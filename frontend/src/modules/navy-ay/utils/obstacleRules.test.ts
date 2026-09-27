import { describe, expect, it } from 'vitest';
import type { NavyObstacle } from '../types/parcel';
import type { LatLng } from '../types/partner';
import { isObstacleActive, obstacleAnchor, obstacleGeom, obstaclesOnRoute } from './obstacleRules';

const NOW = Date.parse('2026-09-27T12:00:00Z');
const base = (over: Partial<NavyObstacle>): NavyObstacle => ({
  id: 'o',
  kind: 'travaux',
  geom: { type: 'Point', coordinates: [48.25, -13.4] },
  note: null,
  starts_at: '2026-09-27T11:00:00Z',
  ends_at: '2026-09-27T13:00:00Z',
  status: 'valide',
  reported_by: null,
  validated_by: null,
  created_at: '2026-09-27T11:00:00Z',
  ...over,
});

describe('obstacle rules', () => {
  it('shows only validated obstacles in progress', () => {
    expect(isObstacleActive(base({}), NOW)).toBe(true);
    expect(isObstacleActive(base({ status: 'propose' }), NOW)).toBe(false);
    expect(isObstacleActive(base({ ends_at: '2026-09-27T11:59:00Z' }), NOW)).toBe(false);
    expect(isObstacleActive(base({ starts_at: '2026-09-27T12:30:00Z' }), NOW)).toBe(false);
  });

  it('builds a point or a line in GeoJSON order', () => {
    expect(obstacleGeom([[-13.4, 48.25]])).toEqual({ type: 'Point', coordinates: [48.25, -13.4] });
    expect(obstacleGeom([[-13.4, 48.25], [-13.41, 48.26]])?.type).toBe('LineString');
    expect(obstacleGeom([])).toBeNull();
    expect(obstacleAnchor({ type: 'LineString', coordinates: [[48.2, -13.4], [48.21, -13.4], [48.22, -13.4]] })).toEqual([-13.4, 48.21]);
  });

  it('finds the obstacles on a route', () => {
    const route: LatLng[] = [[-13.4, 48.2], [-13.4, 48.3]];
    expect(obstaclesOnRoute([base({})], route, NOW)).toHaveLength(1);
    expect(obstaclesOnRoute([base({ geom: { type: 'Point', coordinates: [48.25, -13.41] } })], route, NOW)).toHaveLength(0);
    // a closed passage crossing the road
    const cross = base({ geom: { type: 'LineString', coordinates: [[48.26, -13.405], [48.26, -13.395]] } });
    expect(obstaclesOnRoute([cross], route, NOW)).toHaveLength(1);
    expect(obstaclesOnRoute([base({ status: 'refuse' })], route, NOW)).toHaveLength(0);
    expect(obstaclesOnRoute([base({})], null, NOW)).toHaveLength(0);
  });
});
