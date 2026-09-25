import { describe, expect, it } from 'vitest';
import type { LatLng, NavyZone } from '../types/partner';
import {
  DRIVER_AVAILABILITY_MS,
  formatRemaining,
  isLocalAvailable,
  isServerAvailable,
  isValidPolygon,
  pointInPolygon,
  reorderZones,
  zoneForPoint,
} from './geo';

const square: LatLng[] = [
  [-13.42, 48.25],
  [-13.42, 48.3],
  [-13.38, 48.3],
  [-13.38, 48.25],
];

const zone = (id: string, polygon: LatLng[], sort_order: number, created_at = '2026-09-25T00:00:00Z'): NavyZone => ({
  id,
  name: id,
  polygon,
  color: '#F5D77A',
  sort_order,
  created_at,
});

describe('pointInPolygon', () => {
  it('inside and outside a square', () => {
    expect(pointInPolygon(-13.4, 48.27, square)).toBe(true);
    expect(pointInPolygon(-13.3, 48.27, square)).toBe(false);
    expect(pointInPolygon(-13.4, 48.4, square)).toBe(false);
  });
  it('concave polygon (L shape)', () => {
    const l: LatLng[] = [
      [0, 0],
      [0, 2],
      [1, 2],
      [1, 1],
      [2, 1],
      [2, 0],
    ];
    expect(pointInPolygon(0.5, 1.5, l)).toBe(true);
    expect(pointInPolygon(1.5, 1.5, l)).toBe(false);
    expect(pointInPolygon(1.5, 0.5, l)).toBe(true);
  });
  it('degenerate input', () => {
    expect(pointInPolygon(0, 0, square.slice(0, 2))).toBe(false);
    expect(pointInPolygon(Number.NaN, 0, square)).toBe(false);
  });
});

describe('zoneForPoint', () => {
  it('overlap: the first zone in the order wins', () => {
    const big: LatLng[] = [
      [-13.5, 48.2],
      [-13.5, 48.4],
      [-13.3, 48.4],
      [-13.3, 48.2],
    ];
    const zones = [zone('big', big, 10), zone('small', square, 0)];
    expect(zoneForPoint(zones, -13.4, 48.27)?.id).toBe('small');
    expect(zoneForPoint(zones, -13.45, 48.22)?.id).toBe('big');
    expect(zoneForPoint(zones, -13.0, 48.22)).toBeNull();
    expect(zoneForPoint(zones, null, 48.22)).toBeNull();
  });
  it('same order: the oldest wins (like the server)', () => {
    const zones = [zone('b', square, 0, '2026-09-25T02:00:00Z'), zone('a', square, 0, '2026-09-25T01:00:00Z')];
    expect(zoneForPoint(zones, -13.4, 48.27)?.id).toBe('a');
  });
});

describe('reorderZones', () => {
  it('moves a zone up and renumbers only what changed', () => {
    const zones = [zone('a', square, 0), zone('b', square, 10), zone('c', square, 20)];
    expect(reorderZones(zones, 'c', -1)).toEqual([
      ['c', 10],
      ['b', 20],
    ]);
    expect(reorderZones(zones, 'a', -1)).toEqual([]);
  });
});

describe('availability', () => {
  const now = Date.parse('2026-09-25T12:00:00Z');
  it('expires 3 h after the choice', () => {
    const at = new Date(now - DRIVER_AVAILABILITY_MS + 60000).toISOString();
    expect(isLocalAvailable({ available: true, clientAt: at }, now)).toBe(true);
    expect(isLocalAvailable({ available: true, clientAt: at }, now + 120000)).toBe(false);
    expect(isLocalAvailable({ available: false, clientAt: at }, now)).toBe(false);
  });
  it('server row', () => {
    expect(isServerAvailable({ available: true, available_until: '2026-09-25T13:00:00Z' }, now)).toBe(true);
    expect(isServerAvailable({ available: true, available_until: '2026-09-25T11:00:00Z' }, now)).toBe(false);
    expect(isServerAvailable({ available: true, available_until: null }, now)).toBe(false);
  });
  it('formatRemaining', () => {
    expect(formatRemaining(45 * 60000)).toBe('45 min');
    expect(formatRemaining(135 * 60000)).toBe('2 h 15');
    expect(formatRemaining(180 * 60000)).toBe('3 h');
  });
});

describe('isValidPolygon', () => {
  it('needs 3 valid points', () => {
    expect(isValidPolygon(square)).toBe(true);
    expect(isValidPolygon(square.slice(0, 2))).toBe(false);
    expect(isValidPolygon([[0, 0], [0, 1], [95, 1]])).toBe(false);
  });
});
