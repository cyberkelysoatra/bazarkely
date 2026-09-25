/**
 * NAVY ay — partner profile of the signed-in account (phase 1A), offline-first.
 *
 * Reads: device first (NavyAyDB), then a background refresh from Supabase
 * (withTimeout on every call). Writes:
 * - a request (grocer / driver) is a DRAFT kept on the device with its photos. Its id
 *   is created once on the phone and reused at every attempt: photos go to fixed
 *   paths ({user}/{partner}/{slot}.jpg, upsert) and the row is written with an
 *   upsert on that id → a replay after a timeout never creates a duplicate;
 * - shop / vehicle settings (is_open, fees) are applied locally at once, queued, and
 *   sent as an UPDATE (idempotent by nature).
 * A timeout is NOT a failure: the work stays queued and is replayed.
 *
 * SENSITIVE PERSONAL DATA: identity documents go to the PRIVATE bucket
 * `navy-documents` only; drafts are deleted from the device once sent.
 * Never uses supabase.auth.getUser() (network call, fails offline).
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type {
  NavyPartnerRow,
  NavyPartnerSettingsPatch,
  NavySettings,
  PartnerDraft,
  PartnerFormFields,
  PartnerKind,
  PhotoSlot,
} from '../types/partner';
import { documentPath, normalizePlate, SLOT_COLUMN } from '../utils/partnerRules';
import { getNavyProfile, resetNavyProfile, setNavyProfile } from './navyProfileStore';
import { flushDriverStatus } from './driverService';

// The generated Database type does not know the navy_* tables yet.
const db = supabase as any;

export const NAVY_BUCKET = 'navy-documents';
const REFERRER_KEY = 'navy_referrer_partner_id';

const kvKey = (userId: string, name: string) => `${userId}:${name}`;

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function newId(): string {
  return crypto.randomUUID();
}

function errText(err: unknown): string {
  if (!err) return 'Erreur inconnue';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in (err as any)) return String((err as any).message);
  return String(err);
}

function isTimeout(err: unknown): boolean {
  return /timeout|timed out|Failed to fetch|NetworkError|Load failed/i.test(errText(err));
}

// ------------------------------------------------------------------ local load

async function readLocal(userId: string) {
  const [partners, drafts, patches, op, known, settings] = await Promise.all([
    navyDb.partners.where('user_id').equals(userId).toArray(),
    navyDb.drafts.where('userId').equals(userId).toArray(),
    navyDb.pendingPatches.where('userId').equals(userId).toArray(),
    navyDb.kv.get(kvKey(userId, 'isOperator')),
    navyDb.kv.get(kvKey(userId, 'partnersKnown')),
    navyDb.kv.get('settings'),
  ]);
  return {
    partners,
    drafts,
    pendingPatchIds: patches.map((p) => p.id),
    isOperator: typeof op?.value === 'boolean' ? (op.value as boolean) : null,
    partnersKnown: known?.value === true,
    settings: (settings?.value as NavySettings | undefined) ?? null,
  };
}

/** Load the device copy for this account (instant, offline). */
export async function loadNavyProfile(userId: string): Promise<void> {
  if (getNavyProfile().userId !== userId) resetNavyProfile(userId);
  try {
    const local = await readLocal(userId);
    if (getNavyProfile().userId !== userId) return;
    // A background refresh follows right away when online: flag it now so route guards
    // wait for it instead of deciding on the cached copy alone.
    setNavyProfile({ ...local, loadedLocal: true, refreshing: isOnline() });
  } catch (err) {
    console.warn('⚠️ [navy] local profile unreadable:', errText(err));
    setNavyProfile({ loadedLocal: true });
  }
}

async function reloadLocal(userId: string) {
  const local = await readLocal(userId);
  if (getNavyProfile().userId === userId) setNavyProfile(local);
}

// ------------------------------------------------------------------ server refresh

let refreshInFlight: Promise<void> | null = null;

/**
 * Background refresh: own partner rows, operator flag, suggested fares. Then replays
 * whatever is queued (drafts, settings edits) and the referral, if any.
 */
export function refreshNavyProfile(userId: string): Promise<void> {
  if (!userId || !isOnline()) return Promise.resolve();
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    setNavyProfile({ refreshing: true });
    try {
      await flushNavyQueue(userId);

      const [partnersRes, opRes, settingsRes] = await Promise.allSettled([
        withTimeout(db.from('navy_partners').select('*').eq('user_id', userId) as Promise<any>, 8000, 'navy-partners'),
        withTimeout(db.rpc('navy_is_operator') as Promise<any>, 6000, 'navy-is-operator'),
        withTimeout(db.from('navy_settings').select('*').eq('id', true).maybeSingle() as Promise<any>, 6000, 'navy-settings'),
      ]);

      if (partnersRes.status === 'fulfilled' && !partnersRes.value.error && Array.isArray(partnersRes.value.data)) {
        const rows = partnersRes.value.data as NavyPartnerRow[];
        const patches = await navyDb.pendingPatches.where('userId').equals(userId).toArray();
        // Settings edits not on the server yet stay visible on top of the server copy.
        const merged = rows.map((r) => {
          const p = patches.find((x) => x.id === r.id);
          return p ? { ...r, ...p.patch } : r;
        });
        await navyDb.transaction('rw', navyDb.partners, navyDb.kv, async () => {
          await navyDb.partners.bulkPut(merged);
          await navyDb.kv.put({ key: kvKey(userId, 'partnersKnown'), value: true });
        });
      }
      if (opRes.status === 'fulfilled' && !opRes.value.error && typeof opRes.value.data === 'boolean') {
        await navyDb.kv.put({ key: kvKey(userId, 'isOperator'), value: opRes.value.data });
      }
      if (settingsRes.status === 'fulfilled' && !settingsRes.value.error && settingsRes.value.data) {
        await navyDb.kv.put({ key: 'settings', value: settingsRes.value.data });
      }

      await reloadLocal(userId);
      const checked = partnersRes.status === 'fulfilled' && !partnersRes.value.error
        && opRes.status === 'fulfilled' && !opRes.value.error;
      if (getNavyProfile().userId === userId) setNavyProfile({ serverChecked: checked || getNavyProfile().serverChecked });

      await recordPendingReferral();
      if (getNavyProfile().isOperator) void refreshPendingCount();
    } catch (err) {
      console.warn('⚠️ [navy] profile refresh deferred:', errText(err));
    } finally {
      setNavyProfile({ refreshing: false });
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

/** Operator badge: number of requests waiting for a decision. */
export async function refreshPendingCount(): Promise<void> {
  if (!isOnline()) return;
  try {
    // New requests + change requests of validated partners (phase 1B).
    const [partnersRes, changesRes] = (await Promise.all([
      withTimeout(
        db.from('navy_partners').select('id', { count: 'exact', head: true }).eq('status', 'pending') as Promise<any>,
        6000,
        'navy-pending-count'
      ),
      withTimeout(
        db.from('navy_partner_changes').select('id', { count: 'exact', head: true }).eq('status', 'pending') as Promise<any>,
        6000,
        'navy-pending-changes-count'
      ),
    ])) as any[];
    if (!partnersRes.error && typeof partnersRes.count === 'number') {
      const changes = !changesRes.error && typeof changesRes.count === 'number' ? changesRes.count : 0;
      setNavyProfile({ pendingCount: partnersRes.count + changes });
    }
  } catch {
    /* badge stays as it was */
  }
}

// ------------------------------------------------------------------ drafts (requests)

/** Draft of this kind for the account (new request or correction). */
export async function getDraft(userId: string, kind: PartnerKind): Promise<PartnerDraft | undefined> {
  return navyDb.drafts.where('[userId+kind]').equals([userId, kind]).first();
}

/**
 * Save the form on the device (called on every change, debounced by the page). For a
 * correction the draft reuses the id of the existing request.
 */
export async function saveDraft(
  userId: string,
  kind: PartnerKind,
  fields: PartnerFormFields,
  photos: Partial<Record<PhotoSlot, Blob>>,
  existingId?: string,
  changedSlots: PhotoSlot[] = []
): Promise<PartnerDraft> {
  const current = await getDraft(userId, kind);
  const draft: PartnerDraft = {
    id: current?.id ?? existingId ?? newId(),
    userId,
    kind,
    fields,
    photos,
    // A replaced (or removed) photo must be uploaded again.
    uploaded: (current?.uploaded ?? []).filter((s) => !changedSlots.includes(s) && !!photos[s]),
    state: current?.state === 'queued' ? 'queued' : 'editing',
    lastError: current?.lastError ?? null,
    updatedAt: new Date().toISOString(),
  };
  await navyDb.drafts.put(draft);
  await reloadLocal(userId);
  return draft;
}

export async function discardDraft(userId: string, kind: PartnerKind): Promise<void> {
  const d = await getDraft(userId, kind);
  if (d) await navyDb.drafts.delete(d.id);
  await reloadLocal(userId);
}

export type SubmitResult =
  | { status: 'sent'; row: NavyPartnerRow }
  | { status: 'queued'; reason: 'offline' | 'timeout' }
  | { status: 'error'; message: string };

/** Mark the draft as "to send" and try right away (sent later if offline). */
export async function submitDraft(userId: string, kind: PartnerKind): Promise<SubmitResult> {
  const d = await getDraft(userId, kind);
  if (!d) return { status: 'error', message: 'Brouillon introuvable' };
  await navyDb.drafts.update(d.id, { state: 'queued', lastError: null });
  await reloadLocal(userId);
  if (!isOnline()) return { status: 'queued', reason: 'offline' };
  return sendDraft(d.id);
}

function writablePayload(d: PartnerDraft, uploadedPaths: Partial<Record<PhotoSlot, string>>) {
  const f = d.fields;
  const base: Record<string, unknown> = {
    id: d.id,
    user_id: d.userId,
    kind: d.kind,
    display_name: f.display_name.trim(),
    phone: f.phone.replace(/\s+/g, ' ').trim(),
    nif: f.nif.trim(),
  };
  if (d.kind === 'epicier') {
    base.shop_name = f.shop_name.trim();
    base.stat_number = f.stat_number.trim();
    // Phase 1B: shop position (the server computes the zone). Left out when unknown so
    // an older draft never erases a position already on the server.
    if (f.shop_lat != null && f.shop_lng != null) {
      base.shop_lat = f.shop_lat;
      base.shop_lng = f.shop_lng;
    }
  } else {
    base.vehicle_type = f.vehicle_type || null;
    base.vehicle_plate = normalizePlate(f.vehicle_plate) || null;
    base.nif_holder_type = f.nif_holder_type;
    base.nif_holder_name = f.nif_holder_type === 'self' ? null : f.nif_holder_name.trim();
  }
  for (const [slot, path] of Object.entries(uploadedPaths)) {
    base[SLOT_COLUMN[slot as PhotoSlot] as string] = path;
  }
  return base;
}

const sending = new Set<string>();

/** Upload the photos then upsert the row (idempotent on the client id). */
async function sendDraft(draftId: string, retriedConflict = false): Promise<SubmitResult> {
  if (sending.has(draftId)) return { status: 'queued', reason: 'timeout' };
  sending.add(draftId);
  let d = await navyDb.drafts.get(draftId);
  try {
    if (!d) return { status: 'error', message: 'Brouillon introuvable' };

    // 1. Photos → fixed paths (upsert), skipped when already uploaded on a previous try.
    const paths: Partial<Record<PhotoSlot, string>> = {};
    for (const [slot, blob] of Object.entries(d.photos) as [PhotoSlot, Blob][]) {
      const path = documentPath(d.userId, d.id, slot);
      paths[slot] = path;
      if (d.uploaded.includes(slot)) continue;
      const { error } = (await withTimeout(
        db.storage.from(NAVY_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' }),
        45000,
        `navy-upload-${slot}`
      )) as any;
      if (error) throw error;
      d = { ...d, uploaded: [...d.uploaded, slot] };
      await navyDb.drafts.update(d.id, { uploaded: d.uploaded });
    }

    // 2. Row → upsert on the client id.
    const { data, error } = (await withTimeout(
      db.from('navy_partners').upsert(writablePayload(d, paths), { onConflict: 'id' }).select('*').single(),
      10000,
      'navy-partner-upsert'
    )) as any;
    if (error) {
      // Another device already created this kind of request: adopt its id, retry once.
      if (error.code === '23505' && !retriedConflict) {
        const { data: existing } = (await withTimeout(
          db.from('navy_partners').select('id').eq('user_id', d.userId).eq('kind', d.kind).maybeSingle(),
          6000,
          'navy-partner-conflict'
        )) as any;
        if (existing?.id && existing.id !== d.id) {
          await navyDb.drafts.delete(d.id);
          await navyDb.drafts.put({ ...d, id: existing.id, uploaded: [] });
          sending.delete(draftId);
          return sendDraft(existing.id, true);
        }
      }
      throw error;
    }
    let row = data as NavyPartnerRow;

    // 3. Correction of a refused request → back to "pending" (idempotent RPC).
    if (row.status === 'rejected') {
      const res = (await withTimeout(db.rpc('navy_resubmit_partner', { p_id: row.id }), 8000, 'navy-resubmit')) as any;
      if (res.error) throw res.error;
      if (res.data) row = res.data as NavyPartnerRow;
    }

    await navyDb.transaction('rw', navyDb.partners, navyDb.drafts, navyDb.kv, async () => {
      await navyDb.partners.put(row);
      await navyDb.drafts.delete(row.id);
      await navyDb.kv.put({ key: kvKey(row.user_id, 'partnersKnown'), value: true });
    });
    await reloadLocal(row.user_id);
    return { status: 'sent', row };
  } catch (err) {
    const timeout = isTimeout(err) || !isOnline();
    console.warn('⚠️ [navy] request not sent yet:', errText(err));
    if (d) {
      await navyDb.drafts.update(d.id, { lastError: timeout ? null : errText(err) });
      await reloadLocal(d.userId);
    }
    return timeout ? { status: 'queued', reason: 'timeout' } : { status: 'error', message: errText(err) };
  } finally {
    sending.delete(draftId);
  }
}

// ------------------------------------------------------------------ shop / vehicle settings

/** Apply a settings edit locally at once, queue it, send it when possible. */
export async function updateMyPartnerSettings(
  userId: string,
  partnerId: string,
  patch: NavyPartnerSettingsPatch
): Promise<'sent' | 'queued'> {
  const existing = await navyDb.pendingPatches.get(partnerId);
  await navyDb.transaction('rw', navyDb.partners, navyDb.pendingPatches, async () => {
    const row = await navyDb.partners.get(partnerId);
    if (row) await navyDb.partners.put({ ...row, ...patch });
    await navyDb.pendingPatches.put({
      id: partnerId,
      userId,
      patch: { ...(existing?.patch ?? {}), ...patch },
      updatedAt: new Date().toISOString(),
    });
  });
  await reloadLocal(userId);
  if (!isOnline()) return 'queued';
  await flushPatches(userId);
  const still = await navyDb.pendingPatches.get(partnerId);
  return still ? 'queued' : 'sent';
}

async function flushPatches(userId: string) {
  const patches = await navyDb.pendingPatches.where('userId').equals(userId).toArray();
  for (const p of patches) {
    try {
      const { data, error } = (await withTimeout(
        db.from('navy_partners').update(p.patch).eq('id', p.id).select('*').single(),
        8000,
        'navy-partner-settings'
      )) as any;
      if (error) throw error;
      // Remove only if no newer edit was queued meanwhile.
      const current = await navyDb.pendingPatches.get(p.id);
      if (current && current.updatedAt === p.updatedAt) {
        await navyDb.pendingPatches.delete(p.id);
        if (data) await navyDb.partners.put(data as NavyPartnerRow);
      }
    } catch (err) {
      // Refused for good (e.g. shop position verified on site, hence frozen): drop the
      // edit and take the server copy back, instead of retrying forever.
      if ((err as any)?.code === '42501') {
        await navyDb.pendingPatches.delete(p.id);
        try {
          const { data } = (await withTimeout(
            db.from('navy_partners').select('*').eq('id', p.id).maybeSingle(),
            6000,
            'navy-partner-reload'
          )) as any;
          if (data) await navyDb.partners.put(data as NavyPartnerRow);
        } catch {
          /* refreshed later */
        }
      }
      console.warn('⚠️ [navy] settings not sent yet:', errText(err));
    }
  }
  await reloadLocal(userId);
}

let flushing = false;
/** Replay queued drafts and settings edits (on start, when back online, on demand). */
export async function flushNavyQueue(userId: string): Promise<void> {
  if (!userId || !isOnline() || flushing) return;
  flushing = true;
  try {
    const drafts = await navyDb.drafts.where('userId').equals(userId).toArray();
    for (const d of drafts) {
      if (d.state === 'queued') await sendDraft(d.id);
    }
    await flushPatches(userId);
    await flushDriverStatus(userId);
  } finally {
    flushing = false;
  }
}

// ------------------------------------------------------------------ referral

/** Remember the referring partner (from the public QR page) until sign-in. */
export function rememberReferrer(partnerId: string) {
  try {
    localStorage.setItem(REFERRER_KEY, partnerId);
  } catch {
    /* private mode */
  }
}

/** Record the referral once, after sign-in (server ignores a second attempt). */
export async function recordPendingReferral(): Promise<void> {
  let referrer: string | null = null;
  try {
    referrer = localStorage.getItem(REFERRER_KEY);
  } catch {
    return;
  }
  if (!referrer || !isOnline()) return;
  try {
    const { error } = (await withTimeout(
      db.rpc('navy_record_referral', { p_referrer_partner_id: referrer }),
      6000,
      'navy-referral'
    )) as any;
    // Recorded, already recorded, or not a valid referrer: nothing more to do.
    if (!error || error.code === '22P02') localStorage.removeItem(REFERRER_KEY);
  } catch {
    /* retried at the next refresh */
  }
}

// ------------------------------------------------------------------ helpers for screens

/** Short-lived signed URLs of documents (owner or operator only, enforced by storage RLS). */
export async function signedDocumentUrls(paths: string[], seconds = 600): Promise<Record<string, string>> {
  const list = paths.filter(Boolean);
  if (!list.length) return {};
  const { data, error } = (await withTimeout(
    db.storage.from(NAVY_BUCKET).createSignedUrls(list, seconds),
    10000,
    'navy-signed-urls'
  )) as any;
  if (error) throw error;
  const out: Record<string, string> = {};
  for (const item of data ?? []) if (item?.path && item?.signedUrl) out[item.path] = item.signedUrl;
  return out;
}
