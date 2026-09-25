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

  constructor() {
    super('NavyAyDB');
    this.version(1).stores({
      partners: 'id, user_id, [user_id+kind]',
      drafts: 'id, userId, [userId+kind]',
      pendingPatches: 'id, userId',
      kv: 'key',
    });
  }
}

export const navyDb = new NavyAyDB();
