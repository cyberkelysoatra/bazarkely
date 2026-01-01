/**
 * Goal Suggestion Service - BazarKELY
 * Service intelligent de suggestion d'objectifs d'épargne basé sur le profil financier
 * Guide les utilisateurs malgaches à travers un parcours d'éducation financière structuré
 * 
 * @version 1.0
 * @date 2025-01-XX
 * @author BazarKELY Team
 */

import transactionService from './transactionService';
import goalService from './goalService';
import accountService from './accountService';
import { db } from '../lib/database';
import { supabase } from '../lib/supabase';
import type { Goal, GoalFormData } from '../types';
import type {
  FinancialProfile,
  GoalSuggestion,
  SuggestionType,
  MilestoneType,
  GoalMilestone
} from '../types/suggestions';

/**
 * Clé de stockage pour les suggestions rejetées
 */
const DISMISSED_SUGGESTIONS_KEY = 'bazarkely_dismissed_suggestions';

/**
 * Interface pour les suggestions rejetées stockées
 */
interface DismissedSuggestion {
  type: SuggestionType;
  dismissedAt: string; // ISO date string
  expiresAt: string; // ISO date string (30 jours après)
}

class GoalSuggestionService {
  /**
   * Analyser le profil financier de l'utilisateur
   * 
   * @param userId - ID de l'utilisateur
   * @returns Profil financier complet
   */
  async analyzeFinancialProfile(userId: string): Promise<FinancialProfile> {
    try {
      console.log(`💡 [GoalSuggestionService] Analyse du profil financier pour l'utilisateur ${userId}...`);
      
      // STEP 1: Récupérer les transactions des 3 derniers mois
      const allTransactions = await transactionService.getTransactions();
      const now = new Date();
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      
      const recentTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= threeMonthsAgo && t.userId === userId;
      });
      
      console.log(`💡 [GoalSuggestionService] 📊 ${recentTransactions.length} transaction(s) sur les 3 derniers mois`);
      
      // STEP 2: Calculer les revenus mensuels moyens
      const incomeTransactions = recentTransactions.filter(t => t.type === 'income');
      const totalIncome = incomeTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const monthlyIncome = totalIncome / 3; // Moyenne sur 3 mois
      
      console.log(`💡 [GoalSuggestionService] 💰 Revenus mensuels moyens: ${monthlyIncome.toLocaleString('fr-FR')} Ar`);
      
      // STEP 3: Calculer les dépenses mensuelles moyennes
      const expenseTransactions = recentTransactions.filter(t => t.type === 'expense');
      const totalExpenses = expenseTransactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const monthlyExpenses = totalExpenses / 3; // Moyenne sur 3 mois
      
      console.log(`💡 [GoalSuggestionService] 💸 Dépenses mensuelles moyennes: ${monthlyExpenses.toLocaleString('fr-FR')} Ar`);
      
      // STEP 4: Calculer le taux d'épargne
      const savingsRate = monthlyIncome > 0 
        ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 
        : 0;
      
      console.log(`💡 [GoalSuggestionService] 📈 Taux d'épargne: ${savingsRate.toFixed(1)}%`);
      
      // STEP 5: Vérifier le fonds d'urgence
      const goals = await goalService.getGoals(userId);
      const emergencyFundGoals = goals.filter(g => 
        g.category === 'urgence' || 
        g.name.toLowerCase().includes('urgence') ||
        g.name.toLowerCase().includes('fonds d\'urgence')
      );
      
      let hasEmergencyFund = false;
      let emergencyFundMonths = 0;
      
      if (emergencyFundGoals.length > 0) {
        const activeEmergencyFund = emergencyFundGoals.find(g => !g.isCompleted);
        if (activeEmergencyFund) {
          hasEmergencyFund = true;
          // Calculer combien de mois couvre le fonds d'urgence
          const fundAmount = activeEmergencyFund.currentAmount;
          emergencyFundMonths = monthlyExpenses > 0 ? fundAmount / monthlyExpenses : 0;
        } else {
          // Tous les fonds d'urgence sont complétés, prendre le plus récent
          const completedFund = emergencyFundGoals
            .filter(g => g.isCompleted)
            .sort((a, b) => new Date(b.deadline).getTime() - new Date(a.deadline).getTime())[0];
          if (completedFund) {
            hasEmergencyFund = true;
            emergencyFundMonths = monthlyExpenses > 0 ? completedFund.targetAmount / monthlyExpenses : 0;
          }
        }
      }
      
      console.log(`💡 [GoalSuggestionService] 🛡️ Fonds d'urgence: ${hasEmergencyFund ? 'Oui' : 'Non'} (${emergencyFundMonths.toFixed(1)} mois)`);
      
      // STEP 6: Calculer les dettes (transactions avec catégories liées aux dettes ou montants négatifs)
      const debtKeywords = ['dette', 'prêt', 'emprunt', 'remboursement', 'crédit'];
      const debtTransactions = recentTransactions.filter(t => 
        t.type === 'expense' && 
        (debtKeywords.some(keyword => t.description?.toLowerCase().includes(keyword)) ||
         t.amount < 0)
      );
      const debtAmount = Math.abs(debtTransactions.reduce((sum, t) => sum + t.amount, 0));
      
      // Vérifier aussi les objectifs de remboursement
      const debtGoals = goals.filter(g => 
        g.name.toLowerCase().includes('dette') ||
        g.name.toLowerCase().includes('remboursement') ||
        g.category === 'dette'
      );
      const debtFromGoals = debtGoals.reduce((sum, g) => sum + (g.targetAmount - g.currentAmount), 0);
      
      const totalDebt = debtAmount + debtFromGoals;
      
      console.log(`💡 [GoalSuggestionService] 💳 Dettes totales: ${totalDebt.toLocaleString('fr-FR')} Ar`);
      
      // STEP 7: Compter les objectifs existants
      const existingGoalsCount = goals.filter(g => !g.isCompleted).length;
      const completedGoalsCount = goals.filter(g => g.isCompleted).length;
      
      console.log(`💡 [GoalSuggestionService] 🎯 Objectifs: ${existingGoalsCount} actif(s), ${completedGoalsCount} complété(s)`);
      
      const profile: FinancialProfile = {
        monthlyIncome: Math.round(monthlyIncome),
        monthlyExpenses: Math.round(monthlyExpenses),
        savingsRate: Math.round(savingsRate * 100) / 100,
        hasEmergencyFund,
        emergencyFundMonths: Math.round(emergencyFundMonths * 10) / 10,
        debtAmount: Math.round(totalDebt),
        existingGoalsCount,
        completedGoalsCount
      };
      
      console.log(`💡 [GoalSuggestionService] ✅ Profil financier analysé avec succès`);
      
      return profile;
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors de l'analyse du profil financier:`, error);
      throw error;
    }
  }

  /**
   * Calculer une échéance adaptative basée sur la capacité d'épargne de l'utilisateur
   * 
   * @param targetAmount - Montant cible à atteindre
   * @param maxMonthlyContribution - Contribution mensuelle maximale possible
   * @returns Nombre de mois nécessaires (avec buffer de 20%, max 60 mois)
   */
  private calculateAdaptiveDeadline(targetAmount: number, maxMonthlyContribution: number): number {
    if (maxMonthlyContribution <= 0) {
      return 60; // Retourner le maximum si pas de capacité d'épargne
    }
    
    // Calculer les mois nécessaires
    const monthsNeeded = Math.ceil(targetAmount / maxMonthlyContribution);
    
    // Ajouter 20% de buffer pour la sécurité
    const monthsWithBuffer = Math.ceil(monthsNeeded * 1.2);
    
    // Limiter à 60 mois (5 ans) maximum pour rester réaliste
    return Math.min(monthsWithBuffer, 60);
  }

  /**
   * Générer des suggestions d'objectifs basées sur le profil financier
   * 
   * @param profile - Profil financier de l'utilisateur
   * @returns Liste de suggestions prioritaires (max 3)
   */
  generateSuggestions(profile: FinancialProfile): GoalSuggestion[] {
    try {
      console.log(`💡 [GoalSuggestionService] Génération de suggestions basées sur le profil...`);
      
      const suggestions: GoalSuggestion[] = [];
      const disposableIncome = profile.monthlyIncome - profile.monthlyExpenses;
      const maxMonthlyContribution = disposableIncome * 0.3; // Max 30% du revenu disponible
      
      // PRIORITÉ 1: Fonds d'urgence 3 mois (si couverture < 3 mois)
      if (profile.emergencyFundMonths < 3) {
        const targetAmount = profile.monthlyExpenses * 3;
        
        // Calculer l'échéance adaptative
        const adaptiveMonths = this.calculateAdaptiveDeadline(targetAmount, maxMonthlyContribution);
        
        // Ne suggérer que si l'échéance adaptative est réaliste (<= 60 mois)
        if (adaptiveMonths <= 60) {
          const deadline = new Date();
          deadline.setMonth(deadline.getMonth() + adaptiveMonths);
          
          // Utiliser la contribution mensuelle maximale pour accélérer l'atteinte de l'objectif
          const monthlyContribution = maxMonthlyContribution;
          
          console.log(`💡 [GoalSuggestionService] ➕ Adding suggestion: savings_3months (coverage: ${profile.emergencyFundMonths.toFixed(1)} months < 3)`);
          console.log(`💡 [GoalSuggestionService] 📅 Emergency fund: target ${targetAmount.toLocaleString('fr-FR')} Ar, adaptive deadline ${adaptiveMonths} months, contribution ${monthlyContribution.toLocaleString('fr-FR')} Ar/month`);
          
          suggestions.push({
            type: 'savings_3months',
            title: "Fonds d'urgence - 3 mois",
            description: "Constituez une réserve couvrant 3 mois de dépenses pour faire face aux imprévus",
            targetAmount: Math.round(targetAmount),
            deadline: deadline.toISOString(),
            priority: 'high',
            reasoning: "Sans épargne de précaution, un imprévu (maladie, perte d'emploi) peut vous endetter. C'est la première étape vers la sécurité financière.",
            requiredMonthlyContribution: Math.round(monthlyContribution),
            icon: 'Shield',
            category: 'epargne'
          });
        } else {
          console.log(`💡 [GoalSuggestionService] ⏭️ Skipping savings_3months: adaptive deadline (${adaptiveMonths} months) exceeds 60 months (unrealistic)`);
        }
      } else {
        console.log(`💡 [GoalSuggestionService] ⏭️ Skipping savings_3months: already has ${profile.emergencyFundMonths.toFixed(1)} months coverage (>= 3)`);
      }
      
      // PRIORITÉ 2: Fonds d'urgence 6 mois (si seulement 3 mois)
      if (profile.emergencyFundMonths >= 3 && profile.emergencyFundMonths < 6) {
        const targetAmount = profile.monthlyExpenses * 6;
        const remainingAmount = targetAmount - (profile.monthlyExpenses * profile.emergencyFundMonths);
        
        // Calculer l'échéance adaptative pour le montant restant
        const adaptiveMonths = this.calculateAdaptiveDeadline(remainingAmount, maxMonthlyContribution);
        
        if (adaptiveMonths <= 60) {
          const deadline = new Date();
          deadline.setMonth(deadline.getMonth() + adaptiveMonths);
          
          const monthlyContribution = maxMonthlyContribution;
          
          console.log(`💡 [GoalSuggestionService] ➕ Adding suggestion: savings_6months (coverage: ${profile.emergencyFundMonths.toFixed(1)} months, extending to 6)`);
          console.log(`💡 [GoalSuggestionService] 📅 Emergency fund 6 months: remaining ${remainingAmount.toLocaleString('fr-FR')} Ar, adaptive deadline ${adaptiveMonths} months`);
          
          suggestions.push({
            type: 'savings_6months',
            title: "Fonds d'urgence - 6 mois",
            description: "Étendez votre réserve à 6 mois pour une sécurité maximale",
            targetAmount: Math.round(targetAmount),
            deadline: deadline.toISOString(),
            priority: 'high',
            reasoning: "Avec 6 mois de réserve, vous êtes protégé contre les crises prolongées comme une longue maladie ou une recherche d'emploi difficile.",
            requiredMonthlyContribution: Math.round(monthlyContribution),
            icon: 'ShieldCheck',
            category: 'epargne'
          });
        } else {
          console.log(`💡 [GoalSuggestionService] ⏭️ Skipping savings_6months: adaptive deadline (${adaptiveMonths} months) exceeds 60 months`);
        }
      } else if (profile.emergencyFundMonths >= 6) {
        console.log(`💡 [GoalSuggestionService] ⏭️ Skipping savings_6months: already has ${profile.emergencyFundMonths.toFixed(1)} months coverage (>= 6)`);
      }
      
      // PRIORITÉ 3: Remboursement des dettes (si dettes existent)
      if (profile.debtAmount > 0 && suggestions.length < 3) {
        const targetAmount = profile.debtAmount;
        
        // Calculer l'échéance adaptative
        const adaptiveMonths = this.calculateAdaptiveDeadline(targetAmount, maxMonthlyContribution);
        
        if (adaptiveMonths <= 60) {
          const deadline = new Date();
          deadline.setMonth(deadline.getMonth() + adaptiveMonths);
          
          const monthlyContribution = maxMonthlyContribution;
          
          console.log(`💡 [GoalSuggestionService] ➕ Adding suggestion: debt_payoff (debts: ${profile.debtAmount.toLocaleString('fr-FR')} Ar)`);
          console.log(`💡 [GoalSuggestionService] 📅 Debt payoff: target ${targetAmount.toLocaleString('fr-FR')} Ar, adaptive deadline ${adaptiveMonths} months, contribution ${monthlyContribution.toLocaleString('fr-FR')} Ar/month`);
          
          suggestions.push({
            type: 'debt_payoff',
            title: "Remboursement des dettes",
            description: "Éliminez vos dettes pour libérer votre budget mensuel",
            targetAmount: Math.round(targetAmount),
            deadline: deadline.toISOString(),
            priority: 'high',
            reasoning: "Les dettes coûtent des intérêts chaque mois. Les rembourser libère de l'argent pour épargner et investir.",
            requiredMonthlyContribution: Math.round(monthlyContribution),
            icon: 'CreditCard',
            category: 'autre'
          });
        } else {
          console.log(`💡 [GoalSuggestionService] ⏭️ Skipping debt_payoff: adaptive deadline (${adaptiveMonths} months) exceeds 60 months (unrealistic)`);
        }
      } else if (profile.debtAmount === 0) {
        console.log(`💡 [GoalSuggestionService] ⏭️ Skipping debt_payoff: no debts detected`);
      }
      
      // PRIORITÉ 4: Épargne vacances (si fonds d'urgence OK OU taux d'épargne positif)
      // Utiliser un montant cible basé sur la capacité d'épargne (6 mois de max saving)
      if ((profile.emergencyFundMonths >= 3 || profile.savingsRate > 0) && 
          suggestions.length < 3) {
        const targetAmount = maxMonthlyContribution * 6; // 6 mois d'épargne maximale
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 6); // 6 mois pour un objectif réalisable
        
        const monthlyContribution = maxMonthlyContribution;
        
        console.log(`💡 [GoalSuggestionService] ➕ Adding suggestion: vacation (emergency fund: ${profile.emergencyFundMonths.toFixed(1)} months, savings rate: ${profile.savingsRate.toFixed(1)}%)`);
        console.log(`💡 [GoalSuggestionService] 📅 Vacation: target ${targetAmount.toLocaleString('fr-FR')} Ar (6 months × max), deadline 6 months, contribution ${monthlyContribution.toLocaleString('fr-FR')} Ar/month`);
        
        suggestions.push({
          type: 'vacation',
          title: "Épargne vacances",
          description: "Préparez vos prochaines vacances sans stress financier",
          targetAmount: Math.round(targetAmount),
          deadline: deadline.toISOString(),
          priority: 'medium',
          reasoning: "Épargner à l'avance évite de s'endetter pour les loisirs et permet de profiter sereinement.",
          requiredMonthlyContribution: Math.round(monthlyContribution),
          icon: 'Palmtree',
          category: 'vacances'
        });
      } else {
        console.log(`💡 [GoalSuggestionService] ⏭️ Skipping vacation: emergency fund (${profile.emergencyFundMonths.toFixed(1)} months) < 3 AND savings rate (${profile.savingsRate.toFixed(1)}%) <= 0`);
      }
      
      // PRIORITÉ 5: Investissement éducation (si revenus stables ET taux d'épargne positif)
      // Utiliser un montant cible basé sur la capacité d'épargne (12 mois de max saving)
      if (profile.monthlyIncome > 500000 && profile.savingsRate > 0 && 
          suggestions.length < 3) {
        const targetAmount = maxMonthlyContribution * 12; // 12 mois d'épargne maximale
        const deadline = new Date();
        deadline.setMonth(deadline.getMonth() + 12); // 12 mois pour un objectif réalisable
        
        const monthlyContribution = maxMonthlyContribution;
        
        console.log(`💡 [GoalSuggestionService] ➕ Adding suggestion: education (income: ${profile.monthlyIncome.toLocaleString('fr-FR')} Ar, savings rate: ${profile.savingsRate.toFixed(1)}%)`);
        console.log(`💡 [GoalSuggestionService] 📅 Education: target ${targetAmount.toLocaleString('fr-FR')} Ar (12 months × max), deadline 12 months, contribution ${monthlyContribution.toLocaleString('fr-FR')} Ar/month`);
        
        suggestions.push({
          type: 'education',
          title: "Investissement éducation",
          description: "Financez une formation pour augmenter vos revenus",
          targetAmount: Math.round(targetAmount),
          deadline: deadline.toISOString(),
          priority: 'medium',
          reasoning: "Investir dans vos compétences peut augmenter significativement vos revenus futurs.",
          requiredMonthlyContribution: Math.round(monthlyContribution),
          icon: 'GraduationCap',
          category: 'education'
        });
      } else {
        console.log(`💡 [GoalSuggestionService] ⏭️ Skipping education: income (${profile.monthlyIncome.toLocaleString('fr-FR')} Ar) <= 500,000 OR savings rate (${profile.savingsRate.toFixed(1)}%) <= 0`);
      }
      
      console.log(`💡 [GoalSuggestionService] ✅ ${suggestions.length} suggestion(s) générée(s)`);
      
      if (suggestions.length === 0) {
        console.log(`💡 [GoalSuggestionService] ⚠️ Aucune suggestion générée. Profil: emergencyFundMonths=${profile.emergencyFundMonths.toFixed(1)}, debtAmount=${profile.debtAmount.toLocaleString('fr-FR')} Ar, savingsRate=${profile.savingsRate.toFixed(1)}%`);
      }
      
      return suggestions.slice(0, 3); // Retourner max 3 suggestions
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors de la génération des suggestions:`, error);
      return [];
    }
  }

  /**
   * Récupérer les suggestions pour un utilisateur
   * 
   * @param userId - ID de l'utilisateur
   * @returns Liste de suggestions filtrées et prioritaires
   */
  async getSuggestionsForUser(userId: string): Promise<GoalSuggestion[]> {
    try {
      console.log(`💡 [GoalSuggestionService] Récupération des suggestions pour l'utilisateur ${userId}...`);
      
      // STEP 1: Analyser le profil financier
      const profile = await this.analyzeFinancialProfile(userId);
      
      // STEP 2: Générer les suggestions
      const allSuggestions = this.generateSuggestions(profile);
      
      // STEP 3: Récupérer les objectifs existants pour filtrer
      const goals = await goalService.getGoals(userId);
      const existingSuggestionTypes = new Set<string>();
      
      // Filtrer seulement les objectifs NON complétés avec un type de suggestion
      goals.forEach(goal => {
        if (goal.suggestionType && !goal.isCompleted) {
          existingSuggestionTypes.add(goal.suggestionType);
          console.log(`💡 [GoalSuggestionService] 🔍 Found existing non-completed goal with suggestionType: ${goal.suggestionType}`);
        }
      });
      
      // STEP 4: Récupérer les suggestions rejetées
      const dismissedSuggestions = this.getDismissedSuggestions();
      const dismissedTypes = new Set<string>(
        dismissedSuggestions
          .filter(d => new Date(d.expiresAt) > new Date())
          .map(d => d.type)
      );
      
      // STEP 5: Filtrer les suggestions avec logging détaillé
      const filteredSuggestions = allSuggestions.filter(suggestion => {
        // Exclure si l'utilisateur a déjà un objectif NON complété de ce type
        if (existingSuggestionTypes.has(suggestion.type)) {
          console.log(`💡 [GoalSuggestionService] ⏭️ Skipping ${suggestion.type}: already has non-completed goal with this suggestionType`);
          return false;
        }
        
        // Exclure si la suggestion a été rejetée récemment
        if (dismissedTypes.has(suggestion.type)) {
          console.log(`💡 [GoalSuggestionService] ⏭️ Skipping ${suggestion.type}: dismissed within last 30 days`);
          return false;
        }
        
        console.log(`💡 [GoalSuggestionService] ✅ Keeping suggestion: ${suggestion.type} (${suggestion.title})`);
        return true;
      });
      
      console.log(`💡 [GoalSuggestionService] ✅ ${filteredSuggestions.length} suggestion(s) disponible(s) après filtrage`);
      
      return filteredSuggestions;
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors de la récupération des suggestions:`, error);
      return [];
    }
  }

  /**
   * Accepter une suggestion et créer l'objectif correspondant
   * 
   * @param userId - ID de l'utilisateur
   * @param suggestion - Suggestion à accepter
   * @returns Objectif créé
   */
  async acceptSuggestion(userId: string, suggestion: GoalSuggestion): Promise<Goal> {
    try {
      console.log(`💡 [GoalSuggestionService] Acceptation de la suggestion "${suggestion.title}"...`);
      
      // Créer les données de l'objectif
      const goalData: GoalFormData = {
        name: suggestion.title,
        targetAmount: suggestion.targetAmount,
        deadline: suggestion.deadline ? new Date(suggestion.deadline) : new Date(),
        category: suggestion.category,
        priority: suggestion.priority
      };
      
      // Créer l'objectif via goalService
      const goal = await goalService.createGoal(userId, goalData);
      
      // Mettre à jour avec les métadonnées de suggestion
      const goalWithSuggestion: Goal = {
        ...goal,
        isSuggested: true,
        suggestionType: suggestion.type,
        suggestionAcceptedAt: new Date().toISOString()
      };
      
      // Sauvegarder dans IndexedDB
      await db.goals.put(goalWithSuggestion);
      
      // Synchroniser avec Supabase si online
      if (navigator.onLine) {
        try {
          await supabase
            .from('goals')
            .update({
              is_suggested: true,
              suggestion_type: suggestion.type,
              suggestion_accepted_at: goalWithSuggestion.suggestionAcceptedAt
            })
            .eq('id', goal.id);
        } catch (syncError) {
          console.error(`💡 [GoalSuggestionService] ⚠️ Erreur lors de la synchronisation Supabase:`, syncError);
        }
      }
      
      console.log(`💡 [GoalSuggestionService] ✅ Objectif créé: ${goal.id}`);
      
      return goalWithSuggestion;
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors de l'acceptation de la suggestion:`, error);
      throw error;
    }
  }

  /**
   * Rejeter une suggestion
   * 
   * @param userId - ID de l'utilisateur
   * @param suggestionType - Type de suggestion à rejeter
   */
  async dismissSuggestion(userId: string, suggestionType: SuggestionType): Promise<void> {
    try {
      console.log(`💡 [GoalSuggestionService] Rejet de la suggestion de type "${suggestionType}"...`);
      
      // Récupérer les suggestions rejetées existantes
      const dismissedSuggestions = this.getDismissedSuggestions();
      
      // Ajouter la nouvelle suggestion rejetée
      const dismissedAt = new Date();
      const expiresAt = new Date(dismissedAt);
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 jours
      
      const newDismissed: DismissedSuggestion = {
        type: suggestionType,
        dismissedAt: dismissedAt.toISOString(),
        expiresAt: expiresAt.toISOString()
      };
      
      // Supprimer les anciennes entrées du même type
      const filtered = dismissedSuggestions.filter(d => d.type !== suggestionType);
      filtered.push(newDismissed);
      
      // Sauvegarder dans localStorage
      localStorage.setItem(DISMISSED_SUGGESTIONS_KEY, JSON.stringify(filtered));
      
      console.log(`💡 [GoalSuggestionService] ✅ Suggestion rejetée (ne sera plus affichée pendant 30 jours)`);
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors du rejet de la suggestion:`, error);
      throw error;
    }
  }

  /**
   * Vérifie et retourne les jalons atteints pour un goal
   * 
   * @param goal - Objectif à analyser
   * @returns Type de jalon atteint ou null
   */
  checkMilestones(goal: Goal): MilestoneType | null {
    const percentage = goal.targetAmount > 0 
      ? (goal.currentAmount / goal.targetAmount) * 100 
      : 0;

    if (percentage >= 100) return 'completed';
    if (percentage >= 75) return 'three_quarters';
    if (percentage >= 50) return 'half';
    if (percentage >= 25) return 'quarter';
    if (percentage > 0) return 'started';

    return null;
  }

  /**
   * Marque un jalon comme célébré
   * 
   * @param goalId - ID de l'objectif
   * @param milestone - Type de jalon à marquer
   */
  async markMilestoneCelebrated(goalId: string, milestone: MilestoneType): Promise<void> {
    try {
      const goal = await db.goals.get(goalId);
      if (!goal) return;

      const milestones = goal.milestones || [];
      const existingMilestone = milestones.find((m: any) => m.milestoneType === milestone);

      if (existingMilestone) {
        existingMilestone.celebrationShown = true;
        existingMilestone.achievedAt = new Date().toISOString();
      } else {
        const orderMap: Record<MilestoneType, number> = {
          started: 1,
          quarter: 2,
          half: 3,
          three_quarters: 4,
          completed: 5,
          exceeded: 6
        };
        const percentageMap: Record<MilestoneType, number> = {
          started: 1,
          quarter: 25,
          half: 50,
          three_quarters: 75,
          completed: 100,
          exceeded: 100
        };

        milestones.push({
          id: `${goalId}-${milestone}`,
          goalId,
          orderId: orderMap[milestone] || 0,
          milestoneType: milestone,
          percentageReached: percentageMap[milestone] || 0,
          achievedAt: new Date().toISOString(),
          celebrationShown: true,
          createdAt: new Date().toISOString()
        });
      }

      await db.goals.update(goalId, { milestones });
    } catch (error) {
      console.error('Erreur lors du marquage du jalon:', error);
    }
  }

  /**
   * Obtenir le prochain jalon à atteindre pour un objectif
   * 
   * @param goal - Objectif à analyser
   * @returns Type de jalon suivant ou null si tous atteints
   */
  getNextMilestone(goal: Goal): MilestoneType | null {
    try {
      const percentage = goal.targetAmount > 0 
        ? (goal.currentAmount / goal.targetAmount) * 100 
        : 0;
      
      // Récupérer les jalons déjà atteints
      // Note: On devrait vérifier dans la base de données, mais pour simplifier on calcule directement
      
      if (percentage >= 100) {
        return null; // Objectif complété
      } else if (percentage >= 75) {
        return 'three_quarters';
      } else if (percentage >= 50) {
        return 'half';
      } else if (percentage >= 25) {
        return 'quarter';
      } else if (percentage > 0) {
        return 'started';
      } else {
        return 'started'; // Pas encore commencé
      }
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors du calcul du prochain jalon:`, error);
      return null;
    }
  }

  /**
   * Enregistrer un jalon atteint
   * 
   * @param goalId - ID de l'objectif
   * @param milestoneType - Type de jalon atteint
   * @returns Jalon enregistré
   */
  async recordMilestone(goalId: string, milestoneType: MilestoneType): Promise<GoalMilestone> {
    try {
      console.log(`💡 [GoalSuggestionService] Enregistrement du jalon "${milestoneType}" pour l'objectif ${goalId}...`);
      
      // Récupérer l'objectif
      const goal = await goalService.getGoal(goalId);
      if (!goal) {
        throw new Error(`Objectif ${goalId} non trouvé`);
      }
      
      // Calculer les valeurs du jalon
      const milestoneOrder = {
        'started': 1,
        'quarter': 2,
        'half': 3,
        'three_quarters': 4,
        'completed': 5,
        'exceeded': 6
      };
      
      const percentageValues = {
        'started': 0,
        'quarter': 25,
        'half': 50,
        'three_quarters': 75,
        'completed': 100,
        'exceeded': 100
      };
      
      const milestoneValue = goal.targetAmount * (percentageValues[milestoneType] / 100);
      
      // Créer le jalon
      const milestone: GoalMilestone = {
        id: crypto.randomUUID(),
        goalId,
        orderId: milestoneOrder[milestoneType],
        milestoneType,
        milestoneValue: Math.round(milestoneValue * 100) / 100,
        percentageReached: percentageValues[milestoneType],
        achievedAt: new Date().toISOString(),
        celebrationShown: false,
        createdAt: new Date().toISOString()
      };
      
      // Sauvegarder dans IndexedDB (si table existe) ou localStorage
      try {
        // Essayer d'utiliser une table IndexedDB si elle existe
        if (db.goalMilestones) {
          await (db.goalMilestones as any).add(milestone);
        } else {
          // Fallback sur localStorage
          const milestones = this.getMilestonesFromStorage();
          milestones.push(milestone);
          localStorage.setItem('bazarkely_goal_milestones', JSON.stringify(milestones));
        }
      } catch (storageError) {
        // Fallback sur localStorage
        const milestones = this.getMilestonesFromStorage();
        milestones.push(milestone);
        localStorage.setItem('bazarkely_goal_milestones', JSON.stringify(milestones));
      }
      
      // Synchroniser avec Supabase si online
      if (navigator.onLine) {
        try {
          await supabase
            .from('goal_milestones')
            .insert({
              id: milestone.id,
              goal_id: goalId,
              order_id: milestone.orderId,
              milestone_type: milestoneType,
              milestone_value: milestone.milestoneValue,
              percentage_reached: milestone.percentageReached,
              achieved_at: milestone.achievedAt,
              celebration_shown: milestone.celebrationShown,
              created_at: milestone.createdAt
            });
        } catch (syncError) {
          console.error(`💡 [GoalSuggestionService] ⚠️ Erreur lors de la synchronisation Supabase:`, syncError);
        }
      }
      
      console.log(`💡 [GoalSuggestionService] ✅ Jalon enregistré: ${milestoneType}`);
      
      return milestone;
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ❌ Erreur lors de l'enregistrement du jalon:`, error);
      throw error;
    }
  }

  /**
   * Récupérer les suggestions rejetées depuis localStorage
   */
  private getDismissedSuggestions(): DismissedSuggestion[] {
    try {
      const stored = localStorage.getItem(DISMISSED_SUGGESTIONS_KEY);
      if (!stored) {
        return [];
      }
      return JSON.parse(stored) as DismissedSuggestion[];
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ⚠️ Erreur lors de la récupération des suggestions rejetées:`, error);
      return [];
    }
  }

  /**
   * Récupérer les jalons depuis localStorage
   */
  private getMilestonesFromStorage(): GoalMilestone[] {
    try {
      const stored = localStorage.getItem('bazarkely_goal_milestones');
      if (!stored) {
        return [];
      }
      return JSON.parse(stored) as GoalMilestone[];
    } catch (error) {
      console.error(`💡 [GoalSuggestionService] ⚠️ Erreur lors de la récupération des jalons:`, error);
      return [];
    }
  }
}

export const goalSuggestionService = new GoalSuggestionService();
export default goalSuggestionService;
