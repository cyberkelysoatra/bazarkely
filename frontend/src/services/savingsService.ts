/**
 * Savings Service - BazarKELY
 * Service unifié pour gérer les objectifs d'épargne liés aux comptes d'épargne
 * Gère la création, la liaison, la synchronisation et les calculs d'épargne
 * 
 * @version 1.0
 * @date 2025-01-XX
 * @author BazarKELY Team
 */

import goalService from './goalService';
import accountService from './accountService';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import type { Goal, Account, GoalFormData } from '../types';

class SavingsService {
  /**
   * Créer un objectif avec un compte d'épargne associé
   * 
   * @param userId - ID de l'utilisateur
   * @param goalData - Données de l'objectif
   * @param accountName - Nom du compte (optionnel, utilise le nom de l'objectif par défaut)
   * @returns Objectif et compte créés
   */
  async createGoalWithAccount(
    userId: string,
    goalData: GoalFormData,
    accountName?: string
  ): Promise<{ goal: Goal; account: Account }> {
    try {
      console.log('💰 [SavingsService] Création d\'un objectif avec compte d\'épargne...');
      
      // STEP 1: Créer le compte d'épargne
      const accountData: Omit<Account, 'id' | 'createdAt' | 'userId'> = {
        name: accountName || goalData.name,
        type: 'epargne',
        balance: 0,
        currency: 'MGA',
        isDefault: false,
        isSavingsAccount: true,
        linkedGoalId: undefined // Sera mis à jour après création du goal
      };
      
      const account = await accountService.createAccount(userId, accountData);
      if (!account) {
        throw new Error('Échec de la création du compte d\'épargne');
      }
      
      console.log(`💰 [SavingsService] ✅ Compte d'épargne créé: ${account.id}`);
      
      // STEP 2: Créer l'objectif avec linkedAccountId
      const goalWithAccount: GoalFormData = {
        ...goalData,
        linkedAccountId: account.id
      };
      
      const goal = await goalService.createGoal(userId, goalWithAccount);
      console.log(`💰 [SavingsService] ✅ Objectif créé: ${goal.id}`);
      
      // STEP 3: Mettre à jour le compte avec linkedGoalId et autoSync
      const updatedAccount = await accountService.updateAccount(
        account.id,
        userId,
        { linkedGoalId: goal.id }
      );
      
      if (!updatedAccount) {
        throw new Error('Échec de la mise à jour du compte avec linkedGoalId');
      }
      
      // STEP 4: Activer autoSync sur le goal
      const updatedGoal = await goalService.updateGoal(goal.id, userId, {
        ...goalData,
        linkedAccountId: account.id
      });
      
      // Mettre à jour autoSync dans IndexedDB directement
      const goalWithAutoSync: Goal = {
        ...updatedGoal,
        autoSync: true
      };
      await db.goals.put(goalWithAutoSync);
      
      console.log('💰 [SavingsService] ✅ Objectif et compte liés avec succès');
      
      return {
        goal: goalWithAutoSync,
        account: updatedAccount
      };
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la création de l\'objectif avec compte:', error);
      throw error;
    }
  }

  /**
   * Lier un objectif existant à un compte existant
   * 
   * @param goalId - ID de l'objectif
   * @param accountId - ID du compte
   */
  async linkGoalToAccount(goalId: string, accountId: string): Promise<void> {
    try {
      console.log(`💰 [SavingsService] Liaison de l'objectif ${goalId} au compte ${accountId}...`);
      
      // STEP 1: Récupérer l'objectif et le compte
      const goal = await goalService.getGoal(goalId);
      if (!goal) {
        throw new Error(`Objectif ${goalId} non trouvé`);
      }
      
      const account = await accountService.getAccount(accountId);
      if (!account) {
        throw new Error(`Compte ${accountId} non trouvé`);
      }
      
      // STEP 2: Mettre à jour l'objectif avec linkedAccountId
      await goalService.updateGoal(goalId, goal.userId, {
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline,
        category: goal.category,
        priority: goal.priority,
        linkedAccountId: accountId
      });
      
      // Activer autoSync
      const goalWithAutoSync: Goal = {
        ...goal,
        linkedAccountId: accountId,
        autoSync: true
      };
      await db.goals.put(goalWithAutoSync);
      
      // STEP 3: Mettre à jour le compte avec linkedGoalId
      await accountService.updateAccount(accountId, account.userId, {
        linkedGoalId: goalId
      });
      
      console.log('💰 [SavingsService] ✅ Objectif et compte liés avec succès');
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la liaison:', error);
      throw error;
    }
  }

  /**
   * Délier un objectif de son compte associé
   * 
   * @param goalId - ID de l'objectif
   */
  async unlinkGoalFromAccount(goalId: string): Promise<void> {
    try {
      console.log(`💰 [SavingsService] Déliaison de l'objectif ${goalId}...`);
      
      // STEP 1: Récupérer l'objectif
      const goal = await goalService.getGoal(goalId);
      if (!goal) {
        throw new Error(`Objectif ${goalId} non trouvé`);
      }
      
      const linkedAccountId = goal.linkedAccountId;
      if (!linkedAccountId) {
        console.log('💰 [SavingsService] ⚠️ Aucun compte lié à cet objectif');
        return;
      }
      
      // STEP 2: Récupérer le compte
      const account = await accountService.getAccount(linkedAccountId);
      if (!account) {
        console.warn(`💰 [SavingsService] ⚠️ Compte ${linkedAccountId} non trouvé, suppression du lien uniquement`);
      } else {
        // STEP 3: Supprimer linkedGoalId du compte
        await accountService.updateAccount(linkedAccountId, account.userId, {
          linkedGoalId: undefined
        });
      }
      
      // STEP 4: Supprimer linkedAccountId de l'objectif et désactiver autoSync
      await goalService.updateGoal(goalId, goal.userId, {
        name: goal.name,
        targetAmount: goal.targetAmount,
        deadline: goal.deadline,
        category: goal.category,
        priority: goal.priority,
        linkedAccountId: undefined
      });
      
      // Désactiver autoSync
      const goalWithoutAutoSync: Goal = {
        ...goal,
        linkedAccountId: undefined,
        autoSync: false
      };
      await db.goals.put(goalWithoutAutoSync);
      
      console.log('💰 [SavingsService] ✅ Objectif et compte déliés avec succès');
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la déliaison:', error);
      throw error;
    }
  }

  /**
   * Synchroniser un objectif avec son compte associé
   * Met à jour currentAmount avec le solde du compte
   * 
   * @param goalId - ID de l'objectif
   * @returns Objectif mis à jour
   */
  async syncGoalWithAccount(goalId: string): Promise<Goal> {
    try {
      console.log(`💰 [SavingsService] Synchronisation de l'objectif ${goalId}...`);
      
      // STEP 1: Récupérer l'objectif
      const goal = await goalService.getGoal(goalId);
      if (!goal) {
        throw new Error(`Objectif ${goalId} non trouvé`);
      }
      
      if (!goal.linkedAccountId) {
        throw new Error(`Objectif ${goalId} n'a pas de compte lié`);
      }
      
      // STEP 2: Récupérer le compte
      const account = await accountService.getAccount(goal.linkedAccountId);
      if (!account) {
        throw new Error(`Compte ${goal.linkedAccountId} non trouvé`);
      }
      
      // STEP 3: Mettre à jour currentAmount avec le solde du compte
      const updatedGoal: Goal = {
        ...goal,
        currentAmount: account.balance
      };
      
      // Vérifier si l'objectif est complété
      if (account.balance >= goal.targetAmount && !goal.isCompleted) {
        updatedGoal.isCompleted = true;
        console.log(`💰 [SavingsService] 🎉 Objectif "${goal.name}" complété !`);
      } else if (account.balance < goal.targetAmount && goal.isCompleted) {
        updatedGoal.isCompleted = false;
      }
      
      // STEP 4: Sauvegarder dans IndexedDB
      await db.goals.put(updatedGoal);
      
      // STEP 5: Synchroniser avec Supabase si online
      if (navigator.onLine) {
        try {
          const { error } = await supabase
            .from('goals')
            .update({
              current_amount: account.balance,
              is_completed: updatedGoal.isCompleted
            })
            .eq('id', goalId);
          
          if (error) {
            console.error('💰 [SavingsService] ⚠️ Erreur lors de la synchronisation Supabase:', error);
          } else {
            console.log('💰 [SavingsService] ✅ Synchronisation Supabase réussie');
          }
        } catch (syncError) {
          console.error('💰 [SavingsService] ⚠️ Erreur lors de la synchronisation Supabase:', syncError);
        }
      }
      
      console.log(`💰 [SavingsService] ✅ Objectif synchronisé: ${account.balance} Ar / ${goal.targetAmount} Ar`);
      
      return updatedGoal;
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la synchronisation:', error);
      throw error;
    }
  }

  /**
   * Synchroniser tous les objectifs avec autoSync activé
   * 
   * @param userId - ID de l'utilisateur
   */
  async syncAllGoalsWithAccounts(userId: string): Promise<void> {
    try {
      console.log(`💰 [SavingsService] Synchronisation de tous les objectifs pour l'utilisateur ${userId}...`);
      
      // STEP 1: Récupérer tous les objectifs
      const goals = await goalService.getGoals(userId);
      
      // STEP 2: Filtrer les objectifs avec autoSync activé
      const goalsToSync = goals.filter(goal => goal.autoSync === true && goal.linkedAccountId);
      
      if (goalsToSync.length === 0) {
        console.log('💰 [SavingsService] ℹ️ Aucun objectif à synchroniser');
        return;
      }
      
      console.log(`💰 [SavingsService] 📊 ${goalsToSync.length} objectif(s) à synchroniser`);
      
      // STEP 3: Synchroniser chaque objectif
      const syncResults = await Promise.allSettled(
        goalsToSync.map(goal => this.syncGoalWithAccount(goal.id))
      );
      
      // STEP 4: Analyser les résultats
      const successful = syncResults.filter(r => r.status === 'fulfilled').length;
      const failed = syncResults.filter(r => r.status === 'rejected').length;
      
      console.log(`💰 [SavingsService] ✅ Synchronisation terminée: ${successful} réussie(s), ${failed} échec(s)`);
      
      if (failed > 0) {
        syncResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            console.error(`💰 [SavingsService] ❌ Échec pour l'objectif ${goalsToSync[index].id}:`, result.reason);
          }
        });
      }
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la synchronisation globale:', error);
      throw error;
    }
  }

  /**
   * Récupérer tous les comptes d'épargne
   * 
   * @param userId - ID de l'utilisateur
   * @returns Liste des comptes d'épargne triés par nom
   */
  async getSavingsAccounts(userId: string): Promise<Account[]> {
    try {
      console.log(`💰 [SavingsService] Récupération des comptes d'épargne pour l'utilisateur ${userId}...`);
      
      const accounts = await accountService.getUserAccounts(userId);
      
      // Filtrer les comptes d'épargne
      const savingsAccounts = accounts.filter(
        account => account.type === 'epargne' || account.isSavingsAccount === true
      );
      
      // Trier par nom
      const sortedAccounts = savingsAccounts.sort((a, b) => 
        a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })
      );
      
      console.log(`💰 [SavingsService] ✅ ${sortedAccounts.length} compte(s) d'épargne trouvé(s)`);
      
      return sortedAccounts;
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la récupération des comptes d'épargne:', error);
      return [];
    }
  }

  /**
   * Calculer le total d'épargne de tous les comptes d'épargne
   * 
   * @param userId - ID de l'utilisateur
   * @returns Total des soldes des comptes d'épargne
   */
  async getTotalSavings(userId: string): Promise<number> {
    try {
      console.log(`💰 [SavingsService] Calcul du total d'épargne pour l'utilisateur ${userId}...`);
      
      const savingsAccounts = await this.getSavingsAccounts(userId);
      
      const total = savingsAccounts.reduce((sum, account) => sum + account.balance, 0);
      
      console.log(`💰 [SavingsService] ✅ Total d'épargne: ${total.toLocaleString('fr-FR')} Ar`);
      
      return total;
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors du calcul du total d'épargne:', error);
      return 0;
    }
  }

  /**
   * Calculer l'épargne projetée avec intérêts composés
   * 
   * @param accountId - ID du compte
   * @param months - Nombre de mois pour la projection
   * @returns Montant projeté avec intérêts
   */
  async calculateProjectedSavings(accountId: string, months: number): Promise<number> {
    try {
      console.log(`💰 [SavingsService] Calcul de l'épargne projetée pour le compte ${accountId} sur ${months} mois...`);
      
      const account = await accountService.getAccount(accountId);
      if (!account) {
        throw new Error(`Compte ${accountId} non trouvé`);
      }
      
      const balance = account.balance;
      const interestRate = account.interestRate || 0; // Taux d'intérêt annuel en %
      
      if (interestRate === 0) {
        console.log('💰 [SavingsService] ℹ️ Aucun taux d'intérêt, retour du solde actuel');
        return balance;
      }
      
      // Calcul des intérêts composés mensuels
      // Formule: balance * (1 + rate/12)^months
      const monthlyRate = interestRate / 100 / 12; // Taux mensuel décimal
      const projectedAmount = balance * Math.pow(1 + monthlyRate, months);
      
      console.log(`💰 [SavingsService] ✅ Épargne projetée: ${projectedAmount.toLocaleString('fr-FR')} Ar (taux: ${interestRate}% annuel)`);
      
      return Math.round(projectedAmount * 100) / 100; // Arrondir à 2 décimales
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors du calcul de l'épargne projetée:', error);
      throw error;
    }
  }

  /**
   * Suggérer un objectif de fonds d'urgence
   * 
   * @param userId - ID de l'utilisateur
   * @param monthlyExpenses - Dépenses mensuelles moyennes
   * @returns Données de formulaire pour l'objectif de fonds d'urgence
   */
  suggestEmergencyFundGoal(userId: string, monthlyExpenses: number): GoalFormData {
    try {
      console.log(`💰 [SavingsService] Suggestion d'un fonds d'urgence basé sur ${monthlyExpenses.toLocaleString('fr-FR')} Ar de dépenses mensuelles...`);
      
      // Calculer le montant cible (6 mois de dépenses)
      const targetAmount = monthlyExpenses * 6;
      
      // Calculer la date limite (6 mois à partir d'aujourd'hui)
      const deadline = new Date();
      deadline.setMonth(deadline.getMonth() + 6);
      
      const goalData: GoalFormData = {
        name: "Fonds d'urgence",
        targetAmount: Math.round(targetAmount),
        deadline: deadline,
        category: 'urgence',
        priority: 'high'
      };
      
      console.log(`💰 [SavingsService] ✅ Objectif suggéré: ${targetAmount.toLocaleString('fr-FR')} Ar (6 mois)`);
      
      return goalData;
    } catch (error) {
      console.error('💰 [SavingsService] ❌ Erreur lors de la suggestion du fonds d'urgence:', error);
      throw error;
    }
  }
}

export const savingsService = new SavingsService();
export default savingsService;

