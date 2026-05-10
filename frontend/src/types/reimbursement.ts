/**
 * Types Dexie locaux pour le module Remboursements Familiaux (S69 — offline-first phase 1).
 *
 * Les snapshots dénormalisés (familyGroupId, fromMemberName, toMemberName,
 * transactionDescription, transactionAmount, transactionDate, transactionCategory,
 * reimbursementRate, hasReimbursementRequest, transactionId) sont peuplés au moment
 * du refresh background depuis Supabase via les jointures family_shared_transactions
 * et family_members. Ils permettent à toutes les lectures SWR de fonctionner offline
 * sans solliciter ces tables séparément.
 */

export type ReimbursementRequestLocalStatus = 'pending' | 'settled' | 'cancelled';

export interface ReimbursementRequestLocal {
  // Champs natifs de la table Supabase reimbursement_requests
  id: string;
  sharedTransactionId: string;
  fromMemberId: string; // débiteur (doit rembourser)
  toMemberId: string; // créancier (a payé)
  amount: number;
  currency: string;
  status: ReimbursementRequestLocalStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  settledAt: string | null;
  settledBy: string | null;
  note: string | null;

  // Snapshots dénormalisés (peuplés au refresh — peuvent décaler légèrement après renommage)
  familyGroupId: string; // dérivé de shared_transaction.family_group_id
  fromMemberName: string; // dérivé de family_members.display_name (débiteur)
  toMemberName: string; // dérivé de family_members.display_name (créancier)
  fromMemberUserId: string | null; // user_id du débiteur (pour vérification d'autorisation offline)
  toMemberUserId: string | null; // user_id du créancier (pour vérification d'autorisation offline)
  transactionId: string | null; // dérivé de shared_transaction.transaction_id
  transactionDescription: string | null;
  transactionAmount: number | null;
  transactionDate: string | null; // ISO
  transactionCategory: string | null;
  reimbursementRate: number | null; // colonne percentage côté Supabase (25 / 50 / 75 / 100)
  hasReimbursementRequest: boolean; // flag de family_shared_transactions (filtrage critique)
}

export interface MemberCreditBalanceLocal {
  id: string;
  familyGroupId: string;
  fromMemberId: string;
  toMemberId: string;
  creditAmount: number;
  currency: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  lastPaymentDate: string | null;

  // Snapshots dénormalisés
  fromMemberName: string;
  toMemberName: string;
}
