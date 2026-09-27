import { describe, expect, it } from 'vitest';
import type { LatLng, NavyZone } from '../../types/partner';
import { boundsOf, draftGeoJSON, polygonCentroid, ring, toLngLat, zonesGeoJSON } from './navyMapGeo';

const square: LatLng[] = [
  [-13.42, 48.25],
  [-13.42, 48.3],
  [-13.38, 48.3],
  [-13.38, 48.25],
];

const zone = (id: string, sort_order: number, polygon: LatLng[] = square): NavyZone => ({
  id,
  name: `Zone ${id}`,
  polygon,
  color: '#F5D77A',
  sort_order,
  created_at: '2026-09-01T00:00:00Z',
});

describe('navyMapGeo', () => {
  it('swaps [lat, lng] to [lng, lat] and closes rings', () => {
    expect(toLngLat([-13.4, 48.27])).toEqual([48.27, -13.4]);
    const r = ring(square);
    expect(r).toHaveLength(5);
    expect(r[0]).toEqual(r[4]);
    expect(r[1]).toEqual([48.3, -13.42]);
  });

  it('puts the centroid in the middle of the zone', () => {
    const c = polygonCentroid(square) as LatLng;
    expect(c[0]).toBeCloseTo(-13.4, 6);
    expect(c[1]).toBeCloseTo(48.275, 6);
    expect(polygonCentroid([])).toBeNull();
    // Flat shape: mean of the points.
    expect(polygonCentroid([[-13, 48], [-13, 48]])).toEqual([-13, 48]);
  });

  it('keeps zones in priority order, hides the edited one and marks the highlighted one', () => {
    const { shapes, labels } = zonesGeoJSON([zone('b', 20), zone('a', 10), zone('c', 30), zone('x', 5, square.slice(0, 2))], 'c', 'b');
    expect(shapes.features.map((f) => f.properties.id)).toEqual(['a', 'c']);
    expect(shapes.features[1].properties.strong).toBe(true);
    expect(shapes.features[0].properties.strong).toBe(false);
    expect(labels.features[0].geometry.coordinates[0]).toBeCloseTo(48.275, 6);
  });

  it('draws the draft as a line with 2 points and a polygon from 3', () => {
    expect(draftGeoJSON(undefined).features).toHaveLength(0);
    expect(draftGeoJSON(square.slice(0, 1)).features).toHaveLength(0);
    expect(draftGeoJSON(square.slice(0, 2)).features[0].geometry.type).toBe('LineString');
    expect(draftGeoJSON(square).features[0].geometry.type).toBe('Polygon');
  });

  it('computes bounds as [west, south, east, north]', () => {
    expect(boundsOf(square)).toEqual([48.25, -13.42, 48.3, -13.38]);
    expect(boundsOf([])).toBeNull();
  });
});
