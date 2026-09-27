/**
 * NAVY ay vector map (phase 2C1): pure GeoJSON helpers for the overlays drawn above the
 * island (zones, zone names, polygon being drawn). NAVY stores points as [lat, lng];
 * GeoJSON and MapLibre use [lng, lat]. Covered by navyMapGeo.test.ts.
 */
import type { FeatureCollection, Point, Polygon, LineString } from 'geojson';
import type { LatLng, NavyZone } from '../../types/partner';
import { sortZones } from '../../utils/geo';

export type LngLatPair = [number, number];

export function toLngLat([lat, lng]: LatLng): LngLatPair {
  return [lng, lat];
}

/** Closed GeoJSON ring from NAVY points. */
export function ring(points: LatLng[]): LngLatPair[] {
  const r = points.map(toLngLat);
  if (r.length) r.push(r[0]);
  return r;
}

/** Area centroid of a polygon ([lat, lng] points); mean of the points when the area is ~0. */
export function polygonCentroid(points: LatLng[]): LatLng | null {
  if (!points.length) return null;
  let a = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [yi, xi] = points[i];
    const [yj, xj] = points[j];
    const f = xj * yi - xi * yj;
    a += f;
    cx += (xj + xi) * f;
    cy += (yj + yi) * f;
  }
  if (Math.abs(a) < 1e-12) {
    const lat = points.reduce((s, p) => s + p[0], 0) / points.length;
    const lng = points.reduce((s, p) => s + p[1], 0) / points.length;
    return [lat, lng];
  }
  a *= 0.5;
  return [cy / (6 * a), cx / (6 * a)];
}

export interface ZoneProps {
  id: string;
  name: string;
  color: string;
  strong: boolean;
}

/** Zones in priority order (the last one drawn is on top, like Leaflet). */
export function zonesGeoJSON(
  zones: NavyZone[],
  highlightZoneId?: string | null,
  hiddenZoneId?: string | null
): { shapes: FeatureCollection<Polygon, ZoneProps>; labels: FeatureCollection<Point, ZoneProps> } {
  const list = sortZones(zones).filter((z) => z.id !== hiddenZoneId && z.polygon.length >= 3);
  const props = (z: NavyZone): ZoneProps => ({ id: z.id, name: z.name, color: z.color, strong: z.id === highlightZoneId });
  return {
    shapes: {
      type: 'FeatureCollection',
      features: list.map((z) => ({ type: 'Feature', properties: props(z), geometry: { type: 'Polygon', coordinates: [ring(z.polygon)] } })),
    },
    labels: {
      type: 'FeatureCollection',
      features: list.map((z) => ({
        type: 'Feature',
        properties: props(z),
        geometry: { type: 'Point', coordinates: toLngLat(polygonCentroid(z.polygon) as LatLng) },
      })),
    },
  };
}

/** Polygon being drawn: a filled shape from 3 points, a dashed line before. */
export function draftGeoJSON(points: LatLng[] | undefined): FeatureCollection<Polygon | LineString> {
  const pts = points ?? [];
  if (pts.length >= 3) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring(pts)] } }] };
  }
  if (pts.length === 2) {
    return { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: pts.map(toLngLat) } }] };
  }
  return { type: 'FeatureCollection', features: [] };
}

/** [west, south, east, north] of every point given, or null. */
export function boundsOf(points: LatLng[]): [number, number, number, number] | null {
  if (!points.length) return null;
  let w = Infinity;
  let s = Infinity;
  let e = -Infinity;
  let n = -Infinity;
  for (const [lat, lng] of points) {
    w = Math.min(w, lng);
    e = Math.max(e, lng);
    s = Math.min(s, lat);
    n = Math.max(n, lat);
  }
  return [w, s, e, n];
}
