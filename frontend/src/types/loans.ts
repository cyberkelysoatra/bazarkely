/**
 * Types pour le module Prêts Familiaux
 * Source unique de vérité — réexportés par services/loanService.ts pour rétrocompatibilité
 */

export type LoanStatus = 'pending' | 'active' | 'late' | 'closed';
export type InterestFrequency = 'daily' | 'weekly' | 'monthly';

export interface PersonalLoan {
  id: string;
  lenderUserId: string;
  lenderName: string;
  borrowerUserId: string | null;
  borrowerName: string;
  borrowerPhone: string;
  isITheBorrower: boolean;
  amountInitial: number;
  currency: 'MGA' | 'EUR';
  interestRate: number;
  interestFrequency: InterestFrequency;
  currentCapital: number;
  dueDate: string | null;
  description: string | null;
  photoUrl: string | null;
  transactionId?: string | null;
  status: LoanStatus;
  lenderConfirmedAt: string | null;
  borrowerConfirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  transactionId: string | null;
  amountPaid: number;
  interestPortion: number;
  capitalPortion: number;
  paymentDate: string;
  notes: string | null;
  confirmedAt: string | null;
  confirmedByUserId: string | null;
  createdAt: string;
}

export interface LoanInterestPeriod {
  id: string;
  loanId: string;
  periodStart: string;
  periodEnd: string;
  capitalAtStart: number;
  interestAmount: number;
  status: 'paid' | 'unpaid' | 'capitalized';
  createdAt: string;
}

export interface LoanWithDetails extends PersonalLoan {
  repayments: LoanRepayment[];
  interestPeriods: LoanInterestPeriod[];
  totalRepaid: number;
  totalInterestPaid: number;
  remainingBalance: number;
  isOverdue: boolean;
}

export interface CreateLoanInput {
  borrowerUserId?: string | null;
  borrowerName?: string;
  borrowerPhone?: string;
  isITheBorrower: boolean;
  amountInitial: number;
  currency: 'MGA' | 'EUR';
  interestRate: number;
  interestFrequency: InterestFrequency;
  dueDate?: string | null;
  description?: string | null;
  photoUrl?: string | null;
  transactionId?: string;
}

export interface UnpaidInterestSummary {
  loanId: string;
  borrowerName: string;
  totalUnpaid: number;
  periodCount: number;
  currency: string;
}

/**
 * Reçu de remboursement stocké localement en attente d'upload Supabase Storage
 * (mode offline ou échec d'upload). Le syncManager déclenchera l'upload + l'UPDATE
 * du loan_repayment associé une fois la connexion rétablie.
 */
export interface PendingReceipt {
  id: string;
  userId: string;
  repaymentId: string;
  fileName: string;
  fileBlob: Blob;
  createdAt: string;
}
