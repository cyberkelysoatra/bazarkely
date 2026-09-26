import { describe, expect, it } from 'vitest';
import { computeFare } from './partnerRules';
import {
  creditSplit,
  estimatedKm,
  milestones,
  minProposedTotal,
  offerSecondsLeft,
  pairKm,
  parcelAlerts,
  priceBreakdown,
  proposedDriverGain,
  proposedTotalProblem,
  secondsLeft,
} from './parcelRules';
import type { NavyGrocerDistance, NavyParcelRow } from '../types/parcel';

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

describe('offerSecondsLeft', () => {
  it('follows the server clock, not the phone clock', () => {
    const now = Date.parse('2026-09-26T10:00:00Z');
    // Phone clock 13 s late: expires_at looks 38 s away, the server says 25 s.
    const o = { expires_at: '2026-09-26T10:00:38Z', seconds_left: 25, fetched_at: now };
    expect(offerSecondsLeft(o, now)).toBe(25);
    expect(offerSecondsLeft(o, now + 10000)).toBe(15);
    expect(offerSecondsLeft(o, now + 30000)).toBe(0);
  });
  it('never shows more than 30 s', () => {
    const now = Date.parse('2026-09-26T10:00:00Z');
    expect(offerSecondsLeft({ expires_at: '2026-09-26T10:01:00Z' }, now)).toBe(30);
  });
});

// ------------------------------------------------------------------ phase 2B1

describe('pairKm (road distance kept on the phone, fallback straight line + 30 %)', () => {
  const a = { id: 'a', lat: -13.405, lng: 48.27 };
  const b = { id: 'b', lat: -13.39, lng: 48.215 };
  const row: NavyGrocerDistance = {
    from_id: 'a', to_id: 'b', from_lat: -13.405, from_lng: 48.27, to_lat: -13.39, to_lng: 48.215,
    km: 7.8, duration_s: 700, source: 'route', computed_at: '2026-09-27T00:00:00Z',
  };
  it('uses the road distance of the table', () => {
    expect(pairKm([row], a, b)).toEqual({ km: 7.8, source: 'route' });
  });
  it('falls back to the estimate when the pair is missing (other direction included)', () => {
    expect(pairKm([row], b, a)).toEqual({ km: estimatedKm(b.lat, b.lng, a.lat, a.lng), source: 'estimation' });
    expect(pairKm([], a, b).source).toBe('estimation');
    expect(pairKm(null, a, b).km).toBe(estimatedKm(a.lat, a.lng, b.lat, b.lng));
  });
  it('ignores a row computed for an older position of a shop', () => {
    expect(pairKm([row], a, { ...b, lat: -13.3901 }).source).toBe('estimation');
  });
  it('ignores an "estimation" row (no road found)', () => {
    expect(pairKm([{ ...row, source: 'estimation' }], a, b).source).toBe('estimation');
  });
});

describe('Je propose mon prix', () => {
  it('minimum = grocers + CyberKELY share rounded up to 100 Ar', () => {
    expect(minProposedTotal(100, 100, 300)).toBe(500);
    expect(minProposedTotal(150, 120, 300)).toBe(600);
    expect(minProposedTotal(0, 0, 0)).toBe(0);
  });
  it('the driver earns total − grocers − share', () => {
    expect(proposedDriverGain(1500, 100, 100, 300)).toBe(1000);
    expect(proposedDriverGain(600, 150, 120, 300)).toBe(30);
  });
  it('refuses below the minimum and non multiples of 100', () => {
    expect(proposedTotalProblem(400, 500)).toMatch(/inférieur/);
    expect(proposedTotalProblem(1550, 500)).toMatch(/multiple de 100/);
    expect(proposedTotalProblem(0, 500)).toMatch(/Indiquez/);
    expect(proposedTotalProblem(1500, 500)).toBeNull();
    expect(proposedTotalProblem(500, 500)).toBeNull();
  });
});

describe('creditSplit (avoir)', () => {
  it('uses the credit first and keeps the rest', () => {
    expect(creditSplit(400, 1500)).toEqual({ used: 400, due: 1100, left: 0 });
    expect(creditSplit(2000, 1500)).toEqual({ used: 1500, due: 0, left: 500 });
    expect(creditSplit(0, 1500)).toEqual({ used: 0, due: 1500, left: 0 });
  });
});

describe('offerSecondsLeft, broadcast offers', () => {
  it('a broadcast offer is not capped at 30 s', () => {
    expect(offerSecondsLeft({ expires_at: '2026-01-01T00:04:00Z', seconds_left: 240, fetched_at: 1000, broadcast: true }, 1000)).toBe(240);
    expect(offerSecondsLeft({ expires_at: '2026-01-01T00:04:00Z', seconds_left: 240, fetched_at: 1000 }, 1000)).toBe(30);
  });
});
