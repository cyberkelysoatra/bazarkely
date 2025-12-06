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
    paidBy: row.paid_by,
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
export function mapRowToFamilySharingRule(row: FamilySharingRuleRow): FamilySharingRule {
  return {
    id: row.id,
    familyGroupId: row.family_group_id,
    createdBy: row.created_by,
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
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 = not found, ce qui est OK
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`);
      }

      if (existingShare) {
        throw new Error('Cette transaction est déjà partagée dans ce groupe');
      }
    }

    // Créer la transaction partagée
    const { data: sharedTransaction, error: insertError } = await supabase
      .from('family_shared_transactions')
      .insert({
        family_group_id: input.familyGroupId,
        transaction_id: input.transactionId || null,
        shared_by: user.id,
        description: input.description,
        amount: input.amount,
        category: input.category,
        shared_at: input.date.toISOString(),
        split_type: input.splitType,
        paid_by: input.paidBy,
        split_details: input.splitDetails as any, // JSONB
        is_settled: false,
        notes: input.notes || null,
      } as any)
      .select()
      .single();

    if (insertError || !sharedTransaction) {
      throw new Error(
        `Erreur lors du partage de la transaction: ${insertError?.message || 'Erreur inconnue'}`
      );
    }

    return mapRowToFamilySharedTransaction(sharedTransaction as FamilySharedTransactionRow);
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
      .single();

    if (fetchError || !sharedTransaction) {
      throw new Error('Transaction partagée non trouvée');
    }

    if ((sharedTransaction as any).shared_by !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à retirer ce partage');
    }

    // Supprimer la transaction partagée
    const { error: deleteError } = await supabase
      .from('family_shared_transactions')
      .delete()
      .eq('id', sharedTransactionId);

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
      .single();

    if (fetchError || !sharedTransaction) {
      throw new Error('Transaction partagée non trouvée');
    }

    if ((sharedTransaction as any).shared_by !== user.id) {
      throw new Error('Vous n\'êtes pas autorisé à modifier ce partage');
    }

    // Préparer les données de mise à jour
    const updateData: any = {};
    if (updates.splitType !== undefined) {
      updateData.split_type = updates.splitType;
    }
    if (updates.splitDetails !== undefined) {
      updateData.split_details = updates.splitDetails as any; // JSONB
    }
    if (updates.isSettled !== undefined) {
      updateData.is_settled = updates.isSettled;
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes || null;
    }

    // Mettre à jour
    const { data: updatedTransaction, error: updateError } = await (supabase
      .from('family_shared_transactions') as any)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedTransaction) {
      throw new Error(
        `Erreur lors de la mise à jour: ${updateError?.message || 'Erreur inconnue'}`
      );
    }

    return mapRowToFamilySharedTransaction(updatedTransaction as FamilySharedTransactionRow);
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

    // Construire la requête
    let query = supabase
      .from('family_shared_transactions')
      .select('*')
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

    // Convertir les données
    const result: FamilySharedTransaction[] = (sharedTransactions as any[]).map((row: any) => {
      const baseTransaction = mapRowToFamilySharedTransaction(row as unknown as FamilySharedTransactionRow);

      // transaction field is optional and not available without join
      // If transaction_id is present, we can use it but won't have full transaction details
      baseTransaction.transaction = undefined;

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
      .eq('created_by', user.id)
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
      created_by: user.id,
      name: `Partage automatique: ${category}`,
      category: category,
      split_type: defaultSplitType || 'split_equal',
      is_active: autoShare,
    };

    // Utiliser upsert avec ON CONFLICT sur (family_group_id, created_by, category)
    // Note: Cela nécessite une contrainte unique dans la base de données
    const { data: rule, error: upsertError } = await supabase
      .from('family_sharing_rules')
      .upsert(ruleData, {
        onConflict: 'family_group_id,created_by,category',
      } as any)
      .select()
      .single();

    if (upsertError || !rule) {
      // Si upsert ne fonctionne pas, essayer insert puis update
      const { data: existingRule, error: checkError } = await supabase
        .from('family_sharing_rules')
        .select('id')
        .eq('family_group_id', groupId)
        .eq('created_by', user.id)
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
      .select('created_by')
      .eq('id', ruleId)
      .single();

    if (fetchError || !rule) {
      throw new Error('Règle non trouvée');
    }

    if ((rule as any).created_by !== user.id) {
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
      .eq('created_by', user.id)
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

