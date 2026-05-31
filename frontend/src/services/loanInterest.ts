/**
 * Moteur de calcul des intérêts de prêt — calcul "en direct" (live), pur et sans effet de bord.
 *
 * Modèle (validé S78) :
 *  - Le taux EFFECTIF est JOURNALIER. On le déduit du taux saisi + de l'ancienne fréquence :
 *      • 'daily'   → taux tel quel (prêts créés depuis v3.16.15)
 *      • 'monthly' → taux ÷ 30   (anciens prêts saisis "par mois")
 *      • 'weekly'  → taux ÷ 7
 *    Ainsi les anciens prêts restent corrects sans migration de la base.
 *  - Intérêt SIMPLE, qui s'accumule en continu (précision à la seconde) sur le capital restant.
 *  - Point de départ = date du prêt (loan.createdAt).
 *  - Un remboursement paie D'ABORD les intérêts dus, le reste réduit le capital.
 *  - À la date d'échéance (dueDate) : les intérêts accumulés sont capitalisés UNE SEULE FOIS
 *    (ajoutés au capital), puis l'intérêt repart simple sur cette nouvelle base.
 *    Sans date d'échéance → aucune capitalisation.
 *  - Tout est recalculé depuis le début à partir du capital initial + des remboursements
 *    (les répartitions intérêt/capital éventuellement enregistrées sont ignorées).
 *
 * Aucune écriture en base : c'est un affichage vivant, recalculé à la volée.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Entrée minimale d'un prêt nécessaire au calcul. */
export interface LoanInterestInput {
  amountInitial: number;
  /** Taux saisi en pourcentage, à interpréter selon `interestFrequency`. */
  interestRate: number;
  /** Fréquence d'origine du taux ('daily' | 'weekly' | 'monthly'). Défaut: 'daily'. */
  interestFrequency?: string | null;
  /** Date d'échéance 'YYYY-MM-DD' ou null si pas d'échéance. */
  dueDate: string | null;
  /** Date/heure de départ du prêt (ISO). */
  createdAt: string;
}

/** Entrée minimale d'un remboursement. */
export interface RepaymentInput {
  amountPaid: number;
  /** Date du remboursement (ISO ou 'YYYY-MM-DD'). */
  paymentDate: string;
}

/** Répartition d'un remboursement, recalculée "intérêts d'abord". */
export interface RepaymentAllocation {
  interestPortion: number;
  capitalPortion: number;
}

export interface LoanLiveState {
  /** Capital restant dû (après remboursements et capitalisation éventuelle). */
  capitalOutstanding: number;
  /** Intérêts accumulés non encore payés, à l'instant `now`. */
  accruedInterest: number;
  /** Total dû = capital restant + intérêts accumulés. */
  totalOwed: number;
  /** Total des intérêts déjà payés (recalculé). */
  totalInterestPaid: number;
  /** Total du capital déjà remboursé (recalculé). */
  totalCapitalPaid: number;
  /** Vitesse d'accumulation actuelle des intérêts. */
  gainPerMinute: number;
  gainPerHour: number;
  gainPerDay: number;
  /** Projection sur le mois calendaire courant (nb réel de jours du mois). */
  gainPerMonth: number;
  /** Taux JOURNALIER effectif en %, après conversion depuis la fréquence d'origine. */
  dailyRatePct: number;
  /** true si le prêt est entièrement soldé (capital + intérêts ≈ 0). */
  isSettled: boolean;
  /** Répartition recalculée de chaque remboursement (alignée sur l'ordre d'entrée). */
  allocations: RepaymentAllocation[];
}

function daysBetween(a: Date, b: Date): number {
  return Math.max(0, (b.getTime() - a.getTime()) / MS_PER_DAY);
}

function daysInMonthOf(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Convertit le taux saisi en taux JOURNALIER (fraction) selon la fréquence d'origine. */
function dailyRateFraction(interestRate: number, frequency?: string | null): number {
  const divisor = frequency === 'monthly' ? 30 : frequency === 'weekly' ? 7 : 1;
  return (interestRate || 0) / 100 / divisor;
}

/**
 * Calcule l'état d'un prêt à l'instant `now`, en rejouant la chronologie
 * (remboursements + capitalisation à l'échéance) depuis la date du prêt.
 */
export function computeLoanLiveState(
  loan: LoanInterestInput,
  repayments: RepaymentInput[] = [],
  now: Date = new Date()
): LoanLiveState {
  const dailyRate = dailyRateFraction(loan.interestRate, loan.interestFrequency);
  const dailyRatePct = (loan.interestRate || 0) / (loan.interestFrequency === 'monthly' ? 30 : loan.interestFrequency === 'weekly' ? 7 : 1);
  const start = new Date(loan.createdAt);
  const emptyAllocations = repayments.map(() => ({ interestPortion: 0, capitalPortion: 0 }));

  // Garde-fous : données invalides → état neutre basé sur le capital initial
  if (isNaN(start.getTime()) || !(loan.amountInitial > 0)) {
    const cap = Math.max(0, loan.amountInitial || 0);
    return {
      capitalOutstanding: cap,
      accruedInterest: 0,
      totalOwed: cap,
      totalInterestPaid: 0,
      totalCapitalPaid: 0,
      gainPerMinute: 0,
      gainPerHour: 0,
      gainPerDay: 0,
      gainPerMonth: 0,
      dailyRatePct,
      isSettled: cap <= 0,
      allocations: emptyAllocations,
    };
  }

  // Construction de la chronologie des événements jusqu'à `now`
  type Ev = { time: Date; type: 'repay' | 'capitalize'; amount?: number; idx?: number };
  const events: Ev[] = [];

  repayments.forEach((rp, idx) => {
    const t = new Date(rp.paymentDate);
    if (!isNaN(t.getTime()) && t.getTime() <= now.getTime()) {
      events.push({ time: t, type: 'repay', amount: rp.amountPaid || 0, idx });
    }
  });

  if (loan.dueDate) {
    const due = new Date(loan.dueDate);
    // Capitalisation seulement si l'échéance est déjà passée
    if (!isNaN(due.getTime()) && due.getTime() <= now.getTime()) {
      events.push({ time: due, type: 'capitalize' });
    }
  }

  // Tri chronologique ; à instant égal : remboursement avant capitalisation
  const rank = { repay: 0, capitalize: 1 };
  events.sort((a, b) => a.time.getTime() - b.time.getTime() || rank[a.type] - rank[b.type]);

  let principal = loan.amountInitial;
  let unpaidInterest = 0;
  let totalInterestPaid = 0;
  let totalCapitalPaid = 0;
  let cursor = start;
  let capitalized = false;
  const allocations = emptyAllocations;

  const accrueTo = (t: Date) => {
    if (t.getTime() <= cursor.getTime()) return;
    const days = daysBetween(cursor, t);
    unpaidInterest += principal * dailyRate * days;
    cursor = t;
  };

  for (const ev of events) {
    accrueTo(ev.time);
    if (ev.type === 'repay') {
      let p = ev.amount || 0;
      const payInterest = Math.min(p, unpaidInterest);
      unpaidInterest -= payInterest;
      p -= payInterest;
      const payCapital = Math.min(p, principal); // le reste éponge le capital
      principal -= payCapital;
      if (principal < 0) principal = 0;
      totalInterestPaid += payInterest;
      totalCapitalPaid += payCapital;
      if (ev.idx !== undefined) {
        allocations[ev.idx] = { interestPortion: payInterest, capitalPortion: payCapital };
      }
    } else if (ev.type === 'capitalize' && !capitalized) {
      principal += unpaidInterest; // capitalisation unique à l'échéance
      unpaidInterest = 0;
      capitalized = true;
    }
  }

  // Accumulation finale jusqu'à maintenant
  accrueTo(now);

  // Nettoyage des résidus de virgule flottante
  if (principal < 0.005) principal = 0;
  if (unpaidInterest < 0.005) unpaidInterest = 0;

  const isSettled = principal <= 0 && unpaidInterest <= 0;
  const gainPerDay = principal * dailyRate;

  return {
    capitalOutstanding: principal,
    accruedInterest: unpaidInterest,
    totalOwed: principal + unpaidInterest,
    totalInterestPaid,
    totalCapitalPaid,
    gainPerMinute: gainPerDay / (24 * 60),
    gainPerHour: gainPerDay / 24,
    gainPerDay,
    gainPerMonth: gainPerDay * daysInMonthOf(now),
    dailyRatePct,
    isSettled,
    allocations,
  };
}

/** Agrégat des intérêts "en direct" sur un ensemble de prêts (même devise supposée). */
export interface LoanLiveAggregate {
  accruedInterest: number;
  totalOwed: number;
  capitalOutstanding: number;
  gainPerMinute: number;
  gainPerHour: number;
  gainPerDay: number;
  gainPerMonth: number;
  count: number;
}

type LoanWithRepayments = LoanInterestInput & { repayments?: RepaymentInput[] };

/**
 * Additionne l'état "en direct" d'une liste de prêts.
 * NB : les montants sont sommés bruts (pas de conversion de devise), comme la carte existante.
 */
export function sumLoanLiveStates(
  loans: LoanWithRepayments[],
  now: Date = new Date()
): LoanLiveAggregate {
  const agg: LoanLiveAggregate = {
    accruedInterest: 0,
    totalOwed: 0,
    capitalOutstanding: 0,
    gainPerMinute: 0,
    gainPerHour: 0,
    gainPerDay: 0,
    gainPerMonth: 0,
    count: 0,
  };

  for (const loan of loans) {
    const s = computeLoanLiveState(loan, loan.repayments || [], now);
    agg.accruedInterest += s.accruedInterest;
    agg.totalOwed += s.totalOwed;
    agg.capitalOutstanding += s.capitalOutstanding;
    agg.gainPerMinute += s.gainPerMinute;
    agg.gainPerHour += s.gainPerHour;
    agg.gainPerDay += s.gainPerDay;
    agg.gainPerMonth += s.gainPerMonth;
    agg.count += 1;
  }

  return agg;
}
