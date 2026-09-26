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
  NavyDistanceStatus,
  NavyDriverStatusRow,
  NavyOperatorEntry,
  NavyPartnerChangeRow,
  NavyPartnerRow,
  NavyPurgeItem,
  NavySettings,
  PartnerKind,
  PartnerStatus,
} from '../types/partner';
import { NAVY_BUCKET, refreshPendingCount } from './partnerService';

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

export type Decision = 'approve' | 'reject' | 'suspend' | 'reactivate' | 'end';

/**
 * Operator decision. `final` (refusal only): the documents are deleted at once and the
 * request cannot be sent again; otherwise the person corrects and sends it back.
 */
export async function decidePartner(id: string, decision: Decision, reason?: string, final = false): Promise<NavyPartnerRow> {
  const row = await run<NavyPartnerRow>(
    db.rpc('navy_decide_partner', { p_id: id, p_decision: decision, p_reason: reason ?? null, p_final: final }),
    'navy-op-decide'
  );
  void refreshPendingCount();
  // Final refusal: delete the documents right away (they are queued and due now).
  if (decision === 'reject' && final) await purgeDueDocuments().catch(() => undefined);
  return row;
}

// ------------------------------------------------------------------ phase 1B

/** Shop position checked on site: stamped and frozen. */
export function verifyShopLocation(id: string): Promise<NavyPartnerRow> {
  return run<NavyPartnerRow>(db.rpc('navy_verify_shop_location', { p_id: id }), 'navy-op-verify-location');
}

export type ChangeWithPartner = NavyPartnerChangeRow & { partner: NavyPartnerRow | null };

export function listChanges(status: NavyPartnerChangeRow['status'] = 'pending'): Promise<ChangeWithPartner[]> {
  return run<ChangeWithPartner[]>(
    db.from('navy_partner_changes').select('*, partner:navy_partners(*)').eq('status', status).order('created_at', { ascending: true }),
    'navy-op-changes'
  );
}

export async function getChange(id: string): Promise<ChangeWithPartner | null> {
  return run<ChangeWithPartner | null>(
    db.from('navy_partner_changes').select('*, partner:navy_partners(*)').eq('id', id).maybeSingle(),
    'navy-op-change'
  );
}

export async function decideChange(id: string, decision: 'approve' | 'reject', reason?: string): Promise<NavyPartnerChangeRow> {
  const row = await run<NavyPartnerChangeRow>(
    db.rpc('navy_decide_partner_change', { p_id: id, p_decision: decision, p_reason: reason ?? null }),
    'navy-op-change-decide'
  );
  void refreshPendingCount();
  // Replaced / unused photos are queued and due now: delete them right away.
  await purgeDueDocuments().catch(() => undefined);
  return row;
}

/** Drivers' status rows with their partner (operator). */
export type DriverWithPartner = NavyDriverStatusRow & { partner: NavyPartnerRow | null };

export function listDriverStatuses(): Promise<DriverWithPartner[]> {
  return run<DriverWithPartner[]>(
    db.from('navy_driver_status').select('*, partner:navy_partners(*)').eq('available', true).order('updated_at', { ascending: false }),
    'navy-op-drivers'
  );
}

/** Documents due for deletion (not deleted yet). */
export function listDueDocuments(): Promise<NavyPurgeItem[]> {
  return run<NavyPurgeItem[]>(db.rpc('navy_purge_documents'), 'navy-op-purge-list');
}

/**
 * Delete the due documents from the private bucket (Storage API: the storage policy
 * only lets an operator delete a queued, due path), then let the server confirm and
 * mark what is really gone. Returns the paths deleted.
 */
export async function purgeDueDocuments(): Promise<string[]> {
  const due = await listDueDocuments();
  if (!due.length) return [];
  const paths = due.map((d) => d.path);
  for (let i = 0; i < paths.length; i += 50) {
    const { error } = (await withTimeout(db.storage.from(NAVY_BUCKET).remove(paths.slice(i, i + 50)), 15000, 'navy-op-purge-remove')) as any;
    if (error) throw error;
  }
  return run<string[]>(db.rpc('navy_mark_documents_purged', { p_paths: paths }), 'navy-op-purge-mark');
}

export function getSettings(): Promise<NavySettings | null> {
  return run<NavySettings | null>(db.from('navy_settings').select('*').eq('id', true).maybeSingle(), 'navy-op-settings');
}

export function updateSettings(patch: Partial<NavySettings>): Promise<NavySettings> {
  const clean: Record<string, number | string | null> = {};
  for (const k of ['suggested_min_fare', 'suggested_fare_per_5km', 'suggested_depot_fee', 'suggested_pickup_fee', 'cyberkely_share', 'orange_money_number', 'corridor_width_m'] as const) {
    if (k in patch) clean[k] = (patch as any)[k];
  }
  return run<NavySettings>(db.from('navy_settings').update(clean).eq('id', true).select('*').single(), 'navy-op-settings-save');
}

// ------------------------------------------------------------------ phase 2B1

/** Road distances follow-up: last computation, pairs, requests of the month. */
export function distanceStatus(): Promise<NavyDistanceStatus> {
  return run<NavyDistanceStatus>(db.rpc('navy_distance_status'), 'navy-op-distances');
}

/** "Recalculer les distances": ONE Matrix request for every grocer (server side). */
export function requestDistanceRefresh(): Promise<NavyDistanceStatus> {
  return run<NavyDistanceStatus>(db.rpc('navy_request_distance_refresh'), 'navy-op-distances-refresh');
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
