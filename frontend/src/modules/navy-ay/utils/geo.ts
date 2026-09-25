/**
 * NAVY ay map rules (phase 1B) — pure functions, no React, no Leaflet, no Supabase.
 * Same point-in-polygon rule as the server (navy_point_in_polygon / navy_zone_for_point),
 * so the zone shown on the phone matches the one the server computes.
 * Covered by geo.test.ts.
 */
import type { DriverStatusLocal, LatLng, NavyDriverStatusRow, NavyZone } from '../types/partner';

/** Centre of Nosy Be (between Hell-Ville and Dzamandzar) and default zoom. */
export const NOSY_BE_CENTER: LatLng = [-13.33, 48.26];
export const NOSY_BE_ZOOM = 12;

/** A driver counts as available for 3 hours after their last choice. */
export const DRIVER_AVAILABILITY_MS = 3 * 60 * 60 * 1000;
/** "Toujours disponible ?" reminder shown during the last 30 minutes. */
export const DRIVER_REMINDER_MS = 30 * 60 * 1000;

/**
 * Soft zone colours (NAVY charter: warm, light, never navy blue). The fill is drawn
 * transparent on the map, the outline uses the same colour a bit darker.
 */
export const ZONE_COLORS: { value: string; label: string }[] = [
  { value: '#F5D77A', label: 'Jaune doux' },
  { value: '#F4B183', label: 'Abricot' },
  { value: '#B7DDB0', label: 'Vert tendre' },
  { value: '#F2A7B8', label: 'Rose' },
  { value: '#C9B8E8', label: 'Lavande' },
  { value: '#A8DCD9', label: 'Menthe' },
  { value: '#D9C3A5', label: 'Sable' },
];

/** Ray casting, x = lng, y = lat (the island is small: a planar test is enough). */
export function pointInPolygon(lat: number, lng: number, polygon: LatLng[]): boolean {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [yi, xi] = polygon[i];
    const [yj, xj] = polygon[j];
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Zones in their priority order (sort_order, then creation, then id — like the server). */
export function sortZones(zones: NavyZone[]): NavyZone[] {
  return [...zones].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id)
  );
}

/** First zone in the order containing the point (overlaps: the first one wins). */
export function zoneForPoint(zones: NavyZone[], lat: number | null | undefined, lng: number | null | undefined): NavyZone | null {
  if (lat == null || lng == null) return null;
  return sortZones(zones).find((z) => pointInPolygon(lat, lng, z.polygon)) ?? null;
}

/** A polygon the server accepts: 3 to 200 valid points. */
export function isValidPolygon(points: LatLng[]): boolean {
  return (
    points.length >= 3 &&
    points.length <= 200 &&
    points.every(([la, ln]) => Number.isFinite(la) && Number.isFinite(ln) && Math.abs(la) <= 90 && Math.abs(ln) <= 180)
  );
}

/** New sort orders after moving one zone up (-1) or down (+1). Returns [id, order][] to save. */
export function reorderZones(zones: NavyZone[], id: string, dir: -1 | 1): [string, number][] {
  const list = sortZones(zones);
  const i = list.findIndex((z) => z.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return [];
  [list[i], list[j]] = [list[j], list[i]];
  return list.map((z, k) => [z.id, k * 10] as [string, number]).filter(([zid, order]) => zones.find((z) => z.id === zid)?.sort_order !== order);
}

/** Server row: available right now (expiry computed, nothing written when it passes). */
export function isServerAvailable(row: Pick<NavyDriverStatusRow, 'available' | 'available_until'>, now = Date.now()): boolean {
  return row.available && !!row.available_until && new Date(row.available_until).getTime() > now;
}

/** Local choice: available right now (3 h after the choice made on the phone). */
export function localAvailableUntil(s: Pick<DriverStatusLocal, 'available' | 'clientAt'> | null | undefined): number | null {
  if (!s?.available) return null;
  const t = new Date(s.clientAt).getTime();
  return Number.isFinite(t) ? t + DRIVER_AVAILABILITY_MS : null;
}

export function isLocalAvailable(s: Pick<DriverStatusLocal, 'available' | 'clientAt'> | null | undefined, now = Date.now()): boolean {
  const until = localAvailableUntil(s);
  return until !== null && until > now;
}

/** "2 h 15", "45 min" — time left before the availability ends. */
export function formatRemaining(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`;
}

/** Short readable position (for lists and screen readers). */
export function formatLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
