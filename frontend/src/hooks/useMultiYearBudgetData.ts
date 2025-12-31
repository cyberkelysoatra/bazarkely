/**
 * useMultiYearBudgetData Hook - BazarKELY
 * Hook personnalisé pour récupérer et comparer les données budgétaires multi-années
 * avec analyse de tendances et détection de catégories problématiques
 * 
 * @version 1.0
 * @date 2025-01-XX
 * @author BazarKELY Team
 * 
 * @example
 * ```tsx
 * const {
 *   availableYears,
 *   period1,
 *   period2,
 *   setPeriod1,
 *   setPeriod2,
 *   comparisonResult,
 *   problematicCategories,
 *   yearlyEvolution,
 *   monthlyEvolution,
 *   isLoading,
 *   error,
 *   refetch
 * } = useMultiYearBudgetData();
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/database';
import type { Budget, Transaction, TransactionCategory } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';
import type { CategoryBreakdown, MonthlyData } from './useYearlyBudgetData';
import type { TrendPattern } from '../services/budgetIntelligenceService';

/**
 * Noms des mois en français
 */
const MONTH_NAMES_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
] as const;

/**
 * Interface pour la sélection de période
 */
export interface PeriodSelection {
  readonly type: 'year' | 'month' | 'range';
  readonly year: number;
  readonly month?: number; // 1-12, required if type is 'month'
  readonly startMonth?: number; // 1-12, required if type is 'range'
  readonly endMonth?: number; // 1-12, required if type is 'range'
}

/**
 * Interface pour les données de comparaison de période
 */
export interface PeriodComparisonData {
  readonly period: PeriodSelection;
  readonly periodLabel: string; // "2024", "Décembre 2024", "Juin-Août 2024"
  readonly totalBudget: number;
  readonly totalSpent: number;
  readonly savings: number;
  readonly savingsRate: number; // percentage
  readonly categoryBreakdown: readonly CategoryBreakdown[];
  readonly monthlyDetails: readonly MonthlyData[]; // breakdown by month within period
}

/**
 * Interface pour les catégories problématiques
 */
export interface ProblematicCategory {
  readonly category: string;
  readonly categoryLabel: string;
  readonly overspendingMonths: number; // count of months with overspending
  readonly totalMonthsAnalyzed: number;
  readonly averageOverspend: number; // amount
  readonly averageOverspendPercentage: number;
  readonly trend: 'worsening' | 'stable' | 'improving';
  readonly affectedPeriods: readonly string[]; // ["Janvier 2024", "Mars 2024", "Janvier 2025"]
  readonly severity: 'low' | 'medium' | 'high' | 'critical'; // based on frequency and amount
}

/**
 * Interface pour les points d'évolution annuelle
 */
export interface YearEvolutionPoint {
  readonly year: number;
  readonly month?: number; // if monthly granularity
  readonly label: string; // "2024" or "Jan 2024"
  readonly totalBudget: number;
  readonly totalSpent: number;
  readonly savingsRate: number;
  readonly complianceRate: number; // % of categories within budget
}

/**
 * Interface pour les résultats de comparaison
 */
export interface ComparisonResult {
  readonly period1: PeriodComparisonData;
  readonly period2: PeriodComparisonData;
  readonly differences: {
    readonly budgetChange: number; // amount difference
    readonly budgetChangePercent: number;
    readonly spentChange: number;
    readonly spentChangePercent: number;
    readonly savingsChange: number;
    readonly savingsRateChange: number; // percentage points
    readonly improvedCategories: readonly string[];
    readonly worsenedCategories: readonly string[];
  };
}

/**
 * Interface pour le retour du hook
 */
export interface UseMultiYearBudgetDataReturn {
  // Available data range
  readonly availableYears: readonly number[];
  readonly availableMonths: readonly { year: number; month: number; monthName: string }[];
  
  // Period selection
  readonly period1: PeriodSelection;
  readonly period2: PeriodSelection;
  readonly setPeriod1: (period: PeriodSelection) => void;
  readonly setPeriod2: (period: PeriodSelection) => void;
  
  // Comparison data
  readonly comparisonResult: ComparisonResult | null;
  
  // Problematic categories (across all data)
  readonly problematicCategories: readonly ProblematicCategory[];
  
  // Evolution over time (all years, monthly or yearly granularity)
  readonly yearlyEvolution: readonly YearEvolutionPoint[];
  readonly monthlyEvolution: readonly YearEvolutionPoint[];
  
  // State
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

/**
 * Hook personnalisé pour récupérer et comparer les données budgétaires multi-années
 * 
 * @returns Données budgétaires multi-années avec comparaisons et analyses
 */
export default function useMultiYearBudgetData(): UseMultiYearBudgetDataReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Default periods: previous year vs current year
  const currentYear = new Date().getFullYear();
  const [period1, setPeriod1State] = useState<PeriodSelection>({
    type: 'year',
    year: currentYear - 1
  });
  const [period2, setPeriod2State] = useState<PeriodSelection>({
    type: 'year',
    year: currentYear
  });

  /**
   * Récupérer l'ID de l'utilisateur actuel
   */
  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        return session.user.id;
      }
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (err) {
      console.error('❌ [useMultiYearBudgetData] Erreur lors de la récupération de l\'utilisateur:', err);
      return null;
    }
  }, []);

  /**
   * Récupérer tous les budgets (OFFLINE-FIRST PATTERN)
   */
  const fetchAllBudgets = useCallback(async (userId: string): Promise<Budget[]> => {
    try {
      // STEP 1: Essayer IndexedDB d'abord
      console.log('📊 [useMultiYearBudgetData] Récupération de tous les budgets depuis IndexedDB...');
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .toArray();

      if (localBudgets.length > 0) {
        console.log(`✅ [useMultiYearBudgetData] ${localBudgets.length} budget(s) récupéré(s) depuis IndexedDB`);
        return localBudgets;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('⚠️ [useMultiYearBudgetData] Mode offline et IndexedDB vide');
        return [];
      }

      console.log('🌐 [useMultiYearBudgetData] Récupération de tous les budgets depuis Supabase...');
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (supabaseError) {
        throw supabaseError;
      }

      // Mapper les données Supabase vers le format Budget
      const supabaseBudgets: Budget[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        category: item.category,
        amount: item.amount,
        spent: item.spent || 0,
        period: item.period || 'monthly',
        year: item.year,
        month: item.month,
        alertThreshold: item.alert_threshold || 80
      }));

      // Sauvegarder dans IndexedDB pour la prochaine fois
      if (supabaseBudgets.length > 0) {
        try {
          await db.budgets.bulkPut(supabaseBudgets);
          console.log(`💾 [useMultiYearBudgetData] ${supabaseBudgets.length} budget(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ [useMultiYearBudgetData] Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }

      console.log(`✅ [useMultiYearBudgetData] ${supabaseBudgets.length} budget(s) récupéré(s) depuis Supabase`);
      return supabaseBudgets;
    } catch (err) {
      console.error('❌ [useMultiYearBudgetData] Erreur lors de la récupération des budgets:', err);
      return [];
    }
  }, []);

  /**
   * Récupérer toutes les transactions de dépenses (OFFLINE-FIRST PATTERN)
   */
  const fetchAllTransactions = useCallback(async (userId: string): Promise<Transaction[]> => {
    try {
      // STEP 1: Essayer IndexedDB d'abord
      console.log('📊 [useMultiYearBudgetData] Récupération de toutes les transactions depuis IndexedDB...');
      
      const localTransactions = await db.transactions
        .where('userId')
        .equals(userId)
        .filter(transaction => transaction.type === 'expense')
        .toArray();

      if (localTransactions.length > 0) {
        console.log(`✅ [useMultiYearBudgetData] ${localTransactions.length} transaction(s) récupérée(s) depuis IndexedDB`);
        return localTransactions;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('⚠️ [useMultiYearBudgetData] Mode offline et IndexedDB vide');
        return [];
      }

      console.log('🌐 [useMultiYearBudgetData] Récupération de toutes les transactions depuis Supabase...');
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense');

      if (supabaseError) {
        throw supabaseError;
      }

      // Mapper les données Supabase vers le format Transaction
      const supabaseTransactions: Transaction[] = (data || []).map((item: any) => ({
        id: item.id,
        userId: item.user_id,
        accountId: item.account_id,
        type: item.type,
        amount: item.amount,
        description: item.description || '',
        category: item.category,
        date: new Date(item.date),
        targetAccountId: item.target_account_id,
        transferFee: item.transfer_fee,
        originalCurrency: item.original_currency,
        originalAmount: item.original_amount,
        exchangeRateUsed: item.exchange_rate_used,
        notes: item.notes,
        createdAt: new Date(item.created_at),
        isRecurring: item.is_recurring || false,
        recurringTransactionId: item.recurring_transaction_id,
        currentOwnerId: item.current_owner_id || item.user_id,
        originalOwnerId: item.original_owner_id,
        transferredAt: item.transferred_at
      }));

      // Sauvegarder dans IndexedDB pour la prochaine fois
      if (supabaseTransactions.length > 0) {
        try {
          await db.transactions.bulkPut(supabaseTransactions);
          console.log(`💾 [useMultiYearBudgetData] ${supabaseTransactions.length} transaction(s) sauvegardée(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ [useMultiYearBudgetData] Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }

      console.log(`✅ [useMultiYearBudgetData] ${supabaseTransactions.length} transaction(s) récupérée(s) depuis Supabase`);
      return supabaseTransactions;
    } catch (err) {
      console.error('❌ [useMultiYearBudgetData] Erreur lors de la récupération des transactions:', err);
      return [];
    }
  }, []);

  /**
   * Charger toutes les données nécessaires
   */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const userId = await getCurrentUserId();
      if (!userId) {
        setError('Utilisateur non authentifié');
        setIsLoading(false);
        return;
      }

      // Charger budgets et transactions en parallèle
      const [budgetsData, transactionsData] = await Promise.all([
        fetchAllBudgets(userId),
        fetchAllTransactions(userId)
      ]);

      setBudgets(budgetsData);
      setTransactions(transactionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
      console.error('❌ [useMultiYearBudgetData] Erreur:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUserId, fetchAllBudgets, fetchAllTransactions]);

  // Charger les données au montage
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Détecter les années disponibles depuis les budgets et transactions
   */
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>();
    
    budgets.forEach(budget => {
      if (budget.year) {
        yearsSet.add(budget.year);
      }
    });
    
    transactions.forEach(transaction => {
      const transactionYear = new Date(transaction.date).getFullYear();
      yearsSet.add(transactionYear);
    });
    
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [budgets, transactions]);

  /**
   * Détecter les mois disponibles
   */
  const availableMonths = useMemo(() => {
    const monthsMap = new Map<string, { year: number; month: number }>();
    
    budgets.forEach(budget => {
      if (budget.year && budget.month) {
        const key = `${budget.year}-${budget.month}`;
        monthsMap.set(key, { year: budget.year, month: budget.month });
      }
    });
    
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const year = transactionDate.getFullYear();
      const month = transactionDate.getMonth() + 1;
      const key = `${year}-${month}`;
      if (!monthsMap.has(key)) {
        monthsMap.set(key, { year, month });
      }
    });
    
    return Array.from(monthsMap.values())
      .map(({ year, month }) => ({
        year,
        month,
        monthName: MONTH_NAMES_FR[month - 1]
      }))
      .sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });
  }, [budgets, transactions]);

  /**
   * Générer le label de période en français
   */
  const generatePeriodLabel = useCallback((period: PeriodSelection): string => {
    if (period.type === 'year') {
      return period.year.toString();
    }
    
    if (period.type === 'month' && period.month) {
      return `${MONTH_NAMES_FR[period.month - 1]} ${period.year}`;
    }
    
    if (period.type === 'range' && period.startMonth && period.endMonth) {
      const startName = MONTH_NAMES_FR[period.startMonth - 1];
      const endName = MONTH_NAMES_FR[period.endMonth - 1];
      return `${startName}-${endName} ${period.year}`;
    }
    
    return `${period.year}`;
  }, []);

  /**
   * Filtrer les budgets pour une période donnée
   */
  const filterBudgetsForPeriod = useCallback((period: PeriodSelection): Budget[] => {
    if (period.type === 'year') {
      return budgets.filter(b => b.year === period.year);
    }
    
    if (period.type === 'month' && period.month) {
      return budgets.filter(b => b.year === period.year && b.month === period.month);
    }
    
    if (period.type === 'range' && period.startMonth && period.endMonth) {
      return budgets.filter(b => 
        b.year === period.year && 
        b.month >= period.startMonth! && 
        b.month <= period.endMonth!
      );
    }
    
    return [];
  }, [budgets]);

  /**
   * Filtrer les transactions pour une période donnée
   */
  const filterTransactionsForPeriod = useCallback((period: PeriodSelection): Transaction[] => {
    if (period.type === 'year') {
      const startDate = new Date(period.year, 0, 1);
      const endDate = new Date(period.year, 11, 31, 23, 59, 59);
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }
    
    if (period.type === 'month' && period.month) {
      const startDate = new Date(period.year, period.month - 1, 1);
      const endDate = new Date(period.year, period.month, 0, 23, 59, 59);
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }
    
    if (period.type === 'range' && period.startMonth && period.endMonth) {
      const startDate = new Date(period.year, period.startMonth - 1, 1);
      const endDate = new Date(period.year, period.endMonth, 0, 23, 59, 59);
      return transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= startDate && transactionDate <= endDate;
      });
    }
    
    return [];
  }, [transactions]);

  /**
   * Calculer les données de comparaison pour une période
   */
  const calculatePeriodData = useCallback((period: PeriodSelection): PeriodComparisonData => {
    const periodBudgets = filterBudgetsForPeriod(period);
    const periodTransactions = filterTransactionsForPeriod(period);
    
    // Calculer le breakdown par catégorie
    const breakdownMap = new Map<TransactionCategory, { budget: number; spent: number }>();
    
    // Initialiser toutes les catégories avec 0
    Object.keys(TRANSACTION_CATEGORIES).forEach(category => {
      breakdownMap.set(category as TransactionCategory, { budget: 0, spent: 0 });
    });
    
    // Agréger les budgets par catégorie
    periodBudgets.forEach(budget => {
      const current = breakdownMap.get(budget.category) || { budget: 0, spent: 0 };
      breakdownMap.set(budget.category, {
        budget: current.budget + budget.amount,
        spent: current.spent + budget.spent
      });
    });
    
    // Agréger les dépenses par catégorie
    periodTransactions.forEach(transaction => {
      const current = breakdownMap.get(transaction.category) || { budget: 0, spent: 0 };
      breakdownMap.set(transaction.category, {
        budget: current.budget,
        spent: current.spent + Math.abs(transaction.amount)
      });
    });
    
    // Convertir en tableau CategoryBreakdown
    const categoryBreakdown: CategoryBreakdown[] = Array.from(breakdownMap.entries())
      .map(([category, data]) => {
        const complianceRate = data.budget === 0
          ? (data.spent === 0 ? 100 : 0)
          : Math.max(0, Math.min(100, ((data.budget - data.spent) / data.budget) * 100));
        
        return {
          category,
          categoryName: TRANSACTION_CATEGORIES[category]?.name || category,
          yearlyBudget: data.budget,
          yearlySpent: data.spent,
          complianceRate: Math.round(complianceRate * 100) / 100
        };
      })
      .filter(item => item.yearlyBudget > 0 || item.yearlySpent > 0)
      .sort((a, b) => b.yearlyBudget - a.yearlyBudget);
    
    // Calculer les données mensuelles
    const monthlyMap = new Map<number, { budget: number; spent: number }>();
    
    // Déterminer la plage de mois à analyser
    let startMonth = 1;
    let endMonth = 12;
    
    if (period.type === 'month' && period.month) {
      startMonth = period.month;
      endMonth = period.month;
    } else if (period.type === 'range' && period.startMonth && period.endMonth) {
      startMonth = period.startMonth;
      endMonth = period.endMonth;
    }
    
    // Initialiser les mois de la période
    for (let month = startMonth; month <= endMonth; month++) {
      monthlyMap.set(month, { budget: 0, spent: 0 });
    }
    
    // Agréger les budgets par mois
    periodBudgets.forEach(budget => {
      if (budget.month >= startMonth && budget.month <= endMonth) {
        const current = monthlyMap.get(budget.month) || { budget: 0, spent: 0 };
        monthlyMap.set(budget.month, {
          budget: current.budget + budget.amount,
          spent: current.spent + budget.spent
        });
      }
    });
    
    // Agréger les dépenses par mois
    periodTransactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const month = transactionDate.getMonth() + 1;
      if (month >= startMonth && month <= endMonth) {
        const current = monthlyMap.get(month) || { budget: 0, spent: 0 };
        monthlyMap.set(month, {
          budget: current.budget,
          spent: current.spent + Math.abs(transaction.amount)
        });
      }
    });
    
    // Convertir en tableau MonthlyData
    const monthlyDetails: MonthlyData[] = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        monthName: MONTH_NAMES_FR[month - 1],
        budget: data.budget,
        spent: data.spent
      }))
      .sort((a, b) => a.month - b.month);
    
    // Calculer les totaux
    const totalBudget = categoryBreakdown.reduce((sum, item) => sum + item.yearlyBudget, 0);
    const totalSpent = categoryBreakdown.reduce((sum, item) => sum + item.yearlySpent, 0);
    const savings = totalBudget - totalSpent;
    const savingsRate = totalBudget === 0 ? 0 : (savings / totalBudget) * 100;
    
    return {
      period,
      periodLabel: generatePeriodLabel(period),
      totalBudget,
      totalSpent,
      savings,
      savingsRate: Math.round(savingsRate * 100) / 100,
      categoryBreakdown,
      monthlyDetails
    };
  }, [filterBudgetsForPeriod, filterTransactionsForPeriod, generatePeriodLabel]);

  /**
   * Calculer le résultat de comparaison entre deux périodes
   */
  const comparisonResult = useMemo<ComparisonResult | null>(() => {
    if (availableYears.length < 1) {
      return null;
    }
    
    const data1 = calculatePeriodData(period1);
    const data2 = calculatePeriodData(period2);
    
    // Calculer les différences
    const budgetChange = data2.totalBudget - data1.totalBudget;
    const budgetChangePercent = data1.totalBudget === 0 ? 0 : (budgetChange / data1.totalBudget) * 100;
    const spentChange = data2.totalSpent - data1.totalSpent;
    const spentChangePercent = data1.totalSpent === 0 ? 0 : (spentChange / data1.totalSpent) * 100;
    const savingsChange = data2.savings - data1.savings;
    const savingsRateChange = data2.savingsRate - data1.savingsRate;
    
    // Identifier les catégories améliorées et détériorées
    const categoryMap1 = new Map(data1.categoryBreakdown.map(item => [item.category, item]));
    const categoryMap2 = new Map(data2.categoryBreakdown.map(item => [item.category, item]));
    
    const improvedCategories: string[] = [];
    const worsenedCategories: string[] = [];
    
    categoryMap2.forEach((item2, category) => {
      const item1 = categoryMap1.get(category);
      if (item1) {
        const complianceChange = item2.complianceRate - item1.complianceRate;
        if (complianceChange > 5) {
          improvedCategories.push(item2.categoryName);
        } else if (complianceChange < -5) {
          worsenedCategories.push(item2.categoryName);
        }
      }
    });
    
    return {
      period1: data1,
      period2: data2,
      differences: {
        budgetChange: Math.round(budgetChange * 100) / 100,
        budgetChangePercent: Math.round(budgetChangePercent * 100) / 100,
        spentChange: Math.round(spentChange * 100) / 100,
        spentChangePercent: Math.round(spentChangePercent * 100) / 100,
        savingsChange: Math.round(savingsChange * 100) / 100,
        savingsRateChange: Math.round(savingsRateChange * 100) / 100,
        improvedCategories,
        worsenedCategories
      }
    };
  }, [period1, period2, availableYears.length, calculatePeriodData]);

  /**
   * Détecter les catégories problématiques avec dépassements récurrents
   */
  const problematicCategories = useMemo<ProblematicCategory[]>(() => {
    if (availableYears.length === 0) {
      return [];
    }
    
    const categoryOverspending = new Map<string, {
      months: Array<{ year: number; month: number; overspend: number; overspendPercent: number }>;
      categoryLabel: string;
    }>();
    
    // Analyser chaque mois disponible
    availableMonths.forEach(({ year, month }) => {
      const period: PeriodSelection = { type: 'month', year, month };
      const periodBudgets = filterBudgetsForPeriod(period);
      const periodTransactions = filterTransactionsForPeriod(period);
      
      // Calculer le breakdown par catégorie pour ce mois
      const breakdownMap = new Map<TransactionCategory, { budget: number; spent: number }>();
      
      periodBudgets.forEach(budget => {
        const current = breakdownMap.get(budget.category) || { budget: 0, spent: 0 };
        breakdownMap.set(budget.category, {
          budget: current.budget + budget.amount,
          spent: current.spent + budget.spent
        });
      });
      
      periodTransactions.forEach(transaction => {
        const current = breakdownMap.get(transaction.category) || { budget: 0, spent: 0 };
        breakdownMap.set(transaction.category, {
          budget: current.budget,
          spent: current.spent + Math.abs(transaction.amount)
        });
      });
      
      // Identifier les dépassements
      breakdownMap.forEach((data, category) => {
        if (data.budget > 0 && data.spent > data.budget) {
          const overspend = data.spent - data.budget;
          const overspendPercent = (overspend / data.budget) * 100;
          
          if (!categoryOverspending.has(category)) {
            categoryOverspending.set(category, {
              months: [],
              categoryLabel: TRANSACTION_CATEGORIES[category]?.name || category
            });
          }
          
          const entry = categoryOverspending.get(category)!;
          entry.months.push({ year, month, overspend, overspendPercent });
        }
      });
    });
    
    // Convertir en ProblematicCategory
    const problematic: ProblematicCategory[] = [];
    
    categoryOverspending.forEach((data, category) => {
      // Filtrer les catégories avec au moins 2 mois de dépassement
      if (data.months.length < 2) {
        return;
      }
      
      // Calculer les moyennes
      const totalOverspend = data.months.reduce((sum, m) => sum + m.overspend, 0);
      const averageOverspend = totalOverspend / data.months.length;
      const totalOverspendPercent = data.months.reduce((sum, m) => sum + m.overspendPercent, 0);
      const averageOverspendPercent = totalOverspendPercent / data.months.length;
      
      // Calculer la tendance (comparer les 3 derniers vs les 3 précédents)
      let trend: 'worsening' | 'stable' | 'improving' = 'stable';
      if (data.months.length >= 6) {
        const sortedMonths = [...data.months].sort((a, b) => {
          if (a.year !== b.year) return a.year - b.year;
          return a.month - b.month;
        });
        const last3 = sortedMonths.slice(-3);
        const previous3 = sortedMonths.slice(-6, -3);
        const avgLast3 = last3.reduce((sum, m) => sum + m.overspendPercent, 0) / 3;
        const avgPrevious3 = previous3.reduce((sum, m) => sum + m.overspendPercent, 0) / 3;
        
        if (avgLast3 > avgPrevious3 * 1.1) {
          trend = 'worsening';
        } else if (avgLast3 < avgPrevious3 * 0.9) {
          trend = 'improving';
        }
      }
      
      // Calculer la sévérité
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (data.months.length >= 6 && averageOverspendPercent > 50) {
        severity = 'critical';
      } else if (data.months.length >= 6 || averageOverspendPercent > 25) {
        severity = 'high';
      } else if (data.months.length >= 4 || averageOverspendPercent > 10) {
        severity = 'medium';
      }
      
      // Générer les périodes affectées
      const affectedPeriods = data.months.map(m => 
        `${MONTH_NAMES_FR[m.month - 1]} ${m.year}`
      );
      
      problematic.push({
        category,
        categoryLabel: data.categoryLabel,
        overspendingMonths: data.months.length,
        totalMonthsAnalyzed: availableMonths.length,
        averageOverspend: Math.round(averageOverspend * 100) / 100,
        averageOverspendPercentage: Math.round(averageOverspendPercent * 100) / 100,
        trend,
        affectedPeriods,
        severity
      });
    });
    
    // Trier par sévérité puis par nombre de mois
    return problematic.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      if (severityOrder[a.severity] !== severityOrder[b.severity]) {
        return severityOrder[b.severity] - severityOrder[a.severity];
      }
      return b.overspendingMonths - a.overspendingMonths;
    });
  }, [availableYears.length, availableMonths, filterBudgetsForPeriod, filterTransactionsForPeriod]);

  /**
   * Calculer l'évolution annuelle
   */
  const yearlyEvolution = useMemo<YearEvolutionPoint[]>(() => {
    return availableYears.map(year => {
      const period: PeriodSelection = { type: 'year', year };
      const data = calculatePeriodData(period);
      
      // Calculer le taux de conformité (% de catégories dans le budget)
      const compliantCategories = data.categoryBreakdown.filter(
        item => item.yearlySpent <= item.yearlyBudget
      ).length;
      const complianceRate = data.categoryBreakdown.length === 0 
        ? 0 
        : (compliantCategories / data.categoryBreakdown.length) * 100;
      
      return {
        year,
        label: year.toString(),
        totalBudget: data.totalBudget,
        totalSpent: data.totalSpent,
        savingsRate: data.savingsRate,
        complianceRate: Math.round(complianceRate * 100) / 100
      };
    });
  }, [availableYears, calculatePeriodData]);

  /**
   * Calculer l'évolution mensuelle
   */
  const monthlyEvolution = useMemo<YearEvolutionPoint[]>(() => {
    return availableMonths.map(({ year, month, monthName }) => {
      const period: PeriodSelection = { type: 'month', year, month };
      const data = calculatePeriodData(period);
      
      // Calculer le taux de conformité
      const compliantCategories = data.categoryBreakdown.filter(
        item => item.yearlySpent <= item.yearlyBudget
      ).length;
      const complianceRate = data.categoryBreakdown.length === 0 
        ? 0 
        : (compliantCategories / data.categoryBreakdown.length) * 100;
      
      return {
        year,
        month,
        label: `${monthName.substring(0, 3)} ${year}`,
        totalBudget: data.totalBudget,
        totalSpent: data.totalSpent,
        savingsRate: data.savingsRate,
        complianceRate: Math.round(complianceRate * 100) / 100
      };
    });
  }, [availableMonths, calculatePeriodData]);

  /**
   * Setter pour period1 avec validation
   */
  const setPeriod1 = useCallback((period: PeriodSelection) => {
    setPeriod1State(period);
  }, []);

  /**
   * Setter pour period2 avec validation
   */
  const setPeriod2 = useCallback((period: PeriodSelection) => {
    setPeriod2State(period);
  }, []);

  return {
    availableYears,
    availableMonths,
    period1,
    period2,
    setPeriod1,
    setPeriod2,
    comparisonResult,
    problematicCategories,
    yearlyEvolution,
    monthlyEvolution,
    isLoading,
    error,
    refetch: loadData
  };
}


