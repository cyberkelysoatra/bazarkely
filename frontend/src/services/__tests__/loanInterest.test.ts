import { describe, it, expect } from 'vitest';
import { computeLoanLiveState, sumLoanLiveStates } from '../loanInterest';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const START = '2026-03-01T00:00:00.000Z';
const startMs = new Date(START).getTime();
const at = (days: number) => new Date(startMs + days * MS_PER_DAY);

describe('computeLoanLiveState', () => {
  it('intérêt simple avant échéance (1 000 000 à 1 %/jour, +10 jours)', () => {
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START },
      [],
      at(10)
    );
    expect(s.accruedInterest).toBeCloseTo(100_000, 5);
    expect(s.capitalOutstanding).toBeCloseTo(1_000_000, 5);
    expect(s.totalOwed).toBeCloseTo(1_100_000, 5);
    expect(s.gainPerDay).toBeCloseTo(10_000, 5);
    expect(s.gainPerHour).toBeCloseTo(10_000 / 24, 5);
    expect(s.gainPerMinute).toBeCloseTo(10_000 / 1440, 5);
    // mois calendaire réel : gainPerJour × nb de jours du mois (28..31)
    const ratio = s.gainPerMonth / s.gainPerDay;
    expect(ratio).toBeGreaterThanOrEqual(28);
    expect(ratio).toBeLessThanOrEqual(31);
  });

  it('remboursement : paie d\'abord les intérêts, le reste éponge le capital', () => {
    // +10 jours → 100 000 d'intérêts. Remboursement de 150 000 le jour 10.
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START },
      [{ amountPaid: 150_000, paymentDate: at(10).toISOString() }],
      at(10)
    );
    // 100 000 → intérêts (soldés), 50 000 → capital → capital 950 000
    expect(s.accruedInterest).toBeCloseTo(0, 5);
    expect(s.capitalOutstanding).toBeCloseTo(950_000, 5);
    expect(s.totalOwed).toBeCloseTo(950_000, 5);
  });

  it('remboursement n\'épongeant que les intérêts laisse le capital intact', () => {
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START },
      [{ amountPaid: 100_000, paymentDate: at(10).toISOString() }],
      at(10)
    );
    expect(s.accruedInterest).toBeCloseTo(0, 5);
    expect(s.capitalOutstanding).toBeCloseTo(1_000_000, 5);
  });

  it('capitalisation unique à l\'échéance, puis intérêt simple sur la nouvelle base', () => {
    // échéance à +30 jours ; on regarde à +40 jours
    const dueDate = at(30).toISOString().split('T')[0];
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate, createdAt: START },
      [],
      at(40)
    );
    // À l'échéance : 300 000 d'intérêts capitalisés → base 1 300 000
    // +10 jours après : 1 300 000 × 1 % × 10 = 130 000
    expect(s.capitalOutstanding).toBeCloseTo(1_300_000, 4);
    expect(s.accruedInterest).toBeCloseTo(130_000, 4);
    expect(s.totalOwed).toBeCloseTo(1_430_000, 4);
    expect(s.gainPerDay).toBeCloseTo(13_000, 4);
  });

  it('sans échéance : aucune capitalisation (intérêt simple sur le capital)', () => {
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START },
      [],
      at(40)
    );
    expect(s.accruedInterest).toBeCloseTo(400_000, 4);
    expect(s.capitalOutstanding).toBeCloseTo(1_000_000, 4);
  });

  it('taux 0 → aucun intérêt', () => {
    const s = computeLoanLiveState(
      { amountInitial: 500_000, interestRate: 0, dueDate: null, createdAt: START },
      [],
      at(100)
    );
    expect(s.accruedInterest).toBe(0);
    expect(s.gainPerDay).toBe(0);
    expect(s.totalOwed).toBeCloseTo(500_000, 5);
  });
});

describe('conversion du taux selon la fréquence', () => {
  it('fréquence "monthly" : le taux est divisé par 30 (ancien prêt)', () => {
    // 30 %/mois → 1 %/jour effectif. +10 jours sur 1 000 000 → 100 000.
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 30, interestFrequency: 'monthly', dueDate: null, createdAt: START },
      [],
      at(10)
    );
    expect(s.dailyRatePct).toBeCloseTo(1, 6);
    expect(s.accruedInterest).toBeCloseTo(100_000, 4);
    expect(s.gainPerDay).toBeCloseTo(10_000, 4);
  });

  it('fréquence "daily" : le taux est gardé tel quel (nouveau prêt)', () => {
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, interestFrequency: 'daily', dueDate: null, createdAt: START },
      [],
      at(10)
    );
    expect(s.dailyRatePct).toBeCloseTo(1, 6);
    expect(s.accruedInterest).toBeCloseTo(100_000, 4);
  });
});

describe('répartition des remboursements (intérêts d\'abord)', () => {
  it('renvoie la part intérêts / capital de chaque remboursement', () => {
    const s = computeLoanLiveState(
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START },
      [{ amountPaid: 150_000, paymentDate: at(10).toISOString() }],
      at(10)
    );
    expect(s.allocations).toHaveLength(1);
    expect(s.allocations[0].interestPortion).toBeCloseTo(100_000, 4);
    expect(s.allocations[0].capitalPortion).toBeCloseTo(50_000, 4);
    expect(s.totalInterestPaid).toBeCloseTo(100_000, 4);
    expect(s.totalCapitalPaid).toBeCloseTo(50_000, 4);
  });
});

describe('sumLoanLiveStates', () => {
  it('additionne plusieurs prêts', () => {
    const loans = [
      { amountInitial: 1_000_000, interestRate: 1, dueDate: null, createdAt: START, repayments: [] },
      { amountInitial: 2_000_000, interestRate: 1, dueDate: null, createdAt: START, repayments: [] },
    ];
    const agg = sumLoanLiveStates(loans, at(10));
    // 100 000 + 200 000 = 300 000
    expect(agg.accruedInterest).toBeCloseTo(300_000, 4);
    expect(agg.gainPerDay).toBeCloseTo(30_000, 4);
    expect(agg.count).toBe(2);
  });
});
