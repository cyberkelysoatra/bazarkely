/**
 * Service de partage de transactions dans l'espace famille
 * Gère le partage de transactions, les règles de partage automatique et les transactions récurrentes partagées
 */

import { supabase } from '../lib/supabase';
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
      .eq('family_group_id', input.familyGroupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError || !membership) {
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Si une transaction est fournie, vérifier qu'elle appartient à l'utilisateur
    if (input.transactionId) {
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .select('user_id')
        .eq('id', input.transactionId)
        .single();

      if (transactionError || !transaction) {
        throw new Error('Transaction non trouvée');
      }

      if ((transaction as any).user_id !== user.id) {
        throw new Error('Vous n\'êtes pas propriétaire de cette transaction');
      }
    }

    // Vérifier que la transaction n'est pas déjà partagée
    if (input.transactionId) {
      const { data: existingShare, error: checkError } = await supabase
        .from('family_shared_transactions')
        .select('id')
        .eq('transaction_id', input.transactionId)
        .eq('family_group_id', input.familyGroupId)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }

      if (existingShare) {
        throw new Error('Cette transaction est déjà partagée dans ce groupe');
      }
    }

    // Créer la transaction partagée
    // Note: family_shared_transactions ne contient que les colonnes de référence
    // Les données de transaction (description, amount, category, date) viennent de la table transactions via JOIN
    const { data: sharedTransaction, error: insertError } = await supabase
      .from('family_shared_transactions')
      .insert({
        family_group_id: input.familyGroupId,
        transaction_id: input.transactionId || null,
        shared_by: user.id,
        paid_by: input.paidBy || user.id, // Utiliser paidBy ou fallback sur shared_by (user.id)
        is_private: false, // Par défaut, la transaction n'est pas privée
        split_type: input.splitType,
        split_details: input.splitDetails && input.splitDetails.length > 0 
          ? (input.splitDetails as any) // JSONB
          : null,
        has_reimbursement_request: false, // Par défaut, pas de demande de remboursement
      } as any)
      .select()
      .single();

    if (insertError || !sharedTransaction) {
      throw new Error(
        `Erreur lors du partage de la transaction: ${insertError?.message || 'Erreur inconnue'}`
      );
    }

    // Récupérer la transaction partagée avec les données de transaction jointes
    // car family_shared_transactions ne contient que les références
    const sharedTransactionId = (sharedTransaction as any).id;
    const { data: sharedTransactionWithDetails, error: fetchError } = await supabase
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
      .eq('id', sharedTransactionId)
      .single();

    if (fetchError || !sharedTransactionWithDetails) {
      // Si le JOIN échoue, retourner quand même la transaction partagée de base
      // Le mapping gérera les valeurs manquantes
      return mapRowToFamilySharedTransaction(sharedTransaction as FamilySharedTransactionRow);
    }

    // Utiliser les données jointes pour le mapping
    const row = sharedTransactionWithDetails as any;
    const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

    // Si une transaction est jointe, utiliser ses données
    if (row.transactions) {
      const transaction = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
      if (transaction) {
        baseTransaction.description = transaction.description || '';
        baseTransaction.amount = transaction.amount || 0;
        baseTransaction.category = transaction.category || '';
        baseTransaction.date = new Date(transaction.date);
        baseTransaction.transaction = {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          date: new Date(transaction.date),
          type: transaction.type,
        } as any;
      }
    }

    return baseTransaction;
  } catch (error) {
    console.error('Erreur dans shareTransaction:', error);
    throw error;
  }
}

/**
 * Retire le partage d'une transaction
 * @param sharedTransactionId - ID de la transaction partagée
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function unshareTransaction(sharedTransactionId: string): Promise<void> {
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
      .eq('id', sharedTransactionId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Erreur lors de la vérification: ${fetchError.message}`);
    }

    if (!sharedTransaction) {
      throw new Error('Transaction partagée non trouvée');
    }

    if ((sharedTransaction as any).shared_by !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à retirer ce partage');
    }

    // Supprimer les demandes de remboursement associées AVANT de supprimer la transaction partagée
    const { error: deleteReimbursementsError } = await supabase
      .from('reimbursement_requests')
      .delete()
      .eq('shared_transaction_id', sharedTransactionId)
      .select();

    if (deleteReimbursementsError) {
      console.error(
        '❌ Erreur lors de la suppression des demandes de remboursement:',
        deleteReimbursementsError
      );
      throw new Error(
        `Impossible de supprimer les demandes de remboursement associées: ${deleteReimbursementsError.message}`
      );
    }

    console.log(
      `✅ Demandes de remboursement supprimées pour la transaction partagée: ${sharedTransactionId}`
    );

    // Supprimer la transaction partagée
    const { error: deleteError } = await supabase
      .from('family_shared_transactions')
      .delete()
      .eq('id', sharedTransactionId)
      .select();

    if (deleteError) {
      throw new Error(`Erreur lors du retrait du partage: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans unshareTransaction:', error);
    throw error;
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Construire la requête avec JOIN sur transactions
    let query = supabase
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
      .eq('family_group_id', groupId);

    // Filtrer les transactions privées (sauf si partagées par l'utilisateur actuel)
    // Note: Si is_private n'existe pas dans la table, cette partie sera ignorée
    // query = query.or(`is_private.eq.false,shared_by.eq.${user.id}`);

    // Filtrer par date si fourni
    if (options?.startDate) {
      query = query.gte('shared_at', options.startDate.toISOString());
    }
    if (options?.endDate) {
      query = query.lte('shared_at', options.endDate.toISOString());
    }

    // Trier par date de partage décroissante (shared_at)
    query = query.order('shared_at', { ascending: false });

    // Pagination
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    }

    const { data: sharedTransactions, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
    }

    if (!sharedTransactions || sharedTransactions.length === 0) {
      return [];
    }

    // Convertir les données avec les détails de transaction jointes
    const result: FamilySharedTransaction[] = (sharedTransactions as any[]).map((row: any) => {
      const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

      // Extraire les données de transaction jointes
      let transactionData: any = null;
      
      if (row.transactions) {
        // Gérer les deux formats possibles : tableau ou objet
        if (Array.isArray(row.transactions) && row.transactions.length > 0) {
          transactionData = row.transactions[0];
        } else if (!Array.isArray(row.transactions) && typeof row.transactions === 'object') {
          transactionData = row.transactions;
        }
      }

      // Si une transaction est jointe, utiliser ses données
      if (transactionData) {
        // Toujours utiliser les données de transaction si disponibles, même si vides
        baseTransaction.description = transactionData.description || baseTransaction.description || 'Sans description';
        baseTransaction.amount = transactionData.amount !== null && transactionData.amount !== undefined 
          ? transactionData.amount 
          : (baseTransaction.amount ?? 0);
        baseTransaction.category = transactionData.category || baseTransaction.category || 'autre';
        
        // Utiliser la date de la transaction si disponible, sinon celle du partage
        if (transactionData.date) {
          baseTransaction.date = new Date(transactionData.date);
        }

        // Stocker la transaction complète
        baseTransaction.transaction = {
          id: transactionData.id,
          description: transactionData.description || 'Sans description',
          amount: transactionData.amount ?? 0,
          category: transactionData.category || 'autre',
          date: transactionData.date ? new Date(transactionData.date) : baseTransaction.date,
          type: transactionData.type || 'expense',
        } as any;
      } else {
        // Pas de transaction jointe (transaction virtuelle ou transaction_id null)
        // Utiliser les valeurs par défaut si manquantes
        baseTransaction.description = baseTransaction.description || 'Sans description';
        baseTransaction.amount = baseTransaction.amount ?? 0;
        baseTransaction.category = baseTransaction.category || 'autre';
        baseTransaction.transaction = undefined;
      }

      return baseTransaction;
    }) as FamilySharedTransaction[];

    return result;
  } catch (error) {
    console.error('Erreur dans getFamilySharedTransactions:', error);
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Récupérer les règles de l'utilisateur
    const { data: rules, error: fetchError } = await supabase
      .from('family_sharing_rules')
      .select('*')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('category', { ascending: true, nullsFirst: false });

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération des règles: ${fetchError.message}`);
    }

    if (!rules || rules.length === 0) {
      return [];
    }

    return rules.map(mapRowToFamilySharingRule);
  } catch (error) {
    console.error('Erreur dans getUserSharingRules:', error);
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Préparer les données
    const ruleData: any = {
      family_group_id: groupId,
      user_id: user.id,
      name: `Partage automatique: ${category}`,
      category: category,
      split_type: defaultSplitType || 'split_equal',
      is_active: autoShare,
    };

    // Utiliser upsert avec ON CONFLICT sur (family_group_id, user_id, category)
    // Note: Cela nécessite une contrainte unique dans la base de données
    const { data: rule, error: upsertError } = await supabase
      .from('family_sharing_rules')
      .upsert(ruleData, {
        onConflict: 'family_group_id,user_id,category',
      } as any)
      .select()
      .single();

    if (upsertError || !rule) {
      // Si upsert ne fonctionne pas, essayer insert puis update
      const { data: existingRule, error: checkError } = await supabase
        .from('family_sharing_rules')
        .select('id')
        .eq('family_group_id', groupId)
        .eq('user_id', user.id)
        .eq('category', category)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }

      if (existingRule) {
        // Mettre à jour
        const { data: updatedRule, error: updateError } = await (supabase
          .from('family_sharing_rules') as any)
          .update({
            is_active: autoShare,
            split_type: defaultSplitType || 'split_equal',
            updated_at: new Date().toISOString(),
          })
          .eq('id', (existingRule as any).id)
          .select()
          .single();

        if (updateError || !updatedRule) {
          throw new Error(
            `Erreur lors de la mise à jour: ${updateError?.message || 'Erreur inconnue'}`
          );
        }

        return mapRowToFamilySharingRule(updatedRule as FamilySharingRuleRow);
      } else {
        // Créer
        const { data: newRule, error: insertError } = await supabase
          .from('family_sharing_rules')
          .insert(ruleData)
          .select()
          .single();

        if (insertError || !newRule) {
          throw new Error(
            `Erreur lors de la création: ${insertError?.message || 'Erreur inconnue'}`
          );
        }

        return mapRowToFamilySharingRule(newRule as FamilySharingRuleRow);
      }
    }

    return mapRowToFamilySharingRule((rule as unknown) as FamilySharingRuleRow);
  } catch (error) {
    console.error('Erreur dans upsertSharingRule:', error);
    throw error;
  }
}

/**
 * Supprime une règle de partage automatique
 * @param ruleId - ID de la règle
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function deleteSharingRule(ruleId: string): Promise<void> {
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
    const { data: rule, error: fetchError } = await supabase
      .from('family_sharing_rules')
      .select('user_id')
      .eq('id', ruleId)
      .single();

    if (fetchError || !rule) {
      throw new Error('Règle non trouvée');
    }

    if ((rule as any).user_id !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à supprimer cette règle');
    }

    // Supprimer la règle
    const { error: deleteError } = await supabase
      .from('family_sharing_rules')
      .delete()
      .eq('id', ruleId);

    if (deleteError) {
      throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans deleteSharingRule:', error);
    throw error;
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Vérifier s'il existe une règle active pour cette catégorie
    const { data: rule, error: fetchError } = await supabase
      .from('family_sharing_rules')
      .select('is_active')
      .eq('family_group_id', groupId)
      .eq('user_id', user.id)
      .eq('category', category)
      .eq('is_active', true)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, ce qui est OK
      throw new Error(`Erreur lors de la vérification: ${fetchError.message}`);
    }

    return !!rule && (rule as any).is_active === true;
  } catch (error) {
    console.error('Erreur dans shouldAutoShare:', error);
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Vérifier que la transaction récurrente appartient à l'utilisateur
    // Note: Supposons qu'il existe une table recurring_transactions avec user_id
    const { data: recurringTransaction, error: recurringError } = await supabase
      .from('recurring_transactions')
      .select('user_id')
      .eq('id', recurringTransactionId)
      .single();

    if (recurringError || !recurringTransaction) {
      throw new Error('Transaction récurrente non trouvée');
    }

    if ((recurringTransaction as any).user_id !== user.id) {
      throw new Error('Vous n\'êtes pas propriétaire de cette transaction récurrente');
    }

    // Vérifier qu'elle n'est pas déjà partagée
    const { data: existingShare, error: checkError } = await supabase
      .from('family_shared_recurring_transactions')
      .select('id')
      .eq('recurring_transaction_id', recurringTransactionId)
      .eq('family_group_id', groupId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
    }

    if (existingShare) {
      throw new Error('Cette transaction récurrente est déjà partagée dans ce groupe');
    }

    // Créer le partage
    const { data: sharedRecurring, error: insertError } = await supabase
      .from('family_shared_recurring_transactions')
      .insert({
        family_group_id: groupId,
        recurring_transaction_id: recurringTransactionId,
        shared_by: user.id,
        auto_share_generated: autoShareGenerated,
      } as any)
      .select()
      .single();

    if (insertError || !sharedRecurring) {
      throw new Error(
        `Erreur lors du partage: ${insertError?.message || 'Erreur inconnue'}`
      );
    }

    const sharedRecurringData = sharedRecurring as any;
    return {
      id: sharedRecurringData.id,
      familyGroupId: sharedRecurringData.family_group_id,
      recurringTransactionId: sharedRecurringData.recurring_transaction_id,
      sharedBy: sharedRecurringData.shared_by,
      autoShareGenerated: sharedRecurringData.auto_share_generated || false,
      createdAt: new Date(sharedRecurringData.created_at),
      updatedAt: new Date(sharedRecurringData.updated_at),
    };
  } catch (error) {
    console.error('Erreur dans shareRecurringTransaction:', error);
    throw error;
  }
}

/**
 * Arrête le partage d'une transaction récurrente
 * @param sharedRecurringId - ID du partage de transaction récurrente
 * @throws Error si l'utilisateur n'est pas le propriétaire ou en cas d'erreur
 */
export async function unshareRecurringTransaction(sharedRecurringId: string): Promise<void> {
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
    const { data: sharedRecurring, error: fetchError } = await supabase
      .from('family_shared_recurring_transactions')
      .select('shared_by')
      .eq('id', sharedRecurringId)
      .single();

    if (fetchError || !sharedRecurring) {
      throw new Error('Partage de transaction récurrente non trouvé');
    }

    if ((sharedRecurring as any).shared_by !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à retirer ce partage');
    }

    // Supprimer le partage
    const { error: deleteError } = await supabase
      .from('family_shared_recurring_transactions')
      .delete()
      .eq('id', sharedRecurringId);

    if (deleteError) {
      throw new Error(`Erreur lors du retrait du partage: ${deleteError.message}`);
    }
  } catch (error) {
    console.error('Erreur dans unshareRecurringTransaction:', error);
    throw error;
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
    // Vérifier l'authentification
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Utilisateur non authentifié');
    }

    // Construire la requête avec JOIN sur transactions
    // car family_shared_transactions ne contient que les colonnes de référence
    let query = supabase
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
      .eq('transaction_id', transactionId);

    // Filtrer par groupe si fourni
    if (familyGroupId) {
      query = query.eq('family_group_id', familyGroupId);
    }

    const { data: sharedTransaction, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
    }

    if (!sharedTransaction) {
      return null;
    }

    // Utiliser les données jointes pour le mapping
    const row = sharedTransaction as any;
    const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

    // Si une transaction est jointe, utiliser ses données
    if (row.transactions) {
      const transaction = Array.isArray(row.transactions) ? row.transactions[0] : row.transactions;
      if (transaction) {
        baseTransaction.description = transaction.description || '';
        baseTransaction.amount = transaction.amount || 0;
        baseTransaction.category = transaction.category || '';
        baseTransaction.date = new Date(transaction.date);
        baseTransaction.transaction = {
          id: transaction.id,
          description: transaction.description,
          amount: transaction.amount,
          category: transaction.category,
          date: new Date(transaction.date),
          type: transaction.type,
        } as any;
      }
    }

    return baseTransaction;
  } catch (error) {
    console.error('Erreur dans getSharedTransactionByTransactionId:', error);
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
      throw new Error('Vous n\'êtes pas membre de ce groupe');
    }

    // Récupérer les transactions récurrentes partagées
    const { data: sharedRecurring, error: fetchError } = await supabase
      .from('family_shared_recurring_transactions')
      .select(
        `
        *,
        recurring_transactions!inner(*)
      `
      )
      .eq('family_group_id', groupId);

    if (fetchError) {
      throw new Error(`Erreur lors de la récupération: ${fetchError.message}`);
    }

    if (!sharedRecurring || sharedRecurring.length === 0) {
      return [];
    }

    // Convertir les données
    return sharedRecurring.map((row: any) => ({
      id: row.id,
      familyGroupId: row.family_group_id,
      recurringTransactionId: row.recurring_transaction_id,
      sharedBy: row.shared_by,
      autoShareGenerated: row.auto_share_generated || false,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  } catch (error) {
    console.error('Erreur dans getSharedRecurringTransactions:', error);
    throw error;
  }
}

