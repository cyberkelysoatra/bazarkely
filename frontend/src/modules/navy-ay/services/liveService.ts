/**
 * NAVY ay — the living map (phase 2C3, decisions 49, 50, 53, 55 (2)).
 *
 * - liveDrivers(): available drivers with their live position (rounded ~200 m; exact
 *   only for the parties of a course the driver accepted), phone copy when offline.
 * - reportPosition(): the driver's phone sends its position (navy_report_position),
 *   never queued: an old position is worth nothing.
 * - Obstacles of the private NAVY layer: a small shared store read by every NAVY map
 *   (validated and in progress, refreshed every 5 minutes, phone copy offline), the
 *   operator's list and gestures, the driver's reports. Writes are ONLINE ONLY.
 * Never uses supabase.auth.getUser() (network call, fails offline).
 */
import { useEffect, useSyncExternalStore } from 'react';
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type { NavyLiveDriver, NavyObstacle, NavyObstacleGeom, NavyObstacleKind } from '../types/parcel';
import { isNetworkError } from '../utils/parcelRules';

const db = supabase as any;
const LIVE_KEY = 'liveDrivers';
const OBSTACLES_KEY = 'mapObstacles';
const OBSTACLES_MS = 5 * 60_000;

function online() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

async function run<T>(p: Promise<any>, label: string, ms = 8000): Promise<T> {
  const { data, error } = (await withTimeout(p, ms, label)) as any;
  if (error) throw error;
  return data as T;
}

/** Drivers on the map (server), phone copy when offline (positions then dropped: too old). */
export async function liveDrivers(): Promise<{ list: NavyLiveDriver[]; fromPhone: boolean; receivedAt: number }> {
  if (online()) {
    try {
      const list = (await run<NavyLiveDriver[]>(db.rpc('navy_live_drivers'), 'navy-live-drivers')) ?? [];
      const receivedAt = Date.now();
      // The phone copy never keeps a position (it would be stale by the next opening).
      await navyDb.kv.put({ key: LIVE_KEY, value: list.filter((d) => d.available).map((d) => ({ ...d, live: null })) });
      return { list, fromPhone: false, receivedAt };
    } catch (err) {
      if (!isNetworkError(err)) console.warn('⚠️ [navy] live drivers unreadable:', err instanceof Error ? err.message : (err as any)?.message ?? err);
    }
  }
  const kv = await navyDb.kv.get(LIVE_KEY);
  return { list: (kv?.value as NavyLiveDriver[] | undefined) ?? [], fromPhone: true, receivedAt: Date.now() };
}

/** Driver's phone: its position (server ignores a call within 10 s of the previous one). */
export async function reportPosition(
  partnerId: string,
  p: { lat: number; lng: number; heading: number | null; speed: number | null; accuracy: number | null }
): Promise<'sent' | 'refused' | 'failed'> {
  if (!online()) return 'failed';
  try {
    await run(
      db.rpc('navy_report_position', {
        p_partner_id: partnerId,
        p_lat: Math.round(p.lat * 1e6) / 1e6,
        p_lng: Math.round(p.lng * 1e6) / 1e6,
        p_heading: p.heading != null && Number.isFinite(p.heading) ? p.heading : null,
        p_speed_mps: p.speed != null && Number.isFinite(p.speed) ? p.speed : null,
        p_accuracy_m: p.accuracy != null && Number.isFinite(p.accuracy) ? Math.round(p.accuracy) : null,
      }),
      'navy-report-position',
      6000
    );
    return 'sent';
  } catch (err) {
    // 42501: not available any more (expired, stopped on another phone): stop sending.
    if ((err as any)?.code === '42501') return 'refused';
    return 'failed';
  }
}

// ------------------------------------------------------------------ obstacles store

interface ObstacleState {
  list: NavyObstacle[];
  loadedAt: number;
}

let obstacles: ObstacleState = { list: [], loadedAt: 0 };
const listeners = new Set<() => void>();
let loading: Promise<void> | null = null;

function setObstacles(list: NavyObstacle[]) {
  obstacles = { list, loadedAt: Date.now() };
  listeners.forEach((l) => l());
}

/** Validated obstacles in progress (RLS), phone copy first then the server. */
export function refreshObstacles(force = false): Promise<void> {
  if (loading) return loading;
  if (!force && Date.now() - obstacles.loadedAt < OBSTACLES_MS && obstacles.loadedAt) return Promise.resolve();
  loading = (async () => {
    try {
      if (!obstacles.loadedAt) {
        const kv = await navyDb.kv.get(OBSTACLES_KEY);
        if (kv?.value) setObstacles(kv.value as NavyObstacle[]);
      }
      if (!online()) return;
      const nowIso = new Date().toISOString();
      const list = await run<NavyObstacle[]>(
        db.from('navy_map_obstacles').select('*').eq('status', 'valide').lte('starts_at', nowIso).gt('ends_at', nowIso).limit(500),
        'navy-obstacles'
      );
      await navyDb.kv.put({ key: OBSTACLES_KEY, value: list ?? [] });
      setObstacles(list ?? []);
    } catch {
      /* phone copy stays */
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Obstacles to draw on a NAVY map (loaded on first use, refreshed every 5 minutes). */
export function useMapObstacles(enabled = true): NavyObstacle[] {
  const s = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => obstacles,
    () => obstacles
  );
  useEffect(() => {
    if (!enabled) return;
    void refreshObstacles();
    const t = window.setInterval(() => void refreshObstacles(), OBSTACLES_MS);
    return () => window.clearInterval(t);
  }, [enabled]);
  return s.list;
}

// ------------------------------------------------------------------ operator / driver

/** Operator: every obstacle (proposed, validated, refused), newest first. */
export async function listAllObstacles(): Promise<NavyObstacle[]> {
  return (await run<NavyObstacle[]>(db.from('navy_map_obstacles').select('*').order('created_at', { ascending: false }).limit(300), 'navy-obstacles-all')) ?? [];
}

/** Driver: his own reports (RLS: reported_by = me, plus the validated ones in progress). */
export async function myObstacleReports(userId: string): Promise<NavyObstacle[]> {
  return (
    (await run<NavyObstacle[]>(
      db.from('navy_map_obstacles').select('*').eq('reported_by', userId).order('created_at', { ascending: false }).limit(20),
      'navy-obstacles-mine'
    )) ?? []
  );
}

/** Driver: report an obstacle (proposed, shown to others only once validated). */
export async function proposeObstacle(input: { kind: NavyObstacleKind; geom: NavyObstacleGeom; note: string | null; endsAt: string }): Promise<void> {
  await run(
    db.from('navy_map_obstacles').insert({ id: crypto.randomUUID(), kind: input.kind, geom: input.geom, note: input.note, ends_at: input.endsAt, status: 'propose' }),
    'navy-obstacle-propose'
  );
}

/** Operator: create (validated at once) or change an obstacle. */
export async function saveObstacle(o: { id?: string; kind: NavyObstacleKind; geom: NavyObstacleGeom; note: string | null; startsAt: string; endsAt: string }): Promise<void> {
  const row = { kind: o.kind, geom: o.geom, note: o.note, starts_at: o.startsAt, ends_at: o.endsAt, status: 'valide' };
  if (o.id) await run(db.from('navy_map_obstacles').update(row).eq('id', o.id), 'navy-obstacle-update');
  else await run(db.from('navy_map_obstacles').insert({ id: crypto.randomUUID(), ...row }), 'navy-obstacle-create');
  await refreshObstacles(true);
}

/** Operator: validate a report (with its duration) or refuse it. */
export async function decideObstacle(id: string, decision: 'valider' | 'refuser', endsAt?: string): Promise<void> {
  const patch =
    decision === 'valider'
      ? { status: 'valide', starts_at: new Date().toISOString(), ...(endsAt ? { ends_at: endsAt } : {}) }
      : { status: 'refuse' };
  await run(db.from('navy_map_obstacles').update(patch).eq('id', id), 'navy-obstacle-decide');
  await refreshObstacles(true);
}

export async function deleteObstacle(id: string): Promise<void> {
  await run(db.from('navy_map_obstacles').delete().eq('id', id), 'navy-obstacle-delete');
  await refreshObstacles(true);
}
