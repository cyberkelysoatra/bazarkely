/**
 * Service de budgets pour BazarKELY avec pattern offline-first
 * Utilise IndexedDB comme source primaire et Supabase pour la synchronisation
 */

import type { Budget } from '../types';
import type { BudgetInsert, BudgetUpdate } from '../types/supabase';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import apiService from './apiService';

class BudgetService {
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
      console.error('💰 [BudgetService] ❌ Erreur lors de la récupération de l\'utilisateur:', error);
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
    budgetId: string,
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
        table_name: 'budgets',
        data: { id: budgetId, ...data },
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
        // PWA Phase 3 - New optional fields
        priority: options?.priority ?? SYNC_PRIORITY.NORMAL,
        syncTag: options?.syncTag ?? 'bazarkely-sync',
        expiresAt: options?.expiresAt ?? null,
      };
      await db.syncQueue.add(syncOp);
      console.log(`💰 [BudgetService] Queued ${operation} operation for budget ${budgetId} with priority ${syncOp.priority}`);
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de l\'ajout à la queue de synchronisation:', error);
      // Ne pas faire échouer l'opération principale si la queue échoue
    }
  }

  /**
   * Convertir un budget Supabase (snake_case) vers Budget (camelCase)
   */
  private mapSupabaseToBudget(supabaseBudget: any): Budget {
    return {
      id: supabaseBudget.id,
      userId: supabaseBudget.user_id,
      category: supabaseBudget.category,
      amount: supabaseBudget.amount,
      spent: supabaseBudget.spent || 0,
      period: supabaseBudget.period || 'monthly',
      year: supabaseBudget.year,
      month: supabaseBudget.month,
      alertThreshold: supabaseBudget.alert_threshold || 80
    };
  }

  /**
   * Convertir un budget (camelCase) vers format Supabase (snake_case)
   */
  private mapBudgetToSupabase(budget: Partial<Budget>): any {
    return {
      user_id: budget.userId,
      category: budget.category,
      amount: budget.amount,
      spent: budget.spent,
      period: budget.period || 'monthly',
      year: budget.year,
      month: budget.month,
      alert_threshold: budget.alertThreshold || 80
    };
  }

  /**
   * Récupérer tous les budgets (OFFLINE-FIRST PATTERN)
   * 1. Essaie IndexedDB d'abord (toujours disponible)
   * 2. Si IndexedDB vide et online, fetch depuis Supabase
   * 3. Cache les résultats Supabase dans IndexedDB
   */
  async getBudgets(): Promise<Budget[]> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        console.warn('💰 [BudgetService] ⚠️ Utilisateur non authentifié, retour des budgets IndexedDB uniquement');
        // Retourner les budgets IndexedDB même sans userId (pour compatibilité)
        const localBudgets = await db.budgets.toArray();
        return localBudgets;
      }

      // STEP 1: Essayer IndexedDB d'abord (offline-first)
      console.log('💰 [BudgetService] 💾 Récupération des budgets depuis IndexedDB...');
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .toArray();

      if (localBudgets.length > 0) {
        console.log(`💰 [BudgetService] ✅ ${localBudgets.length} budget(s) récupéré(s) depuis IndexedDB`);
        return localBudgets;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('💰 [BudgetService] ⚠️ Mode offline et IndexedDB vide, retour d\'un tableau vide');
        return [];
      }

      console.log('💰 [BudgetService] 🌐 IndexedDB vide, récupération depuis Supabase...');
      const response = await apiService.getBudgets();
      if (!response.success || response.error) {
        console.error('💰 [BudgetService] ❌ Erreur lors de la récupération des budgets depuis Supabase:', response.error);
        return [];
      }

      // STEP 3: Mapper et sauvegarder dans IndexedDB
      const supabaseBudgets = (response.data as any[]) || [];
      const budgets: Budget[] = supabaseBudgets.map((supabaseBudget: any) =>
        this.mapSupabaseToBudget(supabaseBudget)
      );

      if (budgets.length > 0) {
        // Sauvegarder dans IndexedDB pour la prochaine fois
        try {
          await db.budgets.bulkPut(budgets);
          console.log(`💰 [BudgetService] 💾 ${budgets.length} budget(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('💰 [BudgetService] ❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
          // Continuer même si la sauvegarde échoue
        }
      }

      console.log(`💰 [BudgetService] ✅ ${budgets.length} budget(s) récupéré(s) depuis Supabase`);
      return budgets;
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la récupération des budgets:', error);
      // En cas d'erreur, essayer de retourner IndexedDB
      try {
        const userId = await this.getCurrentUserId();
        if (userId) {
          const localBudgets = await db.budgets
            .where('userId')
            .equals(userId)
            .toArray();
          if (localBudgets.length > 0) {
            console.log(`💰 [BudgetService] ⚠️ Retour de ${localBudgets.length} budget(s) depuis IndexedDB après erreur`);
            return localBudgets;
          }
        }
      } catch (fallbackError) {
        console.error('💰 [BudgetService] ❌ Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }

  /**
   * Récupérer les budgets d'un utilisateur (alias pour getBudgets)
   */
  async getUserBudgets(userId: string): Promise<Budget[]> {
    try {
      // Utiliser IndexedDB d'abord
      console.log(`💰 [BudgetService] 💾 Récupération des budgets de l'utilisateur ${userId} depuis IndexedDB...`);
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .toArray();

      if (localBudgets.length > 0) {
        console.log(`💰 [BudgetService] ✅ ${localBudgets.length} budget(s) récupéré(s) depuis IndexedDB`);
        return localBudgets;
      }

      // Si IndexedDB vide et online, fetch depuis Supabase
      if (!navigator.onLine) {
        console.warn('💰 [BudgetService] ⚠️ Mode offline et IndexedDB vide, retour d\'un tableau vide');
        return [];
      }

      console.log('💰 [BudgetService] 🌐 IndexedDB vide, récupération depuis Supabase...');
      const response = await apiService.getBudgets();
      if (!response.success || response.error) {
        console.error('💰 [BudgetService] ❌ Erreur lors de la récupération des budgets depuis Supabase:', response.error);
        return [];
      }

      // Mapper et sauvegarder dans IndexedDB
      const supabaseBudgets = (response.data as any[]) || [];
      const budgets: Budget[] = supabaseBudgets
        .filter((b: any) => b.user_id === userId)
        .map((supabaseBudget: any) => this.mapSupabaseToBudget(supabaseBudget));

      if (budgets.length > 0) {
        try {
          await db.budgets.bulkPut(budgets);
          console.log(`💰 [BudgetService] 💾 ${budgets.length} budget(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('💰 [BudgetService] ❌ Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }

      return budgets;
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la récupération des budgets utilisateur:', error);
      return [];
    }
  }

  /**
   * Récupérer un budget par ID
   */
  async getBudget(id: string, userId?: string): Promise<Budget | null> {
    try {
      // Essayer IndexedDB d'abord
      const budget = await db.budgets.get(id);
      if (budget) {
        // Vérifier que c'est bien le budget de l'utilisateur si userId fourni
        if (!userId || budget.userId === userId) {
          console.log(`💰 [BudgetService] ✅ Budget ${id} récupéré depuis IndexedDB`);
          return budget;
        }
      }

      // Si pas trouvé dans IndexedDB et online, essayer Supabase
      if (navigator.onLine) {
        const budgets = await this.getBudgets();
        const foundBudget = budgets.find(b => b.id === id);
        if (foundBudget) {
          return foundBudget;
        }
      }

      return null;
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la récupération du budget:', error);
      return null;
    }
  }

  /**
   * Créer un nouveau budget (OFFLINE-FIRST PATTERN)
   * 1. Sauvegarder dans IndexedDB d'abord
   * 2. Si online, sync vers Supabase
   * 3. Si offline ou erreur, mettre en queue pour sync ultérieure
   */
  async createBudget(userId: string, budgetData: Omit<Budget, 'id' | 'userId'>): Promise<Budget | null> {
    try {
      const budgetId = crypto.randomUUID();
      const budget: Budget = {
        id: budgetId,
        userId,
        ...budgetData
      };

      // STEP 1: Sauvegarder dans IndexedDB d'abord (offline-first)
      console.log('💰 [BudgetService] 💾 Sauvegarde du budget dans IndexedDB...');
      await db.budgets.add(budget);
      console.log(`💰 [BudgetService] ✅ Budget ${budgetId} sauvegardé dans IndexedDB`);

      // STEP 2: Sync vers Supabase si online
      if (navigator.onLine) {
        try {
          console.log('💰 [BudgetService] 🌐 Synchronisation du budget vers Supabase...');
          const supabaseData = this.mapBudgetToSupabase(budget);
          const response = await apiService.createBudget(supabaseData as BudgetInsert);
          
          if (response.success && response.data) {
            // Mettre à jour avec l'ID Supabase si différent
            const supabaseBudget = this.mapSupabaseToBudget(response.data);
            if (supabaseBudget.id !== budgetId) {
              // Supprimer l'ancien et ajouter le nouveau avec l'ID Supabase
              await db.budgets.delete(budgetId);
              await db.budgets.add(supabaseBudget);
              console.log(`💰 [BudgetService] ✅ Budget synchronisé avec Supabase (ID: ${supabaseBudget.id})`);
              return supabaseBudget;
            }
            console.log(`💰 [BudgetService] ✅ Budget synchronisé avec Supabase`);
            return budget;
          } else {
            throw new Error(response.error || 'Erreur lors de la création dans Supabase');
          }
        } catch (supabaseError) {
          console.error('💰 [BudgetService] ❌ Erreur lors de la synchronisation vers Supabase:', supabaseError);
          // STEP 3: Mettre en queue pour sync ultérieure
          await this.queueSyncOperation(userId, 'CREATE', budgetId, budget);
          return budget; // Retourner quand même le budget créé localement
        }
      } else {
        // STEP 3: Mode offline, mettre en queue
        console.log('💰 [BudgetService] 📦 Mode offline, budget mis en queue pour synchronisation');
        await this.queueSyncOperation(userId, 'CREATE', budgetId, budget);
        return budget;
      }
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la création du budget:', error);
      throw error;
    }
  }

  /**
   * Mettre à jour un budget (OFFLINE-FIRST PATTERN)
   * 1. Mettre à jour dans IndexedDB d'abord
   * 2. Si online, sync vers Supabase
   * 3. Si offline ou erreur, mettre en queue pour sync ultérieure
   */
  async updateBudget(budgetId: string, budgetData: Partial<Budget>): Promise<Budget | null> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le budget existant
      const existingBudget = await db.budgets.get(budgetId);
      if (!existingBudget) {
        throw new Error(`Budget ${budgetId} non trouvé`);
      }

      // Préparer les données mises à jour
      const updatedBudget: Budget = {
        ...existingBudget,
        ...budgetData
      };

      // STEP 1: Mettre à jour dans IndexedDB d'abord
      console.log(`💰 [BudgetService] 💾 Mise à jour du budget ${budgetId} dans IndexedDB...`);
      await db.budgets.put(updatedBudget);
      console.log(`💰 [BudgetService] ✅ Budget ${budgetId} mis à jour dans IndexedDB`);

      // STEP 2: Sync vers Supabase si online
      if (navigator.onLine) {
        try {
          console.log('💰 [BudgetService] 🌐 Synchronisation de la mise à jour vers Supabase...');
          const supabaseData = this.mapBudgetToSupabase(updatedBudget);
          const { data, error } = await supabase
            .from('budgets')
            .update(supabaseData as BudgetUpdate)
            .eq('id', budgetId)
            .select()
            .single();
          
          if (error) throw error;
          
          if (data) {
            const syncedBudget = this.mapSupabaseToBudget(data);
            // Mettre à jour IndexedDB avec les données Supabase
            await db.budgets.put(syncedBudget);
            console.log(`💰 [BudgetService] ✅ Budget ${budgetId} synchronisé avec Supabase`);
            return syncedBudget;
          } else {
            throw new Error('Aucune donnée retournée par Supabase');
          }
        } catch (supabaseError) {
          console.error('💰 [BudgetService] ❌ Erreur lors de la synchronisation vers Supabase:', supabaseError);
          // STEP 3: Mettre en queue pour sync ultérieure
          await this.queueSyncOperation(userId, 'UPDATE', budgetId, updatedBudget);
          return updatedBudget; // Retourner quand même le budget mis à jour localement
        }
      } else {
        // STEP 3: Mode offline, mettre en queue
        console.log('💰 [BudgetService] 📦 Mode offline, mise à jour mise en queue pour synchronisation');
        await this.queueSyncOperation(userId, 'UPDATE', budgetId, updatedBudget);
        return updatedBudget;
      }
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la mise à jour du budget:', error);
      throw error;
    }
  }

  /**
   * Supprimer un budget (OFFLINE-FIRST PATTERN)
   * 1. Supprimer dans IndexedDB d'abord
   * 2. Si online, sync vers Supabase
   * 3. Si offline ou erreur, mettre en queue pour sync ultérieure
   */
  async deleteBudget(budgetId: string): Promise<boolean> {
    try {
      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      // Récupérer le budget pour la queue
      const existingBudget = await db.budgets.get(budgetId);
      if (!existingBudget) {
        console.warn(`💰 [BudgetService] ⚠️ Budget ${budgetId} non trouvé dans IndexedDB`);
        return false;
      }

      // STEP 1: Supprimer dans IndexedDB d'abord
      console.log(`💰 [BudgetService] 💾 Suppression du budget ${budgetId} dans IndexedDB...`);
      await db.budgets.delete(budgetId);
      console.log(`💰 [BudgetService] ✅ Budget ${budgetId} supprimé de IndexedDB`);

      // STEP 2: Sync vers Supabase si online
      if (navigator.onLine) {
        try {
          console.log('💰 [BudgetService] 🌐 Synchronisation de la suppression vers Supabase...');
          const { error } = await supabase
            .from('budgets')
            .delete()
            .eq('id', budgetId);
          
          if (error) throw error;
          
          console.log(`💰 [BudgetService] ✅ Budget ${budgetId} supprimé de Supabase`);
          return true;
        } catch (supabaseError) {
          console.error('💰 [BudgetService] ❌ Erreur lors de la synchronisation vers Supabase:', supabaseError);
          // STEP 3: Mettre en queue pour sync ultérieure
          await this.queueSyncOperation(userId, 'DELETE', budgetId, existingBudget);
          return true; // Retourner true car supprimé localement
        }
      } else {
        // STEP 3: Mode offline, mettre en queue
        console.log('💰 [BudgetService] 📦 Mode offline, suppression mise en queue pour synchronisation');
        await this.queueSyncOperation(userId, 'DELETE', budgetId, existingBudget);
        return true;
      }
    } catch (error) {
      console.error('💰 [BudgetService] ❌ Erreur lors de la suppression du budget:', error);
      throw error;
    }
  }
}

export const budgetService = new BudgetService();
export default budgetService;

