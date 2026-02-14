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
}

function mapLoanRow(row: any): PersonalLoan {
  return {
    id: row.id, lenderUserId: row.lender_user_id, borrowerUserId: row.borrower_user_id,
    borrowerName: row.borrower_name, borrowerPhone: row.borrower_phone,
    isITheBorrower: row.is_i_the_borrower, amountInitial: row.amount_initial,
    currency: row.currency, interestRate: row.interest_rate,
    interestFrequency: row.interest_frequency, currentCapital: row.current_capital,
    dueDate: row.due_date, description: row.description, photoUrl: row.photo_url,
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
    let query = supabase.from('transactions').select('id, description, amount, date, currency')
      .eq('user_id', user.id).eq('type', 'income').order('date', { ascending: false }).limit(50);
    if (linkedIds.length > 0) {
      query = query.not('id', 'in', `(${linkedIds.join(',')})`);
    }
    const { data, error } = await query;
    if (error) throw new Error(`Erreur récupération transactions: ${error.message}`);
    return (data || []).map((t) => ({
      id: t.id, description: t.description || '', amount: t.amount, date: t.date, currency: t.currency || 'MGA',
    }));
  } catch (error) {
    console.error('Erreur dans getUnlinkedRevenueTransactions:', error);
    throw error instanceof Error ? error : new Error('Erreur inconnue');
  }
}
