/**
 * Service de gestion des Prêts Familiaux — pattern offline-first
 * IndexedDB est la source primaire ; Supabase synchronisé en SWR (lectures)
 * ou via la queue de syncManager (mutations).
 *
 * Pattern aligné sur transactionService (S66) et goalService (S67).
 */

import { supabase, withTimeout } from '../lib/supabase';
import { computeLoanLiveState } from './loanInterest';
import { db } from '../lib/database';
import { useAppStore } from '../stores/appStore';
import type { SyncOperation, SyncPriority } from '../types';
import { SYNC_PRIORITY } from '../types';
import type {
  PersonalLoan,
  LoanRepayment,
  LoanInterestPeriod,
  LoanWithDetails,
  CreateLoanInput,
  InterestFrequency,
  LoanStatus,
  UnpaidInterestSummary,
  PendingReceipt,
} from '../types/loans';

// Réexport des types pour rétrocompatibilité (10+ fichiers importent ces types depuis ce module)
export type {
  PersonalLoan,
  LoanRepayment,
  LoanInterestPeriod,
  LoanWithDetails,
  CreateLoanInput,
  InterestFrequency,
  LoanStatus,
  UnpaidInterestSummary,
} from '../types/loans';

const SUPABASE_TIMEOUT_MS = 5000;
const LOG_TAG = '💰 [LoanService]';

// ============================================================================
// HELPERS — STATUT ONLINE / IDS
// ============================================================================

function isOnline(): boolean {
  // Source de vérité S67 : useAppStore.isOnline (alimenté par onlineStatusService)
  // Fallback navigator.onLine si le store n'est pas encore initialisé
  try {
    return useAppStore.getState().isOnline ?? navigator.onLine;
  } catch {
    return navigator.onLine;
  }
}

/**
 * Récupère l'utilisateur courant SANS faire de requête réseau.
 *
 * `getCurrentUser()` (lib/supabase) appelle `supabase.auth.getUser()` qui tape
 * `/auth/v1/user` → throw `AuthRetryableFetchError` en mode offline, ce qui
 * cassait la lecture IndexedDB de getMyLoans (S68 hotfix).
 *
 * Ordre de résolution :
 * 1. `useAppStore.user` (Zustand, sync, instantané) — alimenté par App.tsx au login
 * 2. `supabase.auth.getSession()` (lecture localStorage, pas de réseau)
 * 3. null
 */
async function getCurrentUserSafe(): Promise<{ id: string } | null> {
  try {
    const storeUser = useAppStore.getState().user;
    if (storeUser?.id) return { id: storeUser.id };
  } catch {
    /* store pas encore initialisé */
  }
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return { id: data.session.user.id };
  } catch {
    /* getSession ne devrait jamais throw, mais on est défensif */
  }
  return null;
}

// ============================================================================
// HELPERS — MAPPING snake_case ↔ camelCase
// ============================================================================

function mapLoanRow(row: any): PersonalLoan {
  return {
    id: row.id,
    lenderUserId: row.lender_user_id,
    lenderName: row.lender_name || '',
    borrowerUserId: row.borrower_user_id,
    borrowerName: row.borrower_name,
    borrowerPhone: row.borrower_phone,
    isITheBorrower: row.is_i_the_borrower,
    amountInitial: row.amount_initial,
    currency: row.currency,
    interestRate: row.interest_rate,
    interestFrequency: row.interest_frequency,
    currentCapital: row.current_capital,
    dueDate: row.due_date,
    description: row.description,
    photoUrl: row.photo_url,
    transactionId: row.transaction_id || null,
    status: row.status,
    lenderConfirmedAt: row.lender_confirmed_at ?? null,
    borrowerConfirmedAt: row.borrower_confirmed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function loanToRow(loan: Partial<PersonalLoan>): Record<string, any> {
  const row: Record<string, any> = {};
  if (loan.id !== undefined) row.id = loan.id;
  if (loan.lenderUserId !== undefined) row.lender_user_id = loan.lenderUserId;
  if (loan.lenderName !== undefined) row.lender_name = loan.lenderName;
  if (loan.borrowerUserId !== undefined) row.borrower_user_id = loan.borrowerUserId;
  if (loan.borrowerName !== undefined) row.borrower_name = loan.borrowerName;
  if (loan.borrowerPhone !== undefined) row.borrower_phone = loan.borrowerPhone;
  if (loan.isITheBorrower !== undefined) row.is_i_the_borrower = loan.isITheBorrower;
  if (loan.amountInitial !== undefined) row.amount_initial = loan.amountInitial;
  if (loan.currency !== undefined) row.currency = loan.currency;
  if (loan.interestRate !== undefined) row.interest_rate = loan.interestRate;
  if (loan.interestFrequency !== undefined) row.interest_frequency = loan.interestFrequency;
  if (loan.currentCapital !== undefined) row.current_capital = loan.currentCapital;
  if (loan.dueDate !== undefined) row.due_date = loan.dueDate;
  if (loan.description !== undefined) row.description = loan.description;
  if (loan.photoUrl !== undefined) row.photo_url = loan.photoUrl;
  if (loan.transactionId !== undefined) row.transaction_id = loan.transactionId;
  if (loan.status !== undefined) row.status = loan.status;
  if (loan.lenderConfirmedAt !== undefined) row.lender_confirmed_at = loan.lenderConfirmedAt;
  if (loan.borrowerConfirmedAt !== undefined) row.borrower_confirmed_at = loan.borrowerConfirmedAt;
  if (loan.createdAt !== undefined) row.created_at = loan.createdAt;
  if (loan.updatedAt !== undefined) row.updated_at = loan.updatedAt;
  return row;
}

function mapRepaymentRow(row: any): LoanRepayment {
  return {
    id: row.id,
    loanId: row.loan_id,
    transactionId: row.transaction_id,
    amountPaid: row.amount_paid,
    interestPortion: row.interest_portion,
    capitalPortion: row.capital_portion,
    paymentDate: row.payment_date,
    notes: row.notes,
    confirmedAt: row.confirmed_at ?? null,
    confirmedByUserId: row.confirmed_by_user_id ?? null,
    createdAt: row.created_at,
  };
}

function repaymentToRow(rep: Partial<LoanRepayment> & { receiptUrl?: string | null }): Record<string, any> {
  const row: Record<string, any> = {};
  if (rep.id !== undefined) row.id = rep.id;
  if (rep.loanId !== undefined) row.loan_id = rep.loanId;
  if (rep.transactionId !== undefined) row.transaction_id = rep.transactionId;
  if (rep.amountPaid !== undefined) row.amount_paid = rep.amountPaid;
  if (rep.interestPortion !== undefined) row.interest_portion = rep.interestPortion;
  if (rep.capitalPortion !== undefined) row.capital_portion = rep.capitalPortion;
  if (rep.paymentDate !== undefined) row.payment_date = rep.paymentDate;
  if (rep.notes !== undefined) row.notes = rep.notes;
  if (rep.confirmedAt !== undefined) row.confirmed_at = rep.confirmedAt;
  if (rep.confirmedByUserId !== undefined) row.confirmed_by_user_id = rep.confirmedByUserId;
  if (rep.createdAt !== undefined) row.created_at = rep.createdAt;
  if (rep.receiptUrl !== undefined) row.receipt_url = rep.receiptUrl;
  return row;
}

function mapInterestPeriodRow(row: any): LoanInterestPeriod {
  return {
    id: row.id,
    loanId: row.loan_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    capitalAtStart: row.capital_at_start,
    interestAmount: row.interest_amount,
    status: row.status,
    createdAt: row.created_at,
  };
}

function interestPeriodToRow(p: Partial<LoanInterestPeriod>): Record<string, any> {
  const row: Record<string, any> = {};
  if (p.id !== undefined) row.id = p.id;
  if (p.loanId !== undefined) row.loan_id = p.loanId;
  if (p.periodStart !== undefined) row.period_start = p.periodStart;
  if (p.periodEnd !== undefined) row.period_end = p.periodEnd;
  if (p.capitalAtStart !== undefined) row.capital_at_start = p.capitalAtStart;
  if (p.interestAmount !== undefined) row.interest_amount = p.interestAmount;
  if (p.status !== undefined) row.status = p.status;
  if (p.createdAt !== undefined) row.created_at = p.createdAt;
  return row;
}

function computeLoanDetails(
  loan: PersonalLoan,
  repayments: LoanRepayment[],
  interestPeriods: LoanInterestPeriod[]
): LoanWithDetails {
  const totalRepaid = repayments.reduce((sum, r) => sum + r.amountPaid, 0);

  // Calcul "en direct" (modèle journalier S78) — source de vérité unique pour
  // le capital restant, les intérêts courus, le total dû et la répartition
  // intérêts/capital de chaque remboursement (recalculés "intérêts d'abord").
  // Les remboursements sont triés par date pour rejouer la chronologie ;
  // les allocations sont ensuite réalignées sur l'ordre de `repayments`.
  const indexed = repayments.map((r, i) => ({ r, i }));
  const chrono = [...indexed].sort(
    (a, b) => new Date(a.r.paymentDate).getTime() - new Date(b.r.paymentDate).getTime()
  );
  const live = computeLoanLiveState(
    {
      amountInitial: loan.amountInitial,
      interestRate: loan.interestRate,
      interestFrequency: loan.interestFrequency,
      dueDate: loan.dueDate,
      createdAt: loan.createdAt,
    },
    chrono.map(({ r }) => ({ amountPaid: r.amountPaid, paymentDate: r.paymentDate })),
    new Date()
  );
  // Réaligner les allocations (ordre chronologique) sur l'ordre d'entrée
  const liveAllocations = repayments.map(() => ({ interestPortion: 0, capitalPortion: 0 }));
  chrono.forEach(({ i }, chronoIdx) => {
    liveAllocations[i] = live.allocations[chronoIdx] || { interestPortion: 0, capitalPortion: 0 };
  });

  const today = new Date().toISOString().split('T')[0];
  // Statut "soldé" piloté par le moteur (capital + intérêts ≈ 0)
  const status = live.isSettled && loan.status !== 'closed' ? 'closed' : loan.status;
  const isOverdue =
    status === 'late' ||
    (loan.dueDate !== null && loan.dueDate < today && status !== 'closed' && !live.isSettled);

  return {
    ...loan,
    status,
    repayments,
    interestPeriods,
    totalRepaid,
    totalInterestPaid: live.totalInterestPaid,
    remainingBalance: live.totalOwed,
    isOverdue,
    liveCapital: live.capitalOutstanding,
    liveAccruedInterest: live.accruedInterest,
    liveTotalOwed: live.totalOwed,
    liveDailyRatePct: live.dailyRatePct,
    liveAllocations,
  };
}

// ============================================================================
// HELPERS — QUEUE DE SYNCHRONISATION
// ============================================================================

type LoanTable =
  | 'personal_loans'
  | 'loan_repayments'
  | 'loan_interest_periods'
  | 'pending_receipts';

async function queueLoanSyncOperation(
  userId: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  tableName: LoanTable,
  recordId: string,
  data: Record<string, any>,
  priority: SyncPriority = SYNC_PRIORITY.NORMAL
): Promise<void> {
  try {
    const syncOp: SyncOperation = {
      id: crypto.randomUUID(),
      userId,
      operation,
      table_name: tableName,
      data: { id: recordId, ...data },
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending',
      priority,
      syncTag: 'bazarkely-sync',
      expiresAt: null,
    };
    await db.syncQueue.add(syncOp);
    console.log(`${LOG_TAG} 📦 ${operation} ${tableName}/${recordId} ajouté à la queue (priorité ${priority})`);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ Erreur push queue ${tableName}:`, error);
  }
}

// ============================================================================
// HELPERS — REFRESH BACKGROUND (Supabase → IndexedDB)
// ============================================================================

async function refreshLoansFromSupabase(userId: string): Promise<void> {
  try {
    const { data: loansData, error } = (await withTimeout(
      supabase
        .from('personal_loans')
        .select('*')
        .or(`lender_user_id.eq.${userId},borrower_user_id.eq.${userId}`)
        .order('created_at', { ascending: false }),
      SUPABASE_TIMEOUT_MS,
      'loanService.refreshLoansFromSupabase'
    )) as any;

    if (error || !loansData) {
      console.warn(`${LOG_TAG} ⚠️ Refresh prêts échoué:`, error);
      return;
    }

    const loans = (loansData as any[]).map(mapLoanRow);
    if (loans.length > 0) {
      await db.personalLoans.bulkPut(loans);
    }

    const loanIds = loans.map((l) => l.id);

    if (loanIds.length > 0) {
      const [{ data: repData }, { data: ipData }] = await Promise.all([
        withTimeout(
          supabase.from('loan_repayments').select('*').in('loan_id', loanIds),
          SUPABASE_TIMEOUT_MS,
          'loanService.refreshRepayments'
        ) as Promise<any>,
        withTimeout(
          supabase.from('loan_interest_periods').select('*').in('loan_id', loanIds),
          SUPABASE_TIMEOUT_MS,
          'loanService.refreshInterestPeriods'
        ) as Promise<any>,
      ]);

      if (repData) {
        const repayments = (repData as any[]).map(mapRepaymentRow);
        if (repayments.length > 0) {
          await db.loanRepayments.bulkPut(repayments);
        }
      }
      if (ipData) {
        const periods = (ipData as any[]).map(mapInterestPeriodRow);
        if (periods.length > 0) {
          await db.loanInterestPeriods.bulkPut(periods);
        }
      }
    }

    console.log(`${LOG_TAG} 🔄 IndexedDB rafraîchi avec ${loans.length} prêt(s) (background)`);
  } catch (error) {
    console.warn(`${LOG_TAG} ⚠️ Refresh background échoué (non bloquant):`, error);
  }
}

async function getLocalLoansForUser(userId: string): Promise<PersonalLoan[]> {
  // Dexie ne gère pas un OR multi-index proprement ; on combine deux queries + dedupe par id
  const [lent, borrowed] = await Promise.all([
    db.personalLoans.where('lenderUserId').equals(userId).toArray(),
    db.personalLoans.where('borrowerUserId').equals(userId).toArray(),
  ]);
  const dedup = new Map<string, PersonalLoan>();
  for (const l of lent) dedup.set(l.id, l);
  for (const l of borrowed) dedup.set(l.id, l);
  return Array.from(dedup.values()).sort((a, b) =>
    (b.createdAt || '').localeCompare(a.createdAt || '')
  );
}

// ============================================================================
// READS — OFFLINE-FIRST STALE-WHILE-REVALIDATE
// ============================================================================

export async function getMyLoans(): Promise<LoanWithDetails[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) throw new Error('Utilisateur non authentifié');
    const userId = user.id;

    // STEP 1: Lecture IndexedDB en premier
    const localLoans = await getLocalLoansForUser(userId);

    // STEP 2: Si données locales → retour immédiat + refresh background SWR
    if (localLoans.length > 0) {
      const loanIds = localLoans.map((l) => l.id);
      const [localRepayments, localPeriods] = await Promise.all([
        db.loanRepayments.where('loanId').anyOf(loanIds).toArray(),
        db.loanInterestPeriods.where('loanId').anyOf(loanIds).toArray(),
      ]);

      const repByLoan = new Map<string, LoanRepayment[]>();
      for (const r of localRepayments) {
        const arr = repByLoan.get(r.loanId) || [];
        arr.push(r);
        repByLoan.set(r.loanId, arr);
      }
      const periodsByLoan = new Map<string, LoanInterestPeriod[]>();
      for (const p of localPeriods) {
        const arr = periodsByLoan.get(p.loanId) || [];
        arr.push(p);
        periodsByLoan.set(p.loanId, arr);
      }

      const result = localLoans.map((l) =>
        computeLoanDetails(l, repByLoan.get(l.id) || [], periodsByLoan.get(l.id) || [])
      );

      console.log(`${LOG_TAG} ✅ ${result.length} prêt(s) depuis IndexedDB (retour immédiat)`);

      if (isOnline()) {
        refreshLoansFromSupabase(userId).catch(() => {
          /* silencieux : l'UI a déjà les données locales */
        });
      }

      return result;
    }

    // STEP 3: IndexedDB vide ET offline → tableau vide
    if (!isOnline()) {
      console.warn(`${LOG_TAG} ⚠️ IndexedDB vide et offline → tableau vide`);
      return [];
    }

    // STEP 4: IndexedDB vide ET online → fetch Supabase synchrone (premier usage)
    console.log(`${LOG_TAG} 🌐 IndexedDB vide → fetch Supabase synchrone...`);
    try {
      const { data: loansData, error: loansError } = (await withTimeout(
        supabase
          .from('personal_loans')
          .select('*')
          .or(`lender_user_id.eq.${userId},borrower_user_id.eq.${userId}`)
          .order('created_at', { ascending: false }),
        SUPABASE_TIMEOUT_MS,
        'loanService.getMyLoans/initial'
      )) as any;
      if (loansError) throw new Error(loansError.message);
      if (!loansData || loansData.length === 0) return [];

      const loans = (loansData as any[]).map(mapLoanRow);
      const loanIds = loans.map((l) => l.id);

      const [{ data: repaymentsData }, { data: interestPeriodsData }] = await Promise.all([
        withTimeout(
          supabase.from('loan_repayments').select('*').in('loan_id', loanIds),
          SUPABASE_TIMEOUT_MS,
          'loanService.getMyLoans/repayments'
        ) as Promise<any>,
        withTimeout(
          supabase.from('loan_interest_periods').select('*').in('loan_id', loanIds),
          SUPABASE_TIMEOUT_MS,
          'loanService.getMyLoans/periods'
        ) as Promise<any>,
      ]);

      const repayments = ((repaymentsData as any[]) || []).map(mapRepaymentRow);
      const periods = ((interestPeriodsData as any[]) || []).map(mapInterestPeriodRow);

      // Caching IndexedDB
      await db.personalLoans.bulkPut(loans);
      if (repayments.length > 0) await db.loanRepayments.bulkPut(repayments);
      if (periods.length > 0) await db.loanInterestPeriods.bulkPut(periods);

      const repByLoan = new Map<string, LoanRepayment[]>();
      for (const r of repayments) {
        const arr = repByLoan.get(r.loanId) || [];
        arr.push(r);
        repByLoan.set(r.loanId, arr);
      }
      const periodsByLoan = new Map<string, LoanInterestPeriod[]>();
      for (const p of periods) {
        const arr = periodsByLoan.get(p.loanId) || [];
        arr.push(p);
        periodsByLoan.set(p.loanId, arr);
      }

      console.log(`${LOG_TAG} ✅ ${loans.length} prêt(s) depuis Supabase (premier fetch)`);

      return loans.map((l) =>
        computeLoanDetails(l, repByLoan.get(l.id) || [], periodsByLoan.get(l.id) || [])
      );
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ Échec Supabase → tableau vide:`, error);
      return [];
    }
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getMyLoans:`, error);
    return [];
  }
}

export async function getLoanById(id: string): Promise<LoanWithDetails | null> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) throw new Error('Utilisateur non authentifié');

    // STEP 1: IndexedDB en premier
    const localLoan = await db.personalLoans.get(id);
    if (localLoan) {
      if (localLoan.lenderUserId !== user.id && localLoan.borrowerUserId !== user.id) {
        throw new Error('Accès non autorisé à ce prêt');
      }
      const [reps, periods] = await Promise.all([
        db.loanRepayments.where('loanId').equals(id).toArray(),
        db.loanInterestPeriods.where('loanId').equals(id).toArray(),
      ]);
      const sortedReps = [...reps].sort((a, b) => (b.paymentDate || '').localeCompare(a.paymentDate || ''));
      const sortedPeriods = [...periods].sort((a, b) =>
        (b.periodStart || '').localeCompare(a.periodStart || '')
      );

      // Refresh background si online
      if (isOnline()) {
        refreshLoansFromSupabase(user.id).catch(() => {});
      }

      return computeLoanDetails(localLoan, sortedReps, sortedPeriods);
    }

    // STEP 2: Pas trouvé localement ET offline → null
    if (!isOnline()) return null;

    // STEP 3: Online → fetch Supabase synchrone
    const { data: loanData, error: loanError } = (await withTimeout(
      supabase.from('personal_loans').select('*').eq('id', id).single(),
      SUPABASE_TIMEOUT_MS,
      'loanService.getLoanById'
    )) as any;
    if (loanError) {
      if (loanError.code === 'PGRST116') return null;
      throw new Error(loanError.message);
    }
    const loan = mapLoanRow(loanData);
    if (loan.lenderUserId !== user.id && loan.borrowerUserId !== user.id) {
      throw new Error('Accès non autorisé à ce prêt');
    }

    const [{ data: repaymentsData }, { data: interestPeriodsData }] = await Promise.all([
      withTimeout(
        supabase
          .from('loan_repayments')
          .select('*')
          .eq('loan_id', id)
          .order('payment_date', { ascending: false }),
        SUPABASE_TIMEOUT_MS,
        'loanService.getLoanById/repayments'
      ) as Promise<any>,
      withTimeout(
        supabase
          .from('loan_interest_periods')
          .select('*')
          .eq('loan_id', id)
          .order('period_start', { ascending: false }),
        SUPABASE_TIMEOUT_MS,
        'loanService.getLoanById/periods'
      ) as Promise<any>,
    ]);

    const repayments = ((repaymentsData as any[]) || []).map(mapRepaymentRow);
    const periods = ((interestPeriodsData as any[]) || []).map(mapInterestPeriodRow);

    await db.personalLoans.put(loan);
    if (repayments.length > 0) await db.loanRepayments.bulkPut(repayments);
    if (periods.length > 0) await db.loanInterestPeriods.bulkPut(periods);

    return computeLoanDetails(loan, repayments, periods);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getLoanById:`, error);
    return null;
  }
}

export async function getUnpaidInterestPeriods(loanId: string): Promise<LoanInterestPeriod[]> {
  try {
    // IndexedDB d'abord
    const local = await db.loanInterestPeriods
      .where('[loanId+status]')
      .equals([loanId, 'unpaid'])
      .toArray();
    if (local.length > 0) {
      return [...local].sort((a, b) => (a.periodStart || '').localeCompare(b.periodStart || ''));
    }
    if (!isOnline()) return [];
    const { data, error } = (await withTimeout(
      supabase
        .from('loan_interest_periods')
        .select('*')
        .eq('loan_id', loanId)
        .eq('status', 'unpaid')
        .order('period_start', { ascending: true }),
      SUPABASE_TIMEOUT_MS,
      'loanService.getUnpaidInterestPeriods'
    )) as any;
    if (error) throw new Error(error.message);
    const periods = ((data as any[]) || []).map(mapInterestPeriodRow);
    if (periods.length > 0) await db.loanInterestPeriods.bulkPut(periods);
    return periods;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getUnpaidInterestPeriods:`, error);
    return [];
  }
}

export async function getRepaymentHistory(loanId: string): Promise<LoanRepayment[]> {
  try {
    const local = await db.loanRepayments.where('loanId').equals(loanId).toArray();
    if (local.length > 0) {
      const sorted = [...local].sort((a, b) =>
        (b.paymentDate || '').localeCompare(a.paymentDate || '')
      );
      if (isOnline()) {
        // Refresh background
        (async () => {
          try {
            const { data } = (await withTimeout(
              supabase
                .from('loan_repayments')
                .select('*')
                .eq('loan_id', loanId)
                .order('payment_date', { ascending: false }),
              SUPABASE_TIMEOUT_MS,
              'loanService.getRepaymentHistory/refresh'
            )) as any;
            if (data) {
              const fresh = (data as any[]).map(mapRepaymentRow);
              if (fresh.length > 0) await db.loanRepayments.bulkPut(fresh);
            }
          } catch {
            /* silencieux */
          }
        })();
      }
      return sorted;
    }
    if (!isOnline()) return [];
    const { data, error } = (await withTimeout(
      supabase
        .from('loan_repayments')
        .select('*')
        .eq('loan_id', loanId)
        .order('payment_date', { ascending: false }),
      SUPABASE_TIMEOUT_MS,
      'loanService.getRepaymentHistory'
    )) as any;
    if (error) throw new Error(error.message);
    const repayments = ((data as any[]) || []).map(mapRepaymentRow);
    if (repayments.length > 0) await db.loanRepayments.bulkPut(repayments);
    return repayments;
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getRepaymentHistory:`, error);
    return [];
  }
}

export async function getLastUsedInterestSettings(): Promise<{
  rate: number;
  frequency: InterestFrequency;
} | null> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) return null;
    const lent = await db.personalLoans.where('lenderUserId').equals(user.id).toArray();
    if (lent.length === 0) return null;
    const last = [...lent].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))[0];
    return { rate: last.interestRate, frequency: last.interestFrequency };
  } catch {
    return null;
  }
}

export async function getActiveLoansForDropdown(): Promise<
  { id: string; label: string; remainingBalance: number; currency: string; isITheBorrower: boolean }[]
> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) return [];
    const localLoans = await getLocalLoansForUser(user.id);
    const active = localLoans.filter((l) => l.status === 'active');
    return active.map((loan) => {
      const lenderName = loan.lenderName || 'Prêteur inconnu';
      const borrowerName = loan.borrowerName || 'Emprunteur inconnu';
      const amount = loan.currentCapital;
      const formattedAmount = amount.toLocaleString('fr-FR');
      const label = loan.isITheBorrower
        ? `Dette envers ${lenderName} ${formattedAmount}`
        : `Prêt à ${borrowerName} ${formattedAmount}`;
      return {
        id: loan.id,
        label,
        remainingBalance: amount,
        currency: loan.currency,
        isITheBorrower: loan.isITheBorrower,
      };
    });
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getActiveLoansForDropdown:`, error);
    return [];
  }
}

export async function getUnlinkedRevenueTransactions(): Promise<
  { id: string; description: string; amount: number; date: string; currency: string }[]
> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) return [];
    // IDs déjà liés à un remboursement
    const allRepayments = await db.loanRepayments.toArray();
    const linkedIds = new Set(
      allRepayments
        .map((r) => r.transactionId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    );
    // Transactions revenus locales
    const localIncome = await db.transactions.where('userId').equals(user.id).toArray();
    return localIncome
      .filter((t) => t.type === 'income' && !linkedIds.has(t.id))
      .sort((a, b) => {
        const da = a.date instanceof Date ? a.date.getTime() : new Date(a.date as any).getTime();
        const db_ = b.date instanceof Date ? b.date.getTime() : new Date(b.date as any).getTime();
        return db_ - da;
      })
      .slice(0, 50)
      .map((t) => ({
        id: t.id,
        description: t.description || '',
        amount: t.amount,
        date: t.date instanceof Date ? t.date.toISOString() : (t.date as any),
        currency: (t.originalCurrency || 'MGA') as string,
      }));
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getUnlinkedRevenueTransactions:`, error);
    return [];
  }
}

export async function getLoanIdByTransactionId(transactionId: string): Promise<string | null> {
  try {
    const all = await db.personalLoans.toArray();
    const match = all.find((l) => l.transactionId === transactionId);
    return match ? match.id : null;
  } catch {
    return null;
  }
}

export async function getLoanByRepaymentTransactionId(
  repaymentTransactionId: string
): Promise<{ loanId: string; loan: LoanWithDetails | null } | null> {
  try {
    const allReps = await db.loanRepayments.toArray();
    const rep = allReps.find((r) => r.transactionId === repaymentTransactionId);
    if (!rep) return null;
    const loan = await getLoanById(rep.loanId);
    return { loanId: rep.loanId, loan };
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getLoanByRepaymentTransactionId:`, error);
    return null;
  }
}

export async function getRepaymentIndexForTransaction(
  loanId: string,
  repaymentTransactionId: string
): Promise<number> {
  try {
    const repayments = await getRepaymentHistory(loanId);
    const sorted = [...repayments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const index = sorted.findIndex((r) => r.transactionId === repaymentTransactionId);
    return index >= 0 ? index + 1 : sorted.length + 1;
  } catch {
    return 1;
  }
}

export async function getTotalUnpaidInterestByLoan(userId: string): Promise<UnpaidInterestSummary[]> {
  try {
    if (!userId) return [];
    const localLoans = await getLocalLoansForUser(userId);
    if (localLoans.length === 0) return [];
    const loanIds = localLoans.map((l) => l.id);
    const loansMap = new Map<string, { borrowerName: string; currency: string }>();
    localLoans.forEach((l) =>
      loansMap.set(l.id, {
        borrowerName: l.borrowerName || 'Inconnu',
        currency: l.currency || 'MGA',
      })
    );
    const allPeriods = await db.loanInterestPeriods.where('loanId').anyOf(loanIds).toArray();
    const unpaid = allPeriods.filter((p) => p.status === 'unpaid');
    if (unpaid.length === 0) return [];
    const map = new Map<string, UnpaidInterestSummary>();
    for (const p of unpaid) {
      const info = loansMap.get(p.loanId);
      if (!info) continue;
      const summary = map.get(p.loanId) || {
        loanId: p.loanId,
        borrowerName: info.borrowerName,
        totalUnpaid: 0,
        periodCount: 0,
        currency: info.currency,
      };
      summary.totalUnpaid += p.interestAmount || 0;
      summary.periodCount += 1;
      map.set(p.loanId, summary);
    }
    return Array.from(map.values());
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getTotalUnpaidInterestByLoan:`, error);
    return [];
  }
}

export async function getDistinctBeneficiaryNames(): Promise<string[]> {
  try {
    const user = await getCurrentUserSafe();
    if (!user) return [];
    const local = await getLocalLoansForUser(user.id);
    const seen = new Map<string, string>();
    for (const loan of local) {
      const candidates = [loan.borrowerName, loan.lenderName];
      for (const raw of candidates) {
        if (typeof raw === 'string' && raw.trim().length > 0) {
          const key = raw.trim().toLowerCase();
          if (!seen.has(key)) seen.set(key, raw.trim());
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.localeCompare(b, 'fr', { sensitivity: 'base' })
    );
  } catch (error) {
    console.error(`${LOG_TAG} ❌ getDistinctBeneficiaryNames:`, error);
    return [];
  }
}

// ============================================================================
// MUTATIONS — OFFLINE-FIRST (Dexie write → Supabase sync ou queue)
// ============================================================================

export async function createLoan(input: CreateLoanInput): Promise<PersonalLoan> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  if (!input.borrowerName && !input.borrowerUserId) {
    throw new Error("Le nom de l'emprunteur ou l'ID utilisateur est requis");
  }

  const loanId = crypto.randomUUID();
  const nowIso = new Date().toISOString();

  const loan: PersonalLoan = {
    id: loanId,
    lenderUserId: user.id,
    lenderName: '', // sera rempli côté serveur via trigger ; vide en local au début
    borrowerUserId: input.borrowerUserId || null,
    borrowerName: input.borrowerName || '',
    borrowerPhone: input.borrowerPhone || '',
    isITheBorrower: input.isITheBorrower,
    amountInitial: input.amountInitial,
    currency: input.currency,
    interestRate: input.interestRate,
    interestFrequency: input.interestFrequency,
    currentCapital: input.amountInitial,
    dueDate: input.dueDate || null,
    description: input.description || null,
    photoUrl: input.photoUrl || null,
    transactionId: input.transactionId || null,
    status: 'pending',
    lenderConfirmedAt: null,
    borrowerConfirmedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // STEP 1: IndexedDB immédiat
  await db.personalLoans.add(loan);
  console.log(`${LOG_TAG} ✅ Prêt créé en IndexedDB: ${loanId}`);

  // STEP 2: Tentative Supabase si online
  if (isOnline()) {
    try {
      const { data, error } = (await withTimeout(
        supabase
          .from('personal_loans')
          .upsert(loanToRow(loan), { onConflict: 'id' })
          .select()
          .single(),
        SUPABASE_TIMEOUT_MS,
        'loanService.createLoan'
      )) as any;
      if (error) throw new Error(error.message);
      const synced = mapLoanRow(data);
      if (synced.id !== loanId) {
        await db.personalLoans.delete(loanId);
        await db.personalLoans.add(synced);
      } else {
        await db.personalLoans.put(synced);
      }
      console.log(`${LOG_TAG} 🌐 Prêt synchronisé Supabase: ${synced.id}`);
      return synced;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ Sync Supabase échouée, push dans queue:`, error);
      await queueLoanSyncOperation(user.id, 'CREATE', 'personal_loans', loanId, loanToRow(loan));
      return loan;
    }
  }

  // STEP 3: Offline → queue
  console.log(`${LOG_TAG} 📦 Mode offline, prêt poussé dans queue`);
  await queueLoanSyncOperation(user.id, 'CREATE', 'personal_loans', loanId, loanToRow(loan));
  return loan;
}

export async function updateLoanStatus(id: string, status: LoanStatus): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const existing = await db.personalLoans.get(id);
  if (existing) {
    if (existing.lenderUserId !== user.id && existing.borrowerUserId !== user.id) {
      throw new Error('Accès non autorisé à ce prêt');
    }
  }
  const updatedAt = new Date().toISOString();
  await db.personalLoans.update(id, { status, updatedAt });

  const payload = { status, updated_at: updatedAt };

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').update(payload).eq('id', id),
        SUPABASE_TIMEOUT_MS,
        'loanService.updateLoanStatus'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ updateLoanStatus Supabase échoué, queue:`, error);
    }
  }
  await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', id, payload);
}

export async function deleteLoan(id: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const existing = await db.personalLoans.get(id);
  if (existing && existing.lenderUserId !== user.id) {
    throw new Error('Seul le prêteur peut supprimer ce prêt');
  }

  // Supprimer aussi les sous-entités locales
  await db.personalLoans.delete(id);
  const reps = await db.loanRepayments.where('loanId').equals(id).toArray();
  if (reps.length > 0) {
    await db.loanRepayments.bulkDelete(reps.map((r) => r.id));
  }
  const periods = await db.loanInterestPeriods.where('loanId').equals(id).toArray();
  if (periods.length > 0) {
    await db.loanInterestPeriods.bulkDelete(periods.map((p) => p.id));
  }

  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').delete().eq('id', id),
        SUPABASE_TIMEOUT_MS,
        'loanService.deleteLoan'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ deleteLoan Supabase échoué, queue:`, error);
    }
  }
  await queueLoanSyncOperation(user.id, 'DELETE', 'personal_loans', id, {});
}

export async function confirmLoanAsBorrower(loanId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const updatedAt = new Date().toISOString();
  const borrowerConfirmedAt = updatedAt;
  await db.personalLoans.update(loanId, {
    borrowerConfirmedAt,
    status: 'active' as LoanStatus,
    updatedAt,
  });
  const payload = {
    borrower_confirmed_at: borrowerConfirmedAt,
    status: 'active',
    updated_at: updatedAt,
  };
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').update(payload).eq('id', loanId),
        SUPABASE_TIMEOUT_MS,
        'loanService.confirmLoanAsBorrower'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ confirmLoanAsBorrower Supabase échoué, queue:`, error);
    }
  }
  await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', loanId, payload);
}

export async function confirmRepaymentAsLender(repaymentId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const confirmedAt = new Date().toISOString();
  await db.loanRepayments.update(repaymentId, {
    confirmedAt,
    confirmedByUserId: user.id,
  });
  const payload = {
    confirmed_at: confirmedAt,
    confirmed_by_user_id: user.id,
  };
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('loan_repayments').update(payload).eq('id', repaymentId),
        SUPABASE_TIMEOUT_MS,
        'loanService.confirmRepaymentAsLender'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ confirmRepaymentAsLender Supabase échoué, queue:`, error);
    }
  }
  await queueLoanSyncOperation(user.id, 'UPDATE', 'loan_repayments', repaymentId, payload);
}

/**
 * Enregistre un paiement de prêt (Phase 2 — engine intérêts/capital).
 *
 * Offline-first :
 * - Read loan, unpaid periods depuis IndexedDB
 * - Calcule interestPortion / capitalPortion / nouveau capital
 * - Update Dexie : périodes payées, nouveau repayment, prêt mis à jour
 * - Pour chaque mutation, tente Supabase si online, sinon queue
 *
 * @param receiptFileOrUrl — Soit l'URL déjà uploadée (cas online où PaymentModal a pré-uploadé),
 *                            soit un File à uploader/différer côté service, soit null
 */
export async function recordPayment(
  loanId: string,
  amountPaid: number,
  paymentDate: string,
  notes?: string,
  transactionId?: string | null,
  receiptFileOrUrl: File | string | null = null
): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');

  const loan = await db.personalLoans.get(loanId);
  if (!loan) {
    if (isOnline()) {
      // Fallback : recharger ce prêt depuis Supabase
      const remote = await getLoanById(loanId);
      if (!remote) throw new Error('Prêt introuvable');
    } else {
      throw new Error('Prêt introuvable en local — connexion requise pour le premier chargement');
    }
  }
  const currentLoan = (await db.personalLoans.get(loanId)) as PersonalLoan;

  // Récupérer les périodes impayées (locales) triées
  const unpaidPeriods = (
    await db.loanInterestPeriods.where('[loanId+status]').equals([loanId, 'unpaid']).toArray()
  ).sort((a, b) => (a.periodStart || '').localeCompare(b.periodStart || ''));
  const accrued = unpaidPeriods.reduce((s, p) => s + (p.interestAmount || 0), 0);

  let interestPortion = 0;
  let capitalPortion = amountPaid;
  const periodsToMarkPaid: string[] = [];

  if (accrued > 0) {
    interestPortion = Math.min(amountPaid, accrued);
    capitalPortion = Math.max(0, amountPaid - accrued);
    let remaining = interestPortion;
    for (const p of unpaidPeriods) {
      if (remaining <= 0) break;
      const covered = Math.min(remaining, p.interestAmount);
      if (covered >= p.interestAmount) {
        periodsToMarkPaid.push(p.id);
      }
      remaining -= covered;
    }
  }

  // STEP 1: Mark periods paid in Dexie + queue
  const updatedAt = new Date().toISOString();
  for (const periodId of periodsToMarkPaid) {
    await db.loanInterestPeriods.update(periodId, { status: 'paid' });
    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase
            .from('loan_interest_periods')
            .update({ status: 'paid' })
            .eq('id', periodId),
          SUPABASE_TIMEOUT_MS,
          'loanService.recordPayment/markPeriodPaid'
        );
        if (error) throw error;
      } catch {
        await queueLoanSyncOperation(user.id, 'UPDATE', 'loan_interest_periods', periodId, {
          status: 'paid',
        });
      }
    } else {
      await queueLoanSyncOperation(user.id, 'UPDATE', 'loan_interest_periods', periodId, {
        status: 'paid',
      });
    }
  }

  // STEP 2: Gérer le receipt (online upload OU stockage local différé)
  let receiptUrlToStore: string | null = null;
  let pendingReceiptId: string | null = null;
  if (receiptFileOrUrl instanceof File) {
    // Tentative upload synchrone si online
    if (isOnline()) {
      try {
        const uploaded = await uploadLoanReceiptDirect(user.id, receiptFileOrUrl);
        receiptUrlToStore = uploaded;
      } catch (err) {
        console.warn(`${LOG_TAG} ⚠️ Upload receipt online échoué, stockage local:`, err);
      }
    }
    if (!receiptUrlToStore) {
      // Offline ou échec → stocker le blob
      pendingReceiptId = crypto.randomUUID();
      const pending: PendingReceipt = {
        id: pendingReceiptId,
        userId: user.id,
        repaymentId: '', // rempli juste après la création du repayment
        fileName: receiptFileOrUrl.name,
        fileBlob: receiptFileOrUrl,
        createdAt: updatedAt,
      };
      await db.pendingReceipts.add(pending);
    }
  } else if (typeof receiptFileOrUrl === 'string') {
    receiptUrlToStore = receiptFileOrUrl;
  }

  // STEP 3: Insert repayment in Dexie + queue
  const repaymentId = crypto.randomUUID();
  const repayment: LoanRepayment = {
    id: repaymentId,
    loanId,
    transactionId: transactionId || null,
    amountPaid,
    interestPortion,
    capitalPortion,
    paymentDate,
    notes: notes || null,
    confirmedAt: null,
    confirmedByUserId: null,
    createdAt: updatedAt,
  };
  await db.loanRepayments.add(repayment);

  // Si on a un pendingReceipt, on lie maintenant
  if (pendingReceiptId) {
    await db.pendingReceipts.update(pendingReceiptId, { repaymentId });
    // Queue l'upload différé (sera traité par syncManager)
    await queueLoanSyncOperation(
      user.id,
      'CREATE',
      'pending_receipts',
      pendingReceiptId,
      { repaymentId },
      SYNC_PRIORITY.LOW
    );
  }

  // Push le repayment vers Supabase (ou queue)
  const repaymentPayload = repaymentToRow({ ...repayment, receiptUrl: receiptUrlToStore });
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('loan_repayments').upsert(repaymentPayload, { onConflict: 'id', ignoreDuplicates: true }),
        SUPABASE_TIMEOUT_MS,
        'loanService.recordPayment/insertRepayment'
      );
      if (error) throw error;
    } catch {
      await queueLoanSyncOperation(user.id, 'CREATE', 'loan_repayments', repaymentId, repaymentPayload);
    }
  } else {
    await queueLoanSyncOperation(user.id, 'CREATE', 'loan_repayments', repaymentId, repaymentPayload);
  }

  // STEP 4: Update loan capital + status in Dexie + queue
  const newCapital = Math.max(0, currentLoan.currentCapital - capitalPortion);
  const newStatus: LoanStatus =
    newCapital <= 0 ? 'closed' : currentLoan.status === 'pending' ? 'active' : currentLoan.status;
  await db.personalLoans.update(loanId, {
    currentCapital: newCapital,
    status: newStatus,
    updatedAt,
  });
  const loanPayload = {
    current_capital: newCapital,
    status: newStatus,
    updated_at: updatedAt,
  };
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').update(loanPayload).eq('id', loanId),
        SUPABASE_TIMEOUT_MS,
        'loanService.recordPayment/updateLoan'
      );
      if (error) throw error;
    } catch {
      await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', loanId, loanPayload);
    }
  } else {
    await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', loanId, loanPayload);
  }
}

export async function generateInterestPeriod(loanId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const loan = await db.personalLoans.get(loanId);
  if (!loan) throw new Error('Prêt introuvable');
  const interestAmount = loan.currentCapital * (loan.interestRate / 100);
  const today = new Date();
  const end = new Date(today);
  if (loan.interestFrequency === 'daily') end.setDate(end.getDate() + 1);
  else if (loan.interestFrequency === 'weekly') end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);

  const periodId = crypto.randomUUID();
  const period: LoanInterestPeriod = {
    id: periodId,
    loanId,
    periodStart: today.toISOString().split('T')[0],
    periodEnd: end.toISOString().split('T')[0],
    capitalAtStart: loan.currentCapital,
    interestAmount,
    status: 'unpaid',
    createdAt: new Date().toISOString(),
  };
  await db.loanInterestPeriods.add(period);
  const payload = interestPeriodToRow(period);
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('loan_interest_periods').upsert(payload, { onConflict: 'id', ignoreDuplicates: true }),
        SUPABASE_TIMEOUT_MS,
        'loanService.generateInterestPeriod'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ generateInterestPeriod Supabase échoué, queue:`, error);
    }
  }
  await queueLoanSyncOperation(user.id, 'CREATE', 'loan_interest_periods', periodId, payload);
}

export async function capitalizeOverdueInterests(loanId: string): Promise<void> {
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const loan = await db.personalLoans.get(loanId);
  if (!loan) throw new Error('Prêt introuvable');
  const unpaid = await db.loanInterestPeriods.where('[loanId+status]').equals([loanId, 'unpaid']).toArray();
  const totalOverdue = unpaid.reduce((s, p) => s + (p.interestAmount || 0), 0);
  if (totalOverdue <= 0) return;
  const updatedAt = new Date().toISOString();
  const newCapital = loan.currentCapital + totalOverdue;
  await db.personalLoans.update(loanId, { currentCapital: newCapital, updatedAt });
  const loanPayload = { current_capital: newCapital, updated_at: updatedAt };
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').update(loanPayload).eq('id', loanId),
        SUPABASE_TIMEOUT_MS,
        'loanService.capitalizeOverdueInterests/loan'
      );
      if (error) throw error;
    } catch {
      await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', loanId, loanPayload);
    }
  } else {
    await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', loanId, loanPayload);
  }

  for (const p of unpaid) {
    await db.loanInterestPeriods.update(p.id, { status: 'capitalized' });
    const periodPayload = { status: 'capitalized' };
    if (isOnline()) {
      try {
        const { error } = await withTimeout(
          supabase.from('loan_interest_periods').update(periodPayload).eq('id', p.id),
          SUPABASE_TIMEOUT_MS,
          'loanService.capitalizeOverdueInterests/period'
        );
        if (error) throw error;
      } catch {
        await queueLoanSyncOperation(user.id, 'UPDATE', 'loan_interest_periods', p.id, periodPayload);
      }
    } else {
      await queueLoanSyncOperation(user.id, 'UPDATE', 'loan_interest_periods', p.id, periodPayload);
    }
  }
}

export async function mergeBeneficiaryGroups(
  targetLoanIds: string[],
  canonical: { name: string; userId: string | null; phone: string },
  userIsBorrower: boolean
): Promise<void> {
  if (targetLoanIds.length === 0) return;
  const user = await getCurrentUserSafe();
  if (!user) throw new Error('Utilisateur non authentifié');
  const updatedAt = new Date().toISOString();
  const partialUpdate: Partial<PersonalLoan> = userIsBorrower
    ? {
        lenderName: canonical.name,
        lenderUserId: canonical.userId || '',
        updatedAt,
      }
    : {
        borrowerName: canonical.name,
        borrowerUserId: canonical.userId,
        borrowerPhone: canonical.phone,
        updatedAt,
      };
  const supabasePayload: Record<string, any> = userIsBorrower
    ? {
        lender_name: canonical.name,
        lender_user_id: canonical.userId,
        updated_at: updatedAt,
      }
    : {
        borrower_name: canonical.name,
        borrower_user_id: canonical.userId,
        borrower_phone: canonical.phone,
        updated_at: updatedAt,
      };

  // Update Dexie pour chaque prêt
  for (const id of targetLoanIds) {
    await db.personalLoans.update(id, partialUpdate);
  }

  // Tentative bulk Supabase si online
  if (isOnline()) {
    try {
      const { error } = await withTimeout(
        supabase.from('personal_loans').update(supabasePayload).in('id', targetLoanIds),
        SUPABASE_TIMEOUT_MS,
        'loanService.mergeBeneficiaryGroups'
      );
      if (error) throw error;
      return;
    } catch (error) {
      console.warn(`${LOG_TAG} ⚠️ mergeBeneficiaryGroups Supabase échoué, queue par prêt:`, error);
    }
  }
  // Offline ou bulk échoué : queue un UPDATE par prêt
  for (const id of targetLoanIds) {
    await queueLoanSyncOperation(user.id, 'UPDATE', 'personal_loans', id, supabasePayload);
  }
}

// ============================================================================
// HELPERS DE STATUT
// ============================================================================

export function isPendingBorrowerConfirmation(loan: PersonalLoan): boolean {
  return loan.status === 'pending' && loan.borrowerConfirmedAt === null && loan.isITheBorrower === false;
}

export function isPendingLenderRepaymentConfirmation(repayment: LoanRepayment): boolean {
  return repayment.confirmedAt === null;
}

// ============================================================================
// UPLOAD RECEIPTS — wrapper offline-friendly
// ============================================================================

/**
 * Upload direct vers Supabase Storage. Échoue (throw) si offline ou erreur.
 * Helper interne utilisé par recordPayment et par le syncManager (pending_receipts).
 */
async function uploadLoanReceiptDirect(userId: string, file: File): Promise<string | null> {
  const sanitizedName = file.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const filePath = `${userId}/${Date.now()}_${sanitizedName}`;

  const { error: uploadError } = await supabase.storage
    .from('loan-receipts')
    .upload(filePath, file, { upsert: false });

  if (uploadError) {
    throw uploadError;
  }

  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('loan-receipts')
    .createSignedUrl(filePath, 60 * 60 * 24 * 365);

  if (signedUrlError || !signedUrlData) {
    throw signedUrlError || new Error('Erreur création URL signée');
  }

  return signedUrlData.signedUrl;
}

/**
 * Wrapper public — rétrocompatibilité avec l'ancienne API (PaymentModal pre-S68).
 *
 * Comportement :
 * - Online : upload direct, retourne l'URL signée
 * - Offline : retourne null + log un avertissement
 *
 * Note : PaymentModal (S68+) ne devrait plus appeler cette fonction directement.
 * Il devrait passer le File à recordPayment qui gère l'upload différé proprement
 * (avec stockage du blob dans db.pendingReceipts si offline).
 * Cette API publique est conservée pour ne pas casser d'éventuels autres callers.
 */
export async function uploadLoanReceipt(userId: string, file: File): Promise<string | null> {
  if (!isOnline()) {
    console.warn(
      `${LOG_TAG} ⚠️ uploadLoanReceipt appelé en mode offline — utilisez recordPayment avec le File en paramètre pour le différé`
    );
    return null;
  }
  try {
    return await uploadLoanReceiptDirect(userId, file);
  } catch (error) {
    console.error(`${LOG_TAG} ❌ uploadLoanReceipt:`, error);
    return null;
  }
}

// Export interne pour le syncManager
export { uploadLoanReceiptDirect as _uploadLoanReceiptDirect };
