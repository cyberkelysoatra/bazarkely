/**
 * NAVY ay zones (phase 1B). Readable by every signed-in account, written by operators
 * (RLS + navy_is_operator()). The list is kept on the phone (NavyAyDB kv 'zones') so a
 * grocer or a driver offline still sees the zone of a point; operator edits are online.
 * Writes use the client id with an upsert (a replay after a timeout never duplicates).
 */
import { useSyncExternalStore } from 'react';
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type { LatLng, NavyZone } from '../types/partner';
import { sortZones } from '../utils/geo';

const db = supabase as any;
const KV_KEY = 'zones';

let zones: NavyZone[] = [];
let loaded = false;
const listeners = new Set<() => void>();

function emit(next: NavyZone[]) {
  zones = sortZones(next);
  loaded = true;
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Zones known on this phone (reactive). */
export function useNavyZones(): { zones: NavyZone[]; loaded: boolean } {
  const z = useSyncExternalStore(subscribe, () => zones, () => zones);
  return { zones: z, loaded };
}

function normalize(row: any): NavyZone {
  return {
    id: row.id,
    name: row.name,
    polygon: Array.isArray(row.polygon) ? (row.polygon as LatLng[]) : [],
    color: row.color,
    sort_order: row.sort_order ?? 0,
    created_by: row.created_by ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

let refreshing: Promise<NavyZone[]> | null = null;

/** Phone copy at once, then the server list (withTimeout). */
export async function loadZones(): Promise<NavyZone[]> {
  if (!loaded) {
    try {
      const kv = await navyDb.kv.get(KV_KEY);
      if (Array.isArray(kv?.value)) emit(kv!.value as NavyZone[]);
    } catch {
      /* no phone copy */
    }
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return zones;
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const { data, error } = (await withTimeout(
        db.from('navy_zones').select('*').order('sort_order', { ascending: true }).order('created_at', { ascending: true }),
        8000,
        'navy-zones'
      )) as any;
      if (!error && Array.isArray(data)) {
        const list = data.map(normalize);
        await navyDb.kv.put({ key: KV_KEY, value: list });
        emit(list);
      }
    } catch (err) {
      console.warn('⚠️ [navy] zones refresh deferred:', err instanceof Error ? err.message : err);
    } finally {
      refreshing = null;
    }
    return zones;
  })();
  return refreshing;
}

async function run<T>(p: Promise<any>, label: string): Promise<T> {
  const { data, error } = (await withTimeout(p, 8000, label)) as any;
  if (error) throw error;
  return data as T;
}

/** Create or update a zone (operator). Idempotent on the client id. */
export async function saveZone(zone: Pick<NavyZone, 'id' | 'name' | 'polygon' | 'color' | 'sort_order'>): Promise<NavyZone> {
  const row = await run<any>(
    db
      .from('navy_zones')
      .upsert(
        { id: zone.id, name: zone.name.trim(), polygon: zone.polygon, color: zone.color, sort_order: zone.sort_order },
        { onConflict: 'id' }
      )
      .select('*')
      .single(),
    'navy-zone-save'
  );
  const saved = normalize(row);
  emit([...zones.filter((z) => z.id !== saved.id), saved]);
  await navyDb.kv.put({ key: KV_KEY, value: zones });
  return saved;
}

export async function deleteZone(id: string): Promise<void> {
  await run(db.from('navy_zones').delete().eq('id', id), 'navy-zone-delete');
  emit(zones.filter((z) => z.id !== id));
  await navyDb.kv.put({ key: KV_KEY, value: zones });
}

/** Save new sort orders ([id, order][]). */
export async function saveZoneOrders(orders: [string, number][]): Promise<void> {
  for (const [id, sort_order] of orders) {
    await run(db.from('navy_zones').update({ sort_order }).eq('id', id), 'navy-zone-order');
  }
  emit(zones.map((z) => {
    const o = orders.find(([id]) => id === z.id);
    return o ? { ...z, sort_order: o[1] } : z;
  }));
  await navyDb.kv.put({ key: KV_KEY, value: zones });
}

export function zoneName(list: NavyZone[], id: string | null | undefined): string | null {
  if (!id) return null;
  return list.find((z) => z.id === id)?.name ?? null;
}
