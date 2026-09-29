import { describe, expect, it } from 'vitest';
import type { LatLng } from '../types/partner';
import {
  addFix,
  BLEND_MS,
  DEFAULT_SPEED_MPS,
  grid200,
  isImpreciseFix,
  displayedPosition,
  LiveFleet,
  metresBetween,
  newTrack,
  prepareRoute,
  project,
  simulatedPosition,
  STALE_MS,
  trackSpeed,
} from './liveMotion';

// A straight road along latitude -13.4, from 48.20 to 48.30 (~10.8 km), with a bend point.
const ROUTE: LatLng[] = [
  [-13.4, 48.2],
  [-13.4, 48.25],
  [-13.4, 48.3],
];
const at = (lng: number) => ({ lat: -13.4, lng });
const T0 = 1_000_000;

describe('route helpers', () => {
  it('measures and projects along the road', () => {
    const r = prepareRoute(ROUTE)!;
    expect(r.cum[2]).toBeGreaterThan(10_700);
    expect(r.cum[2]).toBeLessThan(10_900);
    const p = project(r, { lat: -13.401, lng: 48.25 });
    expect(Math.abs(p.s - r.cum[1])).toBeLessThan(1);
    expect(p.dist).toBeGreaterThan(100);
    expect(p.dist).toBeLessThan(120);
    expect(prepareRoute([[-13.4, 48.2]])).toBeNull();
  });
});

describe('simulation between two positions', () => {
  it('moves along the route at the speed given by the server', () => {
    const t = newTrack({ ...at(48.2), atMs: T0, speedMps: 10 }, ROUTE);
    const p = simulatedPosition(t, T0 + 20_000);
    expect(p.lat).toBeCloseTo(-13.4, 6);
    expect(metresBetween(at(48.2), p)).toBeCloseTo(200, 0);
  });

  it('uses 15 km/h when only one position is known and no speed was given', () => {
    const t = newTrack({ ...at(48.2), atMs: T0, speedMps: null }, ROUTE);
    expect(trackSpeed(t)).toBeCloseTo(DEFAULT_SPEED_MPS, 6);
    expect(metresBetween(at(48.2), simulatedPosition(t, T0 + 10_000))).toBeCloseTo(DEFAULT_SPEED_MPS * 10, 0);
  });

  it('measures the speed on the two last positions (along the road)', () => {
    let t = newTrack({ ...at(48.2), atMs: T0, speedMps: null }, ROUTE);
    const d = 300;
    const lng2 = 48.2 + d / (111320 * Math.cos((13.4 * Math.PI) / 180));
    t = addFix(t, { ...at(lng2), atMs: T0 + 30_000, speedMps: null }, T0 + 30_000);
    expect(trackSpeed(t)).toBeCloseTo(10, 1);
  });

  it('stops the simulated advance 30 s after the last position', () => {
    const t = newTrack({ ...at(48.2), atMs: T0, speedMps: 10 }, ROUTE);
    const at30 = simulatedPosition(t, T0 + 30_000);
    const at90 = simulatedPosition(t, T0 + 90_000);
    expect(metresBetween(at30, at90)).toBeLessThan(0.01);
    expect(metresBetween(at(48.2), at30)).toBeCloseTo(300, 0);
  });

  it('turns grey after 2 minutes without a position', () => {
    const t = newTrack({ ...at(48.2), atMs: T0, speedMps: 10 }, ROUTE);
    expect(displayedPosition(t, T0 + STALE_MS - 1).stale).toBe(false);
    expect(displayedPosition(t, T0 + STALE_MS + 1).stale).toBe(true);
  });

  it('stays still without a route, or when far from it', () => {
    const noRoute = newTrack({ ...at(48.22), atMs: T0, speedMps: 10 }, null);
    expect(simulatedPosition(noRoute, T0 + 20_000)).toEqual(at(48.22));
    const far = newTrack({ lat: -13.41, lng: 48.22, atMs: T0, speedMps: 10 }, ROUTE);
    expect(simulatedPosition(far, T0 + 20_000)).toEqual({ lat: -13.41, lng: 48.22 });
  });

  it('never goes past the end of the route', () => {
    const t = newTrack({ ...at(48.299), atMs: T0, speedMps: 20 }, ROUTE);
    expect(simulatedPosition(t, T0 + 30_000).lng).toBeCloseTo(48.3, 6);
  });
});

describe('smooth join to the next position', () => {
  it('starts from the shown position (no jump) and reaches the new one', () => {
    let t = newTrack({ ...at(48.2), atMs: T0, speedMps: 10 }, ROUTE);
    const now = T0 + 25_000;
    const before = displayedPosition(t, now);
    // The real point is a little behind the simulation.
    t = addFix(t, { ...at(48.2015), atMs: now - 2_000, speedMps: 8 }, now);
    const after = displayedPosition(t, now);
    expect(metresBetween(before, after)).toBeLessThan(0.01);
    const mid = displayedPosition(t, now + BLEND_MS / 2);
    const end = displayedPosition(t, now + BLEND_MS + 1);
    expect(metresBetween(end, simulatedPosition(t, now + BLEND_MS + 1))).toBeLessThan(0.01);
    // Every step is small: no jump.
    expect(metresBetween(after, mid)).toBeLessThan(metresBetween(after, end) + 1);
  });

  it('ignores the same position read twice, and an older answer', () => {
    const t = newTrack({ ...at(48.2), atMs: T0, speedMps: 10 }, ROUTE);
    expect(addFix(t, { ...at(48.2), atMs: T0 + 1_000, speedMps: 10 }, T0 + 5_000)).toBe(t);
    expect(addFix(t, { ...at(48.21), atMs: T0 - 5_000, speedMps: 10 }, T0 + 5_000)).toBe(t);
  });
});

describe('LiveFleet', () => {
  it('follows the server answers and forgets a driver who is no longer listed', () => {
    const f = new LiveFleet();
    f.update([{ id: 'a', live: { ...at(48.2), age_s: 5, speed_kmh: 36 }, route: ROUTE }], T0);
    const p = f.position('a', T0 + 10_000)!;
    // 5 s old + 10 s at 36 km/h = 150 m
    expect(metresBetween(at(48.2), p)).toBeCloseTo(150, 0);
    expect(f.speedKmh('a', T0)).toBe(36);
    f.update([{ id: 'b', live: null, route: null }], T0 + 30_000);
    expect(f.position('a', T0 + 30_000)).toBeNull();
    expect(f.has('b')).toBe(false);
  });
});

describe('grid200 (same rounding as the server)', () => {
  it('rounds to a ~200 m grid', () => {
    // Values checked against navy_grid200 in SQL: -13.40300 -> -13.4028, 48.24700 -> 48.2472
    expect(grid200(-13.403)).toBe(-13.4028);
    expect(grid200(48.247)).toBe(48.2472);
    for (const [lat, lng] of [[-13.40541, 48.27431], [-13.39828, 48.20803], [-13.3, 48.31]]) {
      expect(metresBetween({ lat, lng }, { lat: grid200(lat), lng: grid200(lng) })).toBeLessThan(142);
    }
  });
});

describe('phase 3C: an imprecise position (> 100 m) is only a sign of life', () => {
  const lngAt = (m: number) => 48.2 + m / (111320 * Math.cos((13.4 * Math.PI) / 180));

  it('flags the positions less precise than 100 m (same threshold as the server)', () => {
    expect(isImpreciseFix(101)).toBe(true);
    expect(isImpreciseFix(100)).toBe(false);
    expect(isImpreciseFix(null)).toBe(false);
    expect(isImpreciseFix(undefined)).toBe(false);
  });

  it('never moves the vehicle nor gives a speed, but keeps it alive', () => {
    let t = newTrack({ ...at(48.2), atMs: T0, speedMps: null, accuracyM: 12 }, ROUTE);
    // 800 m jump in 30 s (27 m/s) with 400 m of uncertainty
    t = addFix(t, { ...at(lngAt(800)), atMs: T0 + 30_000, speedMps: 27, accuracyM: 400 }, T0 + 30_000, undefined, T0 + 30_000);
    expect(t.fixes).toHaveLength(1);
    expect(trackSpeed(t)).toBeCloseTo(DEFAULT_SPEED_MPS, 6);
    // still "live" 2 min after the last precise fix thanks to the signal
    expect(displayedPosition(t, T0 + 140_000).stale).toBe(false);
    expect(displayedPosition(t, T0 + 160_000).stale).toBe(true);
  });

  it('measures the speed between precise positions only', () => {
    let t = newTrack({ ...at(48.2), atMs: T0, speedMps: null, accuracyM: 900 }, ROUTE);
    t = addFix(t, { ...at(lngAt(300)), atMs: T0 + 30_000, speedMps: null, accuracyM: 10 }, T0 + 30_000);
    expect(trackSpeed(t)).toBeCloseTo(DEFAULT_SPEED_MPS, 6); // not 10 m/s measured from an imprecise fix
    t = addFix(t, { ...at(lngAt(600)), atMs: T0 + 60_000, speedMps: null, accuracyM: 10 }, T0 + 60_000);
    expect(trackSpeed(t)).toBeCloseTo(10, 1);
  });

  it('LiveFleet: the server keeps the usable position (fix_age_s) and refreshes the signal (age_s)', () => {
    const f = new LiveFleet();
    f.update([{ id: 'a', live: { ...at(48.2), age_s: 0, fix_age_s: 0, accuracy_m: 10, speed_kmh: 36 }, route: ROUTE }], T0);
    // 100 s later: an imprecise fix arrived 1 s ago, the usable position is 100 s old
    f.update([{ id: 'a', live: { ...at(48.2), age_s: 1, fix_age_s: 100, accuracy_m: 10, speed_kmh: 36 }, route: ROUTE }], T0 + 100_000);
    const p = f.position('a', T0 + 100_000)!;
    expect(p.stale).toBe(false);
    // the simulation stopped 30 s after the usable position: 300 m, not more
    expect(metresBetween(at(48.2), p)).toBeCloseTo(300, 0);
  });
});
