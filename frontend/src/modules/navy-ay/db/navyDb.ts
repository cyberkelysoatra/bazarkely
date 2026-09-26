/**
 * NAVY ay local database (Dexie, same pattern as GestionEauDB) — phase 1A.
 *
 * - partners: the signed-in account's OWN partner rows (requests, status, fees,
 *   is_open), shown offline and refreshed in the background.
 * - drafts: request forms kept on the device until the server has them, WITH the
 *   compressed photos (Blob). SENSITIVE PERSONAL DATA (identity documents): never
 *   synced anywhere else than the private bucket `navy-documents`, deleted once sent.
 * - pendingPatches: settings edits (is_open, fees) waiting for the network.
 * - kv: small cached values (settings, operator flag), per user.
 *
 * Never used for operator data (other people's requests): those screens are online.
 */
import Dexie, { type Table } from 'dexie';
import type { NavyPartnerRow, NavyPartnerSettingsPatch, PartnerDraft } from '../types/partner';
import type { NavyParcelRow, ParcelCodes, ParcelQueueEntry } from '../types/parcel';

/**
 * Phase 2A: parcels the account is involved in (sender, recipient, grocer, driver) as
 * last read from the server, so lists and tracking stay readable offline. `scope`
 * tells in which list the row was seen. Amounts and the withdrawal code are NOT here:
 * the codes of the account's own orders live in `parcelCodes` (sender only).
 */
export interface NavyParcelLocal extends NavyParcelRow {
  /** Account that read the row (a shared phone never mixes two accounts). */
  ownerUserId: string;
  /** Row kept locally without server confirmation yet (order queued offline). */
  localOnly?: boolean;
}

export interface NavyPendingPatch {
  /** partner id */
  id: string;
  userId: string;
  patch: NavyPartnerSettingsPatch;
  updatedAt: string;
}

export interface NavyKv {
  key: string;
  value: unknown;
}

export class NavyAyDB extends Dexie {
  partners!: Table<NavyPartnerRow, string>;
  drafts!: Table<PartnerDraft, string>;
  pendingPatches!: Table<NavyPendingPatch, string>;
  kv!: Table<NavyKv, string>;
  parcels!: Table<NavyParcelLocal, [string, string]>;
  parcelQueue!: Table<ParcelQueueEntry, string>;
  parcelCodes!: Table<ParcelCodes & { userId: string }, string>;

  constructor() {
    super('NavyAyDB');
    this.version(1).stores({
      partners: 'id, user_id, [user_id+kind]',
      drafts: 'id, userId, [userId+kind]',
      pendingPatches: 'id, userId',
      kv: 'key',
    });
    // Phase 2A: parcels (additive: existing stores unchanged).
    this.version(2).stores({
      partners: 'id, user_id, [user_id+kind]',
      drafts: 'id, userId, [userId+kind]',
      pendingPatches: 'id, userId',
      kv: 'key',
      parcels: '[ownerUserId+id], ownerUserId, id',
      parcelQueue: 'id, userId',
      parcelCodes: 'parcelId, userId',
    });
  }
}

export const navyDb = new NavyAyDB();
