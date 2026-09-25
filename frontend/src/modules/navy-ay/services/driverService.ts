/**
 * NAVY ay — driver availability and destination (phase 1B), offline-first.
 *
 * Only the DESTINATION the driver chooses is recorded, never a live position.
 * The choice is kept on the phone at once (NavyAyDB kv '<user>:driverStatus'), then
 * sent through navy_set_driver_status(). Offline or on timeout it stays marked
 * "pending" and leaves when the network comes back. Idempotent and order-safe: the
 * server ignores a choice older than the one it holds (p_client_at), so a replay
 * never creates a duplicate nor overwrites a newer choice made on another phone.
 * Availability ends by itself 3 h after the choice (nothing written at expiry).
 */
import { useSyncExternalStore } from 'react';
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type { DriverStatusLocal, NavyDriverStatusRow } from '../types/partner';

const db = supabase as any;
const key = (userId: string) => `${userId}:driverStatus`;
const lastDestKey = (userId: string) => `${userId}:driverLastDest`;

interface DriverState {
  userId: string | null;
  status: DriverStatusLocal | null;
  lastDest: { lat: number; lng: number } | null;
  sending: boolean;
}

let state: DriverState = { userId: null, status: null, lastDest: null, sending: false };
const listeners = new Set<() => void>();

function set(next: Partial<DriverState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useDriverState(): DriverState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
}

function online() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function fromServer(row: NavyDriverStatusRow): DriverStatusLocal {
  return {
    partnerId: row.partner_id,
    available: row.available,
    destLat: row.dest_lat,
    destLng: row.dest_lng,
    clientAt: row.client_at,
    pending: false,
    destZoneId: row.dest_zone_id,
  };
}

/** Phone copy first, then the server row (a pending local choice is never overwritten). */
export async function loadDriverStatus(userId: string, partnerId: string): Promise<void> {
  if (state.userId !== userId) set({ userId, status: null, lastDest: null });
  try {
    const [s, d] = await Promise.all([navyDb.kv.get(key(userId)), navyDb.kv.get(lastDestKey(userId))]);
    const local = (s?.value as DriverStatusLocal | undefined) ?? null;
    set({
      status: local && local.partnerId === partnerId ? local : null,
      lastDest: (d?.value as DriverState['lastDest']) ?? null,
    });
  } catch {
    /* nothing on the phone */
  }
  if (!online()) return;
  await flushDriverStatus(userId);
  try {
    const { data, error } = (await withTimeout(
      db.from('navy_driver_status').select('*').eq('partner_id', partnerId).maybeSingle(),
      6000,
      'navy-driver-status'
    )) as any;
    if (error || state.userId !== userId) return;
    if (state.status?.pending) return;
    if (data) {
      const row = data as NavyDriverStatusRow;
      const local = state.status;
      // Keep whichever choice is the most recent.
      if (!local || new Date(row.client_at).getTime() >= new Date(local.clientAt).getTime()) {
        const next = fromServer(row);
        await navyDb.kv.put({ key: key(userId), value: next });
        set({ status: next });
      }
    }
  } catch {
    /* stays on the phone copy */
  }
}

/** Save the choice on the phone, then send it (queued when offline). */
export async function setDriverAvailability(
  userId: string,
  partnerId: string,
  available: boolean,
  dest: { lat: number; lng: number } | null
): Promise<'sent' | 'queued' | 'error'> {
  const next: DriverStatusLocal = {
    partnerId,
    available,
    destLat: dest?.lat ?? state.status?.destLat ?? null,
    destLng: dest?.lng ?? state.status?.destLng ?? null,
    clientAt: new Date().toISOString(),
    pending: true,
    destZoneId: null,
  };
  await navyDb.kv.put({ key: key(userId), value: next });
  if (dest) await navyDb.kv.put({ key: lastDestKey(userId), value: dest });
  set({ status: next, ...(dest ? { lastDest: dest } : {}) });
  if (!online()) return 'queued';
  return flushDriverStatus(userId);
}

let flushing: Promise<'sent' | 'queued' | 'error'> | null = null;

/** Send the pending choice, if any. Same p_client_at on every attempt (idempotent). */
export function flushDriverStatus(userId: string): Promise<'sent' | 'queued' | 'error'> {
  if (flushing) return flushing;
  flushing = (async () => {
    let s: DriverStatusLocal | null = null;
    try {
      const kv = await navyDb.kv.get(key(userId));
      s = (kv?.value as DriverStatusLocal | undefined) ?? null;
      if (!s?.pending) return 'sent';
      if (!online()) return 'queued';
      set({ sending: true });
      const { data, error } = (await withTimeout(
        db.rpc('navy_set_driver_status', {
          p_partner_id: s.partnerId,
          p_available: s.available,
          p_dest_lat: s.destLat,
          p_dest_lng: s.destLng,
          p_client_at: s.clientAt,
        }),
        8000,
        'navy-driver-status-set'
      )) as any;
      if (error) {
        // Refused for good (not a driver any more, invalid destination): drop it.
        if (error.code === '42501' || error.code === '22023') {
          await navyDb.kv.put({ key: key(userId), value: { ...s, pending: false, available: false } });
          if (state.userId === userId) set({ status: { ...s, pending: false, available: false } });
          return 'error';
        }
        throw error;
      }
      const row = data as NavyDriverStatusRow;
      // A newer choice made meanwhile stays pending.
      const current = (await navyDb.kv.get(key(userId)))?.value as DriverStatusLocal | undefined;
      if (current && current.clientAt === s.clientAt) {
        const done: DriverStatusLocal = { ...s, pending: false, destZoneId: row?.dest_zone_id ?? null };
        await navyDb.kv.put({ key: key(userId), value: done });
        if (state.userId === userId) set({ status: done });
      }
      return 'sent';
    } catch (err) {
      console.warn('⚠️ [navy] driver status not sent yet:', err instanceof Error ? err.message : err);
      return 'queued';
    } finally {
      set({ sending: false });
      flushing = null;
    }
  })();
  return flushing;
}
