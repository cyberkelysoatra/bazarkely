/**
 * Service de partage de transactions dans l'espace famille — refonte offline-first
 * (S72, v3.15.0). Pattern aligné sur reimbursementService :
 *
 * - Lectures critiques en SWR (IndexedDB d'abord, refresh Supabase fire-and-forget)
 *   sur 3 tables locales : familySharedTransactions, familySharingRules,
 *   familySharedRecurring (Dexie v16).
 * - Mutations queue-able (CREATE/UPDATE/DELETE) via syncManager pour les 6
 *   actions simples : shareTransaction (Q5B retour minimal), unshareTransaction,
 *   upsertSharingRule, deleteSharingRule, shareRecurringTransaction,
 *   unshareRecurringTransaction.
 * - updateSharedTransaction reste hybride en S72 — la cascade hasReimbursementRequest
 *   reste online-only (S73 Bloc 3 prévu pour la version offline-first complète
 *   de la cascade).
 */

import { supabase, withTimeout } from '../lib/supabase';
import { db } from '../lib/database';
import { useAppStore } from '../stores/appStore';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import type {
  FamilySharedTransactionLocal,
  FamilySharingRuleLocal,
  FamilySharedRecurringLocal,
} from '../types/familyLocal';
import type { ReimbursementRequestLocal } from '../types/reimbursement';
import type {
  FamilySharedTransaction,
  FamilySharedTransactionRow,
  FamilySharingRule,
  FamilySharingRuleRow,
  ShareTransactionInput,
  FamilySharedTransactionUpdate,
  SplitType,
  SplitDetail,
} from '../types/family';

const LOG_TAG = '👨‍👩‍👧 [FamilySharingService]';
const SUPABASE_TIMEOUT_MS = 5000;

type FamilySharingTable =
  | 'family_shared_transactions'
  | 'family_sharing_rules'
  | 'family_shared_recurring_transactions';

/**
 * Lecture isOnline avec fallback navigator.onLine. Source de vérité : useAppStore.
 */
function isOnline(): boolean {
  try {
    return useAppStore.getState().isOnline ?? navigator.onLine;
  } catch {
    return navigator.onLine;
  }
}

/**
 * Récupère l'utilisateur courant — offline-safe.
 * Ordre : 1) useAppStore.user (Zustand, instantané, jamais réseau)
 *        2) supabase.auth.getSession() (lecture localStorage Supabase)
 *        3) null
 * Ne fait JAMAIS supabase.auth.getUser() (fetch réseau, throw en offline).
 * Pattern aligné sur loanService, familyGroupService, reimbursementService.
 */
async function getCurrentUserSafe(): Promise<{ id: string } | null> {
  try {
    const storeUser = useAppStore.getState().user;
    if (storeUser?.id) return { id: storeUser.id };
  } catch {
    /* store pas encore initialisé */
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return { id: data.session.user.id };
  } catch {
    /* getSession ne devrait jamais throw, mais on est défensif */
  }
  return null;
}

// ============================================================================
// MAPPERS — Local ↔ public / Supabase → Local
// ============================================================================

/**
 * Convertit une ligne Supabase family_shared_transactions (avec JOIN sur
 * transactions) vers la version Dexie locale dénormalisée.
 */
function mapRowToFamilySharedTransactionLocal(
  row: any
): FamilySharedTransactionLocal | null {
  if (!row?.id || !row?.family_group_id) return null;

  const transaction = Array.isArray(row.transactions)
    ? row.transactions[0]
    : row.transactions;

  const sharedAt = row.shared_at || row.created_at || new Date().toISOString();
  const createdAt = row.created_at || sharedAt;
  const updatedAt = row.updated_at || sharedAt;

  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    transactionId: row.transaction_id ?? null,
    sharedBy: row.shared_by,
    paidBy: row.paid_by || row.shared_by,
    isPrivate: row.is_private === true,
    splitType: row.split_type,
    splitDetails: Array.isArray(row.split_details) ? row.split_details : [],
    hasReimbursementRequest: row.has_reimbursement_request === true,
    sharedAt,
    createdAt,
    updatedAt,
    transactionDescription: transaction?.description ?? null,
    transactionAmount:
      typeof transaction?.amount === 'number' ? transaction.amount : null,
    transactionCategory: transaction?.category ?? null,
    transactionDate: transaction?.date ?? null,
    transactionType: transaction?.type ?? null,
  };
}

function mapRowToFamilySharingRuleLocal(row: any): FamilySharingRuleLocal | null {
  if (!row?.id || !row?.family_group_id) return null;
  const userId = row.user_id || row.created_by;
  if (!userId) return null;

  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    userId,
    name: row.name,
    description: row.description ?? null,
    category: row.category ?? null,
    accountId: row.account_id ?? null,
    splitType: row.split_type,
    defaultSplitDetails: row.default_split_details ?? null,
    isActive: row.is_active === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToFamilySharedRecurringLocal(
  row: any
): FamilySharedRecurringLocal | null {
  if (!row?.id || !row?.family_group_id) return null;
  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    recurringTransactionId: row.recurring_transaction_id,
    sharedBy: row.shared_by,
    autoShareGenerated: row.auto_share_generated === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Convertit FamilySharedTransactionLocal (Dexie) vers FamilySharedTransaction (public).
 */
function localToFamilySharedTransaction(
  local: FamilySharedTransactionLocal
): FamilySharedTransaction {
  const base: FamilySharedTransaction = {
    id: local.id,
    familyGroupId: local.familyGroupId,
    transactionId: local.transactionId ?? null,
    sharedBy: local.sharedBy,
    description: local.transactionDescription || '',
    amount: local.transactionAmount ?? 0,
    category: local.transactionCategory || '',
    date: local.transactionDate
      ? new Date(local.transactionDate)
      : new Date(local.sharedAt),
    splitType: local.splitType,
    paidBy: local.paidBy,
    splitDetails: local.splitDetails,
    isSettled: false,
    createdAt: new Date(local.createdAt),
    updatedAt: new Date(local.updatedAt),
  };

  if (local.transactionId) {
    base.transaction = {
      id: local.transactionId,
      description: local.transactionDescription || '',
      amount: local.transactionAmount ?? 0,
      category: local.transactionCategory || '',
      date: local.transactionDate
        ? new Date(local.transactionDate)
        : new Date(local.sharedAt),
      type: (local.transactionType as any) || 'expense',
    } as any;
  }

  return base;
}

function localToFamilySharingRule(
  local: FamilySharingRuleLocal
): FamilySharingRule {
  return {
    id: local.id,
    familyGroupId: local.familyGroupId,
    createdBy: local.userId,
    name: local.name,
    description: local.description ?? undefined,
    category: local.category ?? undefined,
    accountId: local.accountId ?? undefined,
    splitType: local.splitType,
    defaultSplitDetails: local.defaultSplitDetails ?? undefined,
    isActive: local.isActive,
    createdAt: new Date(local.createdAt),
    updatedAt: new Date(local.updatedAt),
  };
}

// ============================================================================
// HELPERS — QUEUE DE SYNCHRONISATION (offline-first)
// ============================================================================

async function queueFamilySharingSyncOperation(
  userId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: FamilySharingTable,
  recordId: string,
  data: Record<string, any>,
  priority: SyncPriority = SYNC_PRIORITY.NORMAL
): Promise<void> {
  try {
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId,
      operation,
      table_name: tableName as any,
      data: { id: recordId, ...data },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      priority,
      syncTag: 'bazarkely-sync',
      expiresAt: null,
    };
    await db.syncQueue.add(syncOp);
    console.log(
      `${LOG_TAG} 📦 ${operation} ${tableName}/${recordId} ajouté à la queue`
    );
  } catch (error) {
    console.error(`${LOG_TAG} ❌ Erreur push queue ${tableName}:`, error);
  }
}

// ============================================================================
// HELPERS — REFRESH BACKGROUND (Supabase → IndexedDB)
// ============================================================================

const SHARED_TRANSACTION_JOIN_SELECT = `
  *,
  transactions (
    id,
    description,
    amount,
    category,
    date,
    type
  )
`;

/**
 * Refresh fire-and-forget des dépenses partagées d'un groupe.
 */
async function refreshSharedTransactionsForGroup(groupId: string): Promise<void> {
  if (!groupId) return;
  try {
    const { data, error } = (await withTimeout(
      supabase
        .from('family_shared_transactions')
        .select(SHARED_TRANSACTION_JOIN_SELECT)
        .eq('family_group_id', groupId),
      SUPABASE_TIMEOUT_MS,
      'familySharingService.refreshSharedTransactionsForGroup'
    )) as any;

    if (error || !data) return;

    const locals = (data as any[])
      .map(mapRowToFamilySharedTransactionLocal)
      .filter((l): l is FamilySharedTransactionLocal => l !== null);

    await db.familySharedTransactions
      .where('familyGroupId')
      .equals(groupId)
      .delete();
    if (locals.length > 0) {
      await db.familySharedTransactions.bulkPut(locals);
    }
  } catch (error) {
    console.warn(
      `${LOG_TAG} ⚠️ refreshSharedTransactionsForGroup échoué (non bloquant):`,
      error
    );
  }
}

/**
 * Refresh fire-and-forget des règles de partage automatique pour un user/groupe.
 */
async function refreshSharingRulesForUser(
  groupId: string,
  userId: string
): Promise<void> {
  if (!groupId || !userId) return;
  try {
    const { data, error } = (await withTimeout(
      supabase
        .from('family_sharing_rules')
        .select('*')
        .eq('family_group_id', groupId)
        .eq('user_id', userId),
      SUPABASE_TIMEOUT_MS,
      'familySharingService.refreshSharingRulesForUser'
    )) as any;

    if (error || !data) return;

    const locals = (data as any[])
      .map(mapRowToFamilySharingRuleLocal)
      .filter((l): l is FamilySharingRuleLocal => l !== null);

    const existing = await db.familySharingRules
      .where('[familyGroupId+userId]')
      .equals([groupId, userId])
      .toArray();
    if (existing.length > 0) {
      await db.familySharingRules.bulkDelete(existing.map((r) => r.id));
    }
    if (locals.length > 0) {
      await db.familySharingRules.bulkPut(locals);
    }
  } catch (error) {
    console.warn(
      `${LOG_TAG} ⚠️ refreshSharingRulesForUser échoué (non bloquant):`,
      error
    );
  }
}

/**
 * Refresh fire-and-forget des transactions récurrentes partagées d'un groupe.
 */
async function refreshSharedRecurringForGroup(groupId: string): Promise<void> {
  if (!groupId) return;
  try {
    const { data, error } = (await withTimeout(
      supabase
        .from('family_shared_recurring_transactions')
        .select('*')
        .eq('family_group_id', groupId),
      SUPABASE_TIMEOUT_MS,
      'familySharingService.refreshSharedRecurringForGroup'
    )) as any;

    if (error || !data) return;

    const locals = (data as any[])
      .map(mapRowToFamilySharedRecurringLocal)
      .filter((l): l is FamilySharedRecurringLocal => l !== null);

    await db.familySharedRecurring
      .where('familyGroupId')
      .equals(groupId)
      .delete();
    if (locals.length > 0) {
      await db.familySharedRecurring.bulkPut(locals);
    }
  } catch (error) {
    console.warn(
      `${LOG_TAG} ⚠️ refreshSharedRecurringForGroup échoué (non bloquant):`,
      error
    );
  }
}

/**
 * Interface locale pour les transactions récurrentes partagées
 * (Type non défini dans family.ts, donc défini ici)
 */
export interface FamilySharedRecurring {
  id: string;
  familyGroupId: string;
  recurringTransactionId: string;
  sharedBy: string; // userId
  autoShareGenerated: boolean; // Si true, les transactions générées seront auto-partagées
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options pour récupérer les transactions partagées
 */
export interface GetSharedTransactionsOptions {
  limit?: number;
  offset?: number;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Convertit une ligne Supabase (snake_case) vers FamilySharedTransaction (camelCase)
 */
export function mapRowToFamilySharedTransaction(
  row: FamilySharedTransactionRow
): FamilySharedTransaction {
  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    transactionId: row.transaction_id,
    sharedBy: row.shared_by,
    description: row.description,
    amount: row.amount,
    category: row.category,
    date: new Date((row as any).shared_at || row.date || (row as any).created_at),
    splitType: row.split_type,
    paidBy: row.paid_by || row.shared_by, // Fallback sur shared_by pour compatibilité avec anciennes données
    splitDetails: row.split_details || [],
    isSettled: row.is_settled,
    notes: row.notes || undefined,
    createdAt: new Date((row as any).shared_at || (row as any).created_at || new Date().toISOString()),
    updatedAt: new Date((row as any).updated_at || (row as any).shared_at || new Date().toISOString()),
  };
}

/**
 * Convertit une ligne Supabase (snake_case) vers FamilySharingRule (camelCase)
 */
export function mapRowToFamilySharingRule(row: FamilySharingRuleRow | any): FamilySharingRule {
  // La colonne dans la DB est user_id, pas created_by
  const userId = (row as any).user_id || row.created_by;
  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    createdBy: userId,
    name: row.name,
    description: row.description || undefined,
    category: row.category || undefined,
    accountId: row.account_id || undefined,
    splitType: row.split_type,
    defaultSplitDetails: row.default_split_details || undefined,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Partage une transaction avec un groupe familial
 * @param input - Données pour partager la transaction
 * @returns La transaction partagée créée
 * @throws Error si l'utilisateur n'est pas authentifié, n'est pas propriétaire de la transaction, ou n'est pas membre du groupe
 */
export async function shareTransaction(
  input: ShareTransactionInput
): Promise<FamilySharedTransaction> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Vérifier que la transaction n'est pas déjà partagée dans ce groupe (lecture locale)
  if (input.transactionId) {
    const existing = await db.familySharedTransactions
      .where('transactionId')
      .equals(input.transactionId)
      .toArray();
    if (existing.some((s) => s.familyGroupId === input.familyGroupId)) {
      throw new Error('Cette transaction est déjà partagée dans ce groupe');
    }
  }

  // Lecture snapshots de la transaction source depuis Dexie (si transactionId fourni)
  let transactionSnapshot: {
    description: string | null;
    amount: number | null;
    category: string | null;
    date: string | null;
    type: 'income' | 'expense' | 'transfer' | null;
  } = {
    description: input.description ?? null,
    amount: input.amount ?? null,
    category: input.category ?? null,
    date: input.date ? input.date.toISOString() : null,
    type: null,
  };

  if (input.transactionId) {
    try {
      const localTx = await db.transactions.get(input.transactionId);
      if (localTx) {
        transactionSnapshot = {
          description: localTx.description ?? input.description ?? null,
          amount: typeof localTx.amount === 'number' ? localTx.amount : input.amount ?? null,
          category: localTx.category ?? input.category ?? null,
          date: localTx.date
            ? (localTx.date instanceof Date
                ? localTx.date.toISOString()
                : new Date(localTx.date as any).toISOString())
            : (input.date ? input.date.toISOString() : null),
          type: (localTx.type as any) ?? null,
        };
      }
    } catch {
      /* lecture Dexie tx non bloquante, on garde les valeurs input */
    }
  }

  // Générer un UUID client — utilisé comme id Supabase aussi (pas de conflit côté serveur
  // grâce au format UUID v4)
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const paidBy = input.paidBy || user.id;
  const splitDetails =
    input.splitDetails && input.splitDetails.length > 0 ? input.splitDetails : [];

  // STEP 1: Insertion Dexie locale immédiate (avec snapshots)
  const localRecord: FamilySharedTransactionLocal = {
    id: newId,
    familyGroupId: input.familyGroupId,
    transactionId: input.transactionId || null,
    sharedBy: user.id,
    paidBy,
    isPrivate: false,
    splitType: input.splitType,
    splitDetails,
    hasReimbursementRequest: false,
    sharedAt: nowIso,
    createdAt: nowIso,
    updatedAt: nowIso,
    transactionDescription: transactionSnapshot.description,
    transactionAmount: transactionSnapshot.amount,
    transactionCategory: transactionSnapshot.category,
    transactionDate: transactionSnapshot.date,
    transactionType: transactionSnapshot.type,
  };
  await db.familySharedTransactions.put(localRecord);

  // STEP 2: Push Supabase si online, queue sinon
  const supabasePayload = {
    id: newId,
    family_group_id: input.familyGroupId,
    transaction_id: input.transactionId || null,
    shared_by: user.id,
    paid_by: paidBy,
    is_private: false,
    split_type: input.splitType,
    split_details: splitDetails.length > 0 ? splitDetails : null,
    has_reimbursement_request: false,
  };

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('family_shared_transactions').insert(supabasePayload as any),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.shareTransaction'
      );
      if (error) throw error;
      // Refresh local pour récupérer les valeurs serveur (shared_at exact, etc.)
      refreshSharedTransactionsForGroup(input.familyGroupId).catch(() => {});
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ shareTransaction Supabase échoué, queue:`, error);
      await queueFamilySharingSyncOperation(
        user.id,
        'CREATE',
        'family_shared_transactions',
        newId,
        supabasePayload
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      'CREATE',
      'family_shared_transactions',
      newId,
      supabasePayload
    );
  }

  return localToFamilySharedTransaction(localRecord);
}

/**
 * Retire le partage d'une transaction
 * @param sharedTransactionId - ID de la transaction partagée
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function unshareTransaction(sharedTransactionId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Vérifier ownership depuis Dexie
  const local = await db.familySharedTransactions.get(sharedTransactionId);
  if (!local) {
    throw new Error('Transaction partagée non trouvée');
  }
  if (local.sharedBy !== user.id) {
    throw new Error("Vous n'êtes pas autorisé à retirer ce partage");
  }

  // STEP 1: Supprimer les demandes de remboursement liées (Dexie + queue par id)
  const linkedReimbursements = await db.reimbursementRequests
    .where('sharedTransactionId')
    .equals(sharedTransactionId)
    .toArray();

  for (const reimb of linkedReimbursements) {
    try {
      await db.reimbursementRequests.delete(reimb.id);
    } catch {
      /* delete Dexie reimbursement non bloquant */
    }

    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase
            .from('reimbursement_requests')
            .delete()
            .eq('id', reimb.id),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.unshareTransaction/deleteReimbursement'
        );
        if (error) throw error;
      } catch (error) {
        console.warn(
          `${LOG_TAG} ⚠️ DELETE reimbursement ${reimb.id} Supabase échoué, queue:`,
          error
        );
        // Réutiliser le pattern reimbursementService : queue dans syncManager
        await db.syncQueue.add({
          id: crypto.randomUUID(),
          userId: user.id,
          operation: 'DELETE',
          table_name: 'reimbursement_requests',
          data: { id: reimb.id },
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending',
          priority: SYNC_PRIORITY.NORMAL,
          syncTag: 'bazarkely-sync',
          expiresAt: null,
        });
      }
    } else {
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        userId: user.id,
        operation: 'DELETE',
        table_name: 'reimbursement_requests',
        data: { id: reimb.id },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        priority: SYNC_PRIORITY.NORMAL,
        syncTag: 'bazarkely-sync',
        expiresAt: null,
      });
    }
  }

  // STEP 2: Supprimer la transaction partagée (Dexie + queue/Supabase)
  await db.familySharedTransactions.delete(sharedTransactionId);

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase
          .from('family_shared_transactions')
          .delete()
          .eq('id', sharedTransactionId),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.unshareTransaction'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ unshareTransaction Supabase échoué, queue:`, error);
      await queueFamilySharingSyncOperation(
        user.id,
        'DELETE',
        'family_shared_transactions',
        sharedTransactionId,
        {}
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      'DELETE',
      'family_shared_transactions',
      sharedTransactionId,
      {}
    );
  }
}

/**
 * Met à jour une transaction partagée — offline-first complet (S73 Bloc 3, v3.16.0).
 *
 * Refonte complète de la cascade hasReimbursementRequest. Toutes les lectures
 * (ownership, family_members créancier/débiteur, reimbursement_request existante)
 * passent par Dexie d'abord. Toutes les écritures (UPDATE family_shared_transactions,
 * INSERT/UPDATE/DELETE/CANCEL reimbursement_requests) sont appliquées en local
 * immédiatement, puis poussées Supabase si online, sinon mises en queue syncManager.
 *
 * Périmètre cascade (Q5/Q6 OUI) :
 *  - hasReimbursementRequest true → create/update reimbursement_request (montant
 *    calculé selon rate + splitType + splitDetails)
 *  - hasReimbursementRequest false → DELETE reimbursement_request s'il n'y a pas
 *    de paiement lié, sinon UPDATE status='cancelled' (Q7 C). Correction de bug
 *    en ligne aussi (Q2 NON).
 *  - Changement de rate, splitType, splitDetails sur dépense avec remboursement
 *    actif → recalcul montant reimbursement_request existante.
 *
 * Périmètre champs (Q3 A) : isPrivate, splitType, splitDetails sont aussi
 * en offline-first dans la même refonte.
 *
 * Cas dégradés (Q1 C) : si cache familyMembers vide ou aucun débiteur actif
 * trouvé → on bascule juste le flag local + queue, et on log un warning. Le
 * toast + l'icône CloudOff sont gérés côté TransactionDetailPage.
 */
export async function updateSharedTransaction(
  id: string,
  updates: Partial<FamilySharedTransactionUpdate>
): Promise<FamilySharedTransaction> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  const updatesAny = updates as any;

  // STEP 0 — Lecture Dexie locale (ownership + snapshots)
  const local = await db.familySharedTransactions.get(id);
  if (!local) {
    throw new Error('Transaction partagée non trouvée');
  }
  if (local.sharedBy !== user.id) {
    throw new Error("Vous n'êtes pas autorisé à modifier ce partage");
  }

  // Construire le patch des champs simples de family_shared_transactions
  const nowIso = new Date().toISOString();
  const fstPatch: Partial<FamilySharedTransactionLocal> = { updatedAt: nowIso };
  const fstSupabasePayload: Record<string, any> = {};

  if (updatesAny.isPrivate !== undefined) {
    fstPatch.isPrivate = !!updatesAny.isPrivate;
    fstSupabasePayload.is_private = !!updatesAny.isPrivate;
  }
  if (updates.splitType !== undefined) {
    fstPatch.splitType = updates.splitType as SplitType;
    fstSupabasePayload.split_type = updates.splitType;
  }
  if (updates.splitDetails !== undefined) {
    fstPatch.splitDetails = (updates.splitDetails as SplitDetail[]) || [];
    fstSupabasePayload.split_details =
      (updates.splitDetails as SplitDetail[])?.length ? updates.splitDetails : null;
  }
  const reimbursementToggleRequested = updatesAny.hasReimbursementRequest !== undefined;
  const newReimbursementFlag = reimbursementToggleRequested
    ? !!updatesAny.hasReimbursementRequest
    : local.hasReimbursementRequest;
  if (reimbursementToggleRequested) {
    fstPatch.hasReimbursementRequest = newReimbursementFlag;
    fstSupabasePayload.has_reimbursement_request = newReimbursementFlag;
  }

  // STEP 1 — UPDATE Dexie family_shared_transactions immédiat
  await db.familySharedTransactions.update(id, fstPatch);
  const updatedLocal: FamilySharedTransactionLocal = {
    ...local,
    ...fstPatch,
  } as FamilySharedTransactionLocal;

  // STEP 2 — Cascade reimbursement_requests (Dexie + push/queue)
  // Décide si on doit (re)calculer le montant : flag activé, ou flag déjà actif
  // et un paramètre de calcul a changé (rate / splitType / splitDetails)
  const calcParamsChanged =
    updatesAny.customReimbursementRate !== undefined ||
    updates.splitType !== undefined ||
    updates.splitDetails !== undefined;
  const shouldRecomputeAmount =
    newReimbursementFlag && (reimbursementToggleRequested || calcParamsChanged);
  const shouldRemoveOrCancel = reimbursementToggleRequested && !newReimbursementFlag;

  if (shouldRecomputeAmount) {
    await applyReimbursementUpsertCascade({
      userId: user.id,
      sharedTx: updatedLocal,
      customRate: updatesAny.customReimbursementRate,
    });
  } else if (shouldRemoveOrCancel) {
    await applyReimbursementRemovalCascade({
      userId: user.id,
      sharedTransactionId: id,
    });
  }

  // STEP 3 — Push Supabase family_shared_transactions (ou queue)
  if (Object.keys(fstSupabasePayload).length > 0) {
    await pushFstUpdate(user.id, id, fstSupabasePayload);
  }

  return localToFamilySharedTransaction(updatedLocal);
}

// ============================================================================
// CASCADE REIMBURSEMENT — helpers internes pour updateSharedTransaction
// ============================================================================

interface ReimbursementUpsertParams {
  userId: string;
  sharedTx: FamilySharedTransactionLocal;
  customRate: number | undefined;
}

/**
 * Calcule le rate effectif : custom > localStorage groupe > 100% par défaut.
 * Retourne une fraction (0-1).
 */
function resolveReimbursementRate(
  familyGroupId: string,
  customRate: number | undefined
): number {
  if (customRate !== undefined && customRate !== null) {
    const clamped = Math.min(100, Math.max(1, customRate));
    return clamped / 100;
  }
  try {
    const stored = localStorage.getItem(
      `bazarkely_family_${familyGroupId}_reimbursement_rate`
    );
    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed)) return parsed / 100;
    }
  } catch {
    /* localStorage indisponible : fallback */
  }
  return 1.0;
}

/**
 * Calcule le montant à rembourser pour un débiteur donné selon le splitType.
 * - paid_by_one : montant total × rate
 * - autres : montant du split du débiteur × rate (fallback total × rate si pas trouvé)
 */
function computeReimbursementAmount(
  sharedTx: FamilySharedTransactionLocal,
  debtorMemberId: string,
  rate: number
): number {
  const totalAmount = Math.abs(sharedTx.transactionAmount ?? 0);
  if (sharedTx.splitType === 'paid_by_one') {
    return totalAmount * rate;
  }
  if (Array.isArray(sharedTx.splitDetails)) {
    const debtorSplit = sharedTx.splitDetails.find(
      (s: any) => s.memberId === debtorMemberId || s.member_id === debtorMemberId
    );
    if (
      debtorSplit &&
      (debtorSplit as any).amount !== undefined &&
      (debtorSplit as any).amount !== null
    ) {
      return Math.abs((debtorSplit as any).amount) * rate;
    }
  }
  return totalAmount * rate;
}

/**
 * Cascade INSERT/UPDATE reimbursement_request. Lecture familyMembers depuis
 * Dexie (cache S71). Si le cache est incomplet (pas de débiteur trouvé), on
 * log un warning et on n'écrit pas — le flag reste à true sur la transaction
 * partagée, la cascade complète sera retentée à la prochaine synchro online
 * (Q1 C : dégradation acceptable).
 */
async function applyReimbursementUpsertCascade(
  params: ReimbursementUpsertParams
): Promise<void> {
  const { userId, sharedTx, customRate } = params;
  const familyGroupId = sharedTx.familyGroupId;
  const paidByUserId = sharedTx.paidBy || sharedTx.sharedBy;
  if (!paidByUserId) {
    console.warn(`${LOG_TAG} ⚠️ cascade reimbursement: paidBy manquant`);
    return;
  }

  // Lookup créancier (payeur) dans le cache local familyMembers
  const creditorMember = await db.familyMembers
    .where('[familyGroupId+userId]')
    .equals([familyGroupId, paidByUserId])
    .filter((m: any) => m.isActive === true)
    .first();
  if (!creditorMember) {
    console.warn(
      `${LOG_TAG} ⚠️ cascade reimbursement: créancier non trouvé en cache (paidBy=${paidByUserId})`
    );
    return;
  }

  // Lookup débiteur (autre membre actif du groupe). On lit tous les actifs et
  // on exclut le payeur en mémoire (l'index Dexie sur isActive boolean est
  // fragile selon les drivers).
  const allMembers = await db.familyMembers
    .where('familyGroupId')
    .equals(familyGroupId)
    .toArray();
  const debtorMember = allMembers
    .filter((m: any) => m.isActive === true)
    .find((m: any) => m.userId && m.userId !== paidByUserId);
  if (!debtorMember) {
    console.warn(
      `${LOG_TAG} ⚠️ cascade reimbursement: aucun autre membre actif trouvé en cache`
    );
    return;
  }

  const rate = resolveReimbursementRate(familyGroupId, customRate);
  const amount = computeReimbursementAmount(sharedTx, debtorMember.id, rate);
  const ratePercent = Math.round(rate * 100);
  const nowIso = new Date().toISOString();

  // Vérifier si une demande pending existe déjà
  const existingPending = await db.reimbursementRequests
    .where('sharedTransactionId')
    .equals(sharedTx.id)
    .filter((r) => r.status === 'pending')
    .first();

  if (existingPending) {
    // UPDATE Dexie + push/queue
    const patch = {
      amount,
      reimbursementRate: ratePercent,
      updatedAt: nowIso,
    };
    await db.reimbursementRequests.update(existingPending.id, patch);

    const supabasePatch = {
      amount,
      percentage: ratePercent,
    };
    await pushReimbursementUpdate(userId, existingPending.id, supabasePatch);
    console.log(
      `${LOG_TAG} 💰 reimbursement_request ${existingPending.id} mise à jour (montant=${amount}, taux=${ratePercent}%)`
    );
    return;
  }

  // INSERT — créer une nouvelle demande
  const newReqId = crypto.randomUUID();
  const reqLocal: ReimbursementRequestLocal = {
    id: newReqId,
    sharedTransactionId: sharedTx.id,
    fromMemberId: debtorMember.id,
    toMemberId: creditorMember.id,
    amount,
    currency: 'MGA',
    status: 'pending',
    createdAt: nowIso,
    updatedAt: nowIso,
    settledAt: null,
    settledBy: null,
    note: null,
    familyGroupId,
    fromMemberName: (debtorMember as any).displayName || '',
    toMemberName: (creditorMember as any).displayName || '',
    fromMemberUserId: (debtorMember as any).userId ?? null,
    toMemberUserId: (creditorMember as any).userId ?? null,
    transactionId: sharedTx.transactionId,
    transactionDescription: sharedTx.transactionDescription,
    transactionAmount: sharedTx.transactionAmount,
    transactionDate: sharedTx.transactionDate,
    transactionCategory: sharedTx.transactionCategory,
    reimbursementRate: ratePercent,
    hasReimbursementRequest: true,
  };
  await db.reimbursementRequests.put(reqLocal);

  const supabasePayload = {
    id: newReqId,
    shared_transaction_id: sharedTx.id,
    from_member_id: debtorMember.id,
    to_member_id: creditorMember.id,
    amount,
    currency: 'MGA',
    status: 'pending',
    percentage: ratePercent,
  };
  await pushReimbursementInsert(userId, newReqId, supabasePayload);
  console.log(
    `${LOG_TAG} 💰 reimbursement_request ${newReqId} créée (montant=${amount}, taux=${ratePercent}%)`
  );
}

/**
 * Cascade DELETE (ou UPDATE status='cancelled') reimbursement_request quand
 * hasReimbursementRequest passe à false. Q7 C : si paiements liés détectables
 * en ligne, on cancel au lieu de delete. En offline, on ne peut pas vérifier
 * la présence de paiements (pas de cache reimbursement_payments en S73) →
 * choix safe = cancel pour ne jamais effacer un éventuel historique.
 */
async function applyReimbursementRemovalCascade(params: {
  userId: string;
  sharedTransactionId: string;
}): Promise<void> {
  const { userId, sharedTransactionId } = params;

  const pendings = await db.reimbursementRequests
    .where('sharedTransactionId')
    .equals(sharedTransactionId)
    .filter((r) => r.status === 'pending')
    .toArray();
  if (pendings.length === 0) {
    console.log(
      `${LOG_TAG} ℹ️ Pas de reimbursement_request pending pour ${sharedTransactionId}`
    );
    return;
  }

  for (const req of pendings) {
    let hasPayments = false;
    if (isOnline()) {
      try {
        const { data, error } = (await withTimeout(
          supabase
            .from('reimbursement_payments')
            .select('id')
            .eq('reimbursement_request_id', req.id)
            .limit(1),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.applyReimbursementRemovalCascade.checkPayments'
        )) as any;
        if (!error && Array.isArray(data) && data.length > 0) {
          hasPayments = true;
        }
      } catch {
        // Si la vérification échoue, choix safe = cancel
        hasPayments = true;
      }
    } else {
      // Offline : on ne peut pas vérifier → safe = cancel
      hasPayments = true;
    }

    const nowIso = new Date().toISOString();
    if (hasPayments) {
      await db.reimbursementRequests.update(req.id, {
        status: 'cancelled',
        updatedAt: nowIso,
      });
      await pushReimbursementUpdate(userId, req.id, { status: 'cancelled' });
      console.log(
        `${LOG_TAG} 🚫 reimbursement_request ${req.id} annulée (paiements existants ou offline)`
      );
    } else {
      await db.reimbursementRequests.delete(req.id);
      await pushReimbursementDelete(userId, req.id);
      console.log(`${LOG_TAG} 🗑️ reimbursement_request ${req.id} supprimée`);
    }
  }
}

/**
 * Push UPDATE family_shared_transactions (Supabase si online, queue sinon).
 * Bascule de hasReimbursementRequest : RPC update_reimbursement_request en
 * ligne (bypass RLS), sinon UPDATE direct rejoué par le syncManager au retour.
 */
async function pushFstUpdate(
  userId: string,
  id: string,
  payload: Record<string, any>
): Promise<void> {
  if (isOnline()) {
    try {
      const hasFlagToggle = payload.has_reimbursement_request !== undefined;
      const otherPayload = { ...payload };
      delete otherPayload.has_reimbursement_request;

      if (hasFlagToggle) {
        const { error: rpcError } = (await withTimeout(
          (supabase.rpc as any)('update_reimbursement_request', {
            p_shared_transaction_id: id,
            p_has_reimbursement_request: payload.has_reimbursement_request,
          }),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.pushFstUpdate.rpc'
        )) as any;
        if (rpcError) throw rpcError;
      }

      if (Object.keys(otherPayload).length > 0) {
        const { error: updateError } = (await withTimeout(
          (supabase.from('family_shared_transactions') as any)
            .update(otherPayload)
            .eq('id', id),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.pushFstUpdate.update'
        )) as any;
        if (updateError) throw updateError;
      }
      return;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ pushFstUpdate Supabase échoué, queue:`,
        error
      );
    }
  }
  await queueFamilySharingSyncOperation(
    userId,
    'UPDATE',
    'family_shared_transactions',
    id,
    payload
  );
}

async function pushReimbursementInsert(
  userId: string,
  _recordId: string,
  payload: Record<string, any>
): Promise<void> {
  if (isOnline()) {
    try {
      const { error } = (await withTimeout(
        supabase.from('reimbursement_requests').insert(payload as any),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.pushReimbursementInsert'
      )) as any;
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ INSERT reimbursement_request Supabase échoué, queue:`,
        error
      );
    }
  }
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    userId,
    operation: 'CREATE',
    table_name: 'reimbursement_requests',
    data: payload,
    timestamp: new Date(),
    retryCount: 0,
    status: 'pending',
    priority: SYNC_PRIORITY.NORMAL,
    syncTag: 'bazarkely-sync',
    expiresAt: null,
  });
}

async function pushReimbursementUpdate(
  userId: string,
  recordId: string,
  payload: Record<string, any>
): Promise<void> {
  if (isOnline()) {
    try {
      const { error } = (await withTimeout(
        (supabase.from('reimbursement_requests') as any)
          .update(payload)
          .eq('id', recordId),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.pushReimbursementUpdate'
      )) as any;
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ UPDATE reimbursement_request ${recordId} Supabase échoué, queue:`,
        error
      );
    }
  }
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    userId,
    operation: 'UPDATE',
    table_name: 'reimbursement_requests',
    data: { id: recordId, ...payload },
    timestamp: new Date(),
    retryCount: 0,
    status: 'pending',
    priority: SYNC_PRIORITY.NORMAL,
    syncTag: 'bazarkely-sync',
    expiresAt: null,
  });
}

async function pushReimbursementDelete(
  userId: string,
  recordId: string
): Promise<void> {
  if (isOnline()) {
    try {
      const { error } = (await withTimeout(
        supabase
          .from('reimbursement_requests')
          .delete()
          .eq('id', recordId),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.pushReimbursementDelete'
      )) as any;
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ DELETE reimbursement_request ${recordId} Supabase échoué, queue:`,
        error
      );
    }
  }
  await db.syncQueue.add({
    id: crypto.randomUUID(),
    userId,
    operation: 'DELETE',
    table_name: 'reimbursement_requests',
    data: { id: recordId },
    timestamp: new Date(),
    retryCount: 0,
    status: 'pending',
    priority: SYNC_PRIORITY.NORMAL,
    syncTag: 'bazarkely-sync',
    expiresAt: null,
  });
}

/**
 * Récupère les transactions partagées d'un groupe familial
 * @param groupId - ID du groupe familial
 * @param options - Options de filtrage et pagination
 * @returns Liste des transactions partagées avec détails
 * @throws Error si l'utilisateur n'est pas membre du groupe
 */
export async function getFamilySharedTransactions(
  groupId: string,
  options?: GetSharedTransactionsOptions
): Promise<FamilySharedTransaction[]> {
  try {
    // Vérifier l'authentification (offline-safe — Zustand store puis getSession)
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // SWR offline-first (S72, v3.15.0)
    // 1. Lecture Dexie d'abord (filter par groupe, application des options en mémoire)
    // 2. Si présent → retour immédiat + refresh background si online
    // 3. Si cache vide ET online → refresh synchrone puis lecture
    // 4. Si cache vide ET offline → retour []

    const applyOptionsAndConvert = (
      locals: FamilySharedTransactionLocal[]
    ): FamilySharedTransaction[] => {
      let filtered = locals.slice();

      if (options?.startDate) {
        const startIso = options.startDate.toISOString();
        filtered = filtered.filter((l) => l.sharedAt >= startIso);
      }
      if (options?.endDate) {
        const endIso = options.endDate.toISOString();
        filtered = filtered.filter((l) => l.sharedAt <= endIso);
      }

      // Tri par sharedAt desc
      filtered.sort((a, b) => b.sharedAt.localeCompare(a.sharedAt));

      // Pagination
      const offset = options?.offset ?? 0;
      const limit = options?.limit;
      if (limit !== undefined) {
        filtered = filtered.slice(offset, offset + limit);
      } else if (offset > 0) {
        filtered = filtered.slice(offset);
      }

      return filtered.map(localToFamilySharedTransaction);
    };

    const cached = await db.familySharedTransactions
      .where('familyGroupId')
      .equals(groupId)
      .toArray();

    if (cached.length > 0) {
      console.log(
        `${LOG_TAG} ✅ ${cached.length} dépense(s) partagée(s) depuis IndexedDB (retour immédiat)`
      );
      if (isOnline()) {
        refreshSharedTransactionsForGroup(groupId).catch(() => {});
      }
      return applyOptionsAndConvert(cached);
    }

    // Cache vide ET offline → retour vide
    if (!isOnline()) {
      return [];
    }

    // Cache vide ET online → fetch synchrone puis lecture
    console.log(`${LOG_TAG} 🌐 Cache vide → fetch Supabase synchrone...`);
    await refreshSharedTransactionsForGroup(groupId);
    const fresh = await db.familySharedTransactions
      .where('familyGroupId')
      .equals(groupId)
      .toArray();
    return applyOptionsAndConvert(fresh);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getFamilySharedTransactions:`, error);
    throw error;
  }
}

/**
 * Récupère les règles de partage automatique de l'utilisateur pour un groupe
 * @param groupId - ID du groupe familial
 * @returns Liste des règles de partage, triées par catégorie
 * @throws Error si l'utilisateur n'est pas membre du groupe
 */
export async function getUserSharingRules(groupId: string): Promise<FamilySharingRule[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // SWR offline-first : lecture Dexie d'abord, refresh background si online
    const cached = await db.familySharingRules
      .where('[familyGroupId+userId]')
      .equals([groupId, user.id])
      .toArray();

    const sortRules = (rules: FamilySharingRuleLocal[]) => {
      // Tri par catégorie ascendant, null en dernier
      return rules
        .filter((r) => r.isActive)
        .sort((a, b) => {
          if (a.category === b.category) return 0;
          if (a.category === null) return 1;
          if (b.category === null) return -1;
          return (a.category || '').localeCompare(b.category || '');
        });
    };

    if (cached.length > 0) {
      if (isOnline()) {
        refreshSharingRulesForUser(groupId, user.id).catch(() => {});
      }
      return sortRules(cached).map(localToFamilySharingRule);
    }

    if (!isOnline()) {
      return [];
    }

    await refreshSharingRulesForUser(groupId, user.id);
    const fresh = await db.familySharingRules
      .where('[familyGroupId+userId]')
      .equals([groupId, user.id])
      .toArray();
    return sortRules(fresh).map(localToFamilySharingRule);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getUserSharingRules:`, error);
    throw error;
  }
}

/**
 * Crée ou met à jour une règle de partage automatique
 * @param groupId - ID du groupe familial
 * @param category - Catégorie de transaction
 * @param autoShare - Si true, les transactions de cette catégorie seront partagées automatiquement
 * @param defaultSplitType - Type de répartition par défaut (optionnel)
 * @returns La règle créée ou mise à jour
 * @throws Error si l'utilisateur n'est pas membre du groupe
 */
export async function upsertSharingRule(
  groupId: string,
  category: string,
  autoShare: boolean,
  defaultSplitType?: SplitType
): Promise<FamilySharingRule> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  const splitType = defaultSplitType || 'split_equal';
  const nowIso = new Date().toISOString();

  // Chercher règle existante en local
  const existingLocals = await db.familySharingRules
    .where('[familyGroupId+userId+category]')
    .equals([groupId, user.id, category])
    .toArray();

  let local: FamilySharingRuleLocal;
  let operation: 'CREATE' | 'UPDATE';

  if (existingLocals.length > 0) {
    // UPDATE
    operation = 'UPDATE';
    const existing = existingLocals[0];
    local = {
      ...existing,
      splitType,
      isActive: autoShare,
      updatedAt: nowIso,
    };
  } else {
    // CREATE
    operation = 'CREATE';
    local = {
      id: crypto.randomUUID(),
      familyGroupId: groupId,
      userId: user.id,
      name: `Partage automatique: ${category}`,
      description: null,
      category,
      accountId: null,
      splitType,
      defaultSplitDetails: null,
      isActive: autoShare,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
  }

  // STEP 1: Update local Dexie
  await db.familySharingRules.put(local);

  // STEP 2: Push Supabase ou queue
  const supabasePayload: Record<string, any> = {
    id: local.id,
    family_group_id: local.familyGroupId,
    user_id: local.userId,
    name: local.name,
    category: local.category,
    split_type: local.splitType,
    is_active: local.isActive,
    updated_at: local.updatedAt,
  };
  if (operation === 'CREATE') {
    supabasePayload.created_at = local.createdAt;
  }

  if (isOnline()) {
    try {
      if (operation === 'CREATE') {
        const { error } = await withTimeout(
          supabase.from('family_sharing_rules').insert(supabasePayload as any),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.upsertSharingRule/insert'
        );
        if (error) throw error;
      } else {
        const { id, ...updateData } = supabasePayload;
        const { error } = await withTimeout(
          (supabase.from('family_sharing_rules') as any)
            .update(updateData)
            .eq('id', id),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.upsertSharingRule/update'
        );
        if (error) throw error;
      }
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ upsertSharingRule Supabase échoué, queue:`, error);
      await queueFamilySharingSyncOperation(
        user.id,
        operation,
        'family_sharing_rules',
        local.id,
        supabasePayload
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      operation,
      'family_sharing_rules',
      local.id,
      supabasePayload
    );
  }

  return localToFamilySharingRule(local);
}

/**
 * Supprime une règle de partage automatique
 * @param ruleId - ID de la règle
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function deleteSharingRule(ruleId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Vérifier ownership en local
  const local = await db.familySharingRules.get(ruleId);
  if (!local) {
    throw new Error('Règle non trouvée');
  }
  if (local.userId !== user.id) {
    throw new Error("Vous n'êtes pas autorisé à supprimer cette règle");
  }

  // STEP 1: DELETE local
  await db.familySharingRules.delete(ruleId);

  // STEP 2: Push Supabase ou queue
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('family_sharing_rules').delete().eq('id', ruleId),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.deleteSharingRule'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ deleteSharingRule Supabase échoué, queue:`, error);
      await queueFamilySharingSyncOperation(
        user.id,
        'DELETE',
        'family_sharing_rules',
        ruleId,
        {}
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      'DELETE',
      'family_sharing_rules',
      ruleId,
      {}
    );
  }
}

/**
 * Vérifie si une catégorie doit être partagée automatiquement
 * @param groupId - ID du groupe familial
 * @param category - Catégorie à vérifier
 * @returns true si une règle active existe pour cette catégorie
 * @throws Error si l'utilisateur n'est pas membre du groupe
 */
export async function shouldAutoShare(groupId: string, category: string): Promise<boolean> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // SWR offline-first : lecture Dexie d'abord. Une règle active pour cette
    // catégorie → true. Refresh background si online.
    const cached = await db.familySharingRules
      .where('[familyGroupId+userId+category]')
      .equals([groupId, user.id, category])
      .toArray();

    const hasActive = cached.some((r) => r.isActive);

    if (cached.length > 0) {
      if (isOnline()) {
        refreshSharingRulesForUser(groupId, user.id).catch(() => {});
      }
      return hasActive;
    }

    // Cache vide : si offline → false (pas d'auto-partage). Si online → refresh + recheck
    if (!isOnline()) {
      return false;
    }

    await refreshSharingRulesForUser(groupId, user.id);
    const fresh = await db.familySharingRules
      .where('[familyGroupId+userId+category]')
      .equals([groupId, user.id, category])
      .toArray();
    return fresh.some((r) => r.isActive);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ shouldAutoShare:`, error);
    throw error;
  }
}

/**
 * Partage une transaction récurrente avec un groupe familial
 * @param groupId - ID du groupe familial
 * @param recurringTransactionId - ID de la transaction récurrente
 * @param autoShareGenerated - Si true, les transactions générées seront auto-partagées
 * @returns La transaction récurrente partagée créée
 * @throws Error si l'utilisateur n'est pas membre du groupe ou n'est pas propriétaire de la transaction récurrente
 */
export async function shareRecurringTransaction(
  groupId: string,
  recurringTransactionId: string,
  autoShareGenerated: boolean = false
): Promise<FamilySharedRecurring> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Vérifier ownership de la recurring transaction (lecture Dexie)
  try {
    const localRecurring = await db.recurringTransactions.get(recurringTransactionId);
    if (!localRecurring) {
      // Pas en cache : si online, on tente, sinon on refuse (impossible de valider)
      if (isOnline()) {
        const { data: serverRecurring, error: fetchError } = await withTimeout(
          supabase
            .from('recurring_transactions')
            .select('user_id')
            .eq('id', recurringTransactionId)
            .single(),
          SUPABASE_TIMEOUT_MS,
          'familySharingService.shareRecurringTransaction/fetchRecurring'
        ) as any;
        if (fetchError || !serverRecurring) {
          throw new Error('Transaction récurrente non trouvée');
        }
        if ((serverRecurring as any).user_id !== user.id) {
          throw new Error("Vous n'êtes pas propriétaire de cette transaction récurrente");
        }
      } else {
        throw new Error('Transaction récurrente non trouvée en local');
      }
    } else if ((localRecurring as any).userId !== user.id) {
      throw new Error("Vous n'êtes pas propriétaire de cette transaction récurrente");
    }
  } catch (error) {
    // Si l'erreur vient de la lecture Dexie (pas de notre throw), on log et continue
    if (error instanceof Error && error.message.includes('non trouvée')) throw error;
    if (error instanceof Error && error.message.includes('propriétaire')) throw error;
  }

  // Vérifier qu'elle n'est pas déjà partagée dans ce groupe (lecture locale)
  const existingShares = await db.familySharedRecurring
    .where('[familyGroupId+recurringTransactionId]')
    .equals([groupId, recurringTransactionId])
    .toArray();
  if (existingShares.length > 0) {
    throw new Error('Cette transaction récurrente est déjà partagée dans ce groupe');
  }

  // Créer le partage en local
  const newId = crypto.randomUUID();
  const nowIso = new Date().toISOString();
  const local: FamilySharedRecurringLocal = {
    id: newId,
    familyGroupId: groupId,
    recurringTransactionId,
    sharedBy: user.id,
    autoShareGenerated,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  await db.familySharedRecurring.put(local);

  // Push Supabase ou queue
  const supabasePayload = {
    id: newId,
    family_group_id: groupId,
    recurring_transaction_id: recurringTransactionId,
    shared_by: user.id,
    auto_share_generated: autoShareGenerated,
  };

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase
          .from('family_shared_recurring_transactions')
          .insert(supabasePayload as any),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.shareRecurringTransaction'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ shareRecurringTransaction Supabase échoué, queue:`, error);
      await queueFamilySharingSyncOperation(
        user.id,
        'CREATE',
        'family_shared_recurring_transactions',
        newId,
        supabasePayload
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      'CREATE',
      'family_shared_recurring_transactions',
      newId,
      supabasePayload
    );
  }

  return {
    id: local.id,
    familyGroupId: local.familyGroupId,
    recurringTransactionId: local.recurringTransactionId,
    sharedBy: local.sharedBy,
    autoShareGenerated: local.autoShareGenerated,
    createdAt: new Date(local.createdAt),
    updatedAt: new Date(local.updatedAt),
  };
}

/**
 * Arrête le partage d'une transaction récurrente
 * @param sharedRecurringId - ID du partage de transaction récurrente
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function unshareRecurringTransaction(sharedRecurringId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  // Vérifier ownership en local
  const local = await db.familySharedRecurring.get(sharedRecurringId);
  if (!local) {
    throw new Error('Partage de transaction récurrente non trouvé');
  }
  if (local.sharedBy !== user.id) {
    throw new Error("Vous n'êtes pas autorisé à retirer ce partage");
  }

  // STEP 1: DELETE local
  await db.familySharedRecurring.delete(sharedRecurringId);

  // STEP 2: Push Supabase ou queue
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase
          .from('family_shared_recurring_transactions')
          .delete()
          .eq('id', sharedRecurringId),
        SUPABASE_TIMEOUT_MS,
        'familySharingService.unshareRecurringTransaction'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ unshareRecurringTransaction Supabase échoué, queue:`,
        error
      );
      await queueFamilySharingSyncOperation(
        user.id,
        'DELETE',
        'family_shared_recurring_transactions',
        sharedRecurringId,
        {}
      );
    }
  } else {
    await queueFamilySharingSyncOperation(
      user.id,
      'DELETE',
      'family_shared_recurring_transactions',
      sharedRecurringId,
      {}
    );
  }
}

/**
 * Récupère une transaction partagée par son transactionId
 * @param transactionId - ID de la transaction
 * @param familyGroupId - ID du groupe familial (optionnel, pour vérification)
 * @returns La transaction partagée ou null si non trouvée
 * @throws Error si l'utilisateur n'est pas authentifié
 */
export async function getSharedTransactionByTransactionId(
  transactionId: string,
  familyGroupId?: string
): Promise<FamilySharedTransaction | null> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    // SWR offline-first : lecture Dexie par transactionId (index simple), filtrage
    // optionnel par familyGroupId en mémoire.
    const cachedAll = await db.familySharedTransactions
      .where('transactionId')
      .equals(transactionId)
      .toArray();
    const cached = familyGroupId
      ? cachedAll.filter((l) => l.familyGroupId === familyGroupId)
      : cachedAll;

    if (cached.length > 0) {
      if (isOnline() && familyGroupId) {
        refreshSharedTransactionsForGroup(familyGroupId).catch(() => {});
      }
      return localToFamilySharedTransaction(cached[0]);
    }

    // Cache vide ET offline → null
    if (!isOnline()) {
      return null;
    }

    // Cache vide ET online : si on a familyGroupId on peut refresh ce groupe,
    // sinon on ne peut pas (refresh demande un groupId). Fallback : retour null.
    if (familyGroupId) {
      await refreshSharedTransactionsForGroup(familyGroupId);
      const fresh = await db.familySharedTransactions
        .where('transactionId')
        .equals(transactionId)
        .toArray();
      const filtered = fresh.filter((l) => l.familyGroupId === familyGroupId);
      return filtered.length > 0 ? localToFamilySharedTransaction(filtered[0]) : null;
    }

    return null;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getSharedTransactionByTransactionId:`, error);
    throw error;
  }
}

/**
 * Récupère toutes les transactions récurrentes partagées d'un groupe
 * @param groupId - ID du groupe familial
 * @returns Liste des transactions récurrentes partagées avec détails
 * @throws Error si l'utilisateur n'est pas membre du groupe
 */
export async function getSharedRecurringTransactions(
  groupId: string
): Promise<FamilySharedRecurring[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      throw new Error('Utilisateur non authentifié');
    }

    const toPublic = (local: FamilySharedRecurringLocal): FamilySharedRecurring => ({
      id: local.id,
      familyGroupId: local.familyGroupId,
      recurringTransactionId: local.recurringTransactionId,
      sharedBy: local.sharedBy,
      autoShareGenerated: local.autoShareGenerated,
      createdAt: new Date(local.createdAt),
      updatedAt: new Date(local.updatedAt),
    });

    // SWR offline-first : lecture Dexie par familyGroupId
    const cached = await db.familySharedRecurring
      .where('familyGroupId')
      .equals(groupId)
      .toArray();

    if (cached.length > 0) {
      if (isOnline()) {
        refreshSharedRecurringForGroup(groupId).catch(() => {});
      }
      return cached.map(toPublic);
    }

    if (!isOnline()) {
      return [];
    }

    await refreshSharedRecurringForGroup(groupId);
    const fresh = await db.familySharedRecurring
      .where('familyGroupId')
      .equals(groupId)
      .toArray();
    return fresh.map(toPublic);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getSharedRecurringTransactions:`, error);
    throw error;
  }
}

