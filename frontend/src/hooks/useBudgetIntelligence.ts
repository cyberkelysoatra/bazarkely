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
import transactionService from '../services/transactionService';
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
  const [hasAutoCreated, setHasAutoCreated] = useState<boolean>(false);

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
   * Charge les transactions de l'utilisateur via transactionService (offline-first SWR).
   * Lit IndexedDB en premier (retour immédiat), refresh Supabase en arrière-plan si online.
   * Plus de `apiService.getTransactions()` (online-only, échouait avec "Failed to fetch" en offline).
   */
  const loadTransactions = useCallback(async (): Promise<void> => {
    if (!user) {
      setTransactions([]);
      setIsLoadingTransactions(false);
      return;
    }

    setIsLoadingTransactions(true);
    try {
      const userTransactions = await transactionService.getTransactions();
      setTransactions(userTransactions);
    } catch (error) {
      console.error('❌ [useBudgetIntelligence] loadTransactions error:', error);
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  }, [user]);

  /**
   * Calcule les budgets basés sur les revenus mensuels (fallback quand priorityAnswers manquants)
   */
  const calculateIncomeBasedBudgets = useCallback((): CategoryBudgets | null => {
    console.log('🔄 DEBUG calculateIncomeBasedBudgets - Début du calcul basé sur les revenus');
    console.log('📊 DEBUG - Nombre de transactions disponibles:', transactions.length);

    if (transactions.length === 0) {
      console.log('⚠️ DEBUG calculateIncomeBasedBudgets - Aucune transaction disponible');
      return null;
    }

    try {
      // Obtenir le mois et l'année actuels
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth();

      console.log('📅 DEBUG calculateIncomeBasedBudgets - Période analysée:', {
        year: currentYear,
        month: currentMonth + 1
      });

      // Filtrer les transactions de revenus du mois en cours
      const currentMonthIncomeTransactions = transactions.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transaction.type === 'income' &&
               transactionDate.getMonth() === currentMonth &&
               transactionDate.getFullYear() === currentYear;
      });

      console.log('💰 DEBUG calculateIncomeBasedBudgets - Transactions de revenus trouvées:', currentMonthIncomeTransactions.length);

      if (currentMonthIncomeTransactions.length === 0) {
        console.log('⚠️ DEBUG calculateIncomeBasedBudgets - Aucune transaction de revenu pour le mois en cours');
        return null;
      }

      // Calculer le revenu total du mois
      const totalMonthlyIncome = currentMonthIncomeTransactions.reduce((sum, transaction) => 
        sum + transaction.amount, 0
      );

      console.log('💵 DEBUG calculateIncomeBasedBudgets - Revenu mensuel total:', totalMonthlyIncome.toLocaleString('fr-FR'), 'Ar');

      if (totalMonthlyIncome <= 0) {
        console.log('⚠️ DEBUG calculateIncomeBasedBudgets - Revenu mensuel invalide ou nul');
        return null;
      }

      // Allocation budgétaire standard (même que dans budgetIntelligenceService)
      const standardAllocation = {
        Alimentation: 0.36,    // 36%
        Logement: 0.24,        // 24%
        Transport: 0.10,       // 10%
        Communication: 0.05,   // 5%
        Santé: 0.05,           // 5%
        Éducation: 0.10,       // 10%
        Loisirs: 0.03,         // 3%
        Habillement: 0.02,     // 2%
        Solidarité: 0.05,      // 5%
        Épargne: 0.00,         // 0% (calculé dynamiquement)
        Autres: 0.00           // 0%
      };

      // Calculer l'épargne recommandée (10% du revenu)
      const savingsAmount = Math.round(totalMonthlyIncome * 0.10);
      const availableForSpending = totalMonthlyIncome - savingsAmount;

      // Calculer les budgets pour chaque catégorie
      const budgets: CategoryBudgets = {
        Alimentation: Math.round(availableForSpending * standardAllocation.Alimentation),
        Logement: Math.round(availableForSpending * standardAllocation.Logement),
        Transport: Math.round(availableForSpending * standardAllocation.Transport),
        Communication: Math.round(availableForSpending * standardAllocation.Communication),
        Habillement: Math.round(availableForSpending * standardAllocation.Habillement),
        Santé: Math.round(availableForSpending * standardAllocation.Santé),
        Éducation: Math.round(availableForSpending * standardAllocation.Éducation),
        Loisirs: Math.round(availableForSpending * standardAllocation.Loisirs),
        Solidarité: Math.round(availableForSpending * standardAllocation.Solidarité),
        Épargne: savingsAmount,
        Autres: Math.round(availableForSpending * standardAllocation.Autres)
      };

      console.log('✅ DEBUG calculateIncomeBasedBudgets - Budgets calculés:');
      Object.entries(budgets).forEach(([category, amount]) => {
        console.log(`  ${category}: ${amount.toLocaleString('fr-FR')} Ar`);
      });

      const totalBudgets = Object.values(budgets).reduce((sum, amount) => sum + amount, 0);
      console.log('💰 DEBUG calculateIncomeBasedBudgets - Total des budgets:', totalBudgets.toLocaleString('fr-FR'), 'Ar');
      console.log('📊 DEBUG calculateIncomeBasedBudgets - Pourcentage du revenu:', ((totalBudgets / totalMonthlyIncome) * 100).toFixed(2) + '%');

      return budgets;

    } catch (error) {
      console.error('❌ DEBUG calculateIncomeBasedBudgets - Erreur lors du calcul:', error);
      return null;
    }
  }, [transactions]);

  /**
   * Calcule les budgets intelligents basés sur les réponses prioritaires ou les revenus
   */
  const calculateIntelligentBudgets = useCallback(async (): Promise<void> => {
    console.log('🚀 DEBUG useBudgetIntelligence - Début du calcul des budgets intelligents');
    console.log('👤 DEBUG - Utilisateur:', user?.id);
    console.log('📊 DEBUG - Nombre de transactions dans le hook:', transactions.length);
    console.log('📋 DEBUG - Réponses prioritaires disponibles:', !!user?.preferences?.priorityAnswers);

    try {
      setIsCalculating(true);
      
      let budgets: CategoryBudgets | null = null;
      let calculationMethod = '';

      // Priorité aux priorityAnswers si disponibles
      if (user?.preferences?.priorityAnswers) {
        console.log('🎯 DEBUG useBudgetIntelligence - Utilisation des priorityAnswers');
        console.log('📋 DEBUG - Réponses prioritaires:', user.preferences.priorityAnswers);
        
        // DEBUG: Verify transactions are passed correctly
        console.log('🔍 DEBUG - Transactions array before analyzePriorityAnswers:', {
          length: transactions.length,
          sample: transactions.slice(0, 3).map(t => ({ id: t.id, type: t.type, amount: t.amount, category: t.category }))
        });
        
        budgets = analyzePriorityAnswers(user.preferences.priorityAnswers, transactions);
        calculationMethod = 'priorityAnswers';
        
      } else {
        console.log('💰 DEBUG useBudgetIntelligence - Fallback vers calcul basé sur les revenus');
        budgets = calculateIncomeBasedBudgets();
        calculationMethod = 'incomeBased';
      }

      if (!budgets) {
        console.log('❌ DEBUG useBudgetIntelligence - Aucun budget calculé');
        toast.error('Impossible de calculer les budgets. Vérifiez vos transactions de revenus.');
        return;
      }
      
      console.log('✅ DEBUG useBudgetIntelligence - Budgets calculés via', calculationMethod, ':', budgets);
      
      setIntelligentBudgets(budgets);
      setLastCalculationDate(new Date());

      // Sauvegarde dans le store
      if (user) {
        setUser({
          ...user,
          preferences: {
            ...user.preferences,
            intelligentBudgets: budgets,
            lastBudgetCalculation: new Date()
          }
        });
      }

      const successMessage = calculationMethod === 'priorityAnswers' 
        ? 'Budgets intelligents calculés avec succès !'
        : 'Budgets calculés automatiquement basés sur vos revenus !';
        
      toast.success(successMessage, {
        duration: 3000,
        icon: '🎯'
      });

    } catch (error) {
      console.error('Erreur lors du calcul des budgets intelligents:', error);
      toast.error('Erreur lors du calcul des budgets intelligents');
    } finally {
      setIsCalculating(false);
    }
  }, [user, setUser, transactions, calculateIncomeBasedBudgets]);

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
   * Crée automatiquement les budgets en base de données
   */
  const autoCreateBudgets = useCallback(async (): Promise<void> => {
    if (!intelligentBudgets || !user || hasAutoCreated) {
      return;
    }

    // Skip si offline : autoCreateBudgets utilise apiService.createBudget (online-only).
    // Sans ce skip, l'app log 11 erreurs `Failed to fetch` au démarrage offline.
    // La création sera retentée au prochain mount si online (hasAutoCreated reste false).
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('⏸️ [useBudgetIntelligence] autoCreateBudgets skipped — offline');
      return;
    }

    console.log('🚀 DEBUG autoCreateBudgets - Début de la création automatique des budgets');
    console.log('📊 DEBUG - Nombre de budgets à créer:', Object.keys(intelligentBudgets).length);
    console.log('👤 DEBUG - Utilisateur:', user.id);
    console.log('📋 DEBUG - intelligentBudgets content:', intelligentBudgets);

    try {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      console.log('🔍 DEBUG autoCreateBudgets - Vérification des budgets existants pour la période:', {
        year: currentYear,
        month: currentMonth
      });

      // Vérifier si des budgets existent déjà pour la période actuelle
      const existingBudgetsResponse = await apiService.getBudgets();
      
      if (existingBudgetsResponse.success && existingBudgetsResponse.data) {
        // Filtrer les budgets pour la période actuelle
        const existingBudgetsForPeriod = existingBudgetsResponse.data.filter(budget => 
          budget.month === currentMonth && budget.year === currentYear
        );
        
        console.log('🔍 DEBUG autoCreateBudgets - Budgets existants trouvés pour la période:', existingBudgetsForPeriod.length);
        console.log('🔍 DEBUG autoCreateBudgets - Détails des budgets existants:', existingBudgetsForPeriod.map(b => ({
          id: b.id,
          category: b.category,
          amount: b.amount,
          month: b.month,
          year: b.year
        })));

        if (existingBudgetsForPeriod.length > 0) {
          console.log('⚠️ DEBUG autoCreateBudgets - Budgets déjà existants pour la période, création ignorée');
          console.log('⚠️ DEBUG autoCreateBudgets - Budgets existants détectés:', existingBudgetsForPeriod.length);
          
          // Marquer comme créé automatiquement pour éviter les tentatives futures
          setHasAutoCreated(true);
          
          console.log('✅ DEBUG autoCreateBudgets - hasAutoCreated défini à true, aucune création effectuée');
          return;
        }
      } else {
        console.log('⚠️ DEBUG autoCreateBudgets - Erreur lors de la récupération des budgets existants:', existingBudgetsResponse.error);
        // Continuer avec la création même en cas d'erreur de récupération
      }

      console.log('✅ DEBUG autoCreateBudgets - Aucun budget existant trouvé, procédure de création...');

      // Créer les budgets pour chaque catégorie
      const budgetPromises = Object.entries(intelligentBudgets).map(async ([category, amount]) => {
        const budgetData = {
          name: `Budget ${category}`,
          category: category.toLowerCase(),
          amount: amount,
          spent: 0,
          period: 'monthly' as const,
          year: currentYear,
          month: currentMonth,
          alert_threshold: 80, // 80%
          is_active: true,
          user_id: user.id
        };

        console.log('🔍 DEBUG autoCreateBudgets - Création du budget pour catégorie:', category, 'avec montant:', amount);
        return apiService.createBudget(budgetData);
      });

      console.log('⏳ DEBUG autoCreateBudgets - Attente de la création de tous les budgets...');
      const results = await Promise.all(budgetPromises);
      
      // Vérifier les résultats
      const failedBudgets = results.filter(result => !result.success);
      const successfulBudgets = results.filter(result => result.success);
      
      console.log('📊 DEBUG autoCreateBudgets - Résultats:', {
        total: results.length,
        successful: successfulBudgets.length,
        failed: failedBudgets.length
      });

      if (failedBudgets.length > 0) {
        console.error('❌ DEBUG autoCreateBudgets - Échec de création de budgets:', failedBudgets);
        toast.error(`${failedBudgets.length} budget(s) n'ont pas pu être créés automatiquement`);
        return;
      }

      // Marquer comme créé automatiquement
      setHasAutoCreated(true);
      
      console.log('✅ DEBUG autoCreateBudgets - Tous les budgets créés avec succès en base de données');
      
      toast.success('Budgets créés automatiquement avec succès !', {
        duration: 4000,
        icon: '🎯'
      });

    } catch (error) {
      console.error('❌ DEBUG autoCreateBudgets - Erreur lors de la création automatique des budgets:', error);
      toast.error('Erreur lors de la création automatique des budgets');
    }
  }, [intelligentBudgets, user, hasAutoCreated]);

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
    // Priorité aux priorityAnswers si disponibles, sinon utiliser les revenus des transactions
    if (user && 
        !intelligentBudgets && 
        !isLoadingTransactions) {
      console.log('🚀 DEBUG useBudgetIntelligence - Conditions remplies, lancement du calcul des budgets');
      console.log('📊 DEBUG - Transactions count:', transactions.length);
      console.log('📋 DEBUG - PriorityAnswers available:', !!user?.preferences?.priorityAnswers);
      calculateIntelligentBudgets();
    } else if (isLoadingTransactions) {
      console.log('⏳ DEBUG useBudgetIntelligence - En attente du chargement des transactions...');
    } else if (!user) {
      console.log('⚠️ DEBUG useBudgetIntelligence - Pas d\'utilisateur connecté');
    } else if (intelligentBudgets) {
      console.log('ℹ️ DEBUG useBudgetIntelligence - Budgets déjà calculés');
    }
  }, [user, intelligentBudgets, calculateIntelligentBudgets, transactions, isLoadingTransactions]);

  // Effect 1.5: Création automatique des budgets quand intelligentBudgets est calculé
  useEffect(() => {
    console.log('🔄 DEBUG useBudgetIntelligence - Effect 1.5 déclenché (création automatique)');
    console.log('💰 DEBUG - intelligentBudgets:', !!intelligentBudgets);
    console.log('💰 DEBUG - intelligentBudgets length:', intelligentBudgets ? Object.keys(intelligentBudgets).length : 0);
    console.log('👤 DEBUG - user:', !!user);
    console.log('👤 DEBUG - user id:', user?.id);
    console.log('🔧 DEBUG - hasAutoCreated:', hasAutoCreated);
    
    // Déclencher la création automatique si:
    // - intelligentBudgets existe et a des budgets
    // - user existe
    // - pas encore créé automatiquement
    if (intelligentBudgets && 
        Object.keys(intelligentBudgets).length > 0 && 
        user && 
        !hasAutoCreated) {
      console.log('🚀 DEBUG useBudgetIntelligence - Conditions remplies pour création automatique');
      console.log('🚀 DEBUG useBudgetIntelligence - Calling autoCreateBudgets()');
      autoCreateBudgets();
    } else if (hasAutoCreated) {
      console.log('ℹ️ DEBUG useBudgetIntelligence - Budgets déjà créés automatiquement');
    } else if (!intelligentBudgets) {
      console.log('⚠️ DEBUG useBudgetIntelligence - Pas de budgets intelligents à créer');
    } else if (!user) {
      console.log('⚠️ DEBUG useBudgetIntelligence - Pas d\'utilisateur pour création automatique');
    } else if (intelligentBudgets && Object.keys(intelligentBudgets).length === 0) {
      console.log('⚠️ DEBUG useBudgetIntelligence - intelligentBudgets est vide');
    }
  }, [intelligentBudgets, user, hasAutoCreated, autoCreateBudgets]);

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
