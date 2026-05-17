/**
 * Types locaux Dexie pour le module Family Sharing — offline-first (v16, S72).
 *
 * Pattern aligné sur types/reimbursement.ts : snapshots dénormalisés stockés
 * directement dans la ligne locale pour éviter les jointures live et permettre
 * les lectures offline depuis IndexedDB.
 *
 * Ces types ne remplacent pas les types publics (FamilySharedTransaction, etc.)
 * dans types/family.ts — ils sont la représentation Dexie interne du cache local.
 * Les services convertissent Local ↔ public via des mappers dédiés.
 */
import type { SplitType, SplitDetail } from './family';

/**
 * Représentation Dexie d'une transaction partagée.
 *
 * Inclut les snapshots dénormalisés de la transaction source (description,
 * amount, category, date, type) pour que la lecture offline n'ait pas besoin
 * de jointure sur la table transactions.
 *
 * Dates stockées au format ISO string (Dexie n'aime pas les Date dans les
 * index — c'est aussi le pattern utilisé par ReimbursementRequestLocal).
 */
export interface FamilySharedTransactionLocal {
  id: string;
  familyGroupId: string;
  /** Null pour les transactions virtuelles (créées directement comme partage). */
  transactionId: string | null;
  sharedBy: string; // userId de la personne qui a partagé
  paidBy: string; // userId de la personne qui a payé (peut différer de sharedBy)
  isPrivate: boolean;
  splitType: SplitType;
  splitDetails: SplitDetail[]; // JSONB côté Supabase
  hasReimbursementRequest: boolean;

  /** ISO date string — date de partage Supabase (shared_at). */
  sharedAt: string;
  /** ISO date string — created_at Supabase. */
  createdAt: string;
  /** ISO date string — updated_at Supabase. */
  updatedAt: string;

  // Snapshots dénormalisés de la transaction source
  transactionDescription: string | null;
  transactionAmount: number | null;
  transactionCategory: string | null;
  /** ISO date string — date de la transaction source. */
  transactionDate: string | null;
  transactionType: 'income' | 'expense' | 'transfer' | null;
}

/**
 * Représentation Dexie d'une règle de partage automatique.
 *
 * Pas de snapshots externes — toutes les colonnes sont natives à la table
 * Supabase family_sharing_rules.
 */
export interface FamilySharingRuleLocal {
  id: string;
  familyGroupId: string;
  /** userId du créateur (colonne `user_id` côté Supabase, parfois aliasée `created_by`). */
  userId: string;
  name: string;
  description: string | null;
  category: string | null;
  accountId: string | null;
  splitType: SplitType;
  defaultSplitDetails: SplitDetail[] | null;
  isActive: boolean;
  /** ISO date string. */
  createdAt: string;
  /** ISO date string. */
  updatedAt: string;
}

/**
 * Représentation Dexie d'une transaction récurrente partagée.
 *
 * Pas de snapshots dénormalisés sur la recurring_transaction — les composants
 * qui ont besoin du détail (description, amount, nextGenerationDate) lisent
 * directement la table Dexie `recurringTransactions` (déjà cachée localement
 * depuis v7).
 */
export interface FamilySharedRecurringLocal {
  id: string;
  familyGroupId: string;
  recurringTransactionId: string;
  sharedBy: string; // userId
  autoShareGenerated: boolean;
  /** ISO date string. */
  createdAt: string;
  /** ISO date string. */
  updatedAt: string;
}
