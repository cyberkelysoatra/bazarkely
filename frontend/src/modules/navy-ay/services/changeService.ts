/**
 * NAVY ay — change requests of a validated partner (phase 1B): new name, shop,
 * vehicle, plate, NIF holder, NIF, statistical card, new photos. The request goes back
 * to an operator; the current profile stays active until it is approved.
 *
 * Sending needs the network (photos + request), but it is replay-safe: the request
 * id is created once and kept on the phone until the server has it, photos go to fixed
 * paths ({user}/{partner}/chg-{id}/{slot}.jpg, upsert) and the RPC is idempotent on
 * the id. The last known request is kept on the phone for offline display.
 *
 * SENSITIVE PERSONAL DATA: photos go to the PRIVATE bucket `navy-documents` only.
 */
import { supabase, withTimeout } from '../../../lib/supabase';
import { navyDb } from '../db/navyDb';
import type { NavyPartnerChangeRow, NavyPartnerRow, PartnerChangeFields, PhotoSlot } from '../types/partner';
import { SLOT_COLUMN } from '../utils/partnerRules';
import { NAVY_BUCKET } from './partnerService';

const db = supabase as any;
const idKey = (userId: string, partnerId: string) => `${userId}:changeId:${partnerId}`;
const lastKey = (userId: string, partnerId: string) => `${userId}:lastChange:${partnerId}`;

export function changePhotoPath(userId: string, partnerId: string, changeId: string, slot: PhotoSlot): string {
  return `${userId}/${partnerId}/chg-${changeId}/${slot}.jpg`;
}

/** Request id reused at every attempt until the server has the request. */
async function stableChangeId(userId: string, partnerId: string): Promise<string> {
  const kv = await navyDb.kv.get(idKey(userId, partnerId));
  if (typeof kv?.value === 'string') return kv.value;
  const id = crypto.randomUUID();
  await navyDb.kv.put({ key: idKey(userId, partnerId), value: id });
  return id;
}

/** Last change request of this partner: phone copy, then the server when online. */
export async function getMyLastChange(userId: string, partnerId: string): Promise<NavyPartnerChangeRow | null> {
  let local: NavyPartnerChangeRow | null = null;
  try {
    local = ((await navyDb.kv.get(lastKey(userId, partnerId)))?.value as NavyPartnerChangeRow | undefined) ?? null;
  } catch {
    /* none */
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;
  try {
    const { data, error } = (await withTimeout(
      db.from('navy_partner_changes').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(1),
      6000,
      'navy-my-change'
    )) as any;
    if (error) return local;
    const row = (data?.[0] as NavyPartnerChangeRow | undefined) ?? null;
    if (row) await navyDb.kv.put({ key: lastKey(userId, partnerId), value: row });
    else await navyDb.kv.delete(lastKey(userId, partnerId));
    return row;
  } catch {
    return local;
  }
}

/** Upload the new photos, then send the request (idempotent). */
export async function submitPartnerChange(
  userId: string,
  partner: NavyPartnerRow,
  fields: PartnerChangeFields,
  photos: Partial<Record<PhotoSlot, Blob>>
): Promise<NavyPartnerChangeRow> {
  const id = await stableChangeId(userId, partner.id);
  const changes: Record<string, unknown> = { ...fields };
  for (const [slot, blob] of Object.entries(photos) as [PhotoSlot, Blob][]) {
    if (!blob) continue;
    const path = changePhotoPath(userId, partner.id, id, slot);
    const { error } = (await withTimeout(
      db.storage.from(NAVY_BUCKET).upload(path, blob, { upsert: true, contentType: 'image/jpeg', cacheControl: '60' }),
      45000,
      `navy-change-upload-${slot}`
    )) as any;
    if (error) throw error;
    changes[SLOT_COLUMN[slot] as string] = path;
  }
  const { data, error } = (await withTimeout(
    db.rpc('navy_request_partner_change', { p_id: id, p_partner_id: partner.id, p_changes: changes }),
    10000,
    'navy-change-request'
  )) as any;
  if (error) throw error;
  const row = data as NavyPartnerChangeRow;
  await navyDb.kv.put({ key: lastKey(userId, partner.id), value: row });
  // The server has it: the next request will get a new id.
  await navyDb.kv.delete(idKey(userId, partner.id));
  return row;
}

/** Plain-French message for a failed change request. */
export function changeErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String((err as any)?.message ?? err ?? '');
  if (/timeout|Failed to fetch|NetworkError|Load failed/i.test(msg)) {
    return 'Le réseau ne répond pas. Rien n’est perdu : réessayez dans un instant.';
  }
  if (/nothing to change/i.test(msg)) return 'Vous n’avez rien modifié.';
  if (/duplicate key|one_pending/i.test(msg)) return 'Une demande de modification est déjà en attente.';
  if ((err as any)?.code === '42501') return 'Cette demande n’est pas possible pour ce profil.';
  return 'La demande n’a pas abouti. Réessayez dans un instant.';
}
