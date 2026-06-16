import { describe, it, expect, vi, afterEach } from 'vitest';
import { toIsoOrUndefined, isFuture, isoToLocalInput } from '../utils/dateInput';
import { timeToMinutes, dureeMinFromHeures, fmtDuree } from '../utils/duree';

/**
 * Tests de caractérisation des helpers purs extraits de EauBassinReleves / EauApportsReleves
 * lors du découpage v3.62.0. Verrouillent la sémantique (anti-régression du refactor).
 */
describe('dateInput — toIsoOrUndefined / isFuture / isoToLocalInput', () => {
  afterEach(() => vi.useRealTimers());

  it('toIsoOrUndefined : vide ou espaces → undefined', () => {
    expect(toIsoOrUndefined('')).toBeUndefined();
    expect(toIsoOrUndefined('   ')).toBeUndefined();
  });

  it('toIsoOrUndefined : invalide → undefined', () => {
    expect(toIsoOrUndefined('pas-une-date')).toBeUndefined();
  });

  it('toIsoOrUndefined : datetime-local valide → ISO', () => {
    const iso = toIsoOrUndefined('2026-01-15T08:30');
    expect(iso).toBe(new Date('2026-01-15T08:30').toISOString());
  });

  it('isFuture : vide → false', () => {
    expect(isFuture('')).toBe(false);
    expect(isFuture('  ')).toBe(false);
  });

  it('isFuture : strictement après maintenant → true ; passé → false', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-16T12:00:00'));
    expect(isFuture('2026-06-16T13:00')).toBe(true);
    expect(isFuture('2026-06-16T11:00')).toBe(false);
  });

  it('isoToLocalInput : ISO → valeur datetime-local locale, invalide → ""', () => {
    expect(isoToLocalInput('not-iso')).toBe('');
    const d = new Date('2026-03-04T05:06:00');
    const pad = (n: number) => String(n).padStart(2, '0');
    const expected = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    expect(isoToLocalInput(d.toISOString())).toBe(expected);
  });
});

describe('duree — timeToMinutes / dureeMinFromHeures / fmtDuree', () => {
  it('timeToMinutes : HH:MM valide → minutes ; vide/invalide → null', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes('24:00')).toBeNull();
    expect(timeToMinutes('08:60')).toBeNull();
    expect(timeToMinutes('abc')).toBeNull();
  });

  it('dureeMinFromHeures : durée simple, passage de minuit, et nulle', () => {
    expect(dureeMinFromHeures('08:00', '10:30')).toBe(150);
    expect(dureeMinFromHeures('23:00', '01:00')).toBe(120); // passage de minuit
    expect(dureeMinFromHeures('08:00', '08:00')).toBeNull(); // durée nulle
    expect(dureeMinFromHeures('', '10:00')).toBeNull();
  });

  it('fmtDuree : minutes → lecture humaine', () => {
    expect(fmtDuree(0)).toBe('—');
    expect(fmtDuree(-5)).toBe('—');
    expect(fmtDuree(45)).toBe('45 min');
    expect(fmtDuree(125)).toBe('2 h 05');
    expect(fmtDuree(60)).toBe('1 h 00');
    expect(fmtDuree(1500)).toBe('1 j 1 h');
  });
});
