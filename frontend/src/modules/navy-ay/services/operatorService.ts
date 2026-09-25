/**
 * NAVY ay — operator workspace (phase 1A). ONLINE ONLY by design: other people's
 * requests, identity documents (signed URLs) and decisions are never cached on the
 * device. Every call is wrapped in withTimeout().
 *
 * Access is enforced by the server (RLS + navy_is_operator() inside the RPCs); the UI
 * route guard is only a convenience.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import type {
  NavyOperatorEntry,
  NavyPartnerRow,
  NavySettings,
  PartnerKind,
  PartnerStatus,
} from '../types/partner';
import { refreshPendingCount } from './partnerService';

const db = supabase as any;

async function run<T>(p: Promise<any>, label: string, ms = 8000): Promise<T> {
  const { data, error } = (await withTimeout(p, ms, label)) as any;
  if (error) throw error;
  return data as T;
}

export function listPartners(filter: { statuses: PartnerStatus[]; kind?: PartnerKind | 'all' }): Promise<NavyPartnerRow[]> {
  let q = db.from('navy_partners').select('*').in('status', filter.statuses).order('created_at', { ascending: true });
  if (filter.kind && filter.kind !== 'all') q = q.eq('kind', filter.kind);
  return run<NavyPartnerRow[]>(q, 'navy-op-list');
}

export async function getPartner(id: string): Promise<NavyPartnerRow | null> {
  return run<NavyPartnerRow | null>(db.from('navy_partners').select('*').eq('id', id).maybeSingle(), 'navy-op-get');
}

export type Decision = 'approve' | 'reject' | 'suspend' | 'reactivate';

export async function decidePartner(id: string, decision: Decision, reason?: string): Promise<NavyPartnerRow> {
  const row = await run<NavyPartnerRow>(
    db.rpc('navy_decide_partner', { p_id: id, p_decision: decision, p_reason: reason ?? null }),
    'navy-op-decide'
  );
  void refreshPendingCount();
  return row;
}

export function getSettings(): Promise<NavySettings | null> {
  return run<NavySettings | null>(db.from('navy_settings').select('*').eq('id', true).maybeSingle(), 'navy-op-settings');
}

export function updateSettings(patch: Partial<NavySettings>): Promise<NavySettings> {
  const clean: Record<string, number | null> = {};
  for (const k of ['suggested_min_fare', 'suggested_fare_per_5km', 'suggested_depot_fee', 'suggested_pickup_fee'] as const) {
    if (k in patch) clean[k] = (patch as any)[k];
  }
  return run<NavySettings>(db.from('navy_settings').update(clean).eq('id', true).select('*').single(), 'navy-op-settings-save');
}

export function listOperators(): Promise<NavyOperatorEntry[]> {
  return run<NavyOperatorEntry[]>(db.rpc('navy_list_operators'), 'navy-op-operators');
}

export async function findUserByEmail(email: string): Promise<{ user_id: string; email: string; username: string | null } | null> {
  const rows = await run<any[]>(db.rpc('navy_find_user_by_email', { p_email: email }), 'navy-op-find');
  return rows?.[0] ?? null;
}

export function designateOperator(userId: string): Promise<boolean> {
  return run<boolean>(db.rpc('navy_designate_operator', { p_user_id: userId }), 'navy-op-designate');
}

/** Plain-French message for a failed operator call (never a raw error). */
export function operatorErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String((err as any)?.message ?? err ?? '');
  const code = (err as any)?.code;
  if (/timeout|Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Le réseau ne répond pas. Vérifiez la connexion puis réessayez.';
  }
  if (code === '42501') return 'Cette action est réservée aux opératrices.';
  if (/not allowed from/i.test(msg)) return 'Cette demande a déjà changé d’état. Rechargez la liste.';
  if (/reason required/i.test(msg)) return 'Indiquez un motif.';
  return 'L’action n’a pas abouti. Réessayez dans un instant.';
}
