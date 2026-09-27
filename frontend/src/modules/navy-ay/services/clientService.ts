/**
 * NAVY ay — the client's journey on the map (phase 2C2).
 *
 * - availableDrivers(): drivers shown on the map at their DECLARED destination (server),
 *   kept on the phone for an offline home.
 * - lookupRecipient(): is the recipient on NAVY ay (first name, usual grocer)? Online
 *   only, 30 calls per hour per account (server limit).
 * - usual pickup grocer (navy_client_profiles, own row only): phone copy first, written
 *   at once when online, else kept on the phone and sent when the network comes back.
 * - routePath(): road geometry departure → arrival grocer, computed once per pair by the
 *   server (OpenRouteService); read again while it is being computed.
 * Never uses supabase.auth.getUser() (network call, fails offline).
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type { NavyAvailableDriver, NavyRecipientLookup, NavyRoutePath } from '../types/parcel';
import { isNetworkError } from '../utils/parcelRules';

const db = supabase as any;
const DRIVERS_KEY = 'availableDrivers';
const profileKey = (userId: string) => `${userId}:clientProfile`;
const dismissKey = (userId: string) => `${userId}:usualGrocerDismissed`;

function online() {
  return typeof navigator === 'undefined' || navigator.onLine;
}

async function run<T>(p: Promise<any>, label: string, ms = 8000): Promise<T> {
  const { data, error } = (await withTimeout(p, ms, label)) as any;
  if (error) throw error;
  return data as T;
}

/** Available drivers (server), phone copy when offline. */
export async function availableDrivers(): Promise<{ list: NavyAvailableDriver[]; fromPhone: boolean }> {
  if (online()) {
    try {
      const list = (await run<NavyAvailableDriver[]>(db.rpc('navy_available_drivers'), 'navy-available-drivers')) ?? [];
      await navyDb.kv.put({ key: DRIVERS_KEY, value: list });
      return { list, fromPhone: false };
    } catch (err) {
      if (!isNetworkError(err)) console.warn('⚠️ [navy] available drivers unreadable:', err instanceof Error ? err.message : err);
    }
  }
  const kv = await navyDb.kv.get(DRIVERS_KEY);
  return { list: (kv?.value as NavyAvailableDriver[] | undefined) ?? [], fromPhone: true };
}

/** Is the recipient on NAVY ay? Null when it cannot be asked now (offline, limit reached). */
export async function lookupRecipient(phone: string): Promise<NavyRecipientLookup | null> {
  if (!online()) return null;
  try {
    return await run<NavyRecipientLookup>(db.rpc('navy_lookup_recipient', { p_phone: phone }), 'navy-lookup-recipient', 6000);
  } catch (err) {
    console.warn('⚠️ [navy] recipient lookup unavailable:', err instanceof Error ? err.message : (err as any)?.message ?? err);
    return null;
  }
}

/** Road geometry of a parcel: from a depot grocer, or from a hand-over place. */
export function routePath(depotId: string | null, from: { lat: number; lng: number } | null, arrivalId: string): Promise<NavyRoutePath> {
  return run<NavyRoutePath>(
    db.rpc('navy_route_path', { p_depot: depotId, p_lat: depotId ? null : from?.lat ?? null, p_lng: depotId ? null : from?.lng ?? null, p_arrival: arrivalId }),
    'navy-route-path'
  );
}

// ------------------------------------------------------------------ usual pickup grocer

interface ProfileLocal {
  usualGrocerId: string | null;
  /** Written on the phone, not yet on the server. */
  pending: boolean;
}

export async function myUsualGrocer(userId: string): Promise<string | null> {
  const kv = await navyDb.kv.get(profileKey(userId));
  const local = (kv?.value as ProfileLocal | undefined) ?? null;
  if (!online()) return local?.usualGrocerId ?? null;
  if (local?.pending) {
    await flushUsualGrocer(userId);
    return local.usualGrocerId;
  }
  try {
    const row = await run<{ usual_grocer_id: string | null } | null>(
      db.from('navy_client_profiles').select('usual_grocer_id').eq('user_id', userId).maybeSingle(),
      'navy-client-profile'
    );
    const id = row?.usual_grocer_id ?? null;
    await navyDb.kv.put({ key: profileKey(userId), value: { usualGrocerId: id, pending: false } satisfies ProfileLocal });
    return id;
  } catch {
    return local?.usualGrocerId ?? null;
  }
}

/** Save the usual grocer: on the phone at once, then on the server (kept if offline). */
export async function setUsualGrocer(userId: string, grocerId: string | null): Promise<'sent' | 'queued' | 'error'> {
  await navyDb.kv.put({ key: profileKey(userId), value: { usualGrocerId: grocerId, pending: true } satisfies ProfileLocal });
  return flushUsualGrocer(userId);
}

export async function flushUsualGrocer(userId: string): Promise<'sent' | 'queued' | 'error'> {
  const kv = await navyDb.kv.get(profileKey(userId));
  const local = (kv?.value as ProfileLocal | undefined) ?? null;
  if (!local?.pending) return 'sent';
  if (!online()) return 'queued';
  try {
    await run(
      db.from('navy_client_profiles').upsert({ user_id: userId, usual_grocer_id: local.usualGrocerId }, { onConflict: 'user_id' }),
      'navy-client-profile-save'
    );
    await navyDb.kv.put({ key: profileKey(userId), value: { usualGrocerId: local.usualGrocerId, pending: false } satisfies ProfileLocal });
    return 'sent';
  } catch (err) {
    if (isNetworkError(err)) return 'queued';
    // Refused (grocer no longer approved): the phone copy goes back to the server's.
    await navyDb.kv.delete(profileKey(userId));
    return 'error';
  }
}

/** "Plus tard" on the proposal made after a first withdrawal. */
export async function usualGrocerProposalDismissed(userId: string): Promise<boolean> {
  return !!(await navyDb.kv.get(dismissKey(userId)))?.value;
}

export async function dismissUsualGrocerProposal(userId: string): Promise<void> {
  await navyDb.kv.put({ key: dismissKey(userId), value: true });
}
