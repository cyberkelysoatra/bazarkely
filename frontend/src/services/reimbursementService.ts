/**
 * Service de gestion des remboursements familiaux — refonte offline-first phase 1 (S69).
 *
 * Pattern aligné sur loanService (S68) :
 * - Lectures critiques en SWR : IndexedDB d'abord, refresh background fire-and-forget
 *   - getMemberBalances (dérivé localement depuis reimbursementRequests cachés)
 *   - getPendingReimbursements (lecture directe table locale + snapshots dénormalisés)
 *   - getReimbursementStatusByTransactionIds (calcul local depuis snapshots)
 *   - getMemberCreditBalance (lecture locale memberCreditBalances)
 * - Mutation portée en offline-first : markAsReimbursed (statut + transfert de propriété)
 * - Mutations restantes (createReimbursementRequest, recordReimbursementPayment,
 *   getPaymentHistory, getAllocationDetails, etc.) restent online-only en S69.
 *   Toutes ont été migrées vers getCurrentUserSafe() pour éliminer le bug
 *   "Utilisateur non authentifié" du race supabase.auth.getUser() offline.
 *
 * À venir (S70) : refonte complète des paiements FIFO + credit balance + allocations.
 */

import { supabase, withTimeout } from '../lib/supabase';
import { db } from '../lib/database';
import { useAppStore } from '../stores/appStore';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import type {
  ReimbursementRequestLocal,
  MemberCreditBalanceLocal,
} from '../types/reimbursement';
import type {
  ReimbursementRequest,
  ReimbursementRequestRow,
  ReimbursementStatus as ReimbursementRequestStatus,
} from '../types/family';
import type { FamilyMemberBalance as FamilyMemberBalanceRowType } from '../types/family';

const SUPABASE_TIMEOUT_MS = 5000;
const LOG_TAG = '💸 [ReimbursementService]';

// ============================================================================
// HELPERS — STATUT ONLINE / IDS (pattern S68 — getCurrentUserSafe)
// ============================================================================

function isOnline(): boolean {
  try {
    return useAppStore.getState().isOnline ?? navigator.onLine;
  } catch {
    return navigator.onLine;
  }
}

/**
 * Récupère l'utilisateur courant SANS faire de requête réseau.
 * Pattern S68 : useAppStore → supabase.auth.getSession() → null.
 *
 * `supabase.auth.getUser()` fait un fetch HTTP vers /auth/v1/user → throw
 * `AuthRetryableFetchError` en offline. À ne JAMAIS utiliser dans un chemin
 * de lecture/écriture offline-first.
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
    /* getSession ne devrait jamais throw */
  }
  return null;
}

// ============================================================================
// STRUCTURE DE TABLE SUPABASE (compat avec ancienne version)
// ============================================================================

interface ReimbursementRequestTableRow {
  id: string;
  shared_transaction_id: string;
  from_member_id: string;
  to_member_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
  settled_at?: string | null;
  settled_by?: string | null;
  note?: string | null;
  family_group_id?: string;
  percentage?: number | null;
}

// ============================================================================
// TYPES PUBLICS (préservés à l'identique pour backward compat)
// ============================================================================

export type ReimbursementStatus = 'none' | 'pending' | 'settled';

export interface FamilyMemberBalance {
  familyGroupId: string;
  memberId: string;
  userId: string | null;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  pendingToReceive: number;
  pendingToPay: number;
  netBalance: number;
}

export interface ReimbursementWithDetails extends ReimbursementRequest {
  fromMemberName: string;
  toMemberName: string;
  transactionDescription: string | null;
  transactionAmount: number | null;
  transactionDate: Date | null;
  transactionCategory?: string | null;
  reimbursementRate: number | null;
}

export interface ReimbursementDetailForDisplay {
  status: ReimbursementStatus;
  amount: number;
  rate: number;
  fromMemberName: string;
  toMemberName: string;
}

export interface CreateReimbursementData {
  sharedTransactionId: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  currency: string;
  note?: string;
}

export interface PaymentAllocationResult {
  paymentId: string;
  totalAmount: number;
  allocatedAmount: number;
  surplusAmount: number;
  allocations: PaymentAllocation[];
  remainingBalances: RemainingBalance[];
  creditBalanceCreated: boolean;
  creditBalanceId?: string;
}

export interface PaymentAllocation {
  reimbursementRequestId: string;
  allocatedAmount: number;
  requestAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
}

export interface RemainingBalance {
  reimbursementRequestId: string;
  remainingAmount: number;
  status: 'pending' | 'settled';
}

export interface PaymentHistoryEntry {
  paymentId: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  totalAmount: number;
  allocatedAmount: number;
  surplusAmount: number;
  notes?: string;
  createdAt: Date;
  allocations: PaymentAllocationDetail[];
}

export interface PaymentAllocationDetail {
  reimbursementRequestId: string;
  requestDescription: string;
  allocatedAmount: number;
  requestAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
}

export interface MemberCreditBalance {
  id: string;
  fromMemberId: string;
  fromMemberName: string;
  toMemberId: string;
  toMemberName: string;
  creditAmount: number;
  createdAt: Date;
  updatedAt: Date;
  lastPaymentDate?: Date;
}

export interface PaymentAllocationDetails {
  payment: PaymentHistoryEntry;
  allocations: PaymentAllocationDetail[];
  creditBalance?: MemberCreditBalance;
  relatedRequests: ReimbursementRequest[];
}

// ============================================================================
// MAPPERS — Supabase ↔ Local Dexie ↔ types publics
// ============================================================================

function mapRowToFamilyMemberBalance(
  row: FamilyMemberBalanceRowType
): FamilyMemberBalance {
  return {
    familyGroupId: row.family_group_id,
    memberId: row.member_id,
    userId: row.user_id,
    displayName: row.display_name,
    totalPaid: row.total_paid,
    totalOwed: row.total_owed,
    pendingToReceive: row.pending_to_receive,
    pendingToPay: row.pending_to_pay,
    netBalance: row.net_balance,
  };
}

function mapRowToReimbursementRequest(
  row: ReimbursementRequestRow | ReimbursementRequestTableRow
): ReimbursementRequest {
  const isNewStructure = 'from_member_id' in row;

  if (isNewStructure) {
    const newRow = row as ReimbursementRequestTableRow;
    return {
      id: newRow.id,
      familyGroupId: newRow.family_group_id || '',
      requestedBy: newRow.to_member_id,
      requestedFrom: newRow.from_member_id,
      familySharedTransactionId: newRow.shared_transaction_id,
      amount: newRow.amount,
      description: newRow.note || '',
      status: newRow.status as ReimbursementRequestStatus,
      statusChangedAt: new Date(newRow.updated_at),
      statusChangedBy: newRow.settled_by || undefined,
      notes: newRow.note || undefined,
      createdAt: new Date(newRow.created_at),
      updatedAt: new Date(newRow.updated_at),
    };
  }

  const oldRow = row as ReimbursementRequestRow;
  return {
    id: oldRow.id,
    familyGroupId: oldRow.family_group_id || '',
    requestedBy: oldRow.requested_by || '',
    requestedFrom: oldRow.requested_from || '',
    familySharedTransactionId: oldRow.family_shared_transaction_id || '',
    amount: oldRow.amount,
    description: oldRow.description || '',
    status: oldRow.status as ReimbursementRequestStatus,
    statusChangedAt: new Date(oldRow.status_changed_at || oldRow.updated_at),
    statusChangedBy: oldRow.status_changed_by || undefined,
    notes: oldRow.notes || undefined,
    createdAt: new Date(oldRow.created_at),
    updatedAt: new Date(oldRow.updated_at),
  };
}

/**
 * Mappe une ligne Supabase enrichie de jointures vers la version Dexie locale
 * (avec les snapshots dénormalisés requis pour le offline).
 *
 * Attend dans `row` :
 * - les colonnes natives de reimbursement_requests
 * - shared_transaction: { family_group_id, transaction_id, has_reimbursement_request,
 *     transactions: { description, amount, date, category } | [...] }
 * - from_member: { display_name, user_id } | [...]
 * - to_member: { display_name, user_id } | [...]
 */
function mapRowWithJoinsToLocal(row: any): ReimbursementRequestLocal | null {
  if (!row?.id) return null;

  const sharedTx = row.shared_transaction;
  const familyGroupId =
    sharedTx?.family_group_id || row.family_group_id || '';
  if (!familyGroupId) return null;

  const transaction = Array.isArray(sharedTx?.transactions)
    ? sharedTx.transactions[0]
    : sharedTx?.transactions;

  const fromMember = Array.isArray(row.from_member)
    ? row.from_member[0]
    : row.from_member;
  const toMember = Array.isArray(row.to_member)
    ? row.to_member[0]
    : row.to_member;

  return {
    id: row.id,
    sharedTransactionId: row.shared_transaction_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    amount: row.amount ?? 0,
    currency: row.currency || 'MGA',
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    settledAt: row.settled_at ?? null,
    settledBy: row.settled_by ?? null,
    note: row.note ?? null,
    familyGroupId,
    fromMemberName: fromMember?.display_name || 'Membre inconnu',
    toMemberName: toMember?.display_name || 'Membre inconnu',
    fromMemberUserId: fromMember?.user_id ?? null,
    toMemberUserId: toMember?.user_id ?? null,
    transactionId: sharedTx?.transaction_id ?? null,
    transactionDescription: transaction?.description ?? null,
    transactionAmount: typeof transaction?.amount === 'number' ? transaction.amount : null,
    transactionDate: transaction?.date ?? null,
    transactionCategory: transaction?.category ?? null,
    reimbursementRate:
      typeof row.percentage === 'number' ? row.percentage : null,
    hasReimbursementRequest:
      sharedTx?.has_reimbursement_request !== false,
  };
}

function localToReimbursementWithDetails(
  local: ReimbursementRequestLocal
): ReimbursementWithDetails {
  return {
    id: local.id,
    familyGroupId: local.familyGroupId,
    requestedBy: local.toMemberId,
    requestedFrom: local.fromMemberId,
    familySharedTransactionId: local.sharedTransactionId,
    amount: local.amount,
    description: local.note || '',
    status: local.status as ReimbursementRequestStatus,
    statusChangedAt: new Date(local.updatedAt),
    statusChangedBy: local.settledBy || undefined,
    notes: local.note || undefined,
    createdAt: new Date(local.createdAt),
    updatedAt: new Date(local.updatedAt),
    fromMemberName: local.fromMemberName,
    toMemberName: local.toMemberName,
    transactionDescription: local.transactionDescription,
    transactionAmount: local.transactionAmount,
    transactionDate: local.transactionDate ? new Date(local.transactionDate) : null,
    transactionCategory: local.transactionCategory,
    reimbursementRate: local.reimbursementRate ?? 100,
  };
}

function mapCreditBalanceRowToLocal(row: any): MemberCreditBalanceLocal | null {
  if (!row?.id) return null;
  const fromMember = Array.isArray(row.from_member)
    ? row.from_member[0]
    : row.from_member;
  const toMember = Array.isArray(row.to_member)
    ? row.to_member[0]
    : row.to_member;
  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    fromMemberId: row.from_member_id,
    toMemberId: row.to_member_id,
    creditAmount: row.credit_amount ?? 0,
    currency: row.currency || 'MGA',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastPaymentDate: row.last_payment_date ?? null,
    fromMemberName: fromMember?.display_name || 'Membre inconnu',
    toMemberName: toMember?.display_name || 'Membre inconnu',
  };
}

function localCreditBalanceToPublic(
  local: MemberCreditBalanceLocal
): MemberCreditBalance {
  return {
    id: local.id,
    fromMemberId: local.fromMemberId,
    fromMemberName: local.fromMemberName,
    toMemberId: local.toMemberId,
    toMemberName: local.toMemberName,
    creditAmount: local.creditAmount,
    createdAt: new Date(local.createdAt),
    updatedAt: new Date(local.updatedAt),
    lastPaymentDate: local.lastPaymentDate
      ? new Date(local.lastPaymentDate)
      : undefined,
  };
}

// ============================================================================
// HELPERS — QUEUE DE SYNCHRONISATION (offline-first)
// ============================================================================

type ReimbursementTable = 'reimbursement_requests';

async function queueReimbursementSyncOperation(
  userId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: ReimbursementTable,
  recordId: string,
  data: Record<string, any>,
  priority: SyncPriority = SYNC_PRIORITY.NORMAL
): Promise<void> {
  try {
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId,
      operation,
      table_name: tableName,
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
      `${LOG_TAG} 📦 ${operation} ${tableName}/${recordId} ajouté à la queue (priorité ${priority})`
    );
  } catch (error) {
    console.error(`${LOG_TAG} ❌ Erreur push queue ${tableName}:`, error);
  }
}

// ============================================================================
// HELPERS — REFRESH BACKGROUND (Supabase → IndexedDB)
// ============================================================================

const REIMBURSEMENT_JOIN_SELECT = `
  *,
  from_member:family_members!reimbursement_requests_from_member_id_fkey(
    display_name,
    user_id,
    family_group_id
  ),
  to_member:family_members!reimbursement_requests_to_member_id_fkey(
    display_name,
    user_id,
    family_group_id
  ),
  shared_transaction:family_shared_transactions(
    transaction_id,
    family_group_id,
    has_reimbursement_request,
    transactions(
      description,
      amount,
      date,
      category
    )
  )
`;

/**
 * Refresh background des reimbursementRequests pour un groupe familial donné.
 * Récupère TOUS les requests (pending + settled + cancelled) du groupe et
 * met à jour Dexie (bulkPut). Ne throw jamais — silencieux en cas d'échec.
 */
async function refreshReimbursementsForGroup(groupId: string): Promise<void> {
  if (!groupId) return;
  try {
    const { data, error } = (await withTimeout(
      supabase
        .from('reimbursement_requests')
        .select(REIMBURSEMENT_JOIN_SELECT),
      SUPABASE_TIMEOUT_MS,
      'reimbursementService.refreshReimbursementsForGroup'
    )) as any;

    if (error || !data) {
      console.warn(`${LOG_TAG} ⚠️ Refresh reimbursements échoué:`, error);
      return;
    }

    // Filtrage strict par groupId (la table n'a pas de family_group_id direct)
    const localsForGroup = (data as any[])
      .map(mapRowWithJoinsToLocal)
      .filter((l): l is ReimbursementRequestLocal => l !== null && l.familyGroupId === groupId);

    if (localsForGroup.length > 0) {
      await db.reimbursementRequests.bulkPut(localsForGroup);
    }

    // Nettoyage : supprimer les locaux qui n'existent plus côté serveur pour ce groupe
    const localIds = new Set(localsForGroup.map((l) => l.id));
    const existingLocals = await db.reimbursementRequests
      .where('familyGroupId')
      .equals(groupId)
      .toArray();
    const toDelete = existingLocals
      .filter((l) => !localIds.has(l.id))
      .map((l) => l.id);
    if (toDelete.length > 0) {
      await db.reimbursementRequests.bulkDelete(toDelete);
    }

    console.log(
      `${LOG_TAG} 🔄 IndexedDB rafraîchi : ${localsForGroup.length} reimbursement(s) pour groupe ${groupId} (background)`
    );
  } catch (error) {
    console.warn(`${LOG_TAG} ⚠️ Refresh background échoué (non bloquant):`, error);
  }
}

/**
 * Refresh background du solde de crédit entre deux membres.
 * Cible précise (pas un refresh par groupe complet) : utilisé par
 * getMemberCreditBalance qui retourne null si pas de solde.
 */
async function refreshCreditBalanceForPair(
  groupId: string,
  fromMemberId: string,
  toMemberId: string
): Promise<void> {
  try {
    const { data, error } = (await withTimeout(
      supabase
        .from('member_credit_balance')
        .select(`
          *,
          from_member:family_members!member_credit_balance_from_member_id_fkey(display_name),
          to_member:family_members!member_credit_balance_to_member_id_fkey(display_name)
        `)
        .eq('family_group_id', groupId)
        .eq('from_member_id', fromMemberId)
        .eq('to_member_id', toMemberId)
        .maybeSingle(),
      SUPABASE_TIMEOUT_MS,
      'reimbursementService.refreshCreditBalanceForPair'
    )) as any;

    if (error) {
      console.warn(`${LOG_TAG} ⚠️ Refresh credit balance échoué:`, error);
      return;
    }

    if (!data) {
      // Pas de solde côté serveur → supprimer un éventuel cache local
      const local = await db.memberCreditBalances
        .where('[familyGroupId+fromMemberId+toMemberId]')
        .equals([groupId, fromMemberId, toMemberId])
        .first();
      if (local) await db.memberCreditBalances.delete(local.id);
      return;
    }

    const mapped = mapCreditBalanceRowToLocal(data);
    if (mapped) await db.memberCreditBalances.put(mapped);
  } catch (error) {
    console.warn(`${LOG_TAG} ⚠️ Refresh credit balance échoué (non bloquant):`, error);
  }
}

// ============================================================================
// LECTURES SWR (offline-first)
// ============================================================================

/**
 * Récupère les soldes des membres d'un groupe familial.
 *
 * Stratégie SWR : on tente d'abord la lecture depuis la vue Supabase si online
 * (la vue agrège totalPaid/totalOwed qu'on ne peut pas dériver localement sans
 * cacher reimbursement_payments). Si offline, on dérive ce qu'on peut depuis
 * reimbursementRequests cachés (pendingToPay, pendingToReceive) — totalPaid
 * et totalOwed retombent à 0 mais l'UI principale n'utilise que les pendings.
 *
 * Refresh background = appelé en parallèle pour mettre à jour le cache des requests.
 */
export async function getMemberBalances(
  groupId: string
): Promise<FamilyMemberBalance[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Si online : lecture depuis la vue Supabase (avec fallback dérivation locale en cas d'échec)
    if (isOnline()) {
      try {
        const { data: viewData, error: viewError } = (await withTimeout(
          supabase
            .from('family_member_balances')
            .select('*')
            .eq('family_group_id', groupId),
          SUPABASE_TIMEOUT_MS,
          'reimbursementService.getMemberBalances/view'
        )) as any;

        if (viewError) throw viewError;
        if (!viewData) return [];

        // Refresh background pour la prochaine lecture offline
        refreshReimbursementsForGroup(groupId).catch(() => {});

        // Recalcul des pending depuis les requests (logique préservée de l'ancienne version)
        const balancesMap = await derivePendingBalancesFromCache(groupId);

        return (viewData as any[]).map((row: any) => {
          const balance = mapRowToFamilyMemberBalance(row);
          const recalculated = balancesMap.get(row.member_id);
          return {
            ...balance,
            pendingToReceive: recalculated?.pendingToReceive ?? 0,
            pendingToPay: recalculated?.pendingToPay ?? 0,
          };
        });
      } catch (error) {
        console.warn(
          `${LOG_TAG} ⚠️ Vue family_member_balances inaccessible, fallback dérivation locale:`,
          error
        );
        // Fallthrough vers dérivation locale
      }
    }

    // Offline ou échec online : dérivation locale (totalPaid/totalOwed à 0,
    // pendingToPay/pendingToReceive calculés depuis reimbursementRequests cachés)
    return await deriveMemberBalancesLocal(groupId);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getMemberBalances:`, error);
    throw error;
  }
}

/**
 * Calcule pendingToReceive/pendingToPay par memberId depuis les requests Dexie.
 * Filtre : status='pending' ET hasReimbursementRequest=true ET familyGroupId match.
 */
async function derivePendingBalancesFromCache(
  groupId: string
): Promise<Map<string, { pendingToReceive: number; pendingToPay: number }>> {
  const balancesMap = new Map<string, { pendingToReceive: number; pendingToPay: number }>();
  const locals = await db.reimbursementRequests
    .where('[familyGroupId+status]')
    .equals([groupId, 'pending'])
    .toArray();

  for (const r of locals) {
    if (!r.hasReimbursementRequest) continue;
    const credit = balancesMap.get(r.toMemberId) || {
      pendingToReceive: 0,
      pendingToPay: 0,
    };
    credit.pendingToReceive += r.amount;
    balancesMap.set(r.toMemberId, credit);

    const debit = balancesMap.get(r.fromMemberId) || {
      pendingToReceive: 0,
      pendingToPay: 0,
    };
    debit.pendingToPay += r.amount;
    balancesMap.set(r.fromMemberId, debit);
  }
  return balancesMap;
}

/**
 * Dérive un FamilyMemberBalance[] complet uniquement depuis le cache local.
 * Utilisé en dernier recours offline. totalPaid/totalOwed/netBalance restent
 * à 0 (ces agrégats viennent de la vue qu'on ne peut pas reproduire sans
 * cacher reimbursement_payments — prévu S70).
 */
async function deriveMemberBalancesLocal(
  groupId: string
): Promise<FamilyMemberBalance[]> {
  const pendingMap = await derivePendingBalancesFromCache(groupId);
  const allLocals = await db.reimbursementRequests
    .where('familyGroupId')
    .equals(groupId)
    .toArray();

  // Construire un dictionnaire memberId → {displayName, userId}
  const memberInfo = new Map<string, { displayName: string; userId: string | null }>();
  for (const r of allLocals) {
    if (!memberInfo.has(r.fromMemberId)) {
      memberInfo.set(r.fromMemberId, {
        displayName: r.fromMemberName,
        userId: r.fromMemberUserId,
      });
    }
    if (!memberInfo.has(r.toMemberId)) {
      memberInfo.set(r.toMemberId, {
        displayName: r.toMemberName,
        userId: r.toMemberUserId,
      });
    }
  }

  // Inclure aussi les membres avec uniquement des pendings
  for (const memberId of pendingMap.keys()) {
    if (!memberInfo.has(memberId)) {
      memberInfo.set(memberId, { displayName: 'Membre', userId: null });
    }
  }

  const result: FamilyMemberBalance[] = [];
  for (const [memberId, info] of memberInfo.entries()) {
    const pending = pendingMap.get(memberId) || {
      pendingToReceive: 0,
      pendingToPay: 0,
    };
    result.push({
      familyGroupId: groupId,
      memberId,
      userId: info.userId,
      displayName: info.displayName,
      totalPaid: 0,
      totalOwed: 0,
      pendingToReceive: pending.pendingToReceive,
      pendingToPay: pending.pendingToPay,
      netBalance: pending.pendingToReceive - pending.pendingToPay,
    });
  }
  console.log(
    `${LOG_TAG} ✅ ${result.length} solde(s) dérivé(s) localement (offline ou vue inaccessible)`
  );
  return result;
}

/**
 * Récupère les demandes de remboursement en attente pour un groupe.
 * SWR : IndexedDB d'abord, refresh background fire-and-forget.
 */
export async function getPendingReimbursements(
  groupId: string
): Promise<ReimbursementWithDetails[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) throw new Error('Utilisateur non authentifié');

    const localPending = await db.reimbursementRequests
      .where('[familyGroupId+status]')
      .equals([groupId, 'pending'])
      .toArray();

    const visible = localPending.filter((r) => r.hasReimbursementRequest);

    if (visible.length > 0) {
      console.log(
        `${LOG_TAG} ✅ ${visible.length} reimbursement(s) en attente depuis IndexedDB (retour immédiat)`
      );
      if (isOnline()) {
        refreshReimbursementsForGroup(groupId).catch(() => {});
      }
      return visible.map(localToReimbursementWithDetails);
    }

    // Cache vide ET offline → retour vide
    if (!isOnline()) {
      console.warn(`${LOG_TAG} ⚠️ Cache vide et offline → tableau vide`);
      return [];
    }

    // Cache vide ET online → fetch synchrone
    console.log(`${LOG_TAG} 🌐 Cache vide → fetch Supabase synchrone...`);
    await refreshReimbursementsForGroup(groupId);
    const fresh = await db.reimbursementRequests
      .where('[familyGroupId+status]')
      .equals([groupId, 'pending'])
      .toArray();
    return fresh
      .filter((r) => r.hasReimbursementRequest)
      .map(localToReimbursementWithDetails);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getPendingReimbursements:`, error);
    throw error;
  }
}

/**
 * Calcule le statut de remboursement pour une liste de transactionIds.
 *
 * Lecture SWR depuis le cache local. Logique :
 * - Pas de reimbursement_request en cache pour ce transactionId → 'none'
 * - hasReimbursementRequest=false → 'none'
 * - hasReimbursementRequest=true ET status='settled' → 'settled'
 * - sinon → 'pending'
 */
export async function getReimbursementStatusByTransactionIds(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementStatus>> {
  const result = new Map<string, ReimbursementStatus>();

  if (transactionIds.length === 0) return result;

  try {
    const user = await getCurrentUserSafe();
    if (!user) {
      transactionIds.forEach((id) => result.set(id, 'none'));
      return result;
    }

    // Lecture locale par transactionId
    const idsSet = new Set(transactionIds);
    const localMatches = (
      await db.reimbursementRequests.where('familyGroupId').equals(groupId).toArray()
    ).filter((r) => r.transactionId && idsSet.has(r.transactionId));

    // Initialisation tous à 'none'
    for (const txId of transactionIds) result.set(txId, 'none');

    // Group by transactionId pour agréger les statuts
    const byTransaction = new Map<string, ReimbursementRequestLocal[]>();
    for (const r of localMatches) {
      if (!r.transactionId) continue;
      const arr = byTransaction.get(r.transactionId) || [];
      arr.push(r);
      byTransaction.set(r.transactionId, arr);
    }

    for (const [txId, requests] of byTransaction.entries()) {
      // Si AU MOINS un request a hasReimbursementRequest=true
      const visibleRequests = requests.filter((r) => r.hasReimbursementRequest);
      if (visibleRequests.length === 0) {
        result.set(txId, 'none');
        continue;
      }
      // Si TOUS les visibles sont settled → 'settled'
      const anyPending = visibleRequests.some((r) => r.status === 'pending');
      result.set(txId, anyPending ? 'pending' : 'settled');
    }

    // Refresh background si online
    if (isOnline()) {
      refreshReimbursementsForGroup(groupId).catch(() => {});
    }

    return result;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getReimbursementStatusByTransactionIds:`, error);
    transactionIds.forEach((id) => result.set(id, 'none'));
    return result;
  }
}

/**
 * Détails de remboursement (status + amount + rate + names) par transactionId.
 *
 * Resté online-only en S69 (utilisée seulement par TransactionsPage en context
 * spécifique, pas critique pour le mode offline). getCurrentUserSafe substitué.
 */
export async function getReimbursementDetailsByTransactionIds(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementDetailForDisplay>> {
  const result = new Map<string, ReimbursementDetailForDisplay>();

  if (!transactionIds.length || !groupId) return result;

  try {
    const user = await getCurrentUserSafe();
    if (!user) return result;

    const { data: sharedTxs, error: sharedError } = await supabase
      .from('family_shared_transactions')
      .select(`
        id,
        transaction_id,
        transactions (
          amount
        )
      `)
      .eq('family_group_id', groupId)
      .in('transaction_id', transactionIds);

    if (sharedError || !sharedTxs || sharedTxs.length === 0) return result;

    const sharedTxIds = sharedTxs.map((st) => st.id);

    const { data: reimbursements, error: reimbError } = await supabase
      .from('reimbursement_requests')
      .select(`
        shared_transaction_id,
        amount,
        status,
        from_member:family_members!reimbursement_requests_from_member_id_fkey(display_name),
        to_member:family_members!reimbursement_requests_to_member_id_fkey(display_name)
      `)
      .in('shared_transaction_id', sharedTxIds);

    if (reimbError || !reimbursements || reimbursements.length === 0) return result;

    const sharedTxMap = new Map<string, { transactionId: string; transactionAmount: number }>();
    sharedTxs.forEach((st) => {
      if (st.transaction_id) {
        const transaction = (st as any).transactions;
        const transactionAmount = transaction
          ? Math.abs(
              Array.isArray(transaction)
                ? transaction[0]?.amount || 0
                : transaction?.amount || 0
            )
          : 0;
        sharedTxMap.set(st.id, {
          transactionId: st.transaction_id,
          transactionAmount,
        });
      }
    });

    for (const reimb of reimbursements) {
      const sharedInfo = sharedTxMap.get((reimb as any).shared_transaction_id);
      if (!sharedInfo?.transactionId) continue;

      const transactionAmount = sharedInfo.transactionAmount;
      const reimbAmount = (reimb as any).amount || 0;
      const rate =
        transactionAmount > 0
          ? Math.round((reimbAmount / transactionAmount) * 100)
          : 100;

      const fromMember = (reimb as any).from_member;
      const toMember = (reimb as any).to_member;

      result.set(sharedInfo.transactionId, {
        status: (reimb as any).status as ReimbursementStatus,
        amount: reimbAmount,
        rate,
        fromMemberName: Array.isArray(fromMember)
          ? fromMember[0]?.display_name || 'Membre'
          : fromMember?.display_name || 'Membre',
        toMemberName: Array.isArray(toMember)
          ? toMember[0]?.display_name || 'Membre'
          : toMember?.display_name || 'Membre',
      });
    }

    return result;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getReimbursementDetailsByTransactionIds:`, error);
    return result;
  }
}

/**
 * Marque une demande comme réglée — OFFLINE-FIRST (S69).
 *
 * Étapes :
 * 1. Vérification autorisation locale (toMember.user_id === user.id)
 * 2. Update local du reimbursement (status, settledAt, settledBy, updatedAt)
 * 3. Update local de la transaction (transfer of ownership : currentOwnerId,
 *    originalOwnerId, transferredAt) — déjà cachée dans db.transactions
 * 4. Push Supabase si online, sinon queue
 *
 * Le transfert de propriété transfère la transaction du créancier vers le débiteur.
 */
export async function markAsReimbursed(
  reimbursementId: string,
  userId: string
): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  if (user.id !== userId) {
    throw new Error("L'ID utilisateur ne correspond pas à l'utilisateur authentifié");
  }

  // STEP 1: Lecture locale + vérifications
  const local = await db.reimbursementRequests.get(reimbursementId);
  if (!local) {
    // Tentative de re-fetch online si possible (cache vide pour ce request)
    if (isOnline()) {
      const { data: remote, error: fetchError } = (await withTimeout(
        supabase
          .from('reimbursement_requests')
          .select(REIMBURSEMENT_JOIN_SELECT)
          .eq('id', reimbursementId)
          .single(),
        SUPABASE_TIMEOUT_MS,
        'reimbursementService.markAsReimbursed/fetch'
      )) as any;
      if (fetchError || !remote) {
        throw new Error('Demande de remboursement introuvable');
      }
      const mapped = mapRowWithJoinsToLocal(remote);
      if (!mapped) throw new Error('Demande de remboursement introuvable');
      await db.reimbursementRequests.put(mapped);
    } else {
      throw new Error('Demande de remboursement introuvable en local');
    }
  }

  const target = (await db.reimbursementRequests.get(reimbursementId)) as ReimbursementRequestLocal;

  if (target.status !== 'pending') {
    throw new Error('Seules les demandes en attente peuvent être marquées comme réglées');
  }

  if (target.toMemberUserId && target.toMemberUserId !== user.id) {
    throw new Error(
      'Seul le créancier peut marquer une demande de remboursement comme réglée'
    );
  }

  // STEP 2: Update local du reimbursement
  const nowIso = new Date().toISOString();
  await db.reimbursementRequests.update(reimbursementId, {
    status: 'settled',
    settledAt: nowIso,
    settledBy: user.id,
    updatedAt: nowIso,
  });

  const reimbursementPayload: Record<string, any> = {
    status: 'settled',
    settled_at: nowIso,
    settled_by: user.id,
    updated_at: nowIso,
  };

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase
          .from('reimbursement_requests')
          .update(reimbursementPayload as any)
          .eq('id', reimbursementId),
        SUPABASE_TIMEOUT_MS,
        'reimbursementService.markAsReimbursed/update'
      );
      if (error) throw error;
    } catch (error) {
      console.warn(
        `${LOG_TAG} ⚠️ markAsReimbursed Supabase échoué, queue:`,
        error
      );
      await queueReimbursementSyncOperation(
        user.id,
        'UPDATE',
        'reimbursement_requests',
        reimbursementId,
        reimbursementPayload
      );
    }
  } else {
    await queueReimbursementSyncOperation(
      user.id,
      'UPDATE',
      'reimbursement_requests',
      reimbursementId,
      reimbursementPayload
    );
  }

  // STEP 3: Transfert de propriété de la transaction (si on a tx_id + debtor user_id)
  if (target.transactionId && target.fromMemberUserId) {
    const debtorUserId = target.fromMemberUserId;
    const creditorUserId = user.id;

    // Update local de la transaction (déjà cachée — voir db.transactions)
    try {
      await db.transactions.update(target.transactionId, {
        currentOwnerId: debtorUserId,
        originalOwnerId: creditorUserId,
        transferredAt: nowIso,
      } as any);
    } catch (err) {
      console.warn(
        `${LOG_TAG} ⚠️ Update local transaction (transfert propriété) échoué:`,
        err
      );
    }

    const transactionPayload = {
      current_owner_id: debtorUserId,
      original_owner_id: creditorUserId,
      transferred_at: nowIso,
    };

    const queueTransactionUpdate = async () => {
      await db.syncQueue.add({
        id: crypto.randomUUID(),
        userId: user.id,
        operation: 'UPDATE',
        table_name: 'transactions',
        data: { id: target.transactionId, ...transactionPayload },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        priority: SYNC_PRIORITY.NORMAL,
        syncTag: 'bazarkely-sync',
        expiresAt: null,
      });
    };

    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase
            .from('transactions')
            .update(transactionPayload as any)
            .eq('id', target.transactionId),
          SUPABASE_TIMEOUT_MS,
          'reimbursementService.markAsReimbursed/transferOwnership'
        );
        if (error) throw error;
      } catch (error) {
        console.warn(
          `${LOG_TAG} ⚠️ Transfert propriété Supabase échoué, queue:`,
          error
        );
        await queueTransactionUpdate();
      }
    } else {
      await queueTransactionUpdate();
    }
  }
}

/**
 * Crée une nouvelle demande de remboursement.
 * Reste online-only en S69 (mutation complexe : insert + update has_reimbursement_request).
 * getCurrentUserSafe substitué pour éliminer le bug auth offline.
 */
export async function createReimbursementRequest(
  data: CreateReimbursementData
): Promise<ReimbursementRequest> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  if (!isOnline()) {
    throw new Error(
      'La création de remboursement nécessite une connexion (refonte offline prévue en S70)'
    );
  }

  try {
    const { data: sharedTransaction, error: transactionError } = await supabase
      .from('family_shared_transactions')
      .select('family_group_id')
      .eq('id', data.sharedTransactionId)
      .single();

    if (transactionError || !sharedTransaction) {
      throw new Error('Transaction partagée introuvable');
    }

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', sharedTransaction.family_group_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error("Vous n'êtes pas membre du groupe de cette transaction");
    }

    const { data: fromMember, error: fromMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id')
      .eq('id', data.fromMemberId)
      .eq('family_group_id', sharedTransaction.family_group_id)
      .single();

    if (fromMemberError || !fromMember) {
      throw new Error('Le membre débiteur est introuvable ou ne fait pas partie du groupe');
    }

    const { data: toMember, error: toMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id')
      .eq('id', data.toMemberId)
      .eq('family_group_id', sharedTransaction.family_group_id)
      .single();

    if (toMemberError || !toMember) {
      throw new Error('Le membre créancier est introuvable ou ne fait pas partie du groupe');
    }

    const { data: created, error: createError } = await supabase
      .from('reimbursement_requests')
      .insert({
        shared_transaction_id: data.sharedTransactionId,
        from_member_id: data.fromMemberId,
        to_member_id: data.toMemberId,
        amount: data.amount,
        currency: data.currency,
        status: 'pending',
        note: data.note || null,
      } as any)
      .select()
      .single();

    if (createError || !created) {
      throw new Error(
        `Erreur lors de la création: ${createError?.message || 'aucune donnée retournée'}`
      );
    }

    const { error: updateError } = await supabase
      .from('family_shared_transactions')
      .update({ has_reimbursement_request: true })
      .eq('id', data.sharedTransactionId);

    if (updateError) {
      console.error(
        'Erreur lors de la mise à jour de has_reimbursement_request:',
        updateError
      );
    }

    // Refresh cache local pour ce groupe (background, non bloquant)
    refreshReimbursementsForGroup(sharedTransaction.family_group_id).catch(() => {});

    return mapRowToReimbursementRequest(created);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ createReimbursementRequest:`, error);
    throw error;
  }
}

/**
 * Récupère toutes les demandes pour un membre (en tant que débiteur OU créancier).
 * Reste online-only en S69. getCurrentUserSafe substitué.
 */
export async function getReimbursementsByMember(
  memberId: string
): Promise<ReimbursementRequest[]> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  try {
    if (!isOnline()) {
      // Lecture best-effort depuis le cache (sans vérification stricte d'autorisation)
      const local = await db.reimbursementRequests
        .filter((r) => r.fromMemberId === memberId || r.toMemberId === memberId)
        .toArray();
      const sorted = [...local].sort((a, b) =>
        (b.createdAt || '').localeCompare(a.createdAt || '')
      );
      return sorted.map((r) => ({
        id: r.id,
        familyGroupId: r.familyGroupId,
        requestedBy: r.toMemberId,
        requestedFrom: r.fromMemberId,
        familySharedTransactionId: r.sharedTransactionId,
        amount: r.amount,
        description: r.note || '',
        status: r.status as ReimbursementRequestStatus,
        statusChangedAt: new Date(r.updatedAt),
        statusChangedBy: r.settledBy || undefined,
        notes: r.note || undefined,
        createdAt: new Date(r.createdAt),
        updatedAt: new Date(r.updatedAt),
      }));
    }

    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) throw new Error('Membre introuvable');

    if (member.user_id !== user.id) {
      throw new Error(
        "Vous n'êtes pas autorisé à consulter les remboursements de ce membre"
      );
    }

    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }
    if (!data) return [];

    return data.map(mapRowToReimbursementRequest);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getReimbursementsByMember:`, error);
    throw error;
  }
}

// ============================================================================
// PAYMENT ALLOCATION (Phase 1) — reste online-only en S69, refonte FIFO en S70
// ============================================================================

/**
 * Enregistre un paiement de remboursement avec allocation FIFO automatique.
 * Reste online-only en S69. getCurrentUserSafe substitué.
 */
export async function recordReimbursementPayment(
  fromMemberId: string,
  toMemberId: string,
  amount: number,
  notes?: string,
  groupId?: string
): Promise<PaymentAllocationResult> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  if (!isOnline()) {
    throw new Error(
      "L'enregistrement d'un paiement nécessite une connexion (refonte offline prévue en S70)"
    );
  }

  if (amount <= 0) {
    throw new Error('Le montant du paiement doit être supérieur à zéro');
  }

  try {
    const { data: fromMember, error: fromMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id, user_id, display_name')
      .eq('id', fromMemberId)
      .single();
    if (fromMemberError || !fromMember) throw new Error('Membre débiteur introuvable');

    const { data: toMember, error: toMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id, user_id, display_name')
      .eq('id', toMemberId)
      .single();
    if (toMemberError || !toMember) throw new Error('Membre créancier introuvable');

    const finalGroupId = groupId || fromMember.family_group_id;
    if (!finalGroupId) throw new Error('Impossible de déterminer le groupe familial');

    if (
      fromMember.family_group_id !== toMember.family_group_id ||
      fromMember.family_group_id !== finalGroupId
    ) {
      throw new Error('Les membres doivent appartenir au même groupe familial');
    }

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', finalGroupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error("Vous n'êtes pas membre de ce groupe familial");
    }

    const { data: pendingRequests, error: requestsError } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .eq('from_member_id', fromMemberId)
      .eq('to_member_id', toMemberId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (requestsError) {
      throw new Error(`Erreur lors de la récupération des demandes: ${requestsError.message}`);
    }

    const requests = pendingRequests || [];

    let remainingPayment = amount;
    const allocations: PaymentAllocation[] = [];
    const remainingBalances: RemainingBalance[] = [];

    for (const request of requests) {
      if (remainingPayment <= 0) break;

      const requestAmount = request.amount || 0;
      const allocatedToThisRequest = Math.min(remainingPayment, requestAmount);
      const remainingInRequest = requestAmount - allocatedToThisRequest;
      const isFullyPaid = allocatedToThisRequest >= requestAmount;

      allocations.push({
        reimbursementRequestId: request.id,
        allocatedAmount: allocatedToThisRequest,
        requestAmount,
        remainingAmount: remainingInRequest,
        isFullyPaid,
      });

      remainingBalances.push({
        reimbursementRequestId: request.id,
        remainingAmount: remainingInRequest,
        status: isFullyPaid ? 'settled' : 'pending',
      });

      remainingPayment -= allocatedToThisRequest;
    }

    const allocatedAmount = amount - remainingPayment;
    const surplusAmount = remainingPayment;

    const { data: payment, error: paymentError } = await supabase
      .from('reimbursement_payments')
      .insert({
        family_group_id: finalGroupId,
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        total_amount: amount,
        allocated_amount: allocatedAmount,
        surplus_amount: surplusAmount,
        currency: 'MGA',
        notes: notes || null,
        created_by: user.id,
      } as any)
      .select()
      .single();

    if (paymentError || !payment) {
      throw new Error(
        `Erreur lors de la création du paiement: ${paymentError?.message || 'aucune donnée retournée'}`
      );
    }

    const paymentId = payment.id;

    if (allocations.length > 0) {
      const allocationInserts = allocations.map((allocation) => ({
        payment_id: paymentId,
        reimbursement_request_id: allocation.reimbursementRequestId,
        allocated_amount: allocation.allocatedAmount,
        request_amount: allocation.requestAmount,
        remaining_amount: allocation.remainingAmount,
        is_fully_paid: allocation.isFullyPaid,
      }));

      const { error: allocationsError } = await supabase
        .from('reimbursement_payment_allocations')
        .insert(allocationInserts as any);

      if (allocationsError) {
        await supabase.from('reimbursement_payments').delete().eq('id', paymentId);
        throw new Error(`Erreur lors de la création des allocations: ${allocationsError.message}`);
      }

      for (const allocation of allocations) {
        const updateData: any = { updated_at: new Date().toISOString() };
        if (allocation.isFullyPaid) {
          updateData.status = 'settled';
          updateData.settled_at = new Date().toISOString();
          updateData.settled_by = user.id;
        } else {
          updateData.amount = allocation.remainingAmount;
        }

        const { error: updateError } = await supabase
          .from('reimbursement_requests')
          .update(updateData)
          .eq('id', allocation.reimbursementRequestId);

        if (updateError) {
          console.error(
            `Erreur lors de la mise à jour de la demande ${allocation.reimbursementRequestId}:`,
            updateError
          );
        }
      }
    }

    let creditBalanceId: string | undefined;
    let creditBalanceCreated = false;

    if (surplusAmount > 0) {
      const { data: existingCredit, error: creditCheckError } = await supabase
        .from('member_credit_balance')
        .select('id, credit_amount')
        .eq('family_group_id', finalGroupId)
        .eq('from_member_id', fromMemberId)
        .eq('to_member_id', toMemberId)
        .single();

      if (creditCheckError && creditCheckError.code !== 'PGRST116') {
        console.error('Erreur lors de la vérification du solde de crédit:', creditCheckError);
      }

      if (existingCredit) {
        const { data: updatedCredit, error: updateCreditError } = await supabase
          .from('member_credit_balance')
          .update({
            credit_amount: (existingCredit.credit_amount || 0) + surplusAmount,
            updated_at: new Date().toISOString(),
            last_payment_date: new Date().toISOString(),
          } as any)
          .eq('id', existingCredit.id)
          .select()
          .single();

        if (updateCreditError) {
          console.error(
            'Erreur lors de la mise à jour du solde de crédit:',
            updateCreditError
          );
        } else {
          creditBalanceId = updatedCredit?.id;
          creditBalanceCreated = true;
        }
      } else {
        const { data: newCredit, error: createCreditError } = await supabase
          .from('member_credit_balance')
          .insert({
            family_group_id: finalGroupId,
            from_member_id: fromMemberId,
            to_member_id: toMemberId,
            credit_amount: surplusAmount,
            currency: 'MGA',
            last_payment_date: new Date().toISOString(),
          } as any)
          .select()
          .single();

        if (createCreditError) {
          console.error('Erreur lors de la création du solde de crédit:', createCreditError);
        } else {
          creditBalanceId = newCredit?.id;
          creditBalanceCreated = true;
        }
      }
    }

    // Refresh cache pour ce groupe et ce couple débiteur/créancier
    refreshReimbursementsForGroup(finalGroupId).catch(() => {});
    refreshCreditBalanceForPair(finalGroupId, fromMemberId, toMemberId).catch(() => {});

    return {
      paymentId,
      totalAmount: amount,
      allocatedAmount,
      surplusAmount,
      allocations,
      remainingBalances,
      creditBalanceCreated,
      creditBalanceId,
    };
  } catch (error) {
    console.error(`${LOG_TAG} ❌ recordReimbursementPayment:`, error);
    throw error;
  }
}

export async function getPaymentHistory(
  groupId: string,
  options?: {
    fromMemberId?: string;
    toMemberId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<PaymentHistoryEntry[]> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  if (!isOnline()) {
    throw new Error(
      "L'historique des paiements nécessite une connexion (refonte offline prévue en S70)"
    );
  }

  try {
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error("Vous n'êtes pas membre de ce groupe ou le groupe n'existe pas");
    }

    let query = supabase
      .from('reimbursement_payments')
      .select(`
        *,
        from_member:family_members!reimbursement_payments_from_member_id_fkey(display_name),
        to_member:family_members!reimbursement_payments_to_member_id_fkey(display_name)
      `)
      .eq('family_group_id', groupId);

    if (options?.fromMemberId) query = query.eq('from_member_id', options.fromMemberId);
    if (options?.toMemberId) query = query.eq('to_member_id', options.toMemberId);
    if (options?.startDate) query = query.gte('created_at', options.startDate.toISOString());
    if (options?.endDate) query = query.lte('created_at', options.endDate.toISOString());

    query = query.order('created_at', { ascending: false });

    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      throw new Error(`Erreur lors de la récupération: ${paymentsError.message}`);
    }
    if (!payments || payments.length === 0) return [];

    const paymentIds = payments.map((p: any) => p.id);
    const { data: allocations } = await supabase
      .from('reimbursement_payment_allocations')
      .select(`
        *,
        reimbursement_request:reimbursement_requests(
          shared_transaction:family_shared_transactions(
            transactions(description)
          )
        )
      `)
      .in('payment_id', paymentIds);

    const allocationsByPayment = new Map<string, any[]>();
    (allocations || []).forEach((alloc: any) => {
      const arr = allocationsByPayment.get(alloc.payment_id) || [];
      arr.push(alloc);
      allocationsByPayment.set(alloc.payment_id, arr);
    });

    return payments.map((payment: any) => {
      const paymentAllocations = allocationsByPayment.get(payment.id) || [];

      const allocationDetails: PaymentAllocationDetail[] = paymentAllocations.map((alloc: any) => {
        const sharedTransaction = alloc.reimbursement_request?.shared_transaction;
        const transaction = Array.isArray(sharedTransaction?.transactions)
          ? sharedTransaction.transactions[0]
          : sharedTransaction?.transactions;
        return {
          reimbursementRequestId: alloc.reimbursement_request_id,
          requestDescription: transaction?.description || 'Transaction sans description',
          allocatedAmount: alloc.allocated_amount || 0,
          requestAmount: alloc.request_amount || 0,
          remainingAmount: alloc.remaining_amount || 0,
          isFullyPaid: alloc.is_fully_paid || false,
        };
      });

      const fromMember = Array.isArray(payment.from_member)
        ? payment.from_member[0]
        : payment.from_member;
      const toMember = Array.isArray(payment.to_member)
        ? payment.to_member[0]
        : payment.to_member;

      return {
        paymentId: payment.id,
        fromMemberId: payment.from_member_id,
        fromMemberName: fromMember?.display_name || 'Membre inconnu',
        toMemberId: payment.to_member_id,
        toMemberName: toMember?.display_name || 'Membre inconnu',
        totalAmount: payment.total_amount || 0,
        allocatedAmount: payment.allocated_amount || 0,
        surplusAmount: payment.surplus_amount || 0,
        notes: payment.notes || undefined,
        createdAt: new Date(payment.created_at),
        allocations: allocationDetails,
      };
    });
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getPaymentHistory:`, error);
    throw error;
  }
}

/**
 * Récupère le solde de crédit (acompte) entre deux membres — SWR.
 */
export async function getMemberCreditBalance(
  fromMemberId: string,
  toMemberId: string,
  groupId: string
): Promise<MemberCreditBalance | null> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) throw new Error('Utilisateur non authentifié');

    // Lecture locale d'abord
    const local = await db.memberCreditBalances
      .where('[familyGroupId+fromMemberId+toMemberId]')
      .equals([groupId, fromMemberId, toMemberId])
      .first();

    if (local) {
      // Refresh background si online
      if (isOnline()) {
        refreshCreditBalanceForPair(groupId, fromMemberId, toMemberId).catch(() => {});
      }
      return localCreditBalanceToPublic(local);
    }

    // Cache vide ET offline → null
    if (!isOnline()) return null;

    // Cache vide ET online → fetch synchrone
    await refreshCreditBalanceForPair(groupId, fromMemberId, toMemberId);
    const fresh = await db.memberCreditBalances
      .where('[familyGroupId+fromMemberId+toMemberId]')
      .equals([groupId, fromMemberId, toMemberId])
      .first();
    return fresh ? localCreditBalanceToPublic(fresh) : null;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getMemberCreditBalance:`, error);
    throw error;
  }
}

/**
 * Détails complets d'une allocation de paiement.
 * Reste online-only en S69.
 */
export async function getAllocationDetails(
  paymentId: string
): Promise<PaymentAllocationDetails | null> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  if (!isOnline()) {
    throw new Error(
      "Les détails d'allocation nécessitent une connexion (refonte offline prévue en S70)"
    );
  }

  try {
    const { data: payment, error: paymentError } = await supabase
      .from('reimbursement_payments')
      .select(`
        *,
        from_member:family_members!reimbursement_payments_from_member_id_fkey(display_name),
        to_member:family_members!reimbursement_payments_to_member_id_fkey(display_name)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError) {
      if (paymentError.code === 'PGRST116') return null;
      throw new Error(`Erreur lors de la récupération: ${paymentError.message}`);
    }
    if (!payment) return null;

    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', payment.family_group_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error("Vous n'êtes pas autorisé à consulter ce paiement");
    }

    const { data: allocations, error: allocationsError } = await supabase
      .from('reimbursement_payment_allocations')
      .select(`
        *,
        reimbursement_request:reimbursement_requests(
          *,
          shared_transaction:family_shared_transactions(
            transactions(description)
          )
        )
      `)
      .eq('payment_id', paymentId);

    if (allocationsError) {
      throw new Error(`Erreur lors de la récupération des allocations: ${allocationsError.message}`);
    }

    const allocationDetails: PaymentAllocationDetail[] = (allocations || []).map(
      (alloc: any) => {
        const sharedTransaction = alloc.reimbursement_request?.shared_transaction;
        const transaction = Array.isArray(sharedTransaction?.transactions)
          ? sharedTransaction.transactions[0]
          : sharedTransaction?.transactions;
        return {
          reimbursementRequestId: alloc.reimbursement_request_id,
          requestDescription: transaction?.description || 'Transaction sans description',
          allocatedAmount: alloc.allocated_amount || 0,
          requestAmount: alloc.request_amount || 0,
          remainingAmount: alloc.remaining_amount || 0,
          isFullyPaid: alloc.is_fully_paid || false,
        };
      }
    );

    const requestIds = allocationDetails.map((a) => a.reimbursementRequestId);
    const { data: requests } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .in('id', requestIds);

    const relatedRequests = requests ? requests.map(mapRowToReimbursementRequest) : [];

    let creditBalance: MemberCreditBalance | undefined;
    if (payment.surplus_amount > 0) {
      const credit = await getMemberCreditBalance(
        payment.from_member_id,
        payment.to_member_id,
        payment.family_group_id
      );
      creditBalance = credit || undefined;
    }

    const fromMember = Array.isArray(payment.from_member)
      ? payment.from_member[0]
      : payment.from_member;
    const toMember = Array.isArray(payment.to_member)
      ? payment.to_member[0]
      : payment.to_member;

    const paymentEntry: PaymentHistoryEntry = {
      paymentId: payment.id,
      fromMemberId: payment.from_member_id,
      fromMemberName: fromMember?.display_name || 'Membre inconnu',
      toMemberId: payment.to_member_id,
      toMemberName: toMember?.display_name || 'Membre inconnu',
      totalAmount: payment.total_amount || 0,
      allocatedAmount: payment.allocated_amount || 0,
      surplusAmount: payment.surplus_amount || 0,
      notes: payment.notes || undefined,
      createdAt: new Date(payment.created_at),
      allocations: allocationDetails,
    };

    return {
      payment: paymentEntry,
      allocations: allocationDetails,
      creditBalance,
      relatedRequests,
    };
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getAllocationDetails:`, error);
    throw error;
  }
}

// ============================================================================
// BACKWARD COMPAT (export ancien wrapper)
// ============================================================================

/**
 * Ancien wrapper conservé pour rétrocompat. Délègue au nouveau pattern SWR.
 */
export async function getReimbursementStatusByTransactionIds_OLD(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementStatus>> {
  return getReimbursementStatusByTransactionIds(transactionIds, groupId);
}
