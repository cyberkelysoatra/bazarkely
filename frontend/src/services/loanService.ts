import { supabase, getCurrentUser } from '../lib/supabase';

export type LoanStatus = 'pending' | 'active' | 'late' | 'closed';
export type InterestFrequency = 'daily' | 'weekly' | 'monthly';
export interface PersonalLoan {
  id: string;
  lenderUserId: string;
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
  transactionId?: string | null; // Transaction ID that created this loan
  status: LoanStatus;
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
  transactionId?: string; // Optional transaction ID to link loan creation to a transaction
}

function mapLoanRow(row: any): PersonalLoan {
  return {
    id: row.id, lenderUserId: row.lender_user_id, borrowerUserId: row.borrower_user_id,
    borrowerName: row.borrower_name, borrowerPhone: row.borrower_phone,
    isITheBorrower: row.is_i_the_borrower, amountInitial: row.amount_initial,
    currency: row.currency, interestRate: row.interest_rate,
    interestFrequency: row.interest_frequency, currentCapital: row.current_capital,
    dueDate: row.due_date, description: row.description, photoUrl: row.photo_url,
    transactionId: row.transaction_id || null,
    status: row.status, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapRepaymentRow(row: any): LoanRepayment {
  return {
    id: row.id, loanId: row.loan_id, transactionId: row.transaction_id,
    amountPaid: row.amount_paid, interestPortion: row.interest_portion,
    capitalPortion: row.capital_portion, paymentDate: row.payment_date,
    notes: row.notes, createdAt: row.created_at,
  };
}
function mapInterestPeriodRow(row: any): LoanInterestPeriod {
  return {
    id: row.id, loanId: row.loan_id, periodStart: row.period_start,
    periodEnd: row.period_end, capitalAtStart: row.capital_at_start,
    interestAmount: row.interest_amount, status: row.status,
    createdAt: row.created_at,
  };
}
function computeLoanDetails(loan: PersonalLoan, repayments: LoanRepayment[], interestPeriods: LoanInterestPeriod[]): LoanWithDetails {
  const totalRepaid = repayments.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalInterestPaid = repayments.reduce((sum, r) => sum + r.interestPortion, 0);
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = loan.status === 'late' || (loan.dueDate !== null && loan.dueDate < today && loan.status !== 'closed');
  return { ...loan, repayments, interestPeriods, totalRepaid, totalInterestPaid, remainingBalance: loan.currentCapital, isOverdue };
}

export async function getMyLoans(): Promise<LoanWithDetails[]> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    const { data: loansData, error: loansError } = await supabase
      .from('personal_loans')
      .select('*')
      .or(`lender_user_id.eq.${user.id},borrower_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (loansError) throw new Error(`Erreur récupération prêts: ${loansError.message}`);
    if (!loansData || loansData.length === 0) return [];
    const loanIds = loansData.map((l) => l.id);
    const { data: repaymentsData, error: repaymentsError } = await supabase
      .from('loan_repayments')
      .select('*')
      .in('loan_id', loanIds);
    if (repaymentsError) throw new Error(`Erreur récupération remboursements: ${repaymentsError.message}`);
    const { data: interestPeriodsData, error: interestPeriodsError } = await supabase
      .from('loan_interest_periods')
      .select('*')
      .in('loan_id', loanIds);
    if (interestPeriodsError) throw new Error(`Erreur récupération périodes: ${interestPeriodsError.message}`);
    const repaymentsByLoan = new Map<string, LoanRepayment[]>();
    (repaymentsData || []).forEach((r) => {
      const repayment = mapRepaymentRow(r);
      if (!repaymentsByLoan.has(repayment.loanId)) repaymentsByLoan.set(repayment.loanId, []);
      repaymentsByLoan.get(repayment.loanId)!.push(repayment);
    });
    const interestPeriodsByLoan = new Map<string, LoanInterestPeriod[]>();
    (interestPeriodsData || []).forEach((ip) => {
      const period = mapInterestPeriodRow(ip);
      const arr = interestPeriodsByLoan.get(period.loanId) || [];
      if (arr.length === 0) interestPeriodsByLoan.set(period.loanId, arr);
      arr.push(period);
    });
    return loansData.map((loanRow) => computeLoanDetails(mapLoanRow(loanRow), repaymentsByLoan.get(loanRow.id) || [], interestPeriodsByLoan.get(loanRow.id) || []));
  } catch (error) {
    console.error('Erreur dans getMyLoans:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la récupération des prêts');
  }
}
export async function getLoanById(id: string): Promise<LoanWithDetails | null> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    const { data: loanData, error: loanError } = await supabase
      .from('personal_loans')
      .select('*')
      .eq('id', id)
      .single();
    if (loanError) {
      if (loanError.code === 'PGRST116') return null;
      throw new Error(`Erreur récupération prêt: ${loanError.message}`);
    }
    const loan = mapLoanRow(loanData);
    if (loan.lenderUserId !== user.id && loan.borrowerUserId !== user.id) {
      throw new Error('Accès non autorisé à ce prêt');
    }
    const { data: repaymentsData, error: repaymentsError } = await supabase
      .from('loan_repayments')
      .select('*')
      .eq('loan_id', id)
      .order('payment_date', { ascending: false });
    if (repaymentsError) throw new Error(`Erreur récupération remboursements: ${repaymentsError.message}`);
    const { data: interestPeriodsData, error: interestPeriodsError } = await supabase
      .from('loan_interest_periods')
      .select('*')
      .eq('loan_id', id)
      .order('period_start', { ascending: false });
    if (interestPeriodsError) throw new Error(`Erreur récupération périodes: ${interestPeriodsError.message}`);
    return computeLoanDetails(loan, (repaymentsData || []).map(mapRepaymentRow), (interestPeriodsData || []).map(mapInterestPeriodRow));
  } catch (error) {
    console.error('Erreur dans getLoanById:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la récupération du prêt');
  }
}
export async function createLoan(input: CreateLoanInput): Promise<PersonalLoan> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    if (!input.borrowerName && !input.borrowerUserId) {
      throw new Error('Le nom de l\'emprunteur ou l\'ID utilisateur est requis');
    }
    const { data, error } = await supabase
      .from('personal_loans')
      .insert({
        lender_user_id: user.id,
        borrower_user_id: input.borrowerUserId || null,
        borrower_name: input.borrowerName || '',
        borrower_phone: input.borrowerPhone || '',
        is_i_the_borrower: input.isITheBorrower,
        amount_initial: input.amountInitial,
        currency: input.currency,
        interest_rate: input.interestRate,
        interest_frequency: input.interestFrequency,
        current_capital: input.amountInitial,
        due_date: input.dueDate || null,
        description: input.description || null,
        photo_url: input.photoUrl || null,
        transaction_id: input.transactionId || null,
        status: 'pending' as LoanStatus,
      })
      .select()
      .single();
    if (error) throw new Error(`Erreur création prêt: ${error.message}`);
    return mapLoanRow(data);
  } catch (error) {
    console.error('Erreur dans createLoan:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la création du prêt');
  }
}
export async function updateLoanStatus(id: string, status: LoanStatus): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    const { data: loanData, error: checkError } = await supabase
      .from('personal_loans')
      .select('lender_user_id, borrower_user_id')
      .eq('id', id)
      .single();
    if (checkError) throw new Error(`Erreur vérification prêt: ${checkError.message}`);
    if (loanData.lender_user_id !== user.id && loanData.borrower_user_id !== user.id) {
      throw new Error('Accès non autorisé à ce prêt');
    }
    const { error } = await supabase
      .from('personal_loans')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(`Erreur mise à jour statut: ${error.message}`);
  } catch (error) {
    console.error('Erreur dans updateLoanStatus:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la mise à jour du statut');
  }
}
export async function deleteLoan(id: string): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    const { data: loanData, error: checkError } = await supabase
      .from('personal_loans')
      .select('lender_user_id')
      .eq('id', id)
      .single();
    if (checkError) throw new Error(`Erreur vérification prêt: ${checkError.message}`);
    if (loanData.lender_user_id !== user.id) throw new Error('Seul le prêteur peut supprimer ce prêt');
    const { error } = await supabase.from('personal_loans').delete().eq('id', id);
    if (error) throw new Error(`Erreur suppression prêt: ${error.message}`);
  } catch (error) {
    console.error('Erreur dans deleteLoan:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de la suppression du prêt');
  }
}
export async function getLastUsedInterestSettings(): Promise<{ rate: number; frequency: InterestFrequency } | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data, error } = await supabase
      .from('personal_loans')
      .select('interest_rate, interest_frequency')
      .eq('lender_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    return {
      rate: data.interest_rate,
      frequency: data.interest_frequency as InterestFrequency
    };
  } catch {
    return null;
  }
}

// ============================================================================
// PAYMENT ENGINE — Phase 2
// ============================================================================

export async function recordPayment(
  loanId: string, amountPaid: number, paymentDate: string, notes?: string, transactionId?: string
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    const { data: loan, error: loanErr } = await supabase
      .from('personal_loans').select('current_capital, status').eq('id', loanId).single();
    if (loanErr || !loan) throw new Error('Prêt introuvable');

    // Fetch unpaid interest periods, sum accrued interest
    const { data: unpaidPeriods } = await supabase
      .from('loan_interest_periods').select('id, interest_amount')
      .eq('loan_id', loanId).eq('status', 'unpaid').order('period_start', { ascending: true });
    const accrued = (unpaidPeriods || []).reduce((s, p) => s + (p.interest_amount || 0), 0);

    let interestPortion = 0;
    let capitalPortion = amountPaid;
    if (accrued > 0) {
      interestPortion = Math.min(amountPaid, accrued);
      capitalPortion = Math.max(0, amountPaid - accrued);
      // Mark periods as paid up to interestPortion amount
      let remaining = interestPortion;
      for (const p of (unpaidPeriods || [])) {
        if (remaining <= 0) break;
        const covered = Math.min(remaining, p.interest_amount);
        if (covered >= p.interest_amount) {
          await supabase.from('loan_interest_periods').update({ status: 'paid' }).eq('id', p.id);
        }
        remaining -= covered;
      }
    }

    // Insert repayment row
    const { error: repErr } = await supabase.from('loan_repayments').insert({
      loan_id: loanId, transaction_id: transactionId || null,
      amount_paid: amountPaid, interest_portion: interestPortion,
      capital_portion: capitalPortion, payment_date: paymentDate, notes: notes || null,
    });
    if (repErr) throw new Error(`Erreur enregistrement paiement: ${repErr.message}`);

    // Update loan capital and status
    const newCapital = Math.max(0, loan.current_capital - capitalPortion);
    const newStatus = newCapital <= 0 ? 'closed' : loan.status === 'pending' ? 'active' : loan.status;
    const { error: updErr } = await supabase.from('personal_loans')
      .update({ current_capital: newCapital, status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', loanId);
    if (updErr) throw new Error(`Erreur mise à jour prêt: ${updErr.message}`);
  } catch (error) {
    console.error('Erreur dans recordPayment:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue lors de l\'enregistrement du paiement');
  }
}

export async function getUnpaidInterestPeriods(loanId: string): Promise<LoanInterestPeriod[]> {
  try {
    const { data, error } = await supabase
      .from('loan_interest_periods').select('*')
      .eq('loan_id', loanId).eq('status', 'unpaid').order('period_start', { ascending: true });
    if (error) throw new Error(`Erreur récupération périodes impayées: ${error.message}`);
    return (data || []).map(mapInterestPeriodRow);
  } catch (error) {
    console.error('Erreur dans getUnpaidInterestPeriods:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}

export async function generateInterestPeriod(loanId: string): Promise<void> {
  try {
    const { data: loan, error: loanErr } = await supabase
      .from('personal_loans').select('current_capital, interest_rate, interest_frequency')
      .eq('id', loanId).single();
    if (loanErr || !loan) throw new Error('Prêt introuvable');
    const interestAmount = loan.current_capital * (loan.interest_rate / 100);
    const today = new Date();
    const end = new Date(today);
    if (loan.interest_frequency === 'daily') end.setDate(end.getDate() + 1);
    else if (loan.interest_frequency === 'weekly') end.setDate(end.getDate() + 7);
    else end.setMonth(end.getMonth() + 1);
    const { error } = await supabase.from('loan_interest_periods').insert({
      loan_id: loanId, period_start: today.toISOString().split('T')[0],
      period_end: end.toISOString().split('T')[0], capital_at_start: loan.current_capital,
      interest_amount: interestAmount, status: 'unpaid',
    });
    if (error) throw new Error(`Erreur génération période: ${error.message}`);
  } catch (error) {
    console.error('Erreur dans generateInterestPeriod:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}

export async function capitalizeOverdueInterests(loanId: string): Promise<void> {
  try {
    const { data: unpaid } = await supabase
      .from('loan_interest_periods').select('id, interest_amount')
      .eq('loan_id', loanId).eq('status', 'unpaid');
    const totalOverdue = (unpaid || []).reduce((s, p) => s + (p.interest_amount || 0), 0);
    if (totalOverdue <= 0) return;
    const { data: loan } = await supabase
      .from('personal_loans').select('current_capital').eq('id', loanId).single();
    if (!loan) throw new Error('Prêt introuvable');
    const { error: updErr } = await supabase.from('personal_loans')
      .update({ current_capital: loan.current_capital + totalOverdue, updated_at: new Date().toISOString() })
      .eq('id', loanId);
    if (updErr) throw new Error(`Erreur capitalisation: ${updErr.message}`);
    const ids = (unpaid || []).map((p) => p.id);
    const { error: periodErr } = await supabase
      .from('loan_interest_periods').update({ status: 'capitalized' }).in('id', ids);
    if (periodErr) throw new Error(`Erreur mise à jour périodes: ${periodErr.message}`);
  } catch (error) {
    console.error('Erreur dans capitalizeOverdueInterests:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}

export async function getRepaymentHistory(loanId: string): Promise<LoanRepayment[]> {
  try {
    const { data, error } = await supabase
      .from('loan_repayments').select('*')
      .eq('loan_id', loanId).order('payment_date', { ascending: false });
    if (error) throw new Error(`Erreur récupération historique: ${error.message}`);
    return (data || []).map(mapRepaymentRow);
  } catch (error) {
    console.error('Erreur dans getRepaymentHistory:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}

export async function getUnlinkedRevenueTransactions(): Promise<
  { id: string; description: string; amount: number; date: string; currency: string }[]
> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Utilisateur non authentifié');
    // Fetch transaction IDs already linked to repayments
    const { data: linked } = await supabase
      .from('loan_repayments').select('transaction_id').not('transaction_id', 'is', null);
    const linkedIds = (linked || []).map((r) => r.transaction_id).filter(Boolean) as string[];
    // Fetch income transactions not yet linked
    // Note: Use original_currency column (not currency) - column renamed in migration 20260118134130
    let query = supabase.from('transactions').select('id, description, amount, date, original_currency')
      .eq('user_id', user.id).eq('type', 'income').order('date', { ascending: false }).limit(50);
    if (linkedIds.length > 0) {
      query = query.not('id', 'in', `(${linkedIds.join(',')})`);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Erreur récupération transactions: ${error.message}`);
    return (data || []).map((t) => ({
      id: t.id, description: t.description || '', amount: t.amount, date: t.date, currency: (t.original_currency || 'MGA') as string,
    }));
  } catch (error) {
    console.error('Erreur dans getUnlinkedRevenueTransactions:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}

export async function getActiveLoansForDropdown(): Promise<
  { id: string; label: string; remainingBalance: number; currency: string; isITheBorrower: boolean }[]
> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];
    const { data, error } = await supabase
      .from('personal_loans')
      .select('id, is_i_the_borrower, lender_name, borrower_name, current_capital, currency')
      .eq('status', 'active')
      .or(`lender_user_id.eq.${user.id},borrower_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Erreur dans getActiveLoansForDropdown:', error);
      return [];
    }
    if (!data || data.length === 0) return [];
    return data.map((loan) => {
      const isITheBorrower = loan.is_i_the_borrower === true;
      const lenderName = loan.lender_name || 'Prêteur inconnu';
      const borrowerName = loan.borrower_name || 'Emprunteur inconnu';
      const amount = loan.current_capital;
      const formattedAmount = amount.toLocaleString('fr-FR');
      const label = isITheBorrower
        ? `Dette envers ${lenderName} ${formattedAmount}`
        : `Prêt à ${borrowerName} ${formattedAmount}`;
      return {
        id: loan.id,
        label,
        remainingBalance: amount,
        currency: loan.currency,
        isITheBorrower,
      };
    });
  } catch (error) {
    console.error('Erreur dans getActiveLoansForDropdown:', error);
    return [];
  }
}

/**
 * Récupère l'ID d'un prêt à partir de l'ID de transaction associé
 * @param transactionId - ID de la transaction
 * @returns ID du prêt ou null si aucun prêt n'est associé à cette transaction
 */
export async function getLoanIdByTransactionId(transactionId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('personal_loans')
      .select('id')
      .eq('transaction_id', transactionId)
      .maybeSingle();
    if (error || !data) return null;
    return data.id;
  } catch (error) {
    console.error('Erreur dans getLoanIdByTransactionId:', error);
    return null;
  }
}

/**
 * Récupère un prêt à partir de l'ID de transaction d'un remboursement
 * @param repaymentTransactionId - ID de la transaction de remboursement
 * @returns Objet contenant loanId et loan (LoanWithDetails) ou null si non trouvé
 */
export async function getLoanByRepaymentTransactionId(
  repaymentTransactionId: string
): Promise<{ loanId: string; loan: LoanWithDetails | null } | null> {
  try {
    const { data, error } = await supabase
      .from('loan_repayments')
      .select('loan_id, payment_date, created_at')
      .eq('transaction_id', repaymentTransactionId)
      .maybeSingle();
    if (error || !data) return null;
    const loan = await getLoanById(data.loan_id);
    return { loanId: data.loan_id, loan };
  } catch (error) {
    console.error('Erreur dans getLoanByRepaymentTransactionId:', error);
    return null;
  }
}

/**
 * Récupère l'index (numéro) d'un remboursement dans l'historique d'un prêt
 * Utile pour afficher "2e remboursement" par exemple
 * @param loanId - ID du prêt
 * @param repaymentTransactionId - ID de la transaction de remboursement
 * @returns Index du remboursement (1-based) ou 1 si non trouvé
 */
export async function getRepaymentIndexForTransaction(
  loanId: string,
  repaymentTransactionId: string
): Promise<number> {
  try {
    const repayments = await getRepaymentHistory(loanId);
    const sorted = [...repayments].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const index = sorted.findIndex(r => r.transactionId === repaymentTransactionId);
    return index >= 0 ? index + 1 : sorted.length + 1;
  } catch {
    return 1;
  }
}

/**
 * Résumé des intérêts impayés par prêt pour un utilisateur
 */
export interface UnpaidInterestSummary {
  loanId: string;
  borrowerName: string;
  totalUnpaid: number;
  periodCount: number;
  currency: string;
}

/**
 * Récupère le total des intérêts impayés groupés par prêt pour un utilisateur
 * @param userId - ID de l'utilisateur (lender ou borrower)
 * @returns Tableau des résumés d'intérêts impayés par prêt
 */
export async function getTotalUnpaidInterestByLoan(userId: string): Promise<UnpaidInterestSummary[]> {
  try {
    if (!userId) {
      return [];
    }

    // Step 1: Get loan IDs where user is lender or borrower
    const { data: loansData, error: loansError } = await supabase
      .from('personal_loans')
      .select('id, borrower_name, currency')
      .or(`lender_user_id.eq.${userId},borrower_user_id.eq.${userId}`);

    if (loansError) {
      console.error('Erreur dans getTotalUnpaidInterestByLoan (loans):', loansError);
      return [];
    }

    if (!loansData || loansData.length === 0) {
      return [];
    }

    const loanIds = loansData.map((l) => l.id);
    const loansMap = new Map<string, { borrowerName: string; currency: string }>();
    loansData.forEach((loan) => {
      loansMap.set(loan.id, {
        borrowerName: loan.borrower_name || 'Inconnu',
        currency: loan.currency || 'MGA',
      });
    });

    // Step 2: Query unpaid interest periods for these loans
    const { data: periodsData, error: periodsError } = await supabase
      .from('loan_interest_periods')
      .select('loan_id, interest_amount')
      .in('loan_id', loanIds)
      .eq('status', 'unpaid');

    if (periodsError) {
      console.error('Erreur dans getTotalUnpaidInterestByLoan (periods):', periodsError);
      return [];
    }

    if (!periodsData || periodsData.length === 0) {
      return [];
    }

    // Step 3: Group by loan_id and calculate totals
    const summaryMap = new Map<string, UnpaidInterestSummary>();

    periodsData.forEach((period: any) => {
      const loanId = period.loan_id;
      const interestAmount = period.interest_amount || 0;
      const loanInfo = loansMap.get(loanId);

      if (!loanInfo) {
        return; // Skip if loan info missing
      }

      if (!summaryMap.has(loanId)) {
        summaryMap.set(loanId, {
          loanId: loanId,
          borrowerName: loanInfo.borrowerName,
          totalUnpaid: 0,
          periodCount: 0,
          currency: loanInfo.currency,
        });
      }

      const summary = summaryMap.get(loanId)!;
      summary.totalUnpaid += interestAmount;
      summary.periodCount += 1;
    });

    return Array.from(summaryMap.values());
  } catch (error) {
    console.error('Erreur dans getTotalUnpaidInterestByLoan:', error);
    return [];
  }
}
