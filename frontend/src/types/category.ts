// Type definitions for transaction categories
import type { Database } from './supabase'

/**
 * Transaction category row type from Supabase
 */
export type TransactionCategoryRow = Database['public']['Tables']['transaction_categories']['Row']

/**
 * Transaction category type: income, expense, or both
 */
export type TransactionCategoryType = 'income' | 'expense' | 'both'





