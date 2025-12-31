/**
 * useYearlyBudgetData Hook - BazarKELY
 * Hook personnalisé pour récupérer et agréger les données budgétaires annuelles
 * 
 * @version 1.0
 * @date 2025-01-XX
 * @author BazarKELY Team
 * 
 * @example
 * ```tsx
 * const {
 *   yearlyTotalBudget,
 *   yearlyTotalSpent,
 *   yearlyOverrun,
 *   overrunPercentage,
 *   categoryBreakdown,
 *   monthlyData,
 *   isLoading,
 *   error
 * } = useYearlyBudgetData(2025);
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { db } from '../lib/database';
import type { Budget, Transaction, TransactionCategory } from '../types';
import { TRANSACTION_CATEGORIES } from '../constants';

/**
 * Interface pour le breakdown par catégorie
 */
export interface CategoryBreakdown {
  readonly category: TransactionCategory;
  readonly categoryName: string;
  readonly yearlyBudget: number;
  readonly yearlySpent: number;
  readonly complianceRate: number; // Pourcentage de conformité (0-100)
}

/**
 * Interface pour les données mensuelles
 */
export interface MonthlyData {
  readonly month: number; // 1-12
  readonly monthName: string; // "Janvier", "Février", etc.
  readonly budget: number;
  readonly spent: number;
}

/**
 * Interface pour le retour du hook
 */
export interface UseYearlyBudgetDataReturn {
  readonly yearlyTotalBudget: number;
  readonly yearlyTotalSpent: number;
  readonly yearlyOverrun: number;
  readonly overrunPercentage: number;
  readonly categoryBreakdown: readonly CategoryBreakdown[];
  readonly monthlyData: readonly MonthlyData[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly refetch: () => Promise<void>;
}

/**
 * Noms des mois en français
 */
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
] as const;

/**
 * Hook personnalisé pour récupérer et agréger les données budgétaires annuelles
 * 
 * @param year - Année pour laquelle récupérer les données (défaut: année actuelle)
 * @returns Données budgétaires annuelles avec états de chargement et d'erreur
 */
export default function useYearlyBudgetData(year?: number): UseYearlyBudgetDataReturn {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Utiliser l'année fournie ou l'année actuelle par défaut
  const targetYear = year ?? new Date().getFullYear();

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
      console.error('❌ [useYearlyBudgetData] Erreur lors de la récupération de l\'utilisateur:', err);
      return null;
    }
  }, []);

  /**
   * Récupérer les budgets pour l'année donnée (OFFLINE-FIRST PATTERN)
   */
  const fetchBudgets = useCallback(async (userId: string): Promise<Budget[]> => {
    try {
      // STEP 1: Essayer IndexedDB d'abord
      console.log(`📊 [useYearlyBudgetData] Récupération des budgets ${targetYear} depuis IndexedDB...`);
      const localBudgets = await db.budgets
        .where('userId')
        .equals(userId)
        .filter(budget => budget.year === targetYear)
        .toArray();

      if (localBudgets.length > 0) {
        console.log(`✅ [useYearlyBudgetData] ${localBudgets.length} budget(s) récupéré(s) depuis IndexedDB`);
        return localBudgets;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('⚠️ [useYearlyBudgetData] Mode offline et IndexedDB vide');
        return [];
      }

      console.log(`🌐 [useYearlyBudgetData] Récupération des budgets ${targetYear} depuis Supabase...`);
      const { data, error: supabaseError } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId)
        .eq('year', targetYear);

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
          console.log(`💾 [useYearlyBudgetData] ${supabaseBudgets.length} budget(s) sauvegardé(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ [useYearlyBudgetData] Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }

      console.log(`✅ [useYearlyBudgetData] ${supabaseBudgets.length} budget(s) récupéré(s) depuis Supabase`);
      return supabaseBudgets;
    } catch (err) {
      console.error('❌ [useYearlyBudgetData] Erreur lors de la récupération des budgets:', err);
      // Fallback vers IndexedDB en cas d'erreur
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const localBudgets = await db.budgets
            .where('userId')
            .equals(userId)
            .filter(budget => budget.year === targetYear)
            .toArray();
          if (localBudgets.length > 0) {
            console.log(`⚠️ [useYearlyBudgetData] Retour de ${localBudgets.length} budget(s) depuis IndexedDB après erreur`);
            return localBudgets;
          }
        }
      } catch (fallbackError) {
        console.error('❌ [useYearlyBudgetData] Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }, [targetYear, getCurrentUserId]);

  /**
   * Récupérer les transactions de dépenses pour l'année donnée (OFFLINE-FIRST PATTERN)
   */
  const fetchTransactions = useCallback(async (userId: string): Promise<Transaction[]> => {
    try {
      // STEP 1: Essayer IndexedDB d'abord
      console.log(`📊 [useYearlyBudgetData] Récupération des transactions ${targetYear} depuis IndexedDB...`);
      
      const startDate = new Date(targetYear, 0, 1);
      const endDate = new Date(targetYear, 11, 31, 23, 59, 59);

      const localTransactions = await db.transactions
        .where('userId')
        .equals(userId)
        .filter(transaction => {
          const transactionDate = new Date(transaction.date);
          return transaction.type === 'expense' &&
                 transactionDate >= startDate &&
                 transactionDate <= endDate;
        })
        .toArray();

      if (localTransactions.length > 0) {
        console.log(`✅ [useYearlyBudgetData] ${localTransactions.length} transaction(s) récupérée(s) depuis IndexedDB`);
        return localTransactions;
      }

      // STEP 2: IndexedDB vide, essayer Supabase si online
      if (!navigator.onLine) {
        console.warn('⚠️ [useYearlyBudgetData] Mode offline et IndexedDB vide');
        return [];
      }

      console.log(`🌐 [useYearlyBudgetData] Récupération des transactions ${targetYear} depuis Supabase...`);
      const { data, error: supabaseError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'expense')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

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
          console.log(`💾 [useYearlyBudgetData] ${supabaseTransactions.length} transaction(s) sauvegardée(s) dans IndexedDB`);
        } catch (idbError) {
          console.error('❌ [useYearlyBudgetData] Erreur lors de la sauvegarde dans IndexedDB:', idbError);
        }
      }

      console.log(`✅ [useYearlyBudgetData] ${supabaseTransactions.length} transaction(s) récupérée(s) depuis Supabase`);
      return supabaseTransactions;
    } catch (err) {
      console.error('❌ [useYearlyBudgetData] Erreur lors de la récupération des transactions:', err);
      // Fallback vers IndexedDB en cas d'erreur
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const startDate = new Date(targetYear, 0, 1);
          const endDate = new Date(targetYear, 11, 31, 23, 59, 59);
          const localTransactions = await db.transactions
            .where('userId')
            .equals(userId)
            .filter(transaction => {
              const transactionDate = new Date(transaction.date);
              return transaction.type === 'expense' &&
                     transactionDate >= startDate &&
                     transactionDate <= endDate;
            })
            .toArray();
          if (localTransactions.length > 0) {
            console.log(`⚠️ [useYearlyBudgetData] Retour de ${localTransactions.length} transaction(s) depuis IndexedDB après erreur`);
            return localTransactions;
          }
        }
      } catch (fallbackError) {
        console.error('❌ [useYearlyBudgetData] Erreur lors du fallback IndexedDB:', fallbackError);
      }
      return [];
    }
  }, [targetYear, getCurrentUserId]);

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
        fetchBudgets(userId),
        fetchTransactions(userId)
      ]);

      setBudgets(budgetsData);
      setTransactions(transactionsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erreur lors du chargement des données';
      console.error('❌ [useYearlyBudgetData] Erreur:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [getCurrentUserId, fetchBudgets, fetchTransactions]);

  // Charger les données au montage et quand l'année change
  useEffect(() => {
    loadData();
  }, [loadData]);

  /**
   * Calculer le total budgétaire annuel
   */
  const yearlyTotalBudget = useMemo(() => {
    return budgets.reduce((total, budget) => total + budget.amount, 0);
  }, [budgets]);

  /**
   * Calculer le total dépensé annuel
   */
  const yearlyTotalSpent = useMemo(() => {
    return transactions.reduce((total, transaction) => total + Math.abs(transaction.amount), 0);
  }, [transactions]);

  /**
   * Calculer le dépassement annuel
   */
  const yearlyOverrun = useMemo(() => {
    return Math.max(0, yearlyTotalSpent - yearlyTotalBudget);
  }, [yearlyTotalSpent, yearlyTotalBudget]);

  /**
   * Calculer le pourcentage de dépassement
   */
  const overrunPercentage = useMemo(() => {
    if (yearlyTotalBudget === 0) return 0;
    return (yearlyOverrun / yearlyTotalBudget) * 100;
  }, [yearlyOverrun, yearlyTotalBudget]);

  /**
   * Calculer le breakdown par catégorie
   */
  const categoryBreakdown = useMemo(() => {
    const breakdownMap = new Map<TransactionCategory, { budget: number; spent: number }>();

    // Initialiser toutes les catégories avec 0
    Object.keys(TRANSACTION_CATEGORIES).forEach(category => {
      breakdownMap.set(category as TransactionCategory, { budget: 0, spent: 0 });
    });

    // Agréger les budgets par catégorie
    budgets.forEach(budget => {
      const current = breakdownMap.get(budget.category) || { budget: 0, spent: 0 };
      breakdownMap.set(budget.category, {
        budget: current.budget + budget.amount,
        spent: current.spent + budget.spent
      });
    });

    // Agréger les dépenses par catégorie
    transactions.forEach(transaction => {
      const current = breakdownMap.get(transaction.category) || { budget: 0, spent: 0 };
      breakdownMap.set(transaction.category, {
        budget: current.budget,
        spent: current.spent + Math.abs(transaction.amount)
      });
    });

    // Convertir en tableau avec calcul du taux de conformité
    return Array.from(breakdownMap.entries())
      .map(([category, data]) => {
        const complianceRate = data.budget === 0
          ? (data.spent === 0 ? 100 : 0)
          : Math.max(0, Math.min(100, ((data.budget - data.spent) / data.budget) * 100));

        return {
          category,
          categoryName: TRANSACTION_CATEGORIES[category]?.name || category,
          yearlyBudget: data.budget,
          yearlySpent: data.spent,
          complianceRate: Math.round(complianceRate * 100) / 100 // Arrondir à 2 décimales
        };
      })
      .filter(item => item.yearlyBudget > 0 || item.yearlySpent > 0) // Filtrer les catégories vides
      .sort((a, b) => b.yearlyBudget - a.yearlyBudget); // Trier par budget décroissant
  }, [budgets, transactions]);

  /**
   * Calculer les données mensuelles pour les graphiques
   */
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<number, { budget: number; spent: number }>();

    // Initialiser tous les mois avec 0
    for (let month = 1; month <= 12; month++) {
      monthlyMap.set(month, { budget: 0, spent: 0 });
    }

    // Agréger les budgets par mois
    budgets.forEach(budget => {
      const current = monthlyMap.get(budget.month) || { budget: 0, spent: 0 };
      monthlyMap.set(budget.month, {
        budget: current.budget + budget.amount,
        spent: current.spent + budget.spent
      });
    });

    // Agréger les dépenses par mois
    transactions.forEach(transaction => {
      const transactionDate = new Date(transaction.date);
      const month = transactionDate.getMonth() + 1; // 1-12
      const current = monthlyMap.get(month) || { budget: 0, spent: 0 };
      monthlyMap.set(month, {
        budget: current.budget,
        spent: current.spent + Math.abs(transaction.amount)
      });
    });

    // Convertir en tableau avec noms de mois
    return Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        monthName: MONTH_NAMES[month - 1],
        budget: data.budget,
        spent: data.spent
      }))
      .sort((a, b) => a.month - b.month); // Trier par mois croissant
  }, [budgets, transactions]);

  return {
    yearlyTotalBudget,
    yearlyTotalSpent,
    yearlyOverrun,
    overrunPercentage: Math.round(overrunPercentage * 100) / 100, // Arrondir à 2 décimales
    categoryBreakdown,
    monthlyData,
    isLoading,
    error,
    refetch: loadData
  };
}


