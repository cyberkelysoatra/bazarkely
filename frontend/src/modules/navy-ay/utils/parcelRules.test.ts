import { describe, expect, it } from 'vitest';
import { computeFare } from './partnerRules';
import { estimatedKm, milestones, parcelAlerts, priceBreakdown, secondsLeft } from './parcelRules';
import type { NavyParcelRow } from '../types/parcel';

describe('priceBreakdown', () => {
  it('E2 case: fees 100 / 100, grid 1000 per 5 km, 7 km, share 300', () => {
    const transport = computeFare(7, 1000, 1000);
    expect(transport).toBe(2000);
    const b = priceBreakdown(100, transport, 100, 300);
    expect(b.total).toBe(2500);
    expect(b.rounding).toBe(0);
    expect(b.navyTotal).toBe(300);
    expect(b.lines.map((l) => l.shown)).toEqual([114, 2273, 113]);
    expect(b.lines.map((l) => l.navyShare)).toEqual([14, 273, 13]);
    expect(b.lines.reduce((s, l) => s + l.shown, 0)).toBe(b.total);
  });

  it('rounds up to 100 Ar and gives the rounding to CyberKELY', () => {
    const b = priceBreakdown(150, 1000, 200, 300);
    expect(b.subtotal).toBe(1650);
    expect(b.total).toBe(1700);
    expect(b.rounding).toBe(50);
    expect(b.navyTotal).toBe(350);
    expect(b.lines.reduce((s, l) => s + l.shown, 0)).toBe(1700);
  });

  it('free grocers: the whole CyberKELY part goes on the transport line', () => {
    const b = priceBreakdown(0, 0, 0, 300);
    expect(b.lines.map((l) => l.shown)).toEqual([0, 300, 0]);
    expect(b.total).toBe(300);
  });
});

describe('estimatedKm', () => {
  it('adds 30 % to the straight line', () => {
    // 5.3846 km due north ≈ 7.0 km estimated
    expect(estimatedKm(-13.43, 48.27, -13.43 + 5.3846 / 111.195, 48.27)).toBe(7);
  });
  it('is 0 for the same point', () => {
    expect(estimatedKm(-13.4, 48.2, -13.4, 48.2)).toBe(0);
  });
});

describe('milestones', () => {
  it('Accepté / En route / Livré follow the status', () => {
    const m = (status: NavyParcelRow['status']) =>
      milestones({ status, driver_found_at: null, picked_up_at: null, withdrawn_at: null }).map((x) => x.done);
    expect(m('depose')).toEqual([false, false, false]);
    expect(m('chauffeur_trouve')).toEqual([true, false, false]);
    expect(m('pris_en_charge')).toEqual([true, true, false]);
    expect(m('arrive')).toEqual([true, true, false]);
    expect(m('retire')).toEqual([true, true, true]);
  });
});

describe('secondsLeft / alerts', () => {
  it('counts down and never goes negative', () => {
    const now = Date.parse('2026-09-26T10:00:00Z');
    expect(secondsLeft('2026-09-26T10:00:30Z', now)).toBe(30);
    expect(secondsLeft('2026-09-26T09:59:00Z', now)).toBe(0);
  });
  it('flags a blocked withdrawal code', () => {
    const p = { status: 'arrive', withdraw_blocked_at: '2026-09-26T10:00:00Z', payment_status: 'paye' } as NavyParcelRow;
    expect(parcelAlerts(p)).toContain('Code de retrait bloqué');
  });
});
