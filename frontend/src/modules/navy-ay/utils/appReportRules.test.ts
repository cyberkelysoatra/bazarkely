import { describe, expect, it } from 'vitest';
import { autoReportDue, summarizeReport, type AppReportSample } from './appReportRules';

const T0 = Date.UTC(2026, 8, 29, 8, 0, 0);
const MIN = 60_000;

function s(min: number, bat: number, scr: boolean, ok: number, extra: Partial<AppReportSample> = {}): AppReportSample {
  return { t: T0 + min * MIN, bat, chg: false, scr, ok, iv: 30_000, run: true, ...extra };
}

describe('automatic report of the app', () => {
  it('measures the battery used per hour with the screen off, and the positions', () => {
    // one hour screen off, 5 % used, 120 positions expected, 118 received
    const samples = Array.from({ length: 13 }, (_, i) => s(i * 5, 80 - (5 * i) / 12, false, 1000 + Math.round((118 * i) / 12)));
    const r = summarizeReport(samples, T0 + 61 * MIN)!;
    expect(r.screenOffMinutes).toBe(60);
    expect(r.drainPctPerHour).toBeCloseTo(5, 5);
    expect(r.positionsSent).toBe(118);
    expect(r.positionsExpected).toBe(120);
    expect(r.samples).toBe(13);
    expect(r.periodStart).toBe(T0);
  });

  it('leaves out the screen-on stretches, charging and gaps', () => {
    const samples = [
      s(0, 90, true, 0),
      s(5, 89, true, 10), // screen on: not counted as screen off
      s(10, 88, false, 20),
      s(15, 88, false, 30, { chg: true }), // charging: not in the battery measure
      s(20, 90, false, 40, { chg: true }),
      s(60, 85, false, 50), // gap of 40 min: sharing stopped meanwhile
      s(65, 84, false, 60),
    ];
    const r = summarizeReport(samples, T0 + 70 * MIN)!;
    expect(r.screenOffMinutes).toBe(15); // 10-15, 15-20, 60-65
    expect(r.drainPctPerHour).toBeNull(); // only 5 min screen off without charging
  });

  it('keeps 48 hours only and never needs coordinates', () => {
    const old = s(-49 * 60, 50, false, 0);
    const recent = [0, 5, 10, 15, 20, 25, 30].map((m) => s(m, 60 - m / 15, false, 10 + m * 2));
    const r = summarizeReport([old, ...recent, { lat: 1 }, null], T0 + 31 * MIN)!;
    expect(r.samples).toBe(7);
    expect(r.drainPctPerHour).toBe(4);
    expect(JSON.stringify(r)).not.toMatch(/lat|lng/);
  });

  it('needs two samples', () => {
    expect(summarizeReport([], T0)).toBeNull();
    expect(summarizeReport([s(0, 50, false, 0)], T0)).toBeNull();
  });

  it('sends by itself at "Pas disponible" from 20 minutes screen off', () => {
    const r20 = summarizeReport([0, 5, 10, 15, 20].map((m) => s(m, 50 - m / 20, false, m * 2)), T0 + 21 * MIN);
    const r10 = summarizeReport([s(0, 50, false, 0), s(10, 49, false, 20)], T0 + 11 * MIN);
    expect(autoReportDue(r20)).toBe(true);
    expect(autoReportDue(r10)).toBe(false);
    expect(autoReportDue(null)).toBe(false);
  });
});
