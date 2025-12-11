/**
 * Service de gestion des transactions récurrentes
 * Phase 2: CRUD, calcul de dates, génération automatique, dual storage
 */

import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import transactionService from './transactionService';
import type {
  RecurringTransaction,
  RecurringTransactionCreate,
  RecurringTransactionUpdate,
  RecurrenceFrequency
} from '../types/recurring';
import type { Transaction, TransactionCategory, Budget } from '../types';
import {
  toRecurringTransaction,
  fromRecurringTransaction,
  fromRecurringTransactionCreate,
  fromRecurringTransactionUpdate
} from '../types/supabase-recurring';
import {
  calculateNextDateFromDate,
  validateRecurringData
} from '../utils/recurringUtils';
import { TRANSACTION_CATEGORIES } from '../constants';

class RecurringTransactionService {
  /**
   * Trouve un budget par nom de catégorie (matching case-insensitive)
   * Cherche dans IndexedDB et Supabase
   */
  private async findBudgetByCategoryName(userId: string, categoryName: string): Promise<Budget | null> {
    try {
      // Obtenir le label de la catégorie depuis TRANSACTION_CATEGORIES
      const categoryLabel = TRANSACTION_CATEGORIES[categoryName as TransactionCategory]?.name || 
                            categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();
      
      // Chercher dans IndexedDB par category (clé de catégorie)
      // Les budgets IndexedDB utilisent category (clé) pas name
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .toArray();
      
      // Filtrer par category key (case-insensitive)
      const matchingBudgets = localBudgets.filter(budget => 
        budget.category?.toLowerCase() === categoryName.toLowerCase()
      );
      
      if (matchingBudgets.length > 0) {
        // Si plusieurs budgets, retourner celui avec le plus grand solde restant (amount - spent)
        const bestBudget = matchingBudgets.reduce((best, current) => {
          const bestRemaining = best.amount - best.spent;
          const currentRemaining = current.amount - current.spent;
          return currentRemaining > bestRemaining ? current : best;
        });
        return bestBudget;
      }
      
      // Si pas trouvé dans IndexedDB, chercher dans Supabase par category (plus fiable que name)
      try {
        const { data: supabaseBudgets, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .eq('category', categoryName);
        
        if (!error && supabaseBudgets && supabaseBudgets.length > 0) {
          // Si plusieurs budgets, choisir celui avec le plus grand solde restant
          const bestSupabaseBudget = supabaseBudgets.reduce((best, current) => {
            const bestRemaining = best.amount - best.spent;
            const currentRemaining = current.amount - current.spent;
            return currentRemaining > bestRemaining ? current : best;
          });
          
          // Convertir le résultat Supabase en format Budget
          const budget: Budget = {
            id: bestSupabaseBudget.id,
            userId: bestSupabaseBudget.user_id,
            category: bestSupabaseBudget.category as TransactionCategory,
            amount: bestSupabaseBudget.amount,
            spent: bestSupabaseBudget.spent,
            period: 'monthly',
            year: bestSupabaseBudget.year,
            month: bestSupabaseBudget.month,
            alertThreshold: bestSupabaseBudget.alert_threshold
          };
          
          // Sauvegarder dans IndexedDB pour la prochaine fois
          await db.budgets.put(budget);
          return budget;
        }
      } catch (supabaseError) {
        console.warn('⚠️ Erreur Supabase lors de la recherche de budget:', supabaseError);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la recherche de budget par catégorie:', error);
      return null;
    }
  }

  /**
   * Crée un budget vide pour une catégorie
   */
  private async createBudgetForCategory(userId: string, categoryName: string): Promise<Budget> {
    try {
      // Obtenir le label de la catégorie depuis TRANSACTION_CATEGORIES
      const categoryLabel = TRANSACTION_CATEGORIES[categoryName as TransactionCategory]?.name || 
                            categoryName.charAt(0).toUpperCase() + categoryName.slice(1).toLowerCase();
      
      const now = new Date();
      const budget: Budget = {
        id: crypto.randomUUID(),
        userId: userId,
        category: categoryName as TransactionCategory,
        amount: 0,
        spent: 0,
        period: 'monthly',
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        alertThreshold: 80
      };
      
      // Sauvegarder dans IndexedDB
      await db.budgets.add(budget);
      
      // Sauvegarder dans Supabase si en ligne
      try {
        const { error: supabaseError } = await supabase
          .from('budgets')
          .insert({
            id: budget.id,
            user_id: userId,
            name: categoryLabel, // Nom pour Supabase
            category: categoryName,
            amount: 0,
            spent: 0,
            period: 'monthly',
            year: budget.year,
            month: budget.month,
            alert_threshold: 80,
            is_active: true
          });
        
        if (supabaseError) {
          console.warn('⚠️ Erreur Supabase lors de la création du budget:', supabaseError);
          // Continuer avec la version IndexedDB
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, budget créé en local seulement:', supabaseError);
      }
      
      return budget;
    } catch (error) {
      console.error('❌ Erreur lors de la création du budget pour catégorie:', error);
      throw error;
    }
  }

  /**
   * Obtient l'utilisateur actuel depuis localStorage ou Supabase
   */
  private async getCurrentUserId(): Promise<string | null> {
    try {
      // Essayer Supabase Auth d'abord
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }

      // Fallback: localStorage
      const userData = localStorage.getItem('bazarkely-user');
      if (userData) {
        const user = JSON.parse(userData);
        return user.id;
      }

      return null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
  }

  /**
   * Crée une nouvelle transaction récurrente
   * Dual storage: Supabase (primary) + IndexedDB (offline)
   */
  async create(data: RecurringTransactionCreate): Promise<RecurringTransaction> {
    try {
      // Validation
      const validation = validateRecurringData(data);
      if (!validation.valid) {
        throw new Error(`Validation échouée: ${validation.errors.join(', ')}`);
      }

      const userId = await this.getCurrentUserId();
      if (!userId) {
        throw new Error('Utilisateur non authentifié');
      }

      // Auto-link budget by category name for expense transactions
      if (data.type === 'expense' && data.category) {
        try {
          let matchingBudget = await this.findBudgetByCategoryName(userId, data.category);
          
          if (!matchingBudget) {
            // Create empty budget with same name as category
            matchingBudget = await this.createBudgetForCategory(userId, data.category);
            console.log('📦 Created budget for category:', data.category, '→', TRANSACTION_CATEGORIES[data.category as TransactionCategory]?.name || data.category);
          }
          
          // Override linkedBudgetId with auto-matched budget
          data.linkedBudgetId = matchingBudget.id;
          console.log('🔗 Auto-linked to budget:', TRANSACTION_CATEGORIES[data.category as TransactionCategory]?.name || data.category, 'for category:', data.category);
        } catch (error) {
          console.error('⚠️ Auto-link budget failed:', error);
          // Continue without linking - don't block transaction creation
        }
      }

      // Calculer nextGenerationDate
      const nextGenerationDate = calculateNextDateFromDate(
        data.frequency,
        data.startDate,
        data.dayOfMonth || undefined,
        data.dayOfWeek || undefined
      );

      const recurringData: RecurringTransaction = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
        lastGeneratedDate: null,
        nextGenerationDate
      } as RecurringTransaction;

      // Ajouter targetAccountId si présent (pour les transferts)
      if ((data as any).targetAccountId) {
        (recurringData as any).targetAccountId = (data as any).targetAccountId;
      }

      // Sauvegarder dans IndexedDB (immédiat, offline-first)
      await db.recurringTransactions.add(recurringData);

      // Sauvegarder dans Supabase (si en ligne)
      try {
        const supabaseData = fromRecurringTransactionCreate({
          ...data,
          nextGenerationDate
        });

        // Ajouter target_account_id si présent (pour les transferts)
        // Note: Les fonctions de conversion seront mises à jour séparément
        if ((data as any).targetAccountId) {
          (supabaseData as any).target_account_id = (data as any).targetAccountId;
        }

        const { data: supabaseResult, error } = await supabase
          .from('recurring_transactions')
          .insert(supabaseData)
          .select()
          .single();

        if (error) {
          console.warn('⚠️ Erreur Supabase, données sauvegardées en local seulement:', error);
          // Continuer avec la version IndexedDB
        } else if (supabaseResult) {
          // Mettre à jour avec l'ID Supabase et targetAccountId si présent
          recurringData.id = supabaseResult.id;
          const updateData: any = { id: supabaseResult.id };
          if ((supabaseResult as any).target_account_id) {
            (recurringData as any).targetAccountId = (supabaseResult as any).target_account_id;
            updateData.targetAccountId = (supabaseResult as any).target_account_id;
          }
          await db.recurringTransactions.update(recurringData.id, updateData);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, données sauvegardées en local:', supabaseError);
      }

      console.log('✅ Transaction récurrente créée:', recurringData.id);
      return recurringData;
    } catch (error) {
      console.error('❌ Erreur lors de la création de la transaction récurrente:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les transactions récurrentes d'un utilisateur
   */
  async getAll(userId: string): Promise<RecurringTransaction[]> {
    try {
      // Récupérer depuis IndexedDB (toujours disponible)
      const localRecurring = await db.recurringTransactions
        .where('userId')
        .equals(userId)
        .toArray();

      // Essayer de synchroniser avec Supabase si en ligne
      try {
        const { data: supabaseRecurring, error } = await supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', userId);

        if (!error && supabaseRecurring) {
          // Convertir et mettre à jour IndexedDB
          const converted = supabaseRecurring.map(supabaseRec => {
            const convertedRec = toRecurringTransaction(supabaseRec);
            // Ajouter targetAccountId si présent (pour les transferts)
            if ((supabaseRec as any).target_account_id) {
              (convertedRec as any).targetAccountId = (supabaseRec as any).target_account_id;
            }
            return convertedRec;
          });
          
          // Synchroniser les deux sources
          for (const remote of converted) {
            const local = localRecurring.find(r => r.id === remote.id);
            if (!local || new Date(remote.updatedAt) > new Date(local.updatedAt)) {
              // Mettre à jour avec la version la plus récente
              await db.recurringTransactions.put(remote);
            }
          }

          // Retourner les données les plus récentes
          return await db.recurringTransactions
            .where('userId')
            .equals(userId)
            .toArray();
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, utilisation des données locales:', supabaseError);
      }

      return localRecurring;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions récurrentes:', error);
      return [];
    }
  }

  /**
   * Récupère une transaction récurrente par ID
   */
  async getById(id: string): Promise<RecurringTransaction | null> {
    try {
      // Essayer d'abord IndexedDB
      let recurring = await db.recurringTransactions.get(id);
      
      // Si pas trouvé localement, essayer Supabase
      if (!recurring) {
        try {
          const { data: supabaseRecurring, error } = await supabase
            .from('recurring_transactions')
            .select('*')
            .eq('id', id)
            .single();

          if (!error && supabaseRecurring) {
            recurring = toRecurringTransaction(supabaseRecurring);
            // Ajouter targetAccountId si présent (pour les transferts)
            if ((supabaseRecurring as any).target_account_id) {
              (recurring as any).targetAccountId = (supabaseRecurring as any).target_account_id;
            }
            // Sauvegarder dans IndexedDB pour la prochaine fois
            await db.recurringTransactions.put(recurring);
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase non disponible pour getById:', supabaseError);
        }
      }
      
      return recurring || null;
    } catch (error) {
      console.error('❌ Erreur lors de la récupération de la transaction récurrente:', error);
      return null;
    }
  }

  /**
   * Met à jour une transaction récurrente
   */
  async update(id: string, data: RecurringTransactionUpdate): Promise<RecurringTransaction> {
    try {
      const existing = await db.recurringTransactions.get(id);
      if (!existing) {
        throw new Error('Transaction récurrente non trouvée');
      }

      // Recalculer nextGenerationDate si nécessaire
      let nextGenerationDate = existing.nextGenerationDate;
      if (data.frequency !== undefined || data.startDate !== undefined || 
          data.dayOfMonth !== undefined || data.dayOfWeek !== undefined) {
        const frequency = data.frequency || existing.frequency;
        const startDate = data.startDate || existing.startDate;
        const dayOfMonth = data.dayOfMonth !== undefined ? data.dayOfMonth : existing.dayOfMonth;
        const dayOfWeek = data.dayOfWeek !== undefined ? data.dayOfWeek : existing.dayOfWeek;

        nextGenerationDate = calculateNextDateFromDate(
          frequency,
          startDate,
          dayOfMonth || undefined,
          dayOfWeek || undefined
        );
      }

      const updated: RecurringTransaction = {
        ...existing,
        ...data,
        nextGenerationDate,
        updatedAt: new Date()
      };

      // Mettre à jour IndexedDB
      await db.recurringTransactions.update(id, updated);

      // Mettre à jour Supabase
      try {
        const supabaseData = fromRecurringTransactionUpdate(updated);
        // Ajouter target_account_id si présent (pour les transferts)
        if ((updated as any).targetAccountId !== undefined) {
          (supabaseData as any).target_account_id = (updated as any).targetAccountId;
        }
        const { error } = await supabase
          .from('recurring_transactions')
          .update(supabaseData)
          .eq('id', id);

        if (error) {
          console.warn('⚠️ Erreur Supabase lors de la mise à jour:', error);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, mise à jour locale seulement:', supabaseError);
      }

      console.log('✅ Transaction récurrente mise à jour:', id);
      return updated;
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour de la transaction récurrente:', error);
      throw error;
    }
  }

  /**
   * Supprime une transaction récurrente
   */
  async delete(id: string): Promise<void> {
    try {
      // Supprimer de IndexedDB
      await db.recurringTransactions.delete(id);

      // Supprimer de Supabase
      try {
        const { error } = await supabase
          .from('recurring_transactions')
          .delete()
          .eq('id', id);

        if (error) {
          console.warn('⚠️ Erreur Supabase lors de la suppression:', error);
        }
      } catch (supabaseError) {
        console.warn('⚠️ Supabase non disponible, suppression locale seulement:', supabaseError);
      }

      console.log('✅ Transaction récurrente supprimée:', id);
    } catch (error) {
      console.error('❌ Erreur lors de la suppression de la transaction récurrente:', error);
      throw error;
    }
  }

  /**
   * Active ou désactive une transaction récurrente
   */
  async toggleActive(id: string, isActive: boolean): Promise<void> {
    await this.update(id, { isActive });
  }

  /**
   * Calcule la prochaine date de génération pour une transaction récurrente
   */
  calculateNextDate(recurring: RecurringTransaction): Date {
    return calculateNextDateFromDate(
      recurring.frequency,
      recurring.nextGenerationDate || recurring.startDate,
      recurring.dayOfMonth || undefined,
      recurring.dayOfWeek || undefined
    );
  }

  /**
   * Vérifie si une transaction récurrente est due (doit être générée)
   */
  isDateDue(recurring: RecurringTransaction): boolean {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const nextDate = new Date(recurring.nextGenerationDate);
    nextDate.setHours(0, 0, 0, 0);

    return nextDate <= now;
  }

  /**
   * Récupère toutes les transactions récurrentes dues
   */
  async getDueTransactions(userId: string): Promise<RecurringTransaction[]> {
    try {
      const allRecurring = await this.getAll(userId);
      return allRecurring.filter(r => r.isActive && this.isDateDue(r));
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions dues:', error);
      return [];
    }
  }

  /**
   * Récupère les transactions récurrentes à venir dans N jours
   */
  async getUpcomingInDays(userId: string, days: number): Promise<RecurringTransaction[]> {
    try {
      const allRecurring = await this.getAll(userId);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const futureDate = new Date(now);
      futureDate.setDate(futureDate.getDate() + days);

      return allRecurring.filter(r => {
        if (!r.isActive) return false;
        const nextDate = new Date(r.nextGenerationDate);
        nextDate.setHours(0, 0, 0, 0);
        return nextDate >= now && nextDate <= futureDate;
      });
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions à venir:', error);
      return [];
    }
  }

  /**
   * Génère une transaction à partir d'une transaction récurrente
   */
  async generateTransaction(recurringId: string): Promise<Transaction | null> {
    try {
      const recurring = await this.getById(recurringId);
      if (!recurring || !recurring.isActive) {
        return null;
      }

      if (!this.isDateDue(recurring)) {
        console.log('⏳ Transaction récurrente pas encore due:', recurringId);
        return null;
      }

      // Vérifier si une transaction a déjà été générée pour cette date
      const generatedDate = new Date(recurring.nextGenerationDate);
      generatedDate.setHours(0, 0, 0, 0);
      
      let alreadyGenerated = false;
      
      if (recurring.type === 'transfer' && (recurring as any).targetAccountId) {
        // Pour les transferts, vérifier si les 2 transactions existent déjà
        // En cherchant par description et date (car createTransfer ne set pas isRecurring/recurringTransactionId)
        const allTransactions = await db.transactions
          .where('userId')
          .equals(recurring.userId)
          .toArray();
        
        const matchingTransactions = allTransactions.filter(t => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === generatedDate.getTime() &&
                 t.description === recurring.description &&
                 ((t.accountId === recurring.accountId && t.targetAccountId === (recurring as any).targetAccountId) ||
                  (t.accountId === (recurring as any).targetAccountId && t.targetAccountId === recurring.accountId));
        });
        
        // Si on trouve au moins 2 transactions correspondantes, c'est déjà généré
        alreadyGenerated = matchingTransactions.length >= 2;
      } else {
        // Pour income/expense, vérifier par isRecurring et recurringTransactionId
        const existingTransactions = await db.transactions
          .where('userId')
          .equals(recurring.userId)
          .and(t => t.isRecurring === true && t.recurringTransactionId === recurringId)
          .toArray();

        alreadyGenerated = existingTransactions.some(t => {
          const tDate = new Date(t.date);
          tDate.setHours(0, 0, 0, 0);
          return tDate.getTime() === generatedDate.getTime();
        });
      }

      if (alreadyGenerated) {
        console.log('ℹ️ Transaction déjà générée pour cette date:', recurringId);
        // Mettre à jour quand même la prochaine date
        await this.updateNextGenerationDate(recurring);
        return null;
      }

      // Gérer les transferts différemment (créer 2 transactions)
      if (recurring.type === 'transfer' && (recurring as any).targetAccountId) {
        // Utiliser createTransfer pour créer les 2 transactions (débit + crédit)
        const transferResult = await transactionService.createTransfer(
          recurring.userId,
          {
            fromAccountId: recurring.accountId,
            toAccountId: (recurring as any).targetAccountId,
            amount: recurring.amount,
            description: recurring.description,
            notes: `Transaction récurrente: ${recurring.description}`,
            date: new Date(recurring.nextGenerationDate)
          }
        );

        if (!transferResult.success || !transferResult.transactions || transferResult.transactions.length !== 2) {
          throw new Error('Échec de la création du transfert récurrent');
        }

        // Marquer les deux transactions comme récurrentes
        // Note: Les transactions sont déjà créées, on pourrait les mettre à jour pour ajouter isRecurring et recurringTransactionId
        // mais createTransfer ne supporte pas ces champs. Pour l'instant, on retourne la première transaction.
        const debitTransaction = transferResult.transactions[0];
        const creditTransaction = transferResult.transactions[1];

        // Mettre à jour la transaction récurrente
        await this.updateNextGenerationDate(recurring);

        console.log('✅ Transfert récurrent généré:', debitTransaction.id, creditTransaction.id);
        // Retourner la transaction de débit (compte source)
        return debitTransaction;
      } else {
        // Créer la transaction (income ou expense)
        const transaction = await transactionService.createTransaction(
          recurring.userId,
          {
            type: recurring.type,
            amount: recurring.amount,
            description: recurring.description,
            category: recurring.category as TransactionCategory,
            accountId: recurring.accountId,
            date: new Date(recurring.nextGenerationDate),
            notes: `Transaction récurrente: ${recurring.description}`,
            isRecurring: true,
            recurringTransactionId: recurring.id
          }
        );

        if (!transaction) {
          throw new Error('Échec de la création de la transaction');
        }

        // Mettre à jour la transaction récurrente
        await this.updateNextGenerationDate(recurring);

        console.log('✅ Transaction générée depuis récurrence:', transaction.id);
        return transaction;
      }
    } catch (error) {
      console.error('❌ Erreur lors de la génération de la transaction:', error);
      return null;
    }
  }

  /**
   * Met à jour la date de prochaine génération
   */
  private async updateNextGenerationDate(recurring: RecurringTransaction): Promise<void> {
    const nextDate = this.calculateNextDate(recurring);
    
    // Vérifier si on a atteint la date de fin
    if (recurring.endDate && nextDate > recurring.endDate) {
      // Désactiver la transaction récurrente
      await this.update(recurring.id, {
        isActive: false,
        nextGenerationDate: recurring.endDate
      });
    } else {
      // Mettre à jour avec la nouvelle date
      await this.update(recurring.id, {
        lastGeneratedDate: new Date(recurring.nextGenerationDate),
        nextGenerationDate: nextDate
      });
    }
  }

  /**
   * Génère toutes les transactions récurrentes dues pour un utilisateur
   */
  async generatePendingTransactions(userId: string): Promise<Transaction[]> {
    try {
      const dueRecurring = await this.getDueTransactions(userId);
      const generatedTransactions: Transaction[] = [];

      for (const recurring of dueRecurring) {
        try {
          const transaction = await this.generateTransaction(recurring.id);
          if (transaction) {
            generatedTransactions.push(transaction);
          }
        } catch (error) {
          console.error(`❌ Erreur lors de la génération pour ${recurring.id}:`, error);
          // Continuer avec les autres
        }
      }

      console.log(`✅ ${generatedTransactions.length} transaction(s) générée(s)`);
      return generatedTransactions;
    } catch (error) {
      console.error('❌ Erreur lors de la génération des transactions en attente:', error);
      return [];
    }
  }

  /**
   * Génère une transaction et met à jour la prochaine date
   */
  async generateAndUpdateNext(recurring: RecurringTransaction): Promise<Transaction | null> {
    return await this.generateTransaction(recurring.id);
  }

  /**
   * Filtre par fréquence
   */
  async getByFrequency(userId: string, frequency: RecurrenceFrequency): Promise<RecurringTransaction[]> {
    try {
      const allRecurring = await this.getAll(userId);
      return allRecurring.filter(r => r.frequency === frequency);
    } catch (error) {
      console.error('❌ Erreur lors du filtrage par fréquence:', error);
      return [];
    }
  }

  /**
   * Filtre par catégorie
   */
  async getByCategory(userId: string, category: TransactionCategory): Promise<RecurringTransaction[]> {
    try {
      const allRecurring = await this.getAll(userId);
      return allRecurring.filter(r => r.category === category);
    } catch (error) {
      console.error('❌ Erreur lors du filtrage par catégorie:', error);
      return [];
    }
  }

  /**
   * Récupère les transactions récurrentes liées à un budget
   */
  async getLinkedToBudget(budgetId: string): Promise<RecurringTransaction[]> {
    try {
      return await db.recurringTransactions
        .where('linkedBudgetId')
        .equals(budgetId)
        .toArray();
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions liées au budget:', error);
      return [];
    }
  }

  /**
   * Récupère uniquement les transactions récurrentes actives
   */
  async getActive(userId: string): Promise<RecurringTransaction[]> {
    try {
      const allRecurring = await this.getAll(userId);
      return allRecurring.filter(r => r.isActive);
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des transactions actives:', error);
      return [];
    }
  }
}

export const recurringTransactionService = new RecurringTransactionService();
export default recurringTransactionService;

