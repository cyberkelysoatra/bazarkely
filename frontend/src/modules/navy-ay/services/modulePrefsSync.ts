/**
 * Module preferences sync (v3.80.0): `users.preferences.modules` and
 * `users.preferences.lastModule`.
 *
 * Same contract as `moduleOrder` (optimistic local update first, best-effort push),
 * hardened for offline-first:
 * - every change is an idempotent PATCH (add/remove ids, most-recent lastModule),
 *   kept in localStorage until the server has it → survives reloads and offline;
 * - the push re-reads the server preferences and MERGES the patch into them, so it
 *   never overwrites `moduleOrder` or any other key written by another device;
 * - every Supabase call is wrapped in withTimeout(); a timeout is NOT a failure,
 *   the patch simply stays pending and is replayed (idempotent).
 *
 * SECURITY NOTE: these preferences only drive the module switcher and the UI guards
 * of the budget module and NAVY ay. Eau / Construction data access is still enforced
 * by their existing server-side rules, unchanged.
 */
import { useSyncExternalStore } from 'react';
import { supabase, withTimeout } from '../../../lib/supabase';
import apiService from '../../../services/apiService';
import { useAppStore } from '../../../stores/appStore';
import {
  combinePatches,
  isEmptyPatch,
  mergePreferences,
  MODULE_IDS,
  type LastModule,
  type PreferencesPatch,
} from '../utils/moduleAccess';

const PENDING_KEY = 'bazarkely_prefs_pending';
/** Existing key (id only) — kept as the canonical local "last module" signal. */
export const LEGACY_ACTIVE_MODULE_KEY = 'bazarkely_active_module';
/** Companion key holding { id, at } so local and account values can be compared. */
export const LOCAL_LAST_MODULE_KEY = 'bazarkely_last_module';

type Pending = { userId: string; patch: PreferencesPatch } | null;
export type ResolveStatus = 'idle' | 'resolving' | 'done' | 'failed';

interface SyncState {
  pending: Pending;
  resolveUserId: string | null;
  resolveStatus: ResolveStatus;
}

function readPending(): Pending {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === 'string' && parsed.patch) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

let state: SyncState = { pending: readPending(), resolveUserId: null, resolveStatus: 'idle' };
const listeners = new Set<() => void>();

function setState(next: Partial<SyncState>) {
  state = { ...state, ...next };
  if ('pending' in next) {
    try {
      if (state.pending && !isEmptyPatch(state.pending.patch)) {
        localStorage.setItem(PENDING_KEY, JSON.stringify(state.pending));
      } else {
        localStorage.removeItem(PENDING_KEY);
      }
    } catch {
      /* private mode: in-memory only */
    }
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useModulePrefsState(): SyncState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Pending patch for this user (null if none / other user). */
export function pendingPatchFor(userId: string | null | undefined): PreferencesPatch | null {
  return userId && state.pending?.userId === userId ? state.pending.patch : null;
}

/** Local preferences as the UI should see them: store copy + not-yet-synced patch. */
export function effectivePreferences(
  user: { id?: string; preferences?: any } | null | undefined,
  pending: Pending
): Record<string, any> {
  const patch = user?.id && pending?.userId === user.id ? pending.patch : null;
  return mergePreferences(user?.preferences, patch, false);
}

function applyToLocalUser(userId: string, compute: (prefs: Record<string, any>) => Record<string, any>) {
  const { user, setUser } = useAppStore.getState();
  if (!user || user.id !== userId) return;
  setUser({ ...user, preferences: compute(user.preferences as any) as any });
}

let flushInFlight = false;
let retryTimer: number | null = null;

function scheduleRetry() {
  if (retryTimer !== null) return;
  retryTimer = window.setTimeout(() => {
    retryTimer = null;
    void flushPreferences();
  }, 30000);
}

/**
 * Queue an idempotent preferences change: applied locally right away (optimistic,
 * works offline), then pushed to the account when possible.
 * @param localAuthoritative true only when the caller KNOWS the server state
 *   (e.g. server confirmed the account has no module list yet).
 */
export function queuePreferencesPatch(userId: string, patch: PreferencesPatch, localAuthoritative = false) {
  if (!userId || isEmptyPatch(patch)) return;
  const current = state.pending?.userId === userId ? state.pending.patch : null;
  setState({ pending: { userId, patch: combinePatches(current, patch) } });
  applyToLocalUser(userId, (prefs) => mergePreferences(prefs, patch, localAuthoritative));
  void flushPreferences();
}

/** Push the pending patch (merged into the SERVER copy of preferences). */
export async function flushPreferences(): Promise<void> {
  const snapshot = state.pending;
  if (!snapshot || isEmptyPatch(snapshot.patch) || flushInFlight) return;
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  flushInFlight = true;
  try {
    const { data, error } = (await withTimeout(
      supabase.from('users').select('preferences').eq('id', snapshot.userId).single() as any,
      5000,
      'module-prefs-read'
    )) as any;
    if (error || !data) throw error || new Error('no user row');

    const merged = mergePreferences(data.preferences, snapshot.patch, true);
    const result = (await withTimeout(
      apiService.updateUserPreferences(snapshot.userId, merged),
      8000,
      'module-prefs-write'
    )) as any;
    if (!result?.success) throw new Error(result?.error || 'updateUserPreferences failed');

    // Newer changes queued meanwhile stay pending (they include this snapshot's ops,
    // which are idempotent) and are pushed right after.
    const stillPending = state.pending === snapshot ? null : state.pending;
    setState({ pending: stillPending });
    applyToLocalUser(snapshot.userId, (prefs) =>
      mergePreferences({ ...prefs, ...merged }, stillPending?.patch ?? null, false)
    );
    flushInFlight = false;
    if (stillPending) void flushPreferences();
    return;
  } catch (err) {
    console.warn('⚠️ [modules] preferences push deferred:', err instanceof Error ? err.message : err);
    scheduleRetry();
  }
  flushInFlight = false;
}

/**
 * The local copy has no module list (cache older than the access rules, or basic
 * user built right after OAuth): read the server copy in the background.
 * - server has a list → adopt it;
 * - server confirms none → new account → `['navy-ay']`, pushed to the account.
 */
export async function resolveModulesIfNeeded(userId: string): Promise<void> {
  if (!userId) return;
  if (state.resolveUserId === userId && (state.resolveStatus === 'resolving' || state.resolveStatus === 'done')) {
    return;
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setState({ resolveUserId: userId, resolveStatus: 'failed' });
    return;
  }
  setState({ resolveUserId: userId, resolveStatus: 'resolving' });
  try {
    const { data, error } = (await withTimeout(
      supabase.from('users').select('preferences').eq('id', userId).single() as any,
      5000,
      'module-prefs-resolve'
    )) as any;
    if (error || !data) throw error || new Error('no user row');
    const serverPrefs = (data.preferences ?? {}) as Record<string, any>;
    if (Array.isArray(serverPrefs.modules)) {
      applyToLocalUser(userId, (prefs) =>
        mergePreferences({ ...prefs, ...serverPrefs }, pendingPatchFor(userId), false)
      );
    } else {
      queuePreferencesPatch(userId, { initModules: [MODULE_IDS.NAVY_AY] }, true);
    }
    setState({ resolveStatus: 'done' });
  } catch (err) {
    console.warn('⚠️ [modules] module list not resolved yet:', err instanceof Error ? err.message : err);
    setState({ resolveStatus: 'failed' });
  }
}

/** Local last module: legacy id key is canonical, companion key gives its timestamp. */
export function readLocalLastModule(): LastModule | null {
  try {
    const id = localStorage.getItem(LEGACY_ACTIVE_MODULE_KEY);
    if (!id) return null;
    const raw = localStorage.getItem(LOCAL_LAST_MODULE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return { id, at: parsed?.id === id && typeof parsed.at === 'string' ? parsed.at : '' };
  } catch {
    return null;
  }
}

export function writeLocalLastModule(last: LastModule) {
  try {
    localStorage.setItem(LEGACY_ACTIVE_MODULE_KEY, last.id);
    localStorage.setItem(LOCAL_LAST_MODULE_KEY, JSON.stringify(last));
  } catch {
    /* private mode */
  }
}

let listenersInstalled = false;
/** Replay pending changes when the network comes back (installed once). */
export function installModulePrefsSyncListeners() {
  if (listenersInstalled || typeof window === 'undefined') return;
  listenersInstalled = true;
  window.addEventListener('online', () => {
    if (state.resolveStatus === 'failed') setState({ resolveStatus: 'idle' });
    void flushPreferences();
  });
}
