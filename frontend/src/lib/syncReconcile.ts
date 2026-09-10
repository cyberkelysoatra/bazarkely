/**
 * syncReconcile — Reconciliation of server-side deletions into the local cache.
 *
 * Problem this solves: every "Supabase -> IndexedDB" refresh only ever does
 * `bulkPut`. It adds and updates, but never removes a local row that no longer
 * exists on the server. A transaction deleted on the phone stays visible on the
 * desktop forever, and a correction made directly in SQL never comes back down.
 *
 * Rule: a local row that is in scope but absent from the server response is
 * moved to the `syncQuarantine` store (never hard-deleted), unless one of the
 * protections below applies.
 *
 * Protections (all mandatory):
 *  P1 - the row id appears in `syncQueue` (ANY status): a local write is still
 *       on its way up, the server simply has not seen it yet.
 *  P2 - the row was created locally after `fetchStartedAt - 60s`: it was born
 *       while the server request was in flight.
 *  P3 - the server response is incomplete (a page failed): nothing is compared.
 *  P4 - the server returned 0 rows while the local scope holds at least 1:
 *       expired session, RLS, incident. We never empty a device on that.
 *  P5 - loan cascade: a repayment / interest period is only compared when its
 *       parent loan was received from the server; when the parent is itself
 *       quarantined, its children follow.
 *
 * Quarantine is local-only: never synced to Supabase, never pushed to
 * `syncQueue`, never read by a screen. `restoreFromQuarantine()` puts a row
 * back from the browser console if a mistake is ever made.
 */

import { db } from './database';
import type { SyncQuarantineEntry } from './database';

const LOG_TAG = '🧹 [syncReconcile]';

/** Dexie stores this module is allowed to reconcile. */
export type ReconcilableStore =
  | 'transactions'
  | 'accounts'
  | 'budgets'
  | 'goals'
  | 'recurringTransactions'
  | 'personalLoans'
  | 'loanRepayments'
  | 'loanInterestPeriods';

/** A row created less than this before the fetch started is protected (P2). */
export const RECENT_CREATION_GRACE_MS = 60_000;

/** Supabase caps an unbounded select at 1000 rows: page at exactly that size. */
export const SUPABASE_PAGE_SIZE = 1000;

/** Hard stop so a misbehaving server cannot spin us forever. */
const MAX_PAGES = 100;

export type ReconcileSkipReason = 'incomplete' | 'empty-server';

export interface ReconcileResult {
  quarantined: number;
  keptPending: number;
  keptRecent: number;
  skipped?: ReconcileSkipReason;
  /** Ids actually moved to quarantine — feeds the P5 cascade for child stores. */
  quarantinedIds: string[];
}

/**
 * P5 plumbing: lets a child store (repayments, interest periods) be compared
 * only against parents the server actually returned.
 */
export interface ParentGate<T> {
  /** Parent id carried by a child row (e.g. `loanId`). */
  getParentId: (row: T) => string | undefined;
  /** Parent ids the server returned in this same refresh. */
  receivedParentIds: Set<string>;
  /** Parent ids that were quarantined in this same refresh (cascade). */
  quarantinedParentIds: Set<string>;
}

export interface ReconcileOptions<T> {
  storeName: ReconcilableStore;
  /** Local rows already narrowed to the scope of the server query. */
  localRows: T[];
  /** Ids the server returned for that same scope. */
  serverIds: Iterable<string>;
  /** Taken JUST BEFORE the server request was issued. */
  fetchStartedAt: Date;
  /** True only when every page was received without error. */
  fetchComplete: boolean;
  userId: string;
  parentGate?: ParentGate<T>;
}

/** Reads a creation timestamp whatever shape the row carries it in. */
function getCreatedAt(row: any): number | null {
  const raw = row?.createdAt ?? row?.created_at;
  if (!raw) return null;
  const time = raw instanceof Date ? raw.getTime() : new Date(raw).getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * Every record id currently referenced by the sync queue, whatever its status
 * (`pending`, `processing`, `failed`, retries exhausted). Loaded ONCE per call.
 * Ids are UUIDs, so a single cross-table set is a safe superset: over-protecting
 * a row is harmless, quarantining one that still has a pending write is not.
 */
async function loadQueuedRecordIds(): Promise<Set<string>> {
  const queued = new Set<string>();
  try {
    const operations = await db.syncQueue.toArray();
    for (const operation of operations) {
      const recordId = (operation as any)?.data?.id;
      if (typeof recordId === 'string') queued.add(recordId);
    }
  } catch (error) {
    console.warn(`${LOG_TAG} ⚠️ Lecture de la file impossible:`, error);
  }
  return queued;
}

/**
 * Drops quarantine entries for rows the server has served again — the regular
 * `bulkPut` already put them back in their store, so keeping the archive would
 * duplicate them.
 */
async function dropResurrectedEntries(
  storeName: ReconcilableStore,
  userId: string,
  serverIdSet: Set<string>
): Promise<number> {
  try {
    const entries = (await db.syncQuarantine
      .where('[userId+storeName]')
      .equals([userId, storeName])
      .toArray()) as SyncQuarantineEntry[];
    const resurrected = entries
      .filter((entry) => serverIdSet.has(entry.recordId))
      .map((entry) => entry.id);
    if (resurrected.length > 0) {
      await db.syncQuarantine.bulkDelete(resurrected);
    }
    return resurrected.length;
  } catch (error) {
    console.warn(`${LOG_TAG} ⚠️ Purge des entrées réapparues impossible:`, error);
    return 0;
  }
}

/**
 * Moves every in-scope local row missing from the server into `syncQuarantine`.
 * The move is atomic: the archive is written and the origin row deleted inside
 * one Dexie `rw` transaction, so a row can never be lost between the two.
 */
export async function reconcileStore<T extends { id: string }>(
  options: ReconcileOptions<T>
): Promise<ReconcileResult> {
  const { storeName, localRows, fetchStartedAt, fetchComplete, userId, parentGate } = options;
  const serverIdSet =
    options.serverIds instanceof Set
      ? (options.serverIds as Set<string>)
      : new Set(options.serverIds);

  // P3 — a page failed: we cannot tell absence from a gap in the response.
  if (!fetchComplete) {
    console.log(`${LOG_TAG} ${storeName}: ignoré (réponse incomplète)`);
    return { quarantined: 0, keptPending: 0, keptRecent: 0, quarantinedIds: [], skipped: 'incomplete' };
  }

  // P4 — an empty server answer against a non-empty local scope is a red flag
  // (expired session, RLS, incident), never a reason to empty the device.
  if (serverIdSet.size === 0 && localRows.length > 0) {
    console.log(
      `${LOG_TAG} ${storeName}: ignoré (réponse serveur vide, ${localRows.length} ligne(s) locale(s) conservée(s))`
    );
    return { quarantined: 0, keptPending: 0, keptRecent: 0, quarantinedIds: [], skipped: 'empty-server' };
  }

  const resurrected = await dropResurrectedEntries(storeName, userId, serverIdSet);

  if (localRows.length === 0) {
    if (resurrected > 0) {
      console.log(
        `${LOG_TAG} ${storeName}: 0 mis en quarantaine, ${resurrected} entrée(s) d'archive purgée(s) (ligne réapparue)`
      );
    }
    return { quarantined: 0, keptPending: 0, keptRecent: 0, quarantinedIds: [] };
  }

  const queuedRecordIds = await loadQueuedRecordIds();
  const recentThreshold = fetchStartedAt.getTime() - RECENT_CREATION_GRACE_MS;

  const toQuarantine: T[] = [];
  let keptPending = 0;
  let keptRecent = 0;

  for (const row of localRows) {
    // P5 — child rows are only comparable when their parent came back.
    let cascaded = false;
    if (parentGate) {
      const parentId = parentGate.getParentId(row);
      if (!parentId) continue;
      if (parentGate.quarantinedParentIds.has(parentId)) {
        cascaded = true;
      } else if (!parentGate.receivedParentIds.has(parentId)) {
        continue; // Parent absent and not quarantined: nothing proven, keep.
      }
    }

    if (!cascaded && serverIdSet.has(row.id)) continue;

    // P1 — a local write is still queued for this row.
    if (queuedRecordIds.has(row.id)) {
      keptPending++;
      continue;
    }

    // P2 — created while the server request was in flight.
    const createdAt = getCreatedAt(row);
    if (createdAt !== null && createdAt > recentThreshold) {
      keptRecent++;
      continue;
    }

    toQuarantine.push(row);
  }

  if (toQuarantine.length === 0) {
    console.log(
      `${LOG_TAG} ${storeName}: 0 mis en quarantaine, ${keptPending} gardé (file), ${keptRecent} gardé (récent)`
    );
    return { quarantined: 0, keptPending, keptRecent, quarantinedIds: [] };
  }

  const quarantinedAt = new Date();
  const entries: SyncQuarantineEntry[] = toQuarantine.map((row) => ({
    id: `${storeName}:${row.id}`,
    storeName,
    recordId: row.id,
    userId,
    quarantinedAt,
    reason: 'absent-from-server',
    record: row,
  }));
  const ids = toQuarantine.map((row) => row.id);

  try {
    await db.transaction('rw', db.table(storeName), db.syncQuarantine, async () => {
      await db.syncQuarantine.bulkPut(entries);
      await db.table(storeName).bulkDelete(ids);
    });
  } catch (error) {
    console.error(
      `${LOG_TAG} ❌ ${storeName}: mise en quarantaine échouée (aucune ligne retirée):`,
      error
    );
    return { quarantined: 0, keptPending, keptRecent, quarantinedIds: [] };
  }

  console.log(
    `${LOG_TAG} ${storeName}: ${entries.length} mis en quarantaine, ${keptPending} gardé (file), ${keptRecent} gardé (récent)`
  );
  return { quarantined: entries.length, keptPending, keptRecent, quarantinedIds: ids };
}

/**
 * Puts a quarantined row back into its origin store. No UI: this is a console
 * escape hatch (`bazarkelyRestoreFromQuarantine('transactions:<uuid>')`).
 */
export async function restoreFromQuarantine(entryId: string): Promise<boolean> {
  try {
    const entry = (await db.syncQuarantine.get(entryId)) as SyncQuarantineEntry | undefined;
    if (!entry) {
      console.warn(`${LOG_TAG} ⚠️ Entrée introuvable: ${entryId}`);
      return false;
    }
    await db.transaction('rw', db.table(entry.storeName), db.syncQuarantine, async () => {
      await db.table(entry.storeName).put(entry.record);
      await db.syncQuarantine.delete(entryId);
    });
    console.log(`${LOG_TAG} ♻️ ${entryId} restauré dans ${entry.storeName}`);
    return true;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ Restauration de ${entryId} échouée:`, error);
    return false;
  }
}

/**
 * Fetches every page of a Supabase select through `.range()`, so a response is
 * only ever declared complete when the last page came back short. `complete`
 * stays false as soon as one page errors — the caller must then skip P3.
 */
export async function fetchAllPages<R>(
  fetchPage: (from: number, to: number) => Promise<{ data: R[] | null; error: any }>,
  pageSize: number = SUPABASE_PAGE_SIZE
): Promise<{ rows: R[]; complete: boolean }> {
  const rows: R[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    let result: { data: R[] | null; error: any };
    try {
      result = await fetchPage(from, from + pageSize - 1);
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ Page ${page} en échec (timeout/erreur):`, error);
      return { rows, complete: false };
    }
    if (result?.error) {
      console.warn(`${LOG_TAG} ⚠️ Page ${page} en erreur:`, result.error);
      return { rows, complete: false };
    }
    const batch = result?.data || [];
    rows.push(...batch);
    if (batch.length < pageSize) return { rows, complete: true };
  }
  console.warn(`${LOG_TAG} ⚠️ Limite de ${MAX_PAGES} pages atteinte, réponse considérée incomplète`);
  return { rows, complete: false };
}

// Console escape hatch for troubleshooting (no UI by design).
if (typeof window !== 'undefined') {
  (window as any).bazarkelyRestoreFromQuarantine = restoreFromQuarantine;
}
