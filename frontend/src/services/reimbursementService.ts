/**
 * Service de gestion des remboursements familiaux
 * Gère les demandes de remboursement et les soldes entre membres
 */

import { supabase } from '../lib/supabase';
import type {
  ReimbursementRequest,
  ReimbursementRequestRow,
  FamilyMemberBalanceRow,
  ReimbursementStatus as ReimbursementRequestStatus,
} from '../types/family';

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
  reimbursementRate: number | null; // Taux de remboursement (25, 50, 75, 100 ou null)
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
// FONCTIONS DE CONVERSION
// ============================================================================

/**
 * Convertit une ligne Supabase (snake_case) vers FamilyMemberBalance (camelCase)
 */
function mapRowToFamilyMemberBalance(
  row: FamilyMemberBalanceRow
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
            date
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
        reimbursementRate: item.percentage ?? 100,
      };
    });
  } catch (error) {
    console.error('Erreur dans getPendingReimbursements:', error);
    throw error;
  }
}

/**
 * Get reimbursement status for multiple transactions
 * @param transactionIds - Array of transaction IDs to check
 * @param groupId - Family group ID
 * @returns Map of transactionId to status ('none' | 'pending' | 'settled')
 */
export async function getReimbursementStatusByTransactionIds(
  transactionIds: string[],
  groupId: string
): Promise<Map<string, ReimbursementStatus>> {
  console.log('[REIMBURSEMENT STATUSES DEBUG] Service called with:', {
    transactionIdsCount: transactionIds.length,
    transactionIds: transactionIds,
    groupId: groupId
  });

  const result = new Map<string, ReimbursementStatus>();

  if (transactionIds.length === 0) {
    console.log('[REIMBURSEMENT STATUSES DEBUG] No transaction IDs provided, returning empty Map');
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

    console.log('[REIMBURSEMENT STATUS DETAIL] Shared transactions from DB:', sharedTransactions?.map(st => ({ 
      transactionId: st.transaction_id, 
      paidBy: st.paid_by, 
      requestReimbursement: st.has_reimbursement_request 
    })));

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

    console.log('[REIMBURSEMENT STATUS DETAIL] Reimbursement requests from DB:', reimbursementRequests?.map(rr => ({ 
      transactionId: sharedToTransactionMap.get(rr.shared_transaction_id) || 'unknown', 
      status: rr.status, 
      debtorId: rr.from_member_id 
    })));

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

      console.log('[REIMBURSEMENT STATUS DETAIL] Processing transaction:', { 
        transactionId, 
        hasSharedTx: !!sharedTx, 
        requestReimbursement: sharedTx?.has_reimbursement_request, 
        hasReimbursementRequest: !!reimbursementRequest, 
        reimbursementStatus: reimbursementRequest?.status, 
        statusesArray: statuses,
        finalStatus: finalStatus 
      });

      result.set(transactionId, finalStatus);
    });

    console.log('[REIMBURSEMENT STATUSES DEBUG] Service returning Map:', {
      resultSize: result.size,
      resultEntries: Array.from(result.entries()),
      sharedTransactionsFound: sharedTransactions?.length || 0,
      reimbursementRequestsFound: reimbursementRequests?.length || 0
    });

    return result;
  } catch (err) {
    console.error('Error in getReimbursementStatusByTransactionIds:', err);
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

