/**
 * useBudgetIntelligence Hook - BazarKELY
 * Hook personnalisé pour l'intégration du service d'intelligence budgétaire
 * 
 * @version 1.0
 * @date 2025-01-11
 * @author BazarKELY Team
 * 
 * @example
 * ```tsx
 * const {
 *   intelligentBudgets,
 *   budgetAnalysis,
 *   deviationAlerts,
 *   isCalculating,
 *   acceptSuggestedBudgets,
 *   customizeBudget,
 *   dismissAlert,
 *   recalculateBudgets
 * } = useBudgetIntelligence();
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { useAppStore } from '../stores/appStore';
import apiService from '../services/apiService';
import type {
  CategoryBudgets,
  BudgetAnalysis,
  DeviationAlert
} from '../services/budgetIntelligenceService.ts';
import {
  analyzePriorityAnswers,
  analyzeTransactionHistory,
  detectSpendingDeviation,
  calculateAdjustedBudgets
} from '../services/budgetIntelligenceService.ts';
import type { Transaction } from '../types/index.js';

/**
 * Interface pour le retour du hook useBudgetIntelligence
 */
export interface UseBudgetIntelligenceReturn {
  readonly intelligentBudgets: CategoryBudgets | null;
  readonly budgetAnalysis: BudgetAnalysis | null;
  readonly deviationAlerts: readonly DeviationAlert[];
  readonly isCalculating: boolean;
  readonly acceptSuggestedBudgets: () => void;
  readonly customizeBudget: (category: string, newAmount: number) => void;
  readonly dismissAlert: (alertId: string) => void;
  readonly recalculateBudgets: () => void;
}

/**
 * Hook personnalisé pour l'intelligence budgétaire
 * Gère les calculs automatiques, les ajustements et les alertes de déviation
 */
export default function useBudgetIntelligence(): UseBudgetIntelligenceReturn {
  // État du hook
  const [intelligentBudgets, setIntelligentBudgets] = useState<CategoryBudgets | null>(null);
  const [budgetAnalysis, setBudgetAnalysis] = useState<BudgetAnalysis | null>(null);
  const [deviationAlerts, setDeviationAlerts] = useState<readonly DeviationAlert[]>([]);
  const [lastCalculationDate, setLastCalculationDate] = useState<Date | null>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Accès au store
  const user = useAppStore((state) => state.user);
  const setUser = useAppStore((state) => state.setUser);
  
  // État pour les transactions
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);

  // Refs pour éviter les re-calculs excessifs
  const dailyCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDailyCheckRef = useRef<Date | null>(null);

  /**
   * Charge les transactions de l'utilisateur depuis la base de données
   */
  const loadTransactions = useCallback(async (): Promise<void> => {
    if (!user) {
      console.log('❌ DEBUG loadTransactions - Pas d\'utilisateur connecté');
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }

    console.log('🔄 DEBUG loadTransactions - Début du chargement des transactions depuis Supabase pour utilisateur:', user.id);
    setIsLoadingTransactions(true);
    
    try {
      // Utiliser apiService.getTransactions() comme DashboardPage
      const response = await apiService.getTransactions();
      
      if (!response.success || response.error) {
        console.error('❌ DEBUG loadTransactions - Erreur API:', response.error);
        setTransactions([]);
        setIsLoadingTransactions(false);
        return;
      }
      
      // Transformer les données Supabase vers le format Transaction
      const supabaseTransactions = response.data as any[];
      const userTransactions: Transaction[] = supabaseTransactions.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
        accountId: t.account_id,
        type: t.type,
        amount: t.amount,
        description: t.description,
        category: t.category,
        date: new Date(t.date),
        targetAccountId: t.target_account_id,
        notes: t.notes || undefined,
        createdAt: new Date(t.created_at)
      }));
      
      console.log('📊 DEBUG loadTransactions - Transactions chargées depuis Supabase:', userTransactions.length);
      console.log('💰 DEBUG loadTransactions - Types de transactions:', userTransactions.map(t => t.type));
      console.log('📅 DEBUG loadTransactions - Période des transactions:', {
        plus_ancienne: userTransactions.length > 0 ? new Date(Math.min(...userTransactions.map(t => new Date(t.date).getTime()))).toISOString() : 'Aucune',
        plus_recente: userTransactions.length > 0 ? new Date(Math.max(...userTransactions.map(t => new Date(t.date).getTime()))).toISOString() : 'Aucune'
      });
      
      setTransactions(userTransactions);
      console.log('✅ DEBUG loadTransactions - Chargement terminé, transactions mises à jour');
    } catch (error) {
      console.error('❌ DEBUG loadTransactions - Erreur lors du chargement des transactions:', error);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user]);

  /**
   * Calcule les budgets intelligents basés sur les réponses prioritaires
   */
  const calculateIntelligentBudgets = useCallback(async (): Promise<void> => {
    if (!user?.preferences?.priorityAnswers) {
      console.log('❌ DEBUG useBudgetIntelligence - Pas de réponses prioritaires');
      return;
    }

    console.log('🚀 DEBUG useBudgetIntelligence - Début du calcul des budgets intelligents');
    console.log('👤 DEBUG - Utilisateur:', user.id);
    console.log('📊 DEBUG - Nombre de transactions dans le hook:', transactions.length);
    console.log('📋 DEBUG - Réponses prioritaires:', user.preferences.priorityAnswers);

    try {
      setIsCalculating(true);
      
      // DEBUG: Verify transactions are passed correctly
      console.log('🔍 DEBUG - Transactions array before analyzePriorityAnswers:', {
        length: transactions.length,
        sample: transactions.slice(0, 3).map(t => ({ id: t.id, type: t.type, amount: t.amount, category: t.category }))
      });
      
      const budgets = analyzePriorityAnswers(user.preferences.priorityAnswers, transactions);
      
      console.log('✅ DEBUG useBudgetIntelligence - Budgets calculés:', budgets);
      
      setIntelligentBudgets(budgets);
      setLastCalculationDate(new Date());

      // Sauvegarde dans le store
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          intelligentBudgets: budgets,
          lastBudgetCalculation: new Date()
        }
      });

      toast.success('Budgets intelligents calculés avec succès !', {
        duration: 3000,
        icon: '🎯'
      });

    } catch (error) {
      console.error('Erreur lors du calcul des budgets intelligents:', error);
      toast.error('Erreur lors du calcul des budgets intelligents');
    } finally {
      setIsCalculating(false);
    }
  }, [user, setUser, transactions]);

  /**
   * Effectue une analyse mensuelle et ajuste les budgets si nécessaire
   */
  const performMonthlyAnalysis = useCallback(async (): Promise<void> => {
    if (!intelligentBudgets || !transactions.length) {
      return;
    }

    try {
      setIsCalculating(true);

      // Filtrage des transactions du mois dernier
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      
      const lastMonthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === lastMonth.getMonth() &&
               transactionDate.getFullYear() === lastMonth.getFullYear();
      });

      if (lastMonthTransactions.length === 0) {
        return;
      }

      // Analyse de l'historique des transactions
      const analysis = analyzeTransactionHistory(lastMonthTransactions, intelligentBudgets);
      setBudgetAnalysis(analysis);

      // Vérification des tendances cohérentes (2+ mois)
      const hasConsistentTrends = analysis.trends.some(trend => trend.months >= 2);
      
      if (hasConsistentTrends) {
        // Calcul des budgets ajustés
        const adjustedBudgets = calculateAdjustedBudgets(intelligentBudgets, analysis);
        
        setIntelligentBudgets(adjustedBudgets);
        setLastCalculationDate(new Date());

        // Sauvegarde des budgets ajustés
        setUser({
          ...user,
          preferences: {
            ...user.preferences,
            intelligentBudgets: adjustedBudgets,
            lastBudgetCalculation: new Date()
          }
        });

        // Notification des ajustements
        const adjustmentsCount = analysis.recommendations.length;
        toast.success(
          `${adjustmentsCount} budget${adjustmentsCount > 1 ? 's' : ''} ajusté${adjustmentsCount > 1 ? 's' : ''} automatiquement basé${adjustmentsCount > 1 ? 's' : ''} sur vos habitudes de dépenses`,
          {
            duration: 4000,
            icon: '📊'
          }
        );
      }

    } catch (error) {
      console.error('Erreur lors de l\'analyse mensuelle:', error);
      toast.error('Erreur lors de l\'analyse mensuelle des budgets');
    } finally {
      setIsCalculating(false);
    }
  }, [intelligentBudgets, transactions, user, setUser]);

  /**
   * Détecte les déviations de dépenses quotidiennes
   */
  const checkDailyDeviations = useCallback(async (): Promise<void> => {
    if (!intelligentBudgets || !transactions.length) {
      return;
    }

    try {
      // Filtrage des transactions du mois en cours
      const currentMonth = new Date();
      const currentMonthTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate.getMonth() === currentMonth.getMonth() &&
               transactionDate.getFullYear() === currentMonth.getFullYear();
      });

      if (currentMonthTransactions.length === 0) {
        return;
      }

      // Détection des déviations
      const alerts = detectSpendingDeviation(currentMonthTransactions, intelligentBudgets);
      
      // Filtrage des alertes de sévérité warning et critical
      const filteredAlerts = alerts.filter(alert => 
        alert.severity === 'warning' || alert.severity === 'critical'
      );

      setDeviationAlerts(filteredAlerts);

      // Notification des alertes critiques
      const criticalAlerts = filteredAlerts.filter(alert => alert.severity === 'critical');
      if (criticalAlerts.length > 0) {
        toast.error(
          `${criticalAlerts.length} alerte${criticalAlerts.length > 1 ? 's' : ''} critique${criticalAlerts.length > 1 ? 's' : ''} détectée${criticalAlerts.length > 1 ? 's' : ''}`,
          {
            duration: 5000,
            icon: '⚠️'
          }
        );
      }

    } catch (error) {
      console.error('Erreur lors de la détection des déviations:', error);
    }
  }, [intelligentBudgets, transactions]);

  /**
   * Vérifie si c'est un nouveau mois
   */
  const isNewMonth = useCallback((): boolean => {
    if (!lastCalculationDate) {
      return true;
    }

    const now = new Date();
    const lastCalc = new Date(lastCalculationDate);
    
    return now.getMonth() !== lastCalc.getMonth() || 
           now.getFullYear() !== lastCalc.getFullYear();
  }, [lastCalculationDate]);

  /**
   * Vérifie si la vérification quotidienne doit être effectuée
   */
  const shouldRunDailyCheck = useCallback((): boolean => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Vérification quotidienne à 8h du matin
    if (currentHour !== 8) {
      return false;
    }

    // Éviter les vérifications multiples le même jour
    if (lastDailyCheckRef.current) {
      const lastCheck = new Date(lastDailyCheckRef.current);
      const today = new Date();
      
      return lastCheck.getDate() !== today.getDate() ||
             lastCheck.getMonth() !== today.getMonth() ||
             lastCheck.getFullYear() !== today.getFullYear();
    }

    return true;
  }, []);

  // Effect 0: Chargement des transactions quand l'utilisateur change
  useEffect(() => {
    console.log('🔄 DEBUG useBudgetIntelligence - Chargement des transactions pour utilisateur:', user?.id);
    loadTransactions();
  }, [loadTransactions]);

  // Effect 1: Calcul initial des budgets quand les réponses prioritaires ou transactions changent
  useEffect(() => {
    console.log('🔄 DEBUG useBudgetIntelligence - Effect 1 déclenché');
    console.log('📊 DEBUG - Transactions disponibles:', transactions.length);
    console.log('📋 DEBUG - Réponses prioritaires:', !!user?.preferences?.priorityAnswers);
    console.log('💰 DEBUG - Budgets intelligents existants:', !!intelligentBudgets);
    console.log('⏳ DEBUG - Chargement des transactions en cours:', isLoadingTransactions);
    
    // Attendre que les transactions soient chargées ET que les conditions soient remplies
    if (user?.preferences?.priorityAnswers && 
        !intelligentBudgets && 
        !isLoadingTransactions && 
        transactions.length > 0) {
      console.log('🚀 DEBUG useBudgetIntelligence - Conditions remplies, lancement du calcul des budgets');
      calculateIntelligentBudgets();
    } else if (isLoadingTransactions) {
      console.log('⏳ DEBUG useBudgetIntelligence - En attente du chargement des transactions...');
    } else if (transactions.length === 0 && !isLoadingTransactions) {
      console.log('⚠️ DEBUG useBudgetIntelligence - Aucune transaction disponible après chargement');
    } else if (!user?.preferences?.priorityAnswers) {
      console.log('⚠️ DEBUG useBudgetIntelligence - Pas de réponses prioritaires');
    } else if (intelligentBudgets) {
      console.log('ℹ️ DEBUG useBudgetIntelligence - Budgets déjà calculés');
    }
  }, [user?.preferences?.priorityAnswers, intelligentBudgets, calculateIntelligentBudgets, transactions, isLoadingTransactions]);

  // Effect 2: Vérification mensuelle le premier jour du mois
  useEffect(() => {
    const checkMonthly = () => {
      if (isNewMonth() && intelligentBudgets) {
        performMonthlyAnalysis();
      }
    };

    // Vérification immédiate
    checkMonthly();

    // Vérification quotidienne à minuit
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      checkMonthly();
      // Répéter toutes les 24h
      const intervalId = setInterval(checkMonthly, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(intervalId);
    }, timeUntilMidnight);

    return () => clearTimeout(timeoutId);
  }, [isNewMonth, intelligentBudgets, performMonthlyAnalysis]);

  // Effect 3: Vérification quotidienne des déviations
  useEffect(() => {
    const checkDaily = () => {
      if (shouldRunDailyCheck()) {
        checkDailyDeviations();
        lastDailyCheckRef.current = new Date();
      }
    };

    // Vérification immédiate si nécessaire
    checkDaily();

    // Vérification toutes les heures
    const intervalId = setInterval(checkDaily, 60 * 60 * 1000);

    return () => {
      clearInterval(intervalId);
      if (dailyCheckTimeoutRef.current) {
        clearTimeout(dailyCheckTimeoutRef.current);
      }
    };
  }, [shouldRunDailyCheck, checkDailyDeviations]);

  /**
   * Accepte les budgets suggérés et les applique
   */
  const acceptSuggestedBudgets = useCallback((): void => {
    if (!intelligentBudgets || !user) {
      toast.error('Aucun budget intelligent disponible');
      return;
    }

    try {
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          activeBudgets: intelligentBudgets
        }
      });

      toast.success('Budgets intelligents appliqués avec succès !', {
        duration: 3000,
        icon: '✅'
      });

      // Effacement des alertes de déviation
      setDeviationAlerts([]);

    } catch (error) {
      console.error('Erreur lors de l\'application des budgets:', error);
      toast.error('Erreur lors de l\'application des budgets');
    }
  }, [intelligentBudgets, user, setUser]);

  /**
   * Personnalise un budget pour une catégorie spécifique
   */
  const customizeBudget = useCallback((category: string, newAmount: number): void => {
    if (!intelligentBudgets || !user) {
      toast.error('Aucun budget intelligent disponible');
      return;
    }

    try {
      const currentTotal = Object.values(intelligentBudgets).reduce((sum, amount) => sum + amount, 0);
      const categoryKey = category as keyof CategoryBudgets;
      const currentAmount = intelligentBudgets[categoryKey];
      const difference = newAmount - currentAmount;

      // Calcul des nouveaux budgets
      const newBudgets = { ...intelligentBudgets };
      newBudgets[categoryKey] = newAmount;

      // Ajustement proportionnel des catégories flexibles
      const flexibleCategories: (keyof CategoryBudgets)[] = ['Autres', 'Loisirs'];
      let remainingDifference = difference;

      for (const flexCategory of flexibleCategories) {
        if (remainingDifference === 0) break;
        
        const currentFlexAmount = newBudgets[flexCategory];
        const adjustment = Math.min(Math.abs(remainingDifference), currentFlexAmount);
        
        if (remainingDifference > 0) {
          // Réduction des catégories flexibles
          newBudgets[flexCategory] = Math.max(0, currentFlexAmount - adjustment);
          remainingDifference -= adjustment;
        } else {
          // Augmentation des catégories flexibles
          newBudgets[flexCategory] = currentFlexAmount + Math.abs(adjustment);
          remainingDifference += adjustment;
        }
      }

      setIntelligentBudgets(newBudgets);

      // Sauvegarde dans le store
      setUser({
        ...user,
        preferences: {
          ...user.preferences,
          intelligentBudgets: newBudgets
        }
      });

      const percentageChange = ((newAmount - currentAmount) / currentAmount) * 100;
      const changeText = percentageChange > 0 ? `+${percentageChange.toFixed(1)}%` : `${percentageChange.toFixed(1)}%`;

      toast.success(
        `Budget ${category} ajusté à ${newAmount.toLocaleString('fr-FR')} Ar (${changeText})`,
        {
          duration: 3000,
          icon: '✏️'
        }
      );

    } catch (error) {
      console.error('Erreur lors de la personnalisation du budget:', error);
      toast.error('Erreur lors de la personnalisation du budget');
    }
  }, [intelligentBudgets, user, setUser]);

  /**
   * Supprime une alerte de déviation
   */
  const dismissAlert = useCallback((alertId: string): void => {
    setDeviationAlerts(prevAlerts => 
      prevAlerts.filter(alert => `${alert.category}-${alert.severity}` !== alertId)
    );
  }, []);

  /**
   * Recalcule manuellement tous les budgets
   */
  const recalculateBudgets = useCallback((): void => {
    if (user?.preferences?.priorityAnswers) {
      calculateIntelligentBudgets();
    } else {
      toast.error('Veuillez d\'abord répondre aux questions prioritaires');
    }
  }, [user?.preferences?.priorityAnswers, calculateIntelligentBudgets]);

  return {
    intelligentBudgets,
    budgetAnalysis,
    deviationAlerts,
    isCalculating,
    acceptSuggestedBudgets,
    customizeBudget,
    dismissAlert,
    recalculateBudgets
  };
}
