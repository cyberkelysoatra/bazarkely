/**
 * NAVY ay profile of the signed-in account (phase 1A): own partner rows, drafts not
 * sent yet, operator flag, suggested fares. Tiny external store (same approach as
 * modulePrefsSync) read by the UI through useNavyProfile().
 *
 * Everything here is first read from the device (NavyAyDB) so it shows offline, then
 * refreshed from Supabase in the background by partnerService.refreshNavyProfile().
 */
import { useSyncExternalStore } from 'react';
import type { NavyPartnerRow, NavySettings, PartnerDraft } from '../types/partner';

export interface NavyProfileState {
  userId: string | null;
  /** Local copy read from the device. */
  loadedLocal: boolean;
  /** Partner rows known from a server answer (now or in a previous session). */
  partnersKnown: boolean;
  /** Server refresh done during THIS session (operator flag included). */
  serverChecked: boolean;
  refreshing: boolean;
  partners: NavyPartnerRow[];
  drafts: PartnerDraft[];
  /** null = never confirmed by the server. */
  isOperator: boolean | null;
  settings: NavySettings | null;
  /** Operator badge: requests waiting for a decision (null = unknown). */
  pendingCount: number | null;
  /** Account has pending settings edits (is_open / fees) not on the server yet. */
  pendingPatchIds: string[];
}

const initial: NavyProfileState = {
  userId: null,
  loadedLocal: false,
  partnersKnown: false,
  serverChecked: false,
  refreshing: false,
  partners: [],
  drafts: [],
  isOperator: null,
  settings: null,
  pendingCount: null,
  pendingPatchIds: [],
};

let state: NavyProfileState = initial;
const listeners = new Set<() => void>();

export function getNavyProfile(): NavyProfileState {
  return state;
}

export function setNavyProfile(next: Partial<NavyProfileState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function resetNavyProfile(userId: string | null) {
  state = { ...initial, userId };
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useNavyProfile(): NavyProfileState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
