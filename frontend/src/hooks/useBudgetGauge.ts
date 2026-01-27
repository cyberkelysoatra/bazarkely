/**
 * useBudgetGauge Hook - BazarKELY
 * Custom hook for budget gauge logic in AddTransactionPage
 * 
 * Fetches budget data using getBudgetByCategory from budgetService,
 * calculates spent amounts from transactions, computes percentage and remaining,
 * determines status with Épargne special logic.
 * 
 * @version 1.0
 * @date 2026-01-26
 * @author BazarKELY Team
 * 
 * @example
 * ```tsx
 * const {
 *   budgetAmount,
 *   spentAmount,
 *   projectedSpent,
 *   percentage,
 *   remaining,
 *   status,
 *   loading,
 *   error,
 *   hasBudget
 * } = useBudgetGauge('alimentation', 50000, '2026-01-15', true);
 * ```
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import budgetService from '../services/budgetService';
import apiService from '../services/apiService';
import type { Budget, Transaction } from '../types';
import { convertAmountWithStoredRate } from '../utils/currencyConversion';

/**
 * Status type for budget gauge
 */
export type BudgetStatus = 'good' | 'warning' | 'exceeded';

/**
 * Status object with display properties
 */
export interface BudgetStatusInfo {
  status: BudgetStatus;
  color: string;
  bgColor: string;
  label: string;
}

/**
 * Return type for useBudgetGauge hook
 */
export interface UseBudgetGaugeReturn {
  budgetAmount: number;
  spentAmount: number;
  projectedSpent: number;
  percentage: number;
  remaining: number;
  status: BudgetStatusInfo;
  loading: boolean;
  error: string | null;
  hasBudget: boolean;
}

/**
 * Custom hook for budget gauge logic
 * 
 * @param category - Category name (case-insensitive matching)
 * @param currentAmount - Current transaction amount being added
 * @param date - Date string (ISO format or parseable date string)
 * @param isExpense - Whether the transaction is an expense (true) or income (false)
 * @returns Budget gauge data with calculations and status
 */
export function useBudgetGauge(
  category: string,
  currentAmount: number,
  date: string,
  isExpense: boolean
): UseBudgetGaugeReturn {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Parse date to extract month (1-12) and year
  const { month, year } = useMemo(() => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        throw new Error('Invalid date');
      }
      return {
        month: dateObj.getMonth() + 1, // 1-12
        year: dateObj.getFullYear()
      };
    } catch (err) {
      console.error('Error parsing date:', err);
      const now = new Date();
      return {
        month: now.getMonth() + 1,
        year: now.getFullYear()
      };
    }
  }, [date]);

  // Normalize category for comparison (case-insensitive, trimmed)
  const normalizedCategory = useMemo(() => {
    return category.trim().toLowerCase();
  }, [category]);

  // Early return if category is empty or not an expense
  const shouldSkip = useMemo(() => {
    return !normalizedCategory || !isExpense;
  }, [normalizedCategory, isExpense]);

  // Fetch budget data
  useEffect(() => {
    if (shouldSkip) {
      setBudget(null);
      setTransactions([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function fetchBudgetData() {
      setLoading(true);
      setError(null);

      try {
        // Fetch budget using getBudgetByCategory
        const budgetData = await budgetService.getBudgetByCategory(
          category,
          month,
          year
        );

        if (cancelled) return;

        setBudget(budgetData || null);

        // Fetch all transactions
        const transactionsResponse = await apiService.getTransactions();

        if (cancelled) return;

        if (!transactionsResponse.success || transactionsResponse.error) {
          throw new Error(transactionsResponse.error || 'Failed to fetch transactions');
        }

        // Map Supabase transactions to Transaction format
        const supabaseTransactions = (transactionsResponse.data as any[]) || [];
        const mappedTransactions: Transaction[] = supabaseTransactions.map((t: any) => ({
          id: t.id,
          userId: t.user_id,
          accountId: t.account_id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          category: t.category,
          date: new Date(t.date),
          targetAccountId: t.target_account_id || undefined,
          transferFee: t.transfer_fee || undefined,
          originalCurrency: t.original_currency || undefined,
          originalAmount: t.original_amount || undefined,
          exchangeRateUsed: t.exchange_rate_used || undefined,
          notes: t.notes || undefined,
          createdAt: new Date(t.created_at),
          currentOwnerId: t.current_owner_id || t.user_id,
          originalOwnerId: t.original_owner_id || undefined,
          transferredAt: t.transferred_at || undefined,
          isRecurring: t.is_recurring || false,
          recurringTransactionId: t.recurring_transaction_id || undefined,
        }));

        setTransactions(mappedTransactions);
      } catch (err) {
        if (cancelled) return;
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        console.error('Error fetching budget gauge data:', err);
        setError(errorMessage);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchBudgetData();

    return () => {
      cancelled = true;
    };
  }, [category, month, year, shouldSkip]);

  // Filter transactions by category, month, year, and type (expense only)
  const filteredTransactions = useMemo(() => {
    if (shouldSkip || !transactions.length) {
      return [];
    }

    return transactions.filter((tx) => {
      // Normalize transaction category for comparison
      const txCategory = String(tx.category).trim().toLowerCase();
      
      // Check category match (case-insensitive)
      if (txCategory !== normalizedCategory) {
        return false;
      }

      // Check transaction type is expense
      if (tx.type !== 'expense') {
        return false;
      }

      // Check month and year match
      const txDate = new Date(tx.date);
      const txMonth = txDate.getMonth() + 1;
      const txYear = txDate.getFullYear();

      return txMonth === month && txYear === year;
    });
  }, [transactions, normalizedCategory, month, year, shouldSkip]);

  // Calculate spentAmount by summing filtered transaction amounts
  // Convert all amounts to MGA for consistent summing
  const spentAmount = useMemo(() => {
    if (shouldSkip || filteredTransactions.length === 0) {
      return 0;
    }

    return filteredTransactions.reduce((sum, tx) => {
      // Use originalAmount if available, otherwise use amount
      const txAmount = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;
      const txCurrency = tx.originalCurrency || 'MGA';
      
      // Convert to MGA if needed
      let amountInMGA = txAmount;
      if (txCurrency === 'EUR' && tx.exchangeRateUsed) {
        // Convert EUR to MGA using stored exchange rate
        amountInMGA = convertAmountWithStoredRate(
          txAmount,
          'EUR',
          'MGA',
          tx.exchangeRateUsed
        );
      } else if (txCurrency === 'EUR' && !tx.exchangeRateUsed) {
        // Fallback: assume 4950 rate if missing (shouldn't happen but handle gracefully)
        console.warn('Missing exchangeRateUsed for EUR transaction, using fallback rate 4950');
        amountInMGA = txAmount * 4950;
      }

      return sum + Math.abs(amountInMGA);
    }, 0);
  }, [filteredTransactions, shouldSkip]);

  // Calculate projectedSpent (spentAmount + currentAmount)
  // Convert currentAmount to MGA if needed (assume MGA for now, can be enhanced)
  const projectedSpent = useMemo(() => {
    if (shouldSkip) {
      return 0;
    }
    // For now, assume currentAmount is in MGA
    // TODO: Could be enhanced to accept currency parameter
    return spentAmount + Math.abs(currentAmount);
  }, [spentAmount, currentAmount, shouldSkip]);

  // Calculate percentage: (projectedSpent / budgetAmount) * 100
  const percentage = useMemo(() => {
    if (shouldSkip || !budget || budget.amount === 0) {
      return 0;
    }
    return (projectedSpent / budget.amount) * 100;
  }, [projectedSpent, budget, shouldSkip]);

  // Calculate remaining: budgetAmount - projectedSpent
  const remaining = useMemo(() => {
    if (shouldSkip || !budget) {
      return 0;
    }
    return Math.max(0, budget.amount - projectedSpent);
  }, [budget, projectedSpent, shouldSkip]);

  // Calculate status with Épargne special logic
  const calculateStatus = useCallback((
    cat: string,
    pct: number
  ): BudgetStatusInfo => {
    const normalizedCat = cat.trim().toLowerCase();
    const isEpargne = normalizedCat === 'épargne' || normalizedCat === 'epargne';

    if (isEpargne) {
      // Épargne special logic: inverted status
      if (pct === 0) {
        return {
          status: 'exceeded',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'À faire'
        };
      } else if (pct < 100) {
        return {
          status: 'warning',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Attention'
        };
      } else {
        return {
          status: 'good',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Bon'
        };
      }
    } else {
      // Normal categories logic
      if (pct >= 100) {
        return {
          status: 'exceeded',
          color: 'text-red-600',
          bgColor: 'bg-red-100',
          label: 'Dépassé'
        };
      } else if (pct >= 80) {
        return {
          status: 'warning',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100',
          label: 'Attention'
        };
      } else {
        return {
          status: 'good',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          label: 'Bon'
        };
      }
    }
  }, []);

  // Calculate status using memoized function
  const status = useMemo(() => {
    if (shouldSkip || !budget) {
      return {
        status: 'good' as BudgetStatus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-100',
        label: 'N/A'
      };
    }
    return calculateStatus(category, percentage);
  }, [category, percentage, budget, shouldSkip, calculateStatus]);

  // Return object with all required properties
  return {
    budgetAmount: budget?.amount || 0,
    spentAmount,
    projectedSpent,
    percentage,
    remaining,
    status,
    loading,
    error,
    hasBudget: !!budget
  };
}

export default useBudgetGauge;
