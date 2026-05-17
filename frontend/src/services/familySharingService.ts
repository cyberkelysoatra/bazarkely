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
 * Met à jour une transaction partagée
 * @param id - ID de la transaction partagée
 * @param updates - Données de mise à jour
 * @returns La transaction partagée mise à jour
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function updateSharedTransaction(
  id: string,
  updates: Partial<FamilySharedTransactionUpdate>
): Promise<FamilySharedTransaction> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est le propriétaire
    const { data: sharedTransaction, error: fetchError } = await supabase
      .from('family_shared_transactions')
      .select('shared_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Erreur lors de la vérification: ${fetchError.message}`);
    }

    if (!sharedTransaction) {
      throw new Error('Transaction partagée non trouvée');
    }

    if ((sharedTransaction as any).shared_by !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à modifier ce partage');
    }

    // Préparer les données de mise à jour
    // Seules les colonnes existantes dans family_shared_transactions peuvent être mises à jour:
    // id, family_group_id, transaction_id, shared_by, is_private, split_type, split_details, has_reimbursement_request, shared_at
    const updateData: any = {};
    const updatesAny = updates as any; // Permet d'accéder aux propriétés qui peuvent être passées
    
    // Colonnes valides à mettre à jour
    if (updatesAny.isPrivate !== undefined) {
      updateData.is_private = updatesAny.isPrivate;
    }
    if (updates.splitType !== undefined) {
      updateData.split_type = updates.splitType;
    }
    if (updates.splitDetails !== undefined) {
      updateData.split_details = updates.splitDetails as any; // JSONB
    }
    if (updatesAny.hasReimbursementRequest !== undefined) {
      updateData.has_reimbursement_request = updatesAny.hasReimbursementRequest;
    }
    
    // DO NOT include: notes, amount, description, category, paid_by, is_settled
    // Ces colonnes n'existent pas dans family_shared_transactions

    // If updating hasReimbursementRequest, use the RPC function (bypasses RLS)
    // Use RPC whenever hasReimbursementRequest is being updated, not just when it's the only field
    if (updatesAny.hasReimbursementRequest !== undefined) {
      
      const { error: rpcError } = await (supabase.rpc as any)('update_reimbursement_request', {
        p_shared_transaction_id: id,
        p_has_reimbursement_request: updatesAny.hasReimbursementRequest
      });

      if (rpcError) {
        throw new Error(`Erreur lors de la mise à jour: ${rpcError.message}`);
      }

      // Si on active la demande de remboursement, créer la ligne dans reimbursement_requests
      if (updatesAny.hasReimbursementRequest === true) {
        // Vérifier si une demande existe déjà
        const { data: existingRequest, error: checkError } = await supabase
          .from('reimbursement_requests')
          .select('id')
          .eq('shared_transaction_id', id)
          .maybeSingle();

        if (checkError) {
          console.warn('[TOGGLE REMBOURSEMENT] Erreur lors de la vérification de l\'existence:', checkError.message);
        } else if (!existingRequest) {
          // Récupérer les détails de la transaction partagée
          const { data: sharedTx, error: sharedTxError } = await supabase
            .from('family_shared_transactions')
            .select(`
              id,
              transaction_id,
              paid_by,
              family_group_id,
              split_type,
              split_details,
              transactions(amount, user_id)
            `)
            .eq('id', id)
            .maybeSingle();

          if (sharedTxError || !sharedTx) {
            console.warn('[TOGGLE REMBOURSEMENT] Impossible de récupérer la transaction partagée:', sharedTxError?.message);
          } else {
            // Récupérer le member_id du payeur (créancier = to_member)
            const paidByUserId = (sharedTx as any).paid_by || (sharedTx as any).shared_by;
            if (!paidByUserId) {
              console.warn('[TOGGLE REMBOURSEMENT] paid_by manquant dans la transaction partagée');
            } else {
              const { data: creditorMember, error: creditorError } = await supabase
                .from('family_members')
                .select('id')
                .eq('family_group_id', (sharedTx as any).family_group_id)
                .eq('user_id', paidByUserId)
                .eq('is_active', true)
                .maybeSingle();

              if (creditorError) {
                console.warn('[TOGGLE REMBOURSEMENT] Erreur lors de la récupération du créancier:', creditorError.message);
              } else if (!creditorMember) {
                console.warn('[TOGGLE REMBOURSEMENT] Créancier (payeur) non trouvé dans les membres actifs');
              } else {
                // Récupérer le member_id du débiteur (celui qui doit rembourser = from_member)
                // C'est l'autre membre actif du groupe qui n'est pas le payeur
                const { data: debtorMembers, error: debtorError } = await supabase
                  .from('family_members')
                  .select('id')
                  .eq('family_group_id', (sharedTx as any).family_group_id)
                  .neq('user_id', paidByUserId)
                  .eq('is_active', true)
                  .limit(1);

                if (debtorError) {
                  console.warn('[TOGGLE REMBOURSEMENT] Erreur lors de la récupération du débiteur:', debtorError.message);
                } else if (!debtorMembers || debtorMembers.length === 0) {
                  console.warn('[TOGGLE REMBOURSEMENT] Débiteur non trouvé (pas d\'autre membre actif dans le groupe)');
                } else {
                  const debtorMember = debtorMembers[0];

                  // Calculer le montant à rembourser (utilise le taux personnalisé, le taux configuré, ou 100% par défaut, ou selon split_details)
                  const transactionAmount = Math.abs(((sharedTx as any).transactions as any)?.amount || 0);
                  
                  // Priority: customReimbursementRate > localStorage setting > default 100%
                  let rate = 1.0; // Default 100%
                  
                  if (updatesAny.customReimbursementRate !== undefined && updatesAny.customReimbursementRate !== null) {
                    // Use custom rate passed from TransactionDetailPage
                    rate = Math.min(100, Math.max(1, updatesAny.customReimbursementRate)) / 100;
                    console.log('[TOGGLE REMBOURSEMENT] Using custom reimbursement rate:', updatesAny.customReimbursementRate + '%');
                  } else {
                    // Get configured reimbursement rate from localStorage (default to 100%)
                    const groupId = (sharedTx as any).family_group_id;
                    const defaultRate = groupId ? localStorage.getItem(`bazarkely_family_${groupId}_reimbursement_rate`) : null;
                    rate = defaultRate ? parseInt(defaultRate, 10) / 100 : 1.0; // Default 100%
                    console.log('[TOGGLE REMBOURSEMENT] Using family default rate:', (rate * 100) + '%');
                  }
                  
                  let reimbursementAmount = transactionAmount * rate; // Use configured rate

                  // Pour 'paid_by_one', toujours utiliser le montant complet de la transaction avec le taux
                  // Pour les autres types de split, utiliser split_details si disponible
                  const splitType = (sharedTx as any).split_type;
                  if (splitType !== 'paid_by_one') {
                    if ((sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
                      const debtorSplit = ((sharedTx as any).split_details as any[]).find(
                        (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
                      );
                      if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
                        // Pour split_custom, appliquer le taux au montant du split
                        reimbursementAmount = Math.abs(debtorSplit.amount) * rate;
                      }
                    }
                  }

                  // Créer ou mettre à jour la demande de remboursement
                  const { data: existingRequest, error: checkRequestError } = await supabase
                    .from('reimbursement_requests')
                    .select('id')
                    .eq('shared_transaction_id', id)
                    .eq('status', 'pending')
                    .maybeSingle();

                  if (checkRequestError && checkRequestError.code !== 'PGRST116') {
                    console.error('[TOGGLE REMBOURSEMENT] Erreur lors de la vérification:', checkRequestError.message);
                  } else if (existingRequest) {
                    // Update existing reimbursement request with new amount
                    const { error: updateError } = await supabase
                      .from('reimbursement_requests')
                      .update({ amount: reimbursementAmount })
                      .eq('id', existingRequest.id);

                    if (updateError) {
                      console.error('[TOGGLE REMBOURSEMENT] Erreur lors de la mise à jour de la demande:', updateError.message);
                    } else {
                      console.log('[TOGGLE REMBOURSEMENT] Demande de remboursement mise à jour avec montant:', reimbursementAmount);
                    }
                  } else {
                    // Create new reimbursement request
                    const { error: insertError } = await supabase
                      .from('reimbursement_requests')
                      .insert({
                        shared_transaction_id: id,
                        from_member_id: debtorMember.id,
                        to_member_id: creditorMember.id,
                        amount: reimbursementAmount,
                        status: 'pending'
                      } as any);

                    if (insertError) {
                      console.error('[TOGGLE REMBOURSEMENT] Erreur lors de la création de la demande:', insertError.message);
                    } else {
                      console.log('[TOGGLE REMBOURSEMENT] Demande de remboursement créée avec succès, montant:', reimbursementAmount);
                    }
                  }
                }
              }
            }
          }
        } else {
          // If hasReimbursementRequest is false, we don't need to update amount
          console.log('[TOGGLE REMBOURSEMENT] Demande de remboursement désactivée');
        }
      }

      // If other fields are also being updated, update them separately
      const otherUpdateData: any = {};
      if (updatesAny.isPrivate !== undefined) {
        otherUpdateData.is_private = updatesAny.isPrivate;
      }
      if (updates.splitType !== undefined) {
        otherUpdateData.split_type = updates.splitType;
      }
      if (updates.splitDetails !== undefined) {
        otherUpdateData.split_details = updates.splitDetails as any;
      }

      // Update other fields if any
      if (Object.keys(otherUpdateData).length > 0) {
        const { error: otherUpdateError } = await (supabase
          .from('family_shared_transactions') as any)
          .update(otherUpdateData)
          .eq('id', id);

        if (otherUpdateError) {
          console.warn('Error updating other fields:', otherUpdateError);
          // Don't throw - the RPC update succeeded, other fields can be updated later
        }
      }

      // Fetch the updated transaction with JOIN to get transaction details
      const { data: updated, error: fetchError } = await supabase
        .from('family_shared_transactions')
        .select(`
          *,
          transactions (
            id,
            description,
            amount,
            category,
            date,
            type
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
      }

      if (!updated) {
        throw new Error('Impossible de récupérer la transaction mise à jour');
      }

      // Map the result with joined transaction data
      const row = updated as any;
      const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

      // Extract joined transaction data if available
      if (row.transactions) {
        const transactionData = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
        if (transactionData) {
          baseTransaction.description = transactionData.description || baseTransaction.description || 'Sans description';
          baseTransaction.amount = transactionData.amount !== null && transactionData.amount !== undefined 
            ? transactionData.amount 
            : (baseTransaction.amount ?? 0);
          baseTransaction.category = transactionData.category || baseTransaction.category || 'autre';
          if (transactionData.date) {
            baseTransaction.date = new Date(transactionData.date);
          }
        }
      }

      return baseTransaction;
    }

    // Mettre à jour (pour les autres colonnes, sans hasReimbursementRequest)
    // Remove has_reimbursement_request from updateData if it was there (shouldn't be, but just in case)
    const updateDataWithoutReimbursement = { ...updateData };
    delete updateDataWithoutReimbursement.has_reimbursement_request;

    // Only proceed with UPDATE if there are other fields to update
    if (Object.keys(updateDataWithoutReimbursement).length === 0) {
      // No other fields to update, just fetch the current transaction
      const { data: currentTransaction, error: fetchError } = await supabase
        .from('family_shared_transactions')
        .select(`
          *,
          transactions (
            id,
            description,
            amount,
            category,
            date,
            type
          )
        `)
        .eq('id', id)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
      }

      if (!currentTransaction) {
        throw new Error('Transaction partagée non trouvée');
      }

      const row = currentTransaction as any;
      const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

      if (row.transactions) {
        const transactionData = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
        if (transactionData) {
          baseTransaction.description = transactionData.description || baseTransaction.description || 'Sans description';
          baseTransaction.amount = transactionData.amount !== null && transactionData.amount !== undefined 
            ? transactionData.amount 
            : (baseTransaction.amount ?? 0);
          baseTransaction.category = transactionData.category || baseTransaction.category || 'autre';
          if (transactionData.date) {
            baseTransaction.date = new Date(transactionData.date);
          }
        }
      }

      return baseTransaction;
    }

    const { data: updatedTransaction, error: updateError } = await (supabase
      .from('family_shared_transactions') as any)
      .update(updateDataWithoutReimbursement)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (updateError) {
      throw new Error(`Erreur lors de la mise à jour: ${updateError.message}`);
    }

    if (!updatedTransaction) {
      // No row updated - might be RLS issue or wrong ID
      console.warn('No row updated - checking if transaction exists...');
      // Vérifier si la transaction existe toujours
      const { data: checkTransaction, error: checkError } = await supabase
        .from('family_shared_transactions')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      
      if (checkError) {
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }
      
      if (!checkTransaction) {
        throw new Error('Transaction partagée non trouvée après mise à jour');
      }
      
      // La transaction existe mais RLS bloque peut-être le SELECT après UPDATE
      // Récupérer la transaction avec JOIN pour avoir les données complètes
      const { data: fetchedTransaction, error: fetchError } = await supabase
        .from('family_shared_transactions')
        .select(`
          *,
          transactions (
            id,
            description,
            amount,
            category,
            date,
            type
          )
        `)
        .eq('id', id)
        .maybeSingle();
      
      if (fetchError || !fetchedTransaction) {
        throw new Error('Impossible de récupérer la transaction mise à jour (problème RLS possible)');
      }
      
      // Utiliser les données récupérées avec JOIN
      const row = fetchedTransaction as any;
      const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);
      
      // Extraire les données de transaction jointes si disponibles
      if (row.transactions) {
        const transactionData = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
        if (transactionData) {
          baseTransaction.description = transactionData.description || baseTransaction.description || 'Sans description';
          baseTransaction.amount = transactionData.amount !== null && transactionData.amount !== undefined 
            ? transactionData.amount 
            : (baseTransaction.amount ?? 0);
          baseTransaction.category = transactionData.category || baseTransaction.category || 'autre';
          if (transactionData.date) {
            baseTransaction.date = new Date(transactionData.date);
          }
        }
      }
      
      return baseTransaction;
    }

    // Transaction mise à jour avec succès, mapper les données
    const row = updatedTransaction as any;
    const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);
    
    // Si une transaction est jointe, extraire ses données
    if (row.transactions) {
      const transactionData = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
      if (transactionData) {
        baseTransaction.description = transactionData.description || baseTransaction.description || 'Sans description';
        baseTransaction.amount = transactionData.amount !== null && transactionData.amount !== undefined 
          ? transactionData.amount 
          : (baseTransaction.amount ?? 0);
        baseTransaction.category = transactionData.category || baseTransaction.category || 'autre';
        if (transactionData.date) {
          baseTransaction.date = new Date(transactionData.date);
        }
      }
    }
    
    return baseTransaction;
  } catch (error) {
    console.error('Erreur dans updateSharedTransaction:', error);
    throw error;
  }
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

