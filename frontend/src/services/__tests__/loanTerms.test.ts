import { describe, it, expect } from 'vitest';
import { computeDailyRatePct, daysBetweenDates, formatDurationLabel } from '../loanTerms';

describe('computeDailyRatePct — les 4 combinaisons donnent le même taux/jour', () => {
  const capital = 200_000;
  const durationDays = 30;

  it('% · par jour : tel quel', () => {
    expect(computeDailyRatePct(1, 'percent', 'day', capital, durationDays)).toBeCloseTo(1, 6);
  });
  it('% · sur la durée : ÷ nb de jours', () => {
    expect(computeDailyRatePct(30, 'percent', 'duration', capital, durationDays)).toBeCloseTo(1, 6);
  });
  it('Ar · par jour : montant ÷ capital', () => {
    // 2000 Ar/jour sur 200000 → 1 %/jour
    expect(computeDailyRatePct(2000, 'amount', 'day', capital, durationDays)).toBeCloseTo(1, 6);
  });
  it('Ar · sur la durée : montant ÷ capital ÷ nb de jours', () => {
    // 60000 Ar sur 30 j sur 200000 → 1 %/jour
    expect(computeDailyRatePct(60000, 'amount', 'duration', capital, durationDays)).toBeCloseTo(1, 6);
  });

  it('valeur vide ou 0 → 0', () => {
    expect(computeDailyRatePct('', 'amount', 'duration', capital, durationDays)).toBe(0);
    expect(computeDailyRatePct(0, 'percent', 'day', capital, durationDays)).toBe(0);
  });

  it('"sur la durée" sans durée (0 jour) → 0', () => {
    expect(computeDailyRatePct(60000, 'amount', 'duration', capital, 0)).toBe(0);
    expect(computeDailyRatePct(30, 'percent', 'duration', capital, 0)).toBe(0);
  });

  it('montant sans capital → 0', () => {
    expect(computeDailyRatePct(60000, 'amount', 'duration', 0, durationDays)).toBe(0);
  });
});

describe('daysBetweenDates', () => {
  it('compte les jours entiers', () => {
    expect(daysBetweenDates('2026-03-01', '2026-03-31')).toBe(30);
    expect(daysBetweenDates('2026-03-01', '2026-03-01')).toBe(0);
  });
  it('dates invalides → 0', () => {
    expect(daysBetweenDates('', '2026-03-31')).toBe(0);
  });
});

describe('formatDurationLabel', () => {
  it('formate ans/mois/jours', () => {
    expect(formatDurationLabel(30)).toBe('1 mois');
    expect(formatDurationLabel(0)).toBe('');
    expect(formatDurationLabel(400)).toContain('1 an');
  });
});
