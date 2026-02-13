/**
 * Service de gestion des remboursements familiaux
 * Gère les demandes de remboursement et les soldes entre membres
 */

import { supabase } from '../lib/supabase';
import type {
  ReimbursementRequest,
  ReimbursementRequestRow,
  ReimbursementStatus as ReimbursementRequestStatus,
} from '../types/family';
// Import the row format type (snake_case) as FamilyMemberBalanceRow
import type { FamilyMemberBalance as FamilyMemberBalanceRowType } from '../types/family';

/**
 * Structure de la table reimbursement_requests (nouvelle version)
 * Compatible avec la structure Supabase actuelle
 */
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
  family_group_id?: string; // Optionnel selon la structure
}

// ============================================================================
// TYPES LOCAUX
// ============================================================================

/**
 * Statut de remboursement pour une transaction
 * 'none' = pas de demande de remboursement
 * 'pending' = au moins une demande en attente
 * 'settled' = toutes les demandes sont réglées (pas de pending)
 */
export type ReimbursementStatus = 'none' | 'pending' | 'settled';

/**
 * Solde d'un membre dans un groupe familial
 */
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

/**
 * Demande de remboursement avec détails complets (noms des membres et transaction)
 */
export interface ReimbursementWithDetails extends ReimbursementRequest {
  fromMemberName: string;
  toMemberName: string;
  transactionDescription: string | null;
  transactionAmount: number | null;
  transactionDate: Date | null;
  transactionCategory?: string | null; // Catégorie de la transaction pour le breakdown chart
  reimbursementRate: number | null; // Taux de remboursement (25, 50, 75, 100 ou null)
}

/**
 * Détails de remboursement pour l'affichage dans l'UI
 */
export interface ReimbursementDetailForDisplay {
  status: ReimbursementStatus;
  amount: number;
  rate: number; // Calculé comme (amount / transactionAmount) * 100
  fromMemberName: string;
  toMemberName: string;
}

/**
 * Données pour créer une demande de remboursement
 */
export interface CreateReimbursementData {
  sharedTransactionId: string;
  fromMemberId: string; // Membre qui doit rembourser (débiteur)
  toMemberId: string; // Membre qui doit recevoir (créancier)
  amount: number;
  currency: string;
  note?: string;
}

// ============================================================================
// TYPES POUR PAYMENT ALLOCATION (Phase 1)
// ============================================================================

/**
 * Résultat de l'allocation d'un paiement
 */
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

/**
 * Allocation d'un paiement à une demande de remboursement
 */
export interface PaymentAllocation {
  reimbursementRequestId: string;
  allocatedAmount: number;
  requestAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
}

/**
 * Solde restant après allocation
 */
export interface RemainingBalance {
  reimbursementRequestId: string;
  remainingAmount: number;
  status: 'pending' | 'settled';
}

/**
 * Entrée dans l'historique des paiements
 */
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

/**
 * Détail d'allocation dans l'historique
 */
export interface PaymentAllocationDetail {
  reimbursementRequestId: string;
  requestDescription: string;
  allocatedAmount: number;
  requestAmount: number;
  remainingAmount: number;
  isFullyPaid: boolean;
}

/**
 * Solde de crédit entre deux membres
 */
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

/**
 * Détails complets d'une allocation de paiement
 */
export interface PaymentAllocationDetails {
  payment: PaymentHistoryEntry;
  allocations: PaymentAllocationDetail[];
  creditBalance?: MemberCreditBalance;
  relatedRequests: ReimbursementRequest[];
}

// ============================================================================
// FONCTIONS DE CONVERSION
// ============================================================================

/**
 * Convertit une ligne Supabase (snake_case) vers FamilyMemberBalance (camelCase)
 */
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

/**
 * Convertit une ligne Supabase (snake_case) vers ReimbursementRequest (camelCase)
 * Gère les deux structures possibles (ancienne et nouvelle)
 */
function mapRowToReimbursementRequest(
  row: ReimbursementRequestRow | ReimbursementRequestTableRow
): ReimbursementRequest {
  // Détecter la structure (nouvelle si from_member_id existe)
  const isNewStructure = 'from_member_id' in row;

  if (isNewStructure) {
    const newRow = row as ReimbursementRequestTableRow;
    return {
      id: newRow.id,
      familyGroupId: newRow.family_group_id || '',
      requestedBy: newRow.to_member_id, // Le créancier est celui qui a payé
      requestedFrom: newRow.from_member_id, // Le débiteur doit rembourser
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
  } else {
    // Ancienne structure
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
}

// ============================================================================
// FONCTIONS PUBLIQUES
// ============================================================================

/**
 * Récupère les soldes de tous les membres d'un groupe familial
 * @param groupId - ID du groupe familial
 * @returns Tableau des soldes des membres
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function getMemberBalances(
  groupId: string
): Promise<FamilyMemberBalance[]> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est membre du groupe
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error(
        "Vous n'êtes pas membre de ce groupe ou le groupe n'existe pas"
      );
    }

    // Récupérer les soldes depuis la vue
    const { data, error } = await supabase
      .from('family_member_balances')
      .select('*')
      .eq('family_group_id', groupId);

    if (error) {
      console.error(
        'Erreur lors de la récupération des soldes:',
        error
      );
      throw new Error(
        `Erreur lors de la récupération des soldes: ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    // CRITICAL FIX: Recalculate pending_to_receive and pending_to_pay
    // by filtering reimbursement_requests where has_reimbursement_request = true
    // This matches the fix applied to getPendingReimbursements
    const { data: reimbursementRequests, error: reimbError } = await supabase
      .from('reimbursement_requests')
      .select(`
        *,
        shared_transaction:family_shared_transactions(
          has_reimbursement_request,
          family_group_id
        )
      `)
      .eq('status', 'pending');

    if (reimbError) {
      console.error('Erreur lors de la récupération des remboursements pour recalcul:', reimbError);
      // Fallback to view data if reimbursement query fails
      return data.map(mapRowToFamilyMemberBalance);
    }

    // Filter reimbursement requests where has_reimbursement_request = true
    const validReimbursements = (reimbursementRequests || []).filter((rr: any) => {
      if (!rr.shared_transaction) {
        return false;
      }
      
      // Check that has_reimbursement_request is true
      const hasReimbursementRequest = rr.shared_transaction?.has_reimbursement_request;
      if (hasReimbursementRequest === false) {
        return false;
      }
      
      // Check that the shared transaction belongs to this group
      const transactionGroupId = rr.shared_transaction?.family_group_id;
      if (transactionGroupId !== groupId) {
        return false;
      }
      
      return true;
    });

    // Recalculate pending amounts for each member
    const balancesMap = new Map<string, { pendingToReceive: number; pendingToPay: number }>();
    
    validReimbursements.forEach((rr: any) => {
      const toMemberId = rr.to_member_id; // Creditor (should receive)
      const fromMemberId = rr.from_member_id; // Debtor (should pay)
      const amount = rr.amount || 0;
      
      // Add to pendingToReceive for creditor
      if (toMemberId) {
        const creditorBalance = balancesMap.get(toMemberId) || { pendingToReceive: 0, pendingToPay: 0 };
        creditorBalance.pendingToReceive += amount;
        balancesMap.set(toMemberId, creditorBalance);
      }
      
      // Add to pendingToPay for debtor
      if (fromMemberId) {
        const debtorBalance = balancesMap.get(fromMemberId) || { pendingToReceive: 0, pendingToPay: 0 };
        debtorBalance.pendingToPay += amount;
        balancesMap.set(fromMemberId, debtorBalance);
      }
    });

    // Map the view data and override pending amounts with recalculated values
    return data.map((row: any) => {
      const balance = mapRowToFamilyMemberBalance(row);
      const recalculated = balancesMap.get(row.member_id);
      
      if (recalculated) {
        // Override with recalculated values
        return {
          ...balance,
          pendingToReceive: recalculated.pendingToReceive,
          pendingToPay: recalculated.pendingToPay,
        };
      } else {
        // If no valid reimbursements for this member, set pending amounts to 0
        return {
          ...balance,
          pendingToReceive: 0,
          pendingToPay: 0,
        };
      }
    });
  } catch (error) {
    console.error('Erreur dans getMemberBalances:', error);
    throw error;
  }
}

/**
 * Récupère toutes les demandes de remboursement en attente pour un groupe
 * @param groupId - ID du groupe familial
 * @returns Tableau des demandes de remboursement avec détails complets
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function getPendingReimbursements(
  groupId: string
): Promise<ReimbursementWithDetails[]> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est membre du groupe
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error(
        "Vous n'êtes pas membre de ce groupe ou le groupe n'existe pas"
      );
    }

    // Récupérer les demandes en attente avec les jointures
    // Note: La description, amount et date sont dans la table transactions, pas family_shared_transactions
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select(
        `
        *,
        from_member:family_members!reimbursement_requests_from_member_id_fkey(
          display_name,
          family_group_id
        ),
        to_member:family_members!reimbursement_requests_to_member_id_fkey(
          display_name,
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
      `
      )
      .eq('status', 'pending');

    if (error) {
      console.error(
        'Erreur lors de la récupération des remboursements:',
        error
      );
      throw new Error(
        `Erreur lors de la récupération des remboursements: ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    // Filtrer par groupe - utiliser shared_transaction.family_group_id comme source de vérité
    // car c'est la transaction partagée qui détermine le groupe, pas les membres individuels
    // IMPORTANT: Ne retourner que les remboursements où has_reimbursement_request = true
    const filteredData = data.filter((item: any) => {
      // Exclure les remboursements sans transaction partagée valide
      if (!item.shared_transaction) {
        return false;
      }
      
      // CRITICAL FIX: Exclure les remboursements où has_reimbursement_request = false
      // Si le flag est false, cela signifie que l'utilisateur a désactivé le toggle
      // et ces remboursements ne doivent plus apparaître dans la liste
      const hasReimbursementRequest = item.shared_transaction?.has_reimbursement_request;
      if (hasReimbursementRequest === false) {
        return false;
      }
      
      // Source principale: la transaction partagée doit appartenir au groupe
      const transactionGroupId = item.shared_transaction?.family_group_id;
      
      // Le remboursement doit appartenir au groupe cible via la transaction partagée
      // C'est la source de vérité car chaque transaction partagée appartient à un seul groupe
      if (transactionGroupId === groupId) {
        return true;
      }
      
      // Fallback: vérifier via family_group_id direct si présent dans reimbursement_requests
      const directGroupId = item.family_group_id;
      if (directGroupId === groupId) {
        return true;
      }
      
      // Si aucune correspondance, exclure
      return false;
    });

    // Mapper les résultats avec les détails
    return filteredData.map((item: any) => {
      const baseRequest = mapRowToReimbursementRequest(item);
      
      // Accéder aux données de transaction via le JOIN avec transactions
      // transactions peut être un objet ou un tableau selon la structure Supabase
      const transaction = item.shared_transaction?.transactions;
      const transactionData = Array.isArray(transaction) ? transaction[0] : transaction;
      
      return {
        ...baseRequest,
        fromMemberName:
          item.from_member?.display_name || 'Membre inconnu',
        toMemberName: item.to_member?.display_name || 'Membre inconnu',
        transactionDescription:
          transactionData?.description || null,
        transactionAmount: transactionData?.amount || null,
        transactionDate: transactionData?.date
          ? new Date(transactionData.date)
          : null,
        transactionCategory: transactionData?.category || null,
        reimbursementRate: item.percentage ?? 100,
      };
    });
  } catch (error) {
    console.error('Erreur dans getPendingReimbursements:', error);
    throw error;
  }
}

/**
 * Get reimbursement status for multiple transactions (OLD VERSION - kept for backward compatibility)
 * @param transactionIds - Array of transaction IDs to check
 * @param groupId - Family group ID
 * @returns Map of transactionId to status ('none' | 'pending' | 'settled')
 */
export async function getReimbursementStatusByTransactionIds_OLD(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementStatus>> {
  const result = new Map<string, ReimbursementStatus>();

  if (transactionIds.length === 0) {
    return result;
  }

  try {
    // Step 1: Get family_shared_transactions for these transaction IDs
    const { data: sharedTransactions, error: sharedError } = await supabase
      .from('family_shared_transactions')
      .select('id, transaction_id, paid_by, has_reimbursement_request')
      .eq('family_group_id', groupId)
      .in('transaction_id', transactionIds);

    if (sharedError) {
      console.error('Error fetching shared transactions:', sharedError);
      return result;
    }

    if (!sharedTransactions || sharedTransactions.length === 0) {
      // No shared transactions found, all are 'none'
      transactionIds.forEach(id => result.set(id, 'none'));
      return result;
    }

    // Create a map of shared_transaction_id to transaction_id
    const sharedToTransactionMap = new Map<string, string>();
    sharedTransactions.forEach(st => {
      if (st.transaction_id) {
        sharedToTransactionMap.set(st.id, st.transaction_id);
      }
    });

    const sharedTransactionIds = Array.from(sharedToTransactionMap.keys());

    // Step 2: Get reimbursement_requests for these shared transactions
    const { data: reimbursementRequests, error: reimbError } = await supabase
      .from('reimbursement_requests')
      .select('shared_transaction_id, status, from_member_id')
      .in('shared_transaction_id', sharedTransactionIds);

    if (reimbError) {
      console.error('Error fetching reimbursement requests:', reimbError);
      // Return 'none' for all transactions if query fails
      transactionIds.forEach(id => result.set(id, 'none'));
      return result;
    }

    // Group reimbursement requests by shared_transaction_id
    const requestsBySharedTransaction = new Map<string, string[]>();
    reimbursementRequests?.forEach(rr => {
      const existing = requestsBySharedTransaction.get(rr.shared_transaction_id) || [];
      existing.push(rr.status);
      requestsBySharedTransaction.set(rr.shared_transaction_id, existing);
    });

    // Determine status for each transaction
    transactionIds.forEach(transactionId => {
      // Find the shared_transaction_id for this transaction
      const sharedTx = sharedTransactions.find(st => st.transaction_id === transactionId);
      
      if (!sharedTx) {
        result.set(transactionId, 'none');
        return;
      }

      const statuses = requestsBySharedTransaction.get(sharedTx.id) || [];
      const reimbursementRequest = reimbursementRequests?.find(rr => rr.shared_transaction_id === sharedTx.id);
      
      let finalStatus: ReimbursementStatus;
      
      // Nouvelle logique basée sur has_reimbursement_request comme indicateur principal
      if (!sharedTx.has_reimbursement_request) {
        // Si has_reimbursement_request est FALSE → pas de demande de remboursement
        finalStatus = 'none';
      } else {
        // Si has_reimbursement_request est TRUE
        if (reimbursementRequest && reimbursementRequest.status === 'settled') {
          // Si reimbursement_request existe ET status = 'settled' → remboursé
          finalStatus = 'settled';
        } else {
          // Sinon → en attente (pending)
          // Cela inclut les cas où:
          // - has_reimbursement_request = true mais pas encore de reimbursement_request créé
          // - has_reimbursement_request = true et reimbursement_request.status = 'pending'
          finalStatus = 'pending';
        }
      }

      result.set(transactionId, finalStatus);
    });

    return result;
  } catch (err) {
    console.error('Error in getReimbursementStatusByTransactionIds_OLD:', err);
    return result;
  }
}

/**
 * Get reimbursement status for multiple transactions (backward compatibility wrapper)
 * @param transactionIds - Array of transaction IDs to check
 * @param groupId - Family group ID
 * @returns Map of transactionId to status ('none' | 'pending' | 'settled')
 */
export async function getReimbursementStatusByTransactionIds(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementStatus>> {
  return getReimbursementStatusByTransactionIds_OLD(transactionIds, groupId);
}

/**
 * Get reimbursement details (status, amount, rate, member names) for multiple transactions
 * @param transactionIds - Array of transaction IDs to check
 * @param groupId - Family group ID
 * @returns Map of transactionId to ReimbursementDetailForDisplay
 */
export async function getReimbursementDetailsByTransactionIds(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementDetailForDisplay>> {
  const result = new Map<string, ReimbursementDetailForDisplay>();

  if (!transactionIds.length || !groupId) {
    return result;
  }

  try {
    // Step 1: Get family_shared_transactions for these transaction IDs with transaction amount
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

    if (sharedError) {
      console.error('Error fetching shared transactions:', sharedError);
      return result;
    }

    if (!sharedTxs || sharedTxs.length === 0) {
      // No shared transactions found
      return result;
    }

    const sharedTxIds = sharedTxs.map(st => st.id);

    // Step 2: Get reimbursement requests with member names
    const { data: reimbursements, error: reimbError } = await supabase
      .from('reimbursement_requests')
      .select(`
        shared_transaction_id,
        amount,
        status,
        from_member:family_members!reimbursement_requests_from_member_id_fkey(
          display_name
        ),
        to_member:family_members!reimbursement_requests_to_member_id_fkey(
          display_name
        )
      `)
      .in('shared_transaction_id', sharedTxIds);

    if (reimbError) {
      console.error('Error fetching reimbursement requests:', reimbError);
      return result;
    }

    if (!reimbursements || reimbursements.length === 0) {
      return result;
    }

    // Step 3: Map shared_transaction_id to transaction_id and transaction amount
    const sharedTxMap = new Map<string, { transactionId: string; transactionAmount: number }>();
    sharedTxs.forEach(st => {
      if (st.transaction_id) {
        const transaction = (st as any).transactions;
        const transactionAmount = transaction 
          ? Math.abs(Array.isArray(transaction) ? transaction[0]?.amount || 0 : transaction?.amount || 0)
          : 0;
        sharedTxMap.set(st.id, {
          transactionId: st.transaction_id,
          transactionAmount: transactionAmount,
        });
      }
    });

    // Step 4: Build result map
    for (const reimb of reimbursements) {
      const sharedInfo = sharedTxMap.get((reimb as any).shared_transaction_id);
      if (!sharedInfo?.transactionId) {
        continue;
      }

      const transactionAmount = sharedInfo.transactionAmount;
      const reimbAmount = (reimb as any).amount || 0;
      const rate = transactionAmount > 0
        ? Math.round((reimbAmount / transactionAmount) * 100)
        : 100;

      const fromMember = (reimb as any).from_member;
      const toMember = (reimb as any).to_member;

      result.set(sharedInfo.transactionId, {
        status: (reimb as any).status as ReimbursementStatus,
        amount: reimbAmount,
        rate: rate,
        fromMemberName: Array.isArray(fromMember)
          ? (fromMember[0]?.display_name || 'Membre')
          : (fromMember?.display_name || 'Membre'),
        toMemberName: Array.isArray(toMember)
          ? (toMember[0]?.display_name || 'Membre')
          : (toMember?.display_name || 'Membre'),
      });
    }

    return result;
  } catch (error) {
    console.error('Error in getReimbursementDetailsByTransactionIds:', error);
    return result;
  }
}

/**
 * Marque une demande de remboursement comme réglée
 * Seul le créancier (to_member) peut marquer comme réglé
 * @param reimbursementId - ID de la demande de remboursement
 * @param userId - ID de l'utilisateur qui effectue l'action
 * @throws Error si l'utilisateur n'est pas autorisé ou en cas d'erreur
 */
export async function markAsReimbursed(
  reimbursementId: string,
  userId: string
): Promise<void> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    if (user.id !== userId) {
      throw new Error(
        "L'ID utilisateur ne correspond pas à l'utilisateur authentifié"
      );
    }

    // Récupérer la demande de remboursement
    const { data: reimbursement, error: fetchError } = await supabase
      .from('reimbursement_requests')
      .select('*, to_member:family_members!reimbursement_requests_to_member_id_fkey(user_id)')
      .eq('id', reimbursementId)
      .single();

    if (fetchError || !reimbursement) {
      throw new Error('Demande de remboursement introuvable');
    }

    // Récupérer le to_member_id (créancier)
    const toMemberId = (reimbursement as any).to_member_id;
    
    if (!toMemberId) {
      throw new Error('Impossible de déterminer le créancier de cette demande');
    }

    // Récupérer le user_id du membre créancier
    const { data: toMember, error: memberError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('id', toMemberId)
      .single();

    if (memberError || !toMember) {
      throw new Error('Membre créancier introuvable');
    }

    // Vérifier que l'utilisateur est le créancier (to_member)
    if (toMember.user_id !== user.id) {
      throw new Error(
        'Seul le créancier peut marquer une demande de remboursement comme réglée'
      );
    }

    // Vérifier que le statut est 'pending'
    if (reimbursement.status !== 'pending') {
      throw new Error(
        'Seules les demandes en attente peuvent être marquées comme réglées'
      );
    }

    // Mettre à jour le statut
    const updateData: any = {
      status: 'settled',
      updated_at: new Date().toISOString(),
    };

    // Ajouter settled_at et settled_by si les colonnes existent
    if ('settled_at' in reimbursement || reimbursement.settled_at !== undefined) {
      updateData.settled_at = new Date().toISOString();
    }
    if ('settled_by' in reimbursement || reimbursement.settled_by !== undefined) {
      updateData.settled_by = user.id;
    }

    const { error: updateError } = await supabase
      .from('reimbursement_requests')
      .update(updateData)
      .eq('id', reimbursementId);

    if (updateError) {
      console.error(
        'Erreur lors de la mise à jour du remboursement:',
        updateError
      );
      throw new Error(
        `Erreur lors de la mise à jour: ${updateError.message}`
      );
    }

    // ========================================================================
    // TRANSFERT AUTOMATIQUE DE PROPRIÉTÉ DE TRANSACTION APRÈS SETTLEMENT
    // ========================================================================
    // Après qu'un remboursement soit marqué comme "settled", transférer
    // automatiquement la propriété de la transaction du créancier (paiement
    // original) vers le débiteur (qui rembourse).
    try {
      // 1. Récupérer le transaction_id depuis family_shared_transactions
      //    en utilisant shared_transaction_id de la demande de remboursement
      const sharedTransactionId = (reimbursement as any).shared_transaction_id;
      
      if (!sharedTransactionId) {
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] shared_transaction_id manquant dans la demande de remboursement'
        );
        return; // Sortir silencieusement si pas de transaction partagée
      }

      const { data: sharedTransaction, error: sharedTxError } = await supabase
        .from('family_shared_transactions')
        .select('transaction_id')
        .eq('id', sharedTransactionId)
        .single();

      if (sharedTxError || !sharedTransaction) {
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] Impossible de récupérer la transaction partagée:',
          sharedTxError?.message || 'Transaction introuvable'
        );
        return; // Ne pas faire échouer le settlement
      }

      const transactionId = sharedTransaction.transaction_id;
      
      if (!transactionId) {
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] transaction_id manquant dans la transaction partagée'
        );
        return; // Ne pas faire échouer le settlement
      }

      // 2. Récupérer le user_id du débiteur (from_member_id) depuis family_members
      const fromMemberId = (reimbursement as any).from_member_id;
      
      if (!fromMemberId) {
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] from_member_id manquant dans la demande de remboursement'
        );
        return; // Ne pas faire échouer le settlement
      }

      const { data: debtorMember, error: debtorError } = await supabase
        .from('family_members')
        .select('user_id')
        .eq('id', fromMemberId)
        .single();

      if (debtorError || !debtorMember || !debtorMember.user_id) {
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] Impossible de récupérer le user_id du débiteur:',
          debtorError?.message || 'Membre débiteur introuvable'
        );
        return; // Ne pas faire échouer le settlement
      }

      const debtorUserId = debtorMember.user_id;
      const creditorUserId = user.id; // Le créancier est l'utilisateur actuel qui marque comme réglé

      // 3. Mettre à jour la table transactions avec le transfert de propriété
      //    - current_owner_id = user_id du débiteur (nouveau propriétaire)
      //    - original_owner_id = user_id du créancier (propriétaire original)
      //    - transferred_at = NOW()
      const { error: transferError } = await supabase
        .from('transactions')
        .update({
          current_owner_id: debtorUserId,
          original_owner_id: creditorUserId,
          transferred_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      if (transferError) {
        // Logger l'erreur mais ne pas faire échouer le settlement
        console.warn(
          '[TRANSFERT PROPRIÉTÉ] Erreur lors du transfert de propriété:',
          transferError.message,
          'Transaction ID:',
          transactionId
        );
        // Ne pas throw - le settlement a réussi, le transfert est secondaire
      } else {
        console.log(
          '[TRANSFERT PROPRIÉTÉ] Propriété transférée avec succès:',
          {
            transactionId,
            fromOwner: creditorUserId,
            toOwner: debtorUserId,
          }
        );
      }
    } catch (transferException) {
      // Capturer toute exception inattendue et logger sans faire échouer le settlement
      console.warn(
        '[TRANSFERT PROPRIÉTÉ] Exception lors du transfert de propriété:',
        transferException
      );
      // Ne pas throw - le settlement a réussi
    }
  } catch (error) {
    console.error('Erreur dans markAsReimbursed:', error);
    throw error;
  }
}

/**
 * Crée une nouvelle demande de remboursement
 * @param data - Données pour créer la demande
 * @returns La demande de remboursement créée
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function createReimbursementRequest(
  data: CreateReimbursementData
): Promise<ReimbursementRequest> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer le groupe familial depuis la transaction partagée
    const { data: sharedTransaction, error: transactionError } =
      await supabase
        .from('family_shared_transactions')
        .select('family_group_id')
        .eq('id', data.sharedTransactionId)
        .single();

    if (transactionError || !sharedTransaction) {
      throw new Error('Transaction partagée introuvable');
    }

    // Vérifier que l'utilisateur est membre du groupe
    const { data: membership, error: membershipError } = await supabase
      .from('family_members')
      .select('id')
      .eq('family_group_id', sharedTransaction.family_group_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error(
        "Vous n'êtes pas membre du groupe de cette transaction"
      );
    }

    // Vérifier que from_member_id et to_member_id sont des membres du groupe
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

    // Créer la demande de remboursement
    const { data: created, error: createError } = await supabase
      .from('reimbursement_requests')
      .insert({
        shared_transaction_id: data.sharedTransactionId,
        from_member_id: data.fromMemberId,
        to_member_id: data.toMemberId,
        amount: data.amount,
        currency: data.currency,
        status: 'pending',
        notes: data.note || null,
        // Si la table utilise family_group_id, l'ajouter
        ...(sharedTransaction.family_group_id && {
          family_group_id: sharedTransaction.family_group_id,
        }),
      } as any)
      .select()
      .single();

    if (createError) {
      console.error(
        'Erreur lors de la création de la demande:',
        createError
      );
      throw new Error(
        `Erreur lors de la création: ${createError.message}`
      );
    }

    if (!created) {
      throw new Error(
        'Erreur lors de la création: aucune donnée retournée'
      );
    }

    return mapRowToReimbursementRequest(created);
  } catch (error) {
    console.error('Erreur dans createReimbursementRequest:', error);
    throw error;
  }
}

/**
 * Récupère toutes les demandes de remboursement pour un membre
 * (en tant que débiteur ou créancier)
 * @param memberId - ID du membre (family_members.id)
 * @returns Tableau des demandes de remboursement
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function getReimbursementsByMember(
  memberId: string
): Promise<ReimbursementRequest[]> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que le membre existe et appartient à l'utilisateur
    const { data: member, error: memberError } = await supabase
      .from('family_members')
      .select('id, user_id')
      .eq('id', memberId)
      .single();

    if (memberError || !member) {
      throw new Error('Membre introuvable');
    }

    // Vérifier que l'utilisateur est bien le propriétaire du membre
    if (member.user_id !== user.id) {
      throw new Error(
        "Vous n'êtes pas autorisé à consulter les remboursements de ce membre"
      );
    }

    // Récupérer les demandes où le membre est débiteur ou créancier
    const { data, error } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        'Erreur lors de la récupération des remboursements:',
        error
      );
      throw new Error(
        `Erreur lors de la récupération: ${error.message}`
      );
    }

    if (!data) {
      return [];
    }

    return data.map(mapRowToReimbursementRequest);
  } catch (error) {
    console.error('Erreur dans getReimbursementsByMember:', error);
    throw error;
  }
}

// ============================================================================
// PAYMENT ALLOCATION FUNCTIONS (Phase 1)
// ============================================================================

/**
 * Enregistre un paiement de remboursement avec allocation FIFO automatique
 * 
 * Algorithme FIFO (First In First Out):
 * - Trie les demandes en attente par date de création (plus ancienne en premier)
 * - Alloue le paiement séquentiellement jusqu'à épuisement
 * - Met à jour le statut des demandes (settled si complètement payée, pending avec montant réduit si partielle)
 * - Détecte le surplus et crée/met à jour un solde de crédit (acompte)
 * 
 * @param fromMemberId - ID du membre débiteur (qui paie)
 * @param toMemberId - ID du membre créancier (qui reçoit)
 * @param amount - Montant total du paiement
 * @param notes - Notes optionnelles sur le paiement
 * @param groupId - ID du groupe familial (optionnel, peut être inféré)
 * @returns Résultat de l'allocation avec détails
 * @throws Error si l'utilisateur n'est pas authentifié, montant invalide, ou erreur de base de données
 */
export async function recordReimbursementPayment(
  fromMemberId: string,
  toMemberId: string,
  amount: number,
  notes?: string,
  groupId?: string
): Promise<PaymentAllocationResult> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Validation du montant
    if (amount <= 0) {
      throw new Error('Le montant du paiement doit être supérieur à zéro');
    }

    // Récupérer les informations des membres et valider qu'ils appartiennent au même groupe
    const { data: fromMember, error: fromMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id, user_id, display_name')
      .eq('id', fromMemberId)
      .single();

    if (fromMemberError || !fromMember) {
      throw new Error('Membre débiteur introuvable');
    }

    const { data: toMember, error: toMemberError } = await supabase
      .from('family_members')
      .select('id, family_group_id, user_id, display_name')
      .eq('id', toMemberId)
      .single();

    if (toMemberError || !toMember) {
      throw new Error('Membre créancier introuvable');
    }

    // Déterminer le groupId si non fourni
    const finalGroupId = groupId || fromMember.family_group_id;
    if (!finalGroupId) {
      throw new Error('Impossible de déterminer le groupe familial');
    }

    // Vérifier que les deux membres appartiennent au même groupe
    if (fromMember.family_group_id !== toMember.family_group_id || fromMember.family_group_id !== finalGroupId) {
      throw new Error('Les membres doivent appartenir au même groupe familial');
    }

    // Vérifier que l'utilisateur est membre du groupe
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

    // Récupérer les demandes de remboursement en attente (FIFO: triées par date de création ASC)
    const { data: pendingRequests, error: requestsError } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .eq('from_member_id', fromMemberId)
      .eq('to_member_id', toMemberId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true }); // FIFO: plus ancienne en premier

    if (requestsError) {
      console.error('Erreur lors de la récupération des demandes en attente:', requestsError);
      throw new Error(`Erreur lors de la récupération des demandes: ${requestsError.message}`);
    }

    const requests = pendingRequests || [];

    // ALGORITHME FIFO: Allouer le paiement aux demandes les plus anciennes en premier
    let remainingPayment = amount;
    const allocations: PaymentAllocation[] = [];
    const remainingBalances: RemainingBalance[] = [];

    for (const request of requests) {
      if (remainingPayment <= 0) {
        break; // Plus de paiement à allouer
      }

      const requestAmount = request.amount || 0;
      const allocatedToThisRequest = Math.min(remainingPayment, requestAmount);
      const remainingInRequest = requestAmount - allocatedToThisRequest;
      const isFullyPaid = allocatedToThisRequest >= requestAmount;

      allocations.push({
        reimbursementRequestId: request.id,
        allocatedAmount: allocatedToThisRequest,
        requestAmount: requestAmount,
        remainingAmount: remainingInRequest,
        isFullyPaid: isFullyPaid,
      });

      remainingBalances.push({
        reimbursementRequestId: request.id,
        remainingAmount: remainingInRequest,
        status: isFullyPaid ? 'settled' : 'pending',
      });

      remainingPayment -= allocatedToThisRequest;
    }

    const allocatedAmount = amount - remainingPayment;
    const surplusAmount = remainingPayment; // Le reste après allocation

    // Créer l'enregistrement de paiement
    const { data: payment, error: paymentError } = await supabase
      .from('reimbursement_payments')
      .insert({
        family_group_id: finalGroupId,
        from_member_id: fromMemberId,
        to_member_id: toMemberId,
        total_amount: amount,
        allocated_amount: allocatedAmount,
        surplus_amount: surplusAmount,
        currency: 'MGA', // TODO: Récupérer depuis la première demande ou paramètre
        notes: notes || null,
        created_by: user.id,
      } as any)
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Erreur lors de la création du paiement:', paymentError);
      throw new Error(`Erreur lors de la création du paiement: ${paymentError?.message || 'Aucune donnée retournée'}`);
    }

    const paymentId = payment.id;

    // Créer les allocations de paiement
    if (allocations.length > 0) {
      const allocationInserts = allocations.map(allocation => ({
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
        console.error('Erreur lors de la création des allocations:', allocationsError);
        // Rollback: supprimer le paiement créé
        await supabase.from('reimbursement_payments').delete().eq('id', paymentId);
        throw new Error(`Erreur lors de la création des allocations: ${allocationsError.message}`);
      }

      // Mettre à jour les statuts des demandes de remboursement
      for (const allocation of allocations) {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };

        if (allocation.isFullyPaid) {
          // Demande complètement payée: marquer comme settled
          updateData.status = 'settled';
          updateData.settled_at = new Date().toISOString();
          updateData.settled_by = user.id;
        } else {
          // Demande partiellement payée: réduire le montant et garder pending
          updateData.amount = allocation.remainingAmount;
        }

        const { error: updateError } = await supabase
          .from('reimbursement_requests')
          .update(updateData)
          .eq('id', allocation.reimbursementRequestId);

        if (updateError) {
          console.error(`Erreur lors de la mise à jour de la demande ${allocation.reimbursementRequestId}:`, updateError);
          // Continuer avec les autres demandes même en cas d'erreur
        }
      }
    }

    // Gérer le surplus: créer ou mettre à jour le solde de crédit
    let creditBalanceId: string | undefined;
    let creditBalanceCreated = false;

    if (surplusAmount > 0) {
      // Vérifier si un solde de crédit existe déjà
      const { data: existingCredit, error: creditCheckError } = await supabase
        .from('member_credit_balance')
        .select('id, credit_amount')
        .eq('family_group_id', finalGroupId)
        .eq('from_member_id', fromMemberId)
        .eq('to_member_id', toMemberId)
        .single();

      if (creditCheckError && creditCheckError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, ce qui est normal si le solde n'existe pas encore
        console.error('Erreur lors de la vérification du solde de crédit:', creditCheckError);
        // Ne pas faire échouer le paiement si la vérification échoue
      }

      if (existingCredit) {
        // Mettre à jour le solde existant
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
          console.error('Erreur lors de la mise à jour du solde de crédit:', updateCreditError);
          // Ne pas faire échouer le paiement si la mise à jour du crédit échoue
        } else {
          creditBalanceId = updatedCredit?.id;
          creditBalanceCreated = true;
        }
      } else {
        // Créer un nouveau solde de crédit
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
          // Ne pas faire échouer le paiement si la création du crédit échoue
        } else {
          creditBalanceId = newCredit?.id;
          creditBalanceCreated = true;
        }
      }
    }

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
    console.error('Erreur dans recordReimbursementPayment:', error);
    throw error;
  }
}

/**
 * Récupère l'historique des paiements de remboursement avec filtres et pagination
 * 
 * @param groupId - ID du groupe familial
 * @param options - Options de filtrage et pagination
 * @returns Tableau des entrées d'historique de paiement
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
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
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est membre du groupe
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

    // Construire la requête avec filtres
    let query = supabase
      .from('reimbursement_payments')
      .select(`
        *,
        from_member:family_members!reimbursement_payments_from_member_id_fkey(
          display_name
        ),
        to_member:family_members!reimbursement_payments_to_member_id_fkey(
          display_name
        )
      `)
      .eq('family_group_id', groupId);

    // Appliquer les filtres
    if (options?.fromMemberId) {
      query = query.eq('from_member_id', options.fromMemberId);
    }
    if (options?.toMemberId) {
      query = query.eq('to_member_id', options.toMemberId);
    }
    if (options?.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    // Trier par date de création (plus récent en premier)
    query = query.order('created_at', { ascending: false });

    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }

    const { data: payments, error: paymentsError } = await query;

    if (paymentsError) {
      console.error('Erreur lors de la récupération de l\'historique des paiements:', paymentsError);
      throw new Error(`Erreur lors de la récupération: ${paymentsError.message}`);
    }

    if (!payments || payments.length === 0) {
      return [];
    }

    // Récupérer les allocations pour chaque paiement
    const paymentIds = payments.map((p: any) => p.id);
    const { data: allocations, error: allocationsError } = await supabase
      .from('reimbursement_payment_allocations')
      .select(`
        *,
        reimbursement_request:reimbursement_requests(
          shared_transaction:family_shared_transactions(
            transactions(
              description
            )
          )
        )
      `)
      .in('payment_id', paymentIds);

    if (allocationsError) {
      console.error('Erreur lors de la récupération des allocations:', allocationsError);
      // Continuer sans allocations plutôt que de faire échouer
    }

    // Grouper les allocations par payment_id
    const allocationsByPayment = new Map<string, any[]>();
    (allocations || []).forEach((alloc: any) => {
      const paymentId = alloc.payment_id;
      const existing = allocationsByPayment.get(paymentId) || [];
      existing.push(alloc);
      allocationsByPayment.set(paymentId, existing);
    });

    // Mapper les résultats
    return payments.map((payment: any) => {
      const paymentAllocations = allocationsByPayment.get(payment.id) || [];
      
      const allocationDetails: PaymentAllocationDetail[] = paymentAllocations.map((alloc: any) => {
        // Extraire la description de la transaction
        const sharedTransaction = alloc.reimbursement_request?.shared_transaction;
        const transaction = Array.isArray(sharedTransaction?.transactions)
          ? sharedTransaction.transactions[0]
          : sharedTransaction?.transactions;
        const description = transaction?.description || 'Transaction sans description';

        return {
          reimbursementRequestId: alloc.reimbursement_request_id,
          requestDescription: description,
          allocatedAmount: alloc.allocated_amount || 0,
          requestAmount: alloc.request_amount || 0,
          remainingAmount: alloc.remaining_amount || 0,
          isFullyPaid: alloc.is_fully_paid || false,
        };
      });

      const fromMember = Array.isArray(payment.from_member) ? payment.from_member[0] : payment.from_member;
      const toMember = Array.isArray(payment.to_member) ? payment.to_member[0] : payment.to_member;

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
    console.error('Erreur dans getPaymentHistory:', error);
    throw error;
  }
}

/**
 * Récupère le solde de crédit (acompte) entre deux membres
 * 
 * @param fromMemberId - ID du membre débiteur
 * @param toMemberId - ID du membre créancier
 * @param groupId - ID du groupe familial
 * @returns Solde de crédit ou null si aucun solde n'existe
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function getMemberCreditBalance(
  fromMemberId: string,
  toMemberId: string,
  groupId: string
): Promise<MemberCreditBalance | null> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Vérifier que l'utilisateur est membre du groupe
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

    // Récupérer le solde de crédit avec les noms des membres
    const { data: creditBalance, error: creditError } = await supabase
      .from('member_credit_balance')
      .select(`
        *,
        from_member:family_members!member_credit_balance_from_member_id_fkey(
          display_name
        ),
        to_member:family_members!member_credit_balance_to_member_id_fkey(
          display_name
        )
      `)
      .eq('family_group_id', groupId)
      .eq('from_member_id', fromMemberId)
      .eq('to_member_id', toMemberId)
      .single();

    if (creditError) {
      if (creditError.code === 'PGRST116') {
        // Aucune ligne trouvée, ce qui est normal
        return null;
      }
      console.error('Erreur lors de la récupération du solde de crédit:', creditError);
      throw new Error(`Erreur lors de la récupération: ${creditError.message}`);
    }

    if (!creditBalance) {
      return null;
    }

    const fromMember = Array.isArray(creditBalance.from_member) ? creditBalance.from_member[0] : creditBalance.from_member;
    const toMember = Array.isArray(creditBalance.to_member) ? creditBalance.to_member[0] : creditBalance.to_member;

    return {
      id: creditBalance.id,
      fromMemberId: creditBalance.from_member_id,
      fromMemberName: fromMember?.display_name || 'Membre inconnu',
      toMemberId: creditBalance.to_member_id,
      toMemberName: toMember?.display_name || 'Membre inconnu',
      creditAmount: creditBalance.credit_amount || 0,
      createdAt: new Date(creditBalance.created_at),
      updatedAt: new Date(creditBalance.updated_at),
      lastPaymentDate: creditBalance.last_payment_date ? new Date(creditBalance.last_payment_date) : undefined,
    };
  } catch (error) {
    console.error('Erreur dans getMemberCreditBalance:', error);
    throw error;
  }
}

/**
 * Récupère les détails complets d'une allocation de paiement spécifique
 * 
 * @param paymentId - ID du paiement
 * @returns Détails complets du paiement ou null si non trouvé
 * @throws Error si l'utilisateur n'est pas authentifié ou en cas d'erreur
 */
export async function getAllocationDetails(
  paymentId: string
): Promise<PaymentAllocationDetails | null> {
  try {
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Récupérer le paiement avec les informations des membres
    const { data: payment, error: paymentError } = await supabase
      .from('reimbursement_payments')
      .select(`
        *,
        from_member:family_members!reimbursement_payments_from_member_id_fkey(
          display_name
        ),
        to_member:family_members!reimbursement_payments_to_member_id_fkey(
          display_name
        )
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError) {
      if (paymentError.code === 'PGRST116') {
        return null; // Paiement non trouvé
      }
      console.error('Erreur lors de la récupération du paiement:', paymentError);
      throw new Error(`Erreur lors de la récupération: ${paymentError.message}`);
    }

    if (!payment) {
      return null;
    }

    // Vérifier que l'utilisateur est membre du groupe
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

    // Récupérer les allocations avec les détails des demandes
    const { data: allocations, error: allocationsError } = await supabase
      .from('reimbursement_payment_allocations')
      .select(`
        *,
        reimbursement_request:reimbursement_requests(
          *,
          shared_transaction:family_shared_transactions(
            transactions(
              description
            )
          )
        )
      `)
      .eq('payment_id', paymentId);

    if (allocationsError) {
      console.error('Erreur lors de la récupération des allocations:', allocationsError);
      throw new Error(`Erreur lors de la récupération des allocations: ${allocationsError.message}`);
    }

    // Mapper les allocations avec les détails
    const allocationDetails: PaymentAllocationDetail[] = (allocations || []).map((alloc: any) => {
      const sharedTransaction = alloc.reimbursement_request?.shared_transaction;
      const transaction = Array.isArray(sharedTransaction?.transactions)
        ? sharedTransaction.transactions[0]
        : sharedTransaction?.transactions;
      const description = transaction?.description || 'Transaction sans description';

      return {
        reimbursementRequestId: alloc.reimbursement_request_id,
        requestDescription: description,
        allocatedAmount: alloc.allocated_amount || 0,
        requestAmount: alloc.request_amount || 0,
        remainingAmount: alloc.remaining_amount || 0,
        isFullyPaid: alloc.is_fully_paid || false,
      };
    });

    // Récupérer les demandes de remboursement liées
    const requestIds = allocationDetails.map(a => a.reimbursementRequestId);
    const { data: requests, error: requestsError } = await supabase
      .from('reimbursement_requests')
      .select('*')
      .in('id', requestIds);

    const relatedRequests = requests ? requests.map(mapRowToReimbursementRequest) : [];

    // Récupérer le solde de crédit si un surplus existe
    let creditBalance: MemberCreditBalance | undefined;
    if (payment.surplus_amount > 0) {
      const credit = await getMemberCreditBalance(
        payment.from_member_id,
        payment.to_member_id,
        payment.family_group_id
      );
      creditBalance = credit || undefined;
    }

    const fromMember = Array.isArray(payment.from_member) ? payment.from_member[0] : payment.from_member;
    const toMember = Array.isArray(payment.to_member) ? payment.to_member[0] : payment.to_member;

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
    console.error('Erreur dans getAllocationDetails:', error);
    throw error;
  }
}
