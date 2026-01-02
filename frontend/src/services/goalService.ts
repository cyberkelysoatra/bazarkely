/**
 * Service de goals (objectifs) pour BazarKELY avec pattern offline-first
 * Utilise IndexedDB comme source primaire et Supabase pour la synchronisation
 */

import type { Goal, GoalFormData } from '../types';
import type { GoalInsert, GoalUpdate } from '../types/supabase';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import apiService from './apiService';
import transactionService from './transactionService';

class GoalService {
  /**
   * Récupérer l'ID de l'utilisateur actuel
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Queue a sync operation for offline-first processing
   * PWA Phase 3 - Now supports priority, syncTag, expiresAt
   */
  private async queueSyncOperation(
    userId: string,
    operation: 'CREATE' | 'UPDATE' | 'DELETE',
    goalId: string,
    data: any,
    options?: {
      priority?: SyncPriority;
      syncTag?: string;
      expiresAt?: Date | null;
    }
  ): Promise<void> {
    try {
      const syncOp: SyncOperation = {
        id: crypto.randomUUID(),
        userId,
        operation,
        table_name: 'goals',
        data: { id: goalId, ...data },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        // PWA Phase 3 - New optional fields
        priority: options?.priority ?? SYNC_PRIORITY.NORMAL,
        syncTag: options?.syncTag ?? 'bazarkely-sync',
        expiresAt: options?.expiresAt ?? null,
      };
      await db.syncQueue.add(syncOp);
      console.log(`🎯 [GoalService] Queued ${operation} operation for goal ${goalId} with priority ${syncOp.priority}`);
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de l\'ajout à la queue de synchronisation:', error);
      // Ne pas faire échouer l'opération principale si la queue échoue
    }
  }

  /**
   * Convertir un goal Supabase (snake_case) vers Goal (camelCase)
   */
  private mapSupabaseToGoal(supabaseGoal: any): Goal {
    return {
      id: supabaseGoal.id,
      userId: supabaseGoal.user_id,
      createdAt: supabaseGoal.created_at || supabaseGoal.createdAt || undefined,
      name: supabaseGoal.name,
      targetAmount: supabaseGoal.target_amount,
      currentAmount: supabaseGoal.current_amount || 0,
      deadline: supabaseGoal.target_date ? new Date(supabaseGoal.target_date) : new Date(),
      category: supabaseGoal.category || undefined,
      priority: (supabaseGoal.priority || 'medium') as 'low' | 'medium' | 'high',
      isCompleted: supabaseGoal.is_completed || false,
      linkedAccountId: supabaseGoal.linked_account_id || undefined,
      autoSync: supabaseGoal.auto_sync || undefined,
      isSuggested: supabaseGoal.is_suggested || undefined,
      suggestionType: supabaseGoal.suggestion_type || undefined,
      suggestionAcceptedAt: supabaseGoal.suggestion_accepted_at || undefined,
      suggestionDismissedAt: supabaseGoal.suggestion_dismissed_at || undefined
    };
  }

  /**
   * Convertir un goal (camelCase) vers format Supabase (snake_case)
   */
  private mapGoalToSupabase(goal: Partial<Goal> | GoalFormData): any {
    const result: any = {};
    
    if ('userId' in goal && goal.userId) result.user_id = goal.userId;
    if ('name' in goal && goal.name !== undefined) result.name = goal.name;
    if ('targetAmount' in goal && goal.targetAmount !== undefined) result.target_amount = goal.targetAmount;
    if ('currentAmount' in goal && goal.currentAmount !== undefined) result.current_amount = goal.currentAmount;
    if ('deadline' in goal && goal.deadline) {
      result.target_date = goal.deadline instanceof Date 
        ? goal.deadline.toISOString().split('T')[0] 
        : goal.deadline;
    }
    if ('category' in goal && goal.category !== undefined) result.category = goal.category;
    if ('priority' in goal && goal.priority !== undefined) result.priority = goal.priority;
    if ('isCompleted' in goal && goal.isCompleted !== undefined) result.is_completed = goal.isCompleted;
    
    return result;
  }

  /**
   * Récupérer tous les goals (OFFLINE-FIRST PATTERN)
   * 1. Essaie IndexedDB d'abord (toujours disponible)
   * 2. Si IndexedDB vide et online, fetch depuis Supabase
   * 3. Cache les résultats Supabase dans IndexedDB
   */
  async getGoals(userId: string): Promise<Goal[]> {
    try {
      // STEP 1: Essayer IndexedDB d'abord (offline-first)
      console.log('🎯 [GoalService] 💾 Récupération des goals depuis IndexedDB...');
      const localGoals = await db.goals
        .where('userId')
        .equals(userId)
        .toArray();

      if (localGoals.length > 0) {
        console.log(`🎯 [GoalService] ✅ ${localGoals.length} goal(s) récupéré(s) depuis IndexedDB`);
        return localGoals;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('🎯 [GoalService] ⚠️ Mode offline et IndexedDB vide, retour d\'un tableau vide');
        return [];
      }

      console.log('🎯 [GoalService] 🌐 IndexedDB vide, récupération depuis Supabase...');
      const response = await apiService.getGoals();
      if (!response.success || response.error) {
        console.error('🎯 [GoalService] ❌ Erreur lors de la récupération des goals depuis Supabase:', response.error);
        return [];
      }

      // STEP 3: Mapper et sauvegarder dans IndexedDB
      const supabaseGoals = (response.data as any[]) || [];
      const goals: Goal[] = supabaseGoals
        .filter((g: any) => g.user_id === userId)
        .map((supabaseGoal: any) => this.mapSupabaseToGoal(supabaseGoal));

      if (goals.length > 0) {
        // Sauvegarder dans IndexedDB pour la prochaine fois
        try {
          await db.goals.bulkPut(goals);
          console.log(`🎯 [GoalService] 💾 ${goals.length} goal(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('🎯 [GoalService] ❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
          // Continuer même si la sauvegarde échoue
        }
      }

      console.log(`🎯 [GoalService] ✅ ${goals.length} goal(s) récupéré(s) depuis Supabase`);
      return goals;
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la récupération des goals:', error);
      // En cas d'erreur, essayer de retourner IndexedDB
      try {
        const localGoals = await db.goals
          .where('userId')
          .equals(userId)
          .toArray();
        if (localGoals.length > 0) {
          console.log(`🎯 [GoalService] ⚠️ Retour de ${localGoals.length} goal(s) depuis IndexedDB après erreur`);
          return localGoals;
        }
      } catch (fallbackError) {
        console.error('🎯 [GoalService] ❌ Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }

  /**
   * Récupérer un goal par ID
   */
  async getGoal(id: string): Promise<Goal | null> {
    try {
      // Essayer IndexedDB d'abord
      const goal = await db.goals.get(id);
      if (goal) {
        console.log(`🎯 [GoalService] ✅ Goal ${id} récupéré depuis IndexedDB`);
        return goal;
      }

      // Si pas trouvé dans IndexedDB et online, essayer Supabase
      if (navigator.onLine) {
        const userId = await this.getCurrentUserId();
        if (userId) {
          const goals = await this.getGoals(userId);
          const foundGoal = goals.find(g => g.id === id);
          if (foundGoal) {
            return foundGoal;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la récupération du goal:', error);
      return null;
    }
  }

  /**
   * Créer un nouveau goal (OFFLINE-FIRST PATTERN)
   * 1. Génère un UUID si non fourni
   * 2. Sauvegarde dans IndexedDB immédiatement
   * 3. Si online, sync vers Supabase
   * 4. Si offline ou échec, queue pour sync ultérieure
   */
  async createGoal(userId: string, goalData: GoalFormData): Promise<Goal> {
    try {
      // Générer un UUID pour le goal
      const goalId = crypto.randomUUID();
      const now = new Date();

      // Créer l'objet Goal complet
      const goal: Goal = {
        id: goalId,
        userId,
        createdAt: now.toISOString(),
        name: goalData.name,
        targetAmount: goalData.targetAmount,
        currentAmount: 0,
        deadline: goalData.deadline instanceof Date ? goalData.deadline : new Date(goalData.deadline),
        category: goalData.category,
        priority: goalData.priority,
        isCompleted: false,
        linkedAccountId: goalData.linkedAccountId
      };

      // STEP 1: Sauvegarder dans IndexedDB immédiatement (offline-first)
      console.log('🎯 [GoalService] 💾 Sauvegarde du goal dans IndexedDB...');
      await db.goals.add(goal);
      console.log(`🎯 [GoalService] ✅ Goal "${goal.name}" sauvegardé dans IndexedDB avec ID: ${goalId}`);

      // STEP 2: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🎯 [GoalService] 🌐 Synchronisation du goal vers Supabase...');
          const supabaseData = this.mapGoalToSupabase({ ...goal, userId });
          const response = await apiService.createGoal(supabaseData as GoalInsert);
          
          if (response.success && response.data) {
            // Mettre à jour IndexedDB avec l'ID du serveur si différent
            const supabaseGoal = this.mapSupabaseToGoal(response.data as any);
            if (supabaseGoal.id !== goalId) {
              // Si Supabase génère un ID différent, mettre à jour IndexedDB
              await db.goals.delete(goalId);
              await db.goals.add(supabaseGoal);
              console.log(`🎯 [GoalService] 🔄 ID du goal mis à jour: ${goalId} → ${supabaseGoal.id}`);
              return supabaseGoal;
            }
            console.log('🎯 [GoalService] ✅ Goal synchronisé avec Supabase');
            return goal;
          } else {
            console.warn('🎯 [GoalService] ⚠️ Échec de la synchronisation Supabase, ajout à la queue');
            // Queue pour sync ultérieure
            await this.queueSyncOperation(userId, 'CREATE', goalId, goalData);
            return goal;
          }
        } catch (syncError) {
          console.error('🎯 [GoalService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          // Queue pour sync ultérieure
          await this.queueSyncOperation(userId, 'CREATE', goalId, goalData);
          return goal;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('🎯 [GoalService] 📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'CREATE', goalId, goalData);
        return goal;
      }
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la création du goal:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un goal (OFFLINE-FIRST PATTERN)
   * 1. Met à jour IndexedDB immédiatement
   * 2. Si online, sync vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async updateGoal(id: string, userId: string, goalData: Partial<GoalFormData>): Promise<Goal> {
    try {
      // STEP 1: Récupérer le goal depuis IndexedDB
      const existingGoal = await db.goals.get(id);
      if (!existingGoal) {
        console.error(`🎯 [GoalService] ❌ Goal ${id} non trouvé dans IndexedDB`);
        // Essayer de récupérer depuis Supabase si online
        if (navigator.onLine) {
          const goals = await this.getGoals(userId);
          const goal = goals.find(g => g.id === id);
          if (goal) {
            // Mettre à jour avec les nouvelles données
            const updatedGoal = { ...goal, ...goalData };
            await db.goals.put(updatedGoal);
            return updatedGoal;
          }
        }
        throw new Error(`Goal ${id} non trouvé`);
      }

      // STEP 2: Mettre à jour IndexedDB immédiatement
      const updatedGoal: Goal = {
        ...existingGoal,
        ...goalData,
        // Préserver les champs qui ne sont pas dans GoalFormData
        id: existingGoal.id,
        userId: existingGoal.userId,
        currentAmount: existingGoal.currentAmount,
        isCompleted: existingGoal.isCompleted
      };
      
      // Gérer la conversion de deadline si nécessaire
      if (goalData.deadline !== undefined) {
        updatedGoal.deadline = goalData.deadline instanceof Date 
          ? goalData.deadline 
          : new Date(goalData.deadline);
      }

      console.log('🎯 [GoalService] 💾 Mise à jour du goal dans IndexedDB...');
      await db.goals.put(updatedGoal);
      console.log(`🎯 [GoalService] ✅ Goal "${updatedGoal.name}" mis à jour dans IndexedDB`);

      // STEP 3: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🎯 [GoalService] 🌐 Synchronisation de la mise à jour vers Supabase...');
          const supabaseData = this.mapGoalToSupabase(updatedGoal);
          const { data, error } = await supabase
            .from('goals')
            .update(supabaseData as GoalUpdate)
            .eq('id', id)
            .select();
          
          if (error) throw error;
          
          // Vérifier si des données ont été retournées (peut être vide à cause de RLS)
          if (data && Array.isArray(data) && data.length > 0) {
            const syncedGoal = this.mapSupabaseToGoal(data[0]);
            // Mettre à jour IndexedDB avec les données Supabase
            await db.goals.put(syncedGoal);
            console.log('🎯 [GoalService] ✅ Goal synchronisé avec Supabase');
            return syncedGoal;
          } else {
            // Supabase retourne 0 lignes (RLS policy ou ligne manquante)
            // Ne pas bloquer - l'update IndexedDB a réussi, continuer avec le goal local
            console.warn('🎯 [GoalService] ⚠️ Supabase a retourné 0 lignes (RLS ou ligne manquante), utilisation du goal IndexedDB');
            await this.queueSyncOperation(userId, 'UPDATE', id, goalData);
            return updatedGoal;
          }
        } catch (syncError) {
          // Erreur Supabase ne doit pas bloquer - l'update IndexedDB a réussi
          console.warn('🎯 [GoalService] ⚠️ Erreur lors de la synchronisation Supabase (non-bloquant):', syncError);
          await this.queueSyncOperation(userId, 'UPDATE', id, goalData);
          return updatedGoal;
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('🎯 [GoalService] 📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'UPDATE', id, goalData);
        return updatedGoal;
      }
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la mise à jour du goal:', error);
      throw error;
    }
  }

  /**
   * Supprimer un goal (OFFLINE-FIRST PATTERN)
   * 1. Supprime de IndexedDB immédiatement
   * 2. Si online, sync suppression vers Supabase
   * 3. Si offline, queue pour sync ultérieure
   */
  async deleteGoal(id: string, userId: string): Promise<void> {
    try {
      // STEP 1: Récupérer le goal depuis IndexedDB pour la queue
      const goal = await db.goals.get(id);
      if (!goal) {
        console.warn(`🎯 [GoalService] ⚠️ Goal ${id} non trouvé dans IndexedDB`);
        // Essayer quand même de supprimer depuis Supabase si online
        if (navigator.onLine) {
          const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);
          if (error) {
            console.error('🎯 [GoalService] ❌ Erreur lors de la suppression Supabase:', error);
          }
        }
        return;
      }

      // STEP 2: Supprimer de IndexedDB immédiatement
      console.log('🎯 [GoalService] 💾 Suppression du goal depuis IndexedDB...');
      await db.goals.delete(id);
      console.log(`🎯 [GoalService] ✅ Goal "${goal.name}" supprimé de IndexedDB`);

      // STEP 3: Si online, essayer de sync vers Supabase
      if (navigator.onLine) {
        try {
          console.log('🎯 [GoalService] 🌐 Synchronisation de la suppression vers Supabase...');
          const { error } = await supabase
            .from('goals')
            .delete()
            .eq('id', id);
          
          if (error) throw error;
          
          console.log('🎯 [GoalService] ✅ Suppression synchronisée avec Supabase');
        } catch (syncError) {
          console.error('🎯 [GoalService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          await this.queueSyncOperation(userId, 'DELETE', id, {});
        }
      } else {
        // Mode offline, queue pour sync ultérieure
        console.log('🎯 [GoalService] 📦 Mode offline, ajout à la queue de synchronisation');
        await this.queueSyncOperation(userId, 'DELETE', id, {});
      }
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la suppression du goal:', error);
      throw error;
    }
  }

  /**
   * Marquer un goal comme complété
   */
  async completeGoal(id: string): Promise<Goal> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      const goal = await this.getGoal(id);
      if (!goal) {
        throw new Error(`Goal ${id} non trouvé`);
      }

      // Mettre à jour directement dans IndexedDB puis synchroniser
      const completedGoal: Goal = {
        ...goal,
        isCompleted: true,
        currentAmount: goal.targetAmount
      };

      // Mettre à jour dans IndexedDB
      await db.goals.put(completedGoal);

      // Synchroniser avec Supabase si online
      if (navigator.onLine) {
        try {
          const supabaseData = this.mapGoalToSupabase(completedGoal);
          const { data, error } = await supabase
            .from('goals')
            .update(supabaseData as GoalUpdate)
            .eq('id', id)
            .select()
            .single();
          
          if (!error && data) {
            const syncedGoal = this.mapSupabaseToGoal(data);
            await db.goals.put(syncedGoal);
            console.log('🎯 [GoalService] ✅ Goal complété et synchronisé avec Supabase');
            return syncedGoal;
          }
        } catch (syncError) {
          console.error('🎯 [GoalService] ❌ Erreur lors de la synchronisation Supabase:', syncError);
          await this.queueSyncOperation(userId, 'UPDATE', id, completedGoal);
        }
      } else {
        await this.queueSyncOperation(userId, 'UPDATE', id, completedGoal);
      }

      return completedGoal;
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la complétion du goal:', error);
      throw error;
    }
  }

  /**
   * Récupérer les goals par statut (active/completed/all)
   */
  async getGoalsByStatus(userId: string, status: 'active' | 'completed' | 'all'): Promise<Goal[]> {
    try {
      const goals = await this.getGoals(userId);
      
      switch (status) {
        case 'active':
          return goals.filter(goal => !goal.isCompleted || goal.isCompleted === false);
        case 'completed':
          return goals.filter(goal => goal.isCompleted === true);
        case 'all':
        default:
          return goals;
      }
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la récupération des goals par statut:', error);
      return [];
    }
  }

  /**
   * Calculer le pourcentage de progression d'un goal
   */
  calculateProgress(goal: Goal): number {
    if (goal.targetAmount === 0) return 0;
    const percentage = (goal.currentAmount / goal.targetAmount) * 100;
    return Math.min(Math.max(percentage, 0), 100); // Clamp entre 0 et 100
  }

  /**
   * Forcer la synchronisation depuis Supabase vers IndexedDB
   */
  async syncGoalsFromSupabase(userId: string): Promise<void> {
    try {
      if (!navigator.onLine) {
        console.warn('🎯 [GoalService] ⚠️ Mode offline, synchronisation impossible');
        return;
      }

      console.log('🎯 [GoalService] 🔄 Synchronisation forcée depuis Supabase...');
      const response = await apiService.getGoals();
      
      if (!response.success || response.error) {
        throw new Error(response.error || 'Erreur lors de la récupération depuis Supabase');
      }

      const supabaseGoals = (response.data as any[]) || [];
      const goals: Goal[] = supabaseGoals
        .filter((g: any) => g.user_id === userId)
        .map((supabaseGoal: any) => this.mapSupabaseToGoal(supabaseGoal));

      if (goals.length > 0) {
        // Remplacer tous les goals dans IndexedDB
        await db.goals.bulkPut(goals);
        console.log(`🎯 [GoalService] ✅ ${goals.length} goal(s) synchronisé(s) depuis Supabase`);
      } else {
        console.log('🎯 [GoalService] ℹ️ Aucun goal à synchroniser');
      }
    } catch (error) {
      console.error('🎯 [GoalService] ❌ Erreur lors de la synchronisation depuis Supabase:', error);
      throw error;
    }
  }

  /**
   * Récupérer l'historique de progression d'un objectif basé sur les transactions du compte lié
   * 
   * @param goalId - ID de l'objectif
   * @param userId - ID de l'utilisateur
   * @returns Tableau d'objets avec date (ISO string) et amount (cumulatif)
   */
  async getGoalProgressionHistory(goalId: string, userId: string): Promise<Array<{ date: string; amount: number }>> {
    try {
      console.log(`🎯 [GoalService] 📊 Récupération de l'historique de progression pour l'objectif ${goalId}...`);
      
      // STEP 1: Récupérer l'objectif
      const goal = await this.getGoal(goalId);
      if (!goal) {
        console.warn(`🎯 [GoalService] ⚠️ Objectif ${goalId} non trouvé`);
        return [];
      }
      
      // STEP 2: Vérifier si l'objectif a un compte lié
      if (!goal.linkedAccountId) {
        console.log(`🎯 [GoalService] ℹ️ Objectif ${goalId} n'a pas de compte lié, historique non disponible`);
        return [];
      }
      
      // STEP 3: Récupérer toutes les transactions et filtrer par accountId
      const allTransactions = await transactionService.getTransactions();
      const accountTransactions = allTransactions.filter(t => {
        // Inclure les transactions où le compte lié est impliqué
        const isAccountInvolved = 
          t.accountId === goal.linkedAccountId || 
          t.targetAccountId === goal.linkedAccountId;
        
        return isAccountInvolved && 
               t.userId === userId &&
               (t.type === 'income' || t.type === 'expense' || t.type === 'transfer');
      });
      
      if (accountTransactions.length === 0) {
        console.log(`🎯 [GoalService] ℹ️ Aucune transaction trouvée pour le compte ${goal.linkedAccountId}`);
        // Retourner au moins le point de départ et le point actuel
        const startDate = goal.createdAt ? new Date(goal.createdAt) : new Date();
        const today = new Date();
        return [
          { date: startDate.toISOString().split('T')[0], amount: 0 },
          { date: today.toISOString().split('T')[0], amount: goal.currentAmount }
        ];
      }
      
      // STEP 4: Trier les transactions par date croissante
      const sortedTransactions = [...accountTransactions].sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return dateA - dateB;
      });
      
      // STEP 5: Calculer le cumul par date
      const dailyTotals = new Map<string, number>();
      let cumulativeAmount = 0;
      
      // Déterminer la date de départ
      const firstTransactionDate = sortedTransactions.length > 0 
        ? new Date(sortedTransactions[0].date).toISOString().split('T')[0]
        : null;
      const startDate = goal.createdAt 
        ? new Date(goal.createdAt).toISOString().split('T')[0]
        : firstTransactionDate || new Date().toISOString().split('T')[0];
      
      // Ajouter le point de départ avec montant 0
      dailyTotals.set(startDate, 0);
      
      // Traiter chaque transaction
      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date).toISOString().split('T')[0];
        
        // Ajouter le montant au cumul (positif pour income, négatif pour expense)
        if (transaction.type === 'income') {
          // Revenu = crédit sur le compte
          cumulativeAmount += Math.abs(transaction.amount);
        } else if (transaction.type === 'expense') {
          // Dépense = débit sur le compte
          cumulativeAmount -= Math.abs(transaction.amount);
        } else if (transaction.type === 'transfer') {
          // Pour les transferts, vérifier si le compte lié est source ou destination
          if (transaction.accountId === goal.linkedAccountId) {
            // Le compte lié est la source = débit (sortie)
            cumulativeAmount -= Math.abs(transaction.amount);
          } else if (transaction.targetAccountId === goal.linkedAccountId) {
            // Le compte lié est la destination = crédit (entrée)
            cumulativeAmount += Math.abs(transaction.amount);
          }
        }
        
        // Garder la dernière valeur cumulative pour chaque jour
        dailyTotals.set(transactionDate, cumulativeAmount);
      }
      
      // STEP 6: Convertir en tableau et trier par date
      const progressionData = Array.from(dailyTotals.entries())
        .map(([date, amount]) => ({
          date,
          amount: Math.max(0, amount) // S'assurer que le montant n'est jamais négatif
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // STEP 7: Ajouter le point actuel (aujourd'hui) avec currentAmount
      const today = new Date().toISOString().split('T')[0];
      const lastEntry = progressionData[progressionData.length - 1];
      
      // Si le dernier point n'est pas aujourd'hui, ajouter le point actuel
      if (!lastEntry || lastEntry.date !== today) {
        progressionData.push({
          date: today,
          amount: goal.currentAmount
        });
      } else {
        // Sinon, mettre à jour le dernier point avec currentAmount
        lastEntry.amount = goal.currentAmount;
      }
      
      console.log(`🎯 [GoalService] ✅ Historique de progression récupéré: ${progressionData.length} point(s)`);
      
      return progressionData;
    } catch (error) {
      console.error(`🎯 [GoalService] ❌ Erreur lors de la récupération de l'historique de progression:`, error);
      return [];
    }
  }

  /**
   * Calculer les données de projection pour un objectif
   * Calcule la progression linéaire depuis l'état actuel jusqu'à l'objectif à la date limite
   * 
   * @param currentAmount - Montant actuel
   * @param targetAmount - Montant cible
   * @param startDate - Date de début (ISO string)
   * @param deadline - Date limite
   * @returns Tableau d'objets avec date (ISO string) et projectedAmount (montant projeté)
   */
  calculateProjectionData(
    currentAmount: number,
    targetAmount: number,
    startDate: string,
    deadline: Date
  ): Array<{ date: string; projectedAmount: number }> {
    try {
      console.log(`🎯 [GoalService] 📈 Calcul des données de projection...`);
      
      const start = new Date(startDate);
      const end = new Date(deadline);
      const today = new Date();
      
      // Si la date limite est dans le passé, retourner seulement le point actuel
      if (end < today) {
        return [
          { date: today.toISOString().split('T')[0], projectedAmount: currentAmount }
        ];
      }
      
      // Si le montant actuel dépasse déjà l'objectif, retourner seulement le point actuel
      if (currentAmount >= targetAmount) {
        return [
          { date: today.toISOString().split('T')[0], projectedAmount: currentAmount }
        ];
      }
      
      const projectionData: Array<{ date: string; projectedAmount: number }> = [];
      
      // Point de départ (aujourd'hui)
      const todayStr = today.toISOString().split('T')[0];
      projectionData.push({
        date: todayStr,
        projectedAmount: currentAmount
      });
      
      // Calculer le nombre de jours entre aujourd'hui et la date limite
      const daysDiff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const amountToSave = targetAmount - currentAmount;
      const dailyIncrement = amountToSave / daysDiff;
      
      // Si moins de 30 jours, ajouter seulement le point final
      if (daysDiff <= 30) {
        const deadlineStr = end.toISOString().split('T')[0];
        projectionData.push({
          date: deadlineStr,
          projectedAmount: targetAmount
        });
      } else {
        // Ajouter des points mensuels intermédiaires pour une ligne plus lisse
        const monthsDiff = Math.ceil(daysDiff / 30);
        const monthlyIncrement = amountToSave / monthsDiff;
        
        // Ajouter des points mensuels
        for (let i = 1; i < monthsDiff; i++) {
          const intermediateDate = new Date(today);
          intermediateDate.setMonth(intermediateDate.getMonth() + i);
          
          // Ne pas dépasser la date limite
          if (intermediateDate > end) {
            break;
          }
          
          const projectedAmount = currentAmount + (monthlyIncrement * i);
          projectionData.push({
            date: intermediateDate.toISOString().split('T')[0],
            projectedAmount: Math.min(projectedAmount, targetAmount)
          });
        }
        
        // Ajouter le point final (date limite)
        const deadlineStr = end.toISOString().split('T')[0];
        projectionData.push({
          date: deadlineStr,
          projectedAmount: targetAmount
        });
      }
      
      // Trier par date
      projectionData.sort((a, b) => a.date.localeCompare(b.date));
      
      console.log(`🎯 [GoalService] ✅ Données de projection calculées: ${projectionData.length} point(s)`);
      
      return projectionData;
    } catch (error) {
      console.error(`🎯 [GoalService] ❌ Erreur lors du calcul des données de projection:`, error);
      return [];
    }
  }
}

export const goalService = new GoalService();
export default goalService;

