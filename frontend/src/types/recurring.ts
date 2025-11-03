/**
 * Types pour les transactions récurrentes
 * Phase 1: Infrastructure et types de base
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Interface principale pour une transaction récurrente
 */
export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: string;
  frequency: RecurrenceFrequency;
  startDate: Date;
  endDate: Date | null; // null = sans fin
  dayOfMonth: number | null; // Pour monthly/quarterly/yearly (1-31, null = dernier jour)
  dayOfWeek: number | null; // Pour weekly (0=Sunday, 6=Saturday, null = utilise startDate)
  notifyBeforeDays: number; // Nombre de jours avant la génération pour notification
  autoCreate: boolean; // Créer automatiquement la transaction ou demander confirmation
  linkedBudgetId: string | null; // Budget lié (optionnel)
  isActive: boolean; // Transaction récurrente active ou suspendue
  lastGeneratedDate: Date | null; // Date de dernière génération de transaction
  nextGenerationDate: Date; // Prochaine date de génération calculée
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Type pour créer une nouvelle transaction récurrente
 * Omit: id, createdAt, updatedAt, lastGeneratedDate, nextGenerationDate
 */
export type RecurringTransactionCreate = Omit<
  RecurringTransaction,
  'id' | 'createdAt' | 'updatedAt' | 'lastGeneratedDate' | 'nextGenerationDate'
>;

/**
 * Type pour mettre à jour une transaction récurrente
 * Tous les champs sont optionnels sauf id
 */
export type RecurringTransactionUpdate = Partial<
  Omit<RecurringTransaction, 'id' | 'createdAt' | 'userId'>
> & {
  id: string;
};

