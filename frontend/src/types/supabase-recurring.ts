/**
 * Types Supabase pour les transactions récurrentes
 * Conversion entre camelCase (frontend) et snake_case (base de données)
 * Phase 1: Infrastructure et types de base
 */

import type { RecurringTransaction, RecurringTransactionCreate, RecurringTransactionUpdate } from './recurring';

/**
 * Type Supabase pour une transaction récurrente (format base de données)
 * Tous les champs sont en snake_case et les dates sont des strings ISO
 */
export interface SupabaseRecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  start_date: string; // ISO date string
  end_date: string | null; // ISO date string ou null
  day_of_month: number | null;
  day_of_week: number | null;
  notify_before_days: number;
  auto_create: boolean;
  linked_budget_id: string | null;
  target_account_id?: string; // Compte de destination pour les transferts (optionnel, snake_case)
  is_active: boolean;
  last_generated_date: string | null; // ISO date string ou null
  next_generation_date: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

/**
 * Type pour créer une transaction récurrente dans Supabase
 */
export type SupabaseRecurringTransactionInsert = Omit<
  SupabaseRecurringTransaction,
  'id' | 'created_at' | 'updated_at' | 'last_generated_date' | 'next_generation_date'
>;

/**
 * Type pour mettre à jour une transaction récurrente dans Supabase
 */
export type SupabaseRecurringTransactionUpdate = Partial<
  Omit<SupabaseRecurringTransaction, 'id' | 'created_at' | 'user_id'>
> & {
  id: string;
};

/**
 * Convertit une transaction récurrente Supabase (snake_case) vers le format frontend (camelCase)
 * 
 * @param supabaseRecurringTransaction Transaction au format Supabase
 * @returns Transaction au format frontend avec dates converties en Date
 */
export function toRecurringTransaction(
  supabaseRecurringTransaction: SupabaseRecurringTransaction
): RecurringTransaction {
  return {
    id: supabaseRecurringTransaction.id,
    userId: supabaseRecurringTransaction.user_id,
    accountId: supabaseRecurringTransaction.account_id,
    type: supabaseRecurringTransaction.type,
    amount: supabaseRecurringTransaction.amount,
    description: supabaseRecurringTransaction.description,
    category: supabaseRecurringTransaction.category,
    frequency: supabaseRecurringTransaction.frequency,
    startDate: new Date(supabaseRecurringTransaction.start_date),
    endDate: supabaseRecurringTransaction.end_date ? new Date(supabaseRecurringTransaction.end_date) : null,
    dayOfMonth: supabaseRecurringTransaction.day_of_month,
    dayOfWeek: supabaseRecurringTransaction.day_of_week,
    notifyBeforeDays: supabaseRecurringTransaction.notify_before_days,
    autoCreate: supabaseRecurringTransaction.auto_create,
    linkedBudgetId: supabaseRecurringTransaction.linked_budget_id,
    targetAccountId: supabaseRecurringTransaction.target_account_id,
    isActive: supabaseRecurringTransaction.is_active,
    lastGeneratedDate: supabaseRecurringTransaction.last_generated_date 
      ? new Date(supabaseRecurringTransaction.last_generated_date) 
      : null,
    nextGenerationDate: new Date(supabaseRecurringTransaction.next_generation_date),
    createdAt: new Date(supabaseRecurringTransaction.created_at),
    updatedAt: new Date(supabaseRecurringTransaction.updated_at),
  };
}

/**
 * Convertit une transaction récurrente frontend (camelCase) vers le format Supabase (snake_case)
 * 
 * @param recurringTransaction Transaction au format frontend
 * @returns Transaction au format Supabase avec dates converties en ISO strings
 */
export function fromRecurringTransaction(
  recurringTransaction: RecurringTransaction
): SupabaseRecurringTransaction {
  return {
    id: recurringTransaction.id,
    user_id: recurringTransaction.userId,
    account_id: recurringTransaction.accountId,
    type: recurringTransaction.type,
    amount: recurringTransaction.amount,
    description: recurringTransaction.description,
    category: recurringTransaction.category,
    frequency: recurringTransaction.frequency,
    start_date: recurringTransaction.startDate.toISOString(),
    end_date: recurringTransaction.endDate ? recurringTransaction.endDate.toISOString() : null,
    day_of_month: recurringTransaction.dayOfMonth,
    day_of_week: recurringTransaction.dayOfWeek,
    notify_before_days: recurringTransaction.notifyBeforeDays,
    auto_create: recurringTransaction.autoCreate,
    linked_budget_id: recurringTransaction.linkedBudgetId,
    target_account_id: recurringTransaction.targetAccountId,
    is_active: recurringTransaction.isActive,
    last_generated_date: recurringTransaction.lastGeneratedDate 
      ? recurringTransaction.lastGeneratedDate.toISOString() 
      : null,
    next_generation_date: recurringTransaction.nextGenerationDate.toISOString(),
    created_at: recurringTransaction.createdAt.toISOString(),
    updated_at: recurringTransaction.updatedAt.toISOString(),
  };
}

/**
 * Convertit une transaction récurrente Create (frontend) vers le format Supabase Insert
 * 
 * @param recurringTransactionCreate Transaction Create au format frontend
 * @returns Transaction Insert au format Supabase avec dates converties en ISO strings
 */
export function fromRecurringTransactionCreate(
  recurringTransactionCreate: RecurringTransactionCreate
): SupabaseRecurringTransactionInsert {
  // Calculer nextGenerationDate à partir de startDate (la logique de calcul sera implémentée dans Phase 2)
  // Pour l'instant, on utilise startDate comme prochaine date de génération
  const nextGenerationDate = recurringTransactionCreate.startDate;

  return {
    user_id: recurringTransactionCreate.userId,
    account_id: recurringTransactionCreate.accountId,
    type: recurringTransactionCreate.type,
    amount: recurringTransactionCreate.amount,
    description: recurringTransactionCreate.description,
    category: recurringTransactionCreate.category,
    frequency: recurringTransactionCreate.frequency,
    start_date: recurringTransactionCreate.startDate.toISOString(),
    end_date: recurringTransactionCreate.endDate ? recurringTransactionCreate.endDate.toISOString() : null,
    day_of_month: recurringTransactionCreate.dayOfMonth,
    day_of_week: recurringTransactionCreate.dayOfWeek,
    notify_before_days: recurringTransactionCreate.notifyBeforeDays,
    auto_create: recurringTransactionCreate.autoCreate,
    linked_budget_id: recurringTransactionCreate.linkedBudgetId,
    target_account_id: recurringTransactionCreate.targetAccountId,
    is_active: recurringTransactionCreate.isActive,
    next_generation_date: nextGenerationDate.toISOString(),
  };
}

/**
 * Convertit une transaction récurrente Update (frontend) vers le format Supabase Update
 * 
 * @param recurringTransactionUpdate Transaction Update au format frontend
 * @returns Transaction Update au format Supabase avec dates converties en ISO strings si présentes
 */
export function fromRecurringTransactionUpdate(
  recurringTransactionUpdate: RecurringTransactionUpdate
): SupabaseRecurringTransactionUpdate {
  const update: SupabaseRecurringTransactionUpdate = {
    id: recurringTransactionUpdate.id,
  };

  // Convertir seulement les champs présents
  if (recurringTransactionUpdate.accountId !== undefined) {
    update.account_id = recurringTransactionUpdate.accountId;
  }
  if (recurringTransactionUpdate.type !== undefined) {
    update.type = recurringTransactionUpdate.type;
  }
  if (recurringTransactionUpdate.amount !== undefined) {
    update.amount = recurringTransactionUpdate.amount;
  }
  if (recurringTransactionUpdate.description !== undefined) {
    update.description = recurringTransactionUpdate.description;
  }
  if (recurringTransactionUpdate.category !== undefined) {
    update.category = recurringTransactionUpdate.category;
  }
  if (recurringTransactionUpdate.frequency !== undefined) {
    update.frequency = recurringTransactionUpdate.frequency;
  }
  if (recurringTransactionUpdate.startDate !== undefined) {
    update.start_date = recurringTransactionUpdate.startDate.toISOString();
  }
  if (recurringTransactionUpdate.endDate !== undefined) {
    update.end_date = recurringTransactionUpdate.endDate 
      ? recurringTransactionUpdate.endDate.toISOString() 
      : null;
  }
  if (recurringTransactionUpdate.dayOfMonth !== undefined) {
    update.day_of_month = recurringTransactionUpdate.dayOfMonth;
  }
  if (recurringTransactionUpdate.dayOfWeek !== undefined) {
    update.day_of_week = recurringTransactionUpdate.dayOfWeek;
  }
  if (recurringTransactionUpdate.notifyBeforeDays !== undefined) {
    update.notify_before_days = recurringTransactionUpdate.notifyBeforeDays;
  }
  if (recurringTransactionUpdate.autoCreate !== undefined) {
    update.auto_create = recurringTransactionUpdate.autoCreate;
  }
  if (recurringTransactionUpdate.linkedBudgetId !== undefined) {
    update.linked_budget_id = recurringTransactionUpdate.linkedBudgetId;
  }
  if (recurringTransactionUpdate.targetAccountId !== undefined) {
    update.target_account_id = recurringTransactionUpdate.targetAccountId;
  }
  if (recurringTransactionUpdate.isActive !== undefined) {
    update.is_active = recurringTransactionUpdate.isActive;
  }
  if (recurringTransactionUpdate.lastGeneratedDate !== undefined) {
    update.last_generated_date = recurringTransactionUpdate.lastGeneratedDate 
      ? recurringTransactionUpdate.lastGeneratedDate.toISOString() 
      : null;
  }
  if (recurringTransactionUpdate.nextGenerationDate !== undefined) {
    update.next_generation_date = recurringTransactionUpdate.nextGenerationDate.toISOString();
  }
  if (recurringTransactionUpdate.updatedAt !== undefined) {
    update.updated_at = recurringTransactionUpdate.updatedAt.toISOString();
  }

  return update;
}

/**
 * Convertit un tableau de transactions récurrentes Supabase vers le format frontend
 * 
 * @param supabaseRecurringTransactions Tableau de transactions au format Supabase
 * @returns Tableau de transactions au format frontend
 */
export function toRecurringTransactionArray(
  supabaseRecurringTransactions: SupabaseRecurringTransaction[]
): RecurringTransaction[] {
  return supabaseRecurringTransactions.map(toRecurringTransaction);
}

/**
 * Convertit un tableau de transactions récurrentes frontend vers le format Supabase
 * 
 * @param recurringTransactions Tableau de transactions au format frontend
 * @returns Tableau de transactions au format Supabase
 */
export function fromRecurringTransactionArray(
  recurringTransactions: RecurringTransaction[]
): SupabaseRecurringTransaction[] {
  return recurringTransactions.map(fromRecurringTransaction);
}

