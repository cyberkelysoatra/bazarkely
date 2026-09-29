/**
 * NAVY ay — moving vehicles between two positions (phase 2C3, decision 49).
 *
 * The server receives one position every 30 s per driver. Between two positions the
 * CLIENT'S phone makes the icon move:
 *   - along the driver's route (road by road); without a route, or when the position is
 *     far from it, the icon stays still;
 *   - at the measured speed (the server's, measured on the driver's two last exact
 *     positions or given by his GPS; else measured here on the two last positions
 *     received; else 15 km/h when only one is known);
 *   - when the next position arrives, the icon JOINS it smoothly (no jump);
 *   - the simulated advance stops 30 s after the last position (a stopped driver does
 *     not seem to drive); without a position for 2 minutes the icon turns grey
 *     ("position incertaine"); after 5 minutes the track is forgotten.
 *   - phase 3C: a position less precise than 100 m (isImpreciseFix) never feeds the speed
 *     nor the simulation: it only refreshes the time of the last signal (same rule as the
 *     server, navy_report_position, which keeps the last usable fix and gives its age as
 *     fix_age_s). Seen on 2026-09-28/29: an imprecise GPS jump gave up to 29 m/s.
 * Pure functions (no clock, no DOM): every time is given. Covered by liveMotion.test.ts.
 */
import type { LatLng } from '../types/partner';

export const SIM_STOP_MS = 30_000;
export const STALE_MS = 120_000;
export const FORGET_MS = 300_000;
export const BLEND_MS = 2_500;
export const DEFAULT_SPEED_MPS = 15 / 3.6;
/** Farther than this from its route, a position is not moved along it. */
export const OFF_ROUTE_M = 250;
/** Faster than this is a GPS jump, not a speed. */
export const MAX_SPEED_MPS = 30;
/** Less precise than this (m), a position is only a sign of life (server: same threshold). */
export const IMPRECISE_M = 100;

export function isImpreciseFix(accuracyM: number | null | undefined): boolean {
  return accuracyM != null && Number.isFinite(accuracyM) && accuracyM > IMPRECISE_M;
}

export interface LiveFix {
  lat: number;
  lng: number;
  /** Time of the position (ms, the phone's clock shifted by the age given by the server). */
  atMs: number;
  /** Speed given by the server (m/s), or null. */
  speedMps: number | null;
  /** Precision of the position (m), when known. */
  accuracyM?: number | null;
}

export interface LiveRoute {
  pts: LatLng[];
  /** Cumulative distance (m) at each point. */
  cum: number[];
}

export interface LiveTrack {
  /** Two last positions at most, oldest first. */
  fixes: LiveFix[];
  route: LiveRoute | null;
  /** Smooth join towards the newest position. */
  blend: { lat: number; lng: number; startMs: number } | null;
  /** Time of the last sign of life (a usable position or an imprecise one), ms. */
  signalAtMs?: number;
}

/** Last sign of life of the driver: never older than his last usable position. */
function signalAt(track: LiveTrack): number {
  const last = track.fixes[track.fixes.length - 1];
  return Math.max(last.atMs, track.signalAtMs ?? 0);
}

export interface LivePosition {
  lat: number;
  lng: number;
  stale: boolean;
}

/** ~200 m grid (0.0018 degree): mirror of the server's navy_grid200, the precision clients see. */
export const GRID_STEP = 0.0018;
export function grid200(v: number): number {
  return Math.round(Math.round(v / GRID_STEP) * GRID_STEP * 1e5) / 1e5;
}

const RAD = Math.PI / 180;

/** Distance in metres (equirectangular, enough at the scale of an island). */
export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const kx = 111320 * Math.cos(((a.lat + b.lat) / 2) * RAD);
  return Math.hypot((b.lng - a.lng) * kx, (b.lat - a.lat) * 110574);
}

const ll = (p: LatLng) => ({ lat: p[0], lng: p[1] });

export function prepareRoute(points: LatLng[] | null | undefined): LiveRoute | null {
  if (!points || points.length < 2) return null;
  const cum = [0];
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + metresBetween(ll(points[i - 1]), ll(points[i])));
  return cum[cum.length - 1] > 1 ? { pts: points, cum } : null;
}

/** Nearest point of the route: distance along it (s, m) and distance to it (m). */
export function project(route: LiveRoute, p: { lat: number; lng: number }): { s: number; dist: number } {
  let best = { s: 0, dist: Infinity };
  const kx = 111320 * Math.cos(p.lat * RAD);
  const ky = 110574;
  for (let i = 1; i < route.pts.length; i++) {
    const ax = (route.pts[i - 1][1] - p.lng) * kx;
    const ay = (route.pts[i - 1][0] - p.lat) * ky;
    const bx = (route.pts[i][1] - p.lng) * kx;
    const by = (route.pts[i][0] - p.lat) * ky;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
    const d = Math.hypot(ax + t * dx, ay + t * dy);
    if (d < best.dist) best = { s: route.cum[i - 1] + t * (route.cum[i] - route.cum[i - 1]), dist: d };
  }
  return best;
}

/** Point at distance s along the route (clamped to its ends). */
export function pointAt(route: LiveRoute, s: number): { lat: number; lng: number } {
  const total = route.cum[route.cum.length - 1];
  const x = Math.max(0, Math.min(total, s));
  let i = 1;
  while (i < route.cum.length - 1 && route.cum[i] < x) i++;
  const seg = route.cum[i] - route.cum[i - 1];
  const t = seg <= 0 ? 0 : (x - route.cum[i - 1]) / seg;
  const a = route.pts[i - 1];
  const b = route.pts[i];
  return { lat: a[0] + (b[0] - a[0]) * t, lng: a[1] + (b[1] - a[1]) * t };
}

/** Speed used for the simulation (m/s). */
export function trackSpeed(track: LiveTrack): number {
  const last = track.fixes[track.fixes.length - 1];
  if (!last) return 0;
  if (last.speedMps != null && Number.isFinite(last.speedMps)) return Math.min(MAX_SPEED_MPS, Math.max(0, last.speedMps));
  if (track.fixes.length >= 2 && !isImpreciseFix(track.fixes[track.fixes.length - 2].accuracyM)) {
    const prev = track.fixes[track.fixes.length - 2];
    const dt = (last.atMs - prev.atMs) / 1000;
    if (dt > 0) {
      const d =
        track.route && project(track.route, prev).dist <= OFF_ROUTE_M && project(track.route, last).dist <= OFF_ROUTE_M
          ? Math.abs(project(track.route, last).s - project(track.route, prev).s)
          : metresBetween(prev, last);
      const v = d / dt;
      if (v <= MAX_SPEED_MPS) return v;
    }
  }
  return DEFAULT_SPEED_MPS;
}

/** Where the simulation puts the vehicle, without the smooth join. */
export function simulatedPosition(track: LiveTrack, nowMs: number): { lat: number; lng: number } {
  const last = track.fixes[track.fixes.length - 1];
  if (!track.route) return { lat: last.lat, lng: last.lng };
  const pr = project(track.route, last);
  if (pr.dist > OFF_ROUTE_M) return { lat: last.lat, lng: last.lng };
  const elapsed = Math.max(0, Math.min(nowMs - last.atMs, SIM_STOP_MS)) / 1000;
  return pointAt(track.route, pr.s + trackSpeed(track) * elapsed);
}

const ease = (t: number) => t * (2 - t);

/** Position shown on the map at `nowMs`, with the smooth join and the grey state. */
export function displayedPosition(track: LiveTrack, nowMs: number): LivePosition {
  const last = track.fixes[track.fixes.length - 1];
  const sim = simulatedPosition(track, nowMs);
  const stale = nowMs - Math.max(last.atMs, signalAt(track)) > STALE_MS;
  const b = track.blend;
  if (b && nowMs - b.startMs < BLEND_MS) {
    const t = ease(Math.max(0, nowMs - b.startMs) / BLEND_MS);
    return { lat: b.lat + (sim.lat - b.lat) * t, lng: b.lng + (sim.lng - b.lng) * t, stale };
  }
  return { ...sim, stale };
}

export function newTrack(fix: LiveFix, route: LatLng[] | null | undefined): LiveTrack {
  return { fixes: [fix], route: prepareRoute(route), blend: null };
}

const sameFix = (a: LiveFix, b: LiveFix) => Math.abs(a.atMs - b.atMs) < 2_000 && a.lat === b.lat && a.lng === b.lng;

/** A new position received at `nowMs`: the icon leaves from where it is shown now. */
export function addFix(track: LiveTrack, fix: LiveFix, nowMs: number, route?: LatLng[] | null, signalAtMs?: number): LiveTrack {
  const last = track.fixes[track.fixes.length - 1];
  const nextRoute = route === undefined ? track.route : prepareRoute(route);
  const signal = Math.max(track.signalAtMs ?? 0, signalAtMs ?? 0);
  // Imprecise: a sign of life only (the vehicle neither moves nor gets a speed from it).
  if (last && isImpreciseFix(fix.accuracyM)) {
    return { ...track, route: nextRoute, signalAtMs: Math.max(signal, last.atMs) };
  }
  if (last && sameFix(last, fix)) {
    return nextRoute === track.route && signal <= signalAt(track) ? track : { ...track, route: nextRoute, signalAtMs: Math.max(signal, signalAt(track)) };
  }
  if (last && fix.atMs <= last.atMs) return signal > signalAt(track) ? { ...track, signalAtMs: signal } : track; // older answer arriving late
  const from = last ? displayedPosition(track, nowMs) : null;
  return {
    fixes: [...track.fixes.slice(-1), fix],
    route: nextRoute,
    blend: from ? { lat: from.lat, lng: from.lng, startMs: nowMs } : null,
    signalAtMs: signal,
  };
}

// ------------------------------------------------------------------ fleet

export interface LiveEntry {
  id: string;
  /** age_s: last sign of life; fix_age_s (phase 3C): the usable position; accuracy_m: its precision. */
  live: { lat: number; lng: number; age_s: number; speed_kmh: number | null; fix_age_s?: number | null; accuracy_m?: number | null } | null;
  route: LatLng[] | null;
}

/** Tracks of every driver shown on a map, fed by the answers of navy_live_drivers(). */
export class LiveFleet {
  private tracks = new Map<string, LiveTrack>();

  /** One server answer received at `receivedAtMs` (the age of each position comes from the server, P21). */
  update(entries: LiveEntry[], receivedAtMs: number): void {
    const seen = new Set<string>();
    for (const e of entries) {
      seen.add(e.id);
      const cur = this.tracks.get(e.id);
      if (!e.live) {
        if (cur && receivedAtMs - signalAt(cur) > FORGET_MS) this.tracks.delete(e.id);
        continue;
      }
      const signalAtMs = receivedAtMs - Math.max(0, e.live.age_s) * 1000;
      const fixAge = typeof e.live.fix_age_s === 'number' ? Math.max(e.live.fix_age_s, e.live.age_s) : e.live.age_s;
      const fix: LiveFix = {
        lat: e.live.lat,
        lng: e.live.lng,
        atMs: receivedAtMs - Math.max(0, fixAge) * 1000,
        speedMps: e.live.speed_kmh == null ? null : e.live.speed_kmh / 3.6,
        accuracyM: e.live.accuracy_m ?? null,
      };
      this.tracks.set(e.id, cur ? addFix(cur, fix, receivedAtMs, e.route, signalAtMs) : { ...newTrack(fix, e.route), signalAtMs });
    }
    // "Pas disponible": gone from the answer, gone from the map.
    for (const id of [...this.tracks.keys()]) if (!seen.has(id)) this.tracks.delete(id);
  }

  position(id: string, nowMs: number): LivePosition | null {
    const t = this.tracks.get(id);
    if (!t) return null;
    if (nowMs - signalAt(t) > FORGET_MS) return null;
    return displayedPosition(t, nowMs);
  }

  /** Speed shown on the sheet (km/h), or null without a position. */
  speedKmh(id: string, nowMs: number): number | null {
    const t = this.tracks.get(id);
    if (!t || nowMs - t.fixes[t.fixes.length - 1].atMs > SIM_STOP_MS) return t ? 0 : null;
    return Math.round(trackSpeed(t) * 3.6);
  }

  has(id: string): boolean {
    return this.tracks.has(id);
  }

  clear(): void {
    this.tracks.clear();
  }
}
