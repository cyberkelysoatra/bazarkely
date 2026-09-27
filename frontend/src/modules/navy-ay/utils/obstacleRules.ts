/**
 * NAVY ay — obstacles of the private NAVY layer (phase 2C3, decisions 52 (2), 55 (2)):
 * works, flooded road, closed passage. Pure rules shared by the maps and the screens,
 * covered by obstacleRules.test.ts.
 */
import type { NavyObstacle, NavyObstacleGeom, NavyObstacleKind } from '../types/parcel';
import type { LatLng } from '../types/partner';
import { metresBetween } from './liveMotion';

export const OBSTACLE_LABELS: Record<NavyObstacleKind, string> = {
  travaux: 'Travaux',
  inondation: 'Route inondée',
  ferme: 'Passage fermé',
  autre: 'Autre obstacle',
};

/** Durations offered to the operator (ms). */
export const OBSTACLE_DURATIONS: { label: string; ms: number }[] = [
  { label: '1 heure', ms: 3_600_000 },
  { label: '3 heures', ms: 3 * 3_600_000 },
  { label: '1 jour', ms: 24 * 3_600_000 },
  { label: '3 jours', ms: 3 * 24 * 3_600_000 },
  { label: '1 semaine', ms: 7 * 24 * 3_600_000 },
];
/** Same limit as the server (navy_map_obstacles_guard). */
export const OBSTACLE_MAX_MS = 90 * 24 * 3_600_000;
/** A driver's report lasts one day until the operator sets its duration. */
export const OBSTACLE_REPORT_MS = 24 * 3_600_000;

/** Shown on the maps: validated and in progress at `nowMs` (ended ones disappear by themselves). */
export function isObstacleActive(o: Pick<NavyObstacle, 'status' | 'starts_at' | 'ends_at'>, nowMs: number): boolean {
  return o.status === 'valide' && Date.parse(o.starts_at) <= nowMs && Date.parse(o.ends_at) > nowMs;
}

/** [lat, lng] points of the shape. */
export function obstaclePoints(g: NavyObstacleGeom): LatLng[] {
  return g.type === 'Point' ? [[g.coordinates[1], g.coordinates[0]]] : g.coordinates.map((c) => [c[1], c[0]] as LatLng);
}

/** Where the pictogram goes: the point, or the middle point of the line. */
export function obstacleAnchor(g: NavyObstacleGeom): LatLng {
  const pts = obstaclePoints(g);
  return pts[Math.floor((pts.length - 1) / 2)];
}

/** Shape from what was drawn: one point, or a line of 2 to 100 points. */
export function obstacleGeom(points: LatLng[]): NavyObstacleGeom | null {
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  if (points.length === 1) return { type: 'Point', coordinates: [r(points[0][1]), r(points[0][0])] };
  if (points.length >= 2 && points.length <= 100) return { type: 'LineString', coordinates: points.map((p) => [r(p[1]), r(p[0])] as [number, number]) };
  return null;
}

/** Distance (m) from a point to a line of [lat, lng] points. */
function pointToLine(p: { lat: number; lng: number }, line: LatLng[]): number {
  if (line.length === 1) return metresBetween(p, { lat: line[0][0], lng: line[0][1] });
  const kx = 111320 * Math.cos((p.lat * Math.PI) / 180);
  const ky = 110574;
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const ax = (line[i - 1][1] - p.lng) * kx;
    const ay = (line[i - 1][0] - p.lat) * ky;
    const dx = (line[i][1] - p.lng) * kx - ax;
    const dy = (line[i][0] - p.lat) * ky - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    best = Math.min(best, Math.hypot(ax + t * dx, ay + t * dy));
  }
  return best;
}

/** Two segments cross (in degrees, enough to tell whether a passage cuts a road). */
function segmentsCross(a: LatLng, b: LatLng, c: LatLng, d: LatLng): boolean {
  const o = (p: LatLng, q: LatLng, r: LatLng) => Math.sign((q[1] - p[1]) * (r[0] - p[0]) - (q[0] - p[0]) * (r[1] - p[1]));
  return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b);
}

/** Active obstacles lying on (within `m` metres of) a route: the alert of the route panel. */
export function obstaclesOnRoute(list: NavyObstacle[], route: LatLng[] | null | undefined, nowMs: number, m = 60): NavyObstacle[] {
  if (!route || route.length < 2) return [];
  return list.filter((o) => {
    if (!isObstacleActive(o, nowMs)) return false;
    const pts = obstaclePoints(o.geom);
    if (pts.some(([lat, lng]) => pointToLine({ lat, lng }, route) <= m)) return true;
    if (pts.length < 2) return false;
    for (let i = 1; i < pts.length; i++) for (let j = 1; j < route.length; j++) if (segmentsCross(pts[i - 1], pts[i], route[j - 1], route[j])) return true;
    return false;
  });
}

/** "jusqu'à 18:30" today, "jusqu'au 3 oct. 18:30" later. */
export function formatUntil(iso: string, nowMs: number): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const sameDay = new Date(nowMs).toDateString() === d.toDateString();
  return sameDay ? `jusqu’à ${time}` : `jusqu’au ${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} ${time}`;
}
