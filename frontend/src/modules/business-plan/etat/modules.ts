// Other modules of the signed-in account (NEC-CC-06), for the B-lossom logo of the header. Pattern of
// src/modules/validation/appels/modules.ts and session.ts, never imported from them.
// - Whether someone is signed in is read ONLY from the shared host session kept in localStorage: no
//   session kept (every participant) → no list, inert logo, and Supabase is never loaded.
// - Session kept: the list kept on the phone (key `nec.modules`, with the account id) first, then a
//   quiet read of the account's own `users` row (role, preferences) with the trainer client (same
//   shared session), kept again under `nec.modules`.
import { useEffect, useSyncExternalStore } from 'react';
import { SESSION_STORAGE_KEY, clientFormateur, withTimeout } from '../sync/supabase';
import { modulesDesIds, modulesDuCompte, type CompteModules, type ModuleHote } from '../utils/modulesCompte';

const CLE = 'nec.modules';

interface Garde {
  uid: string;
  ids: string[];
}

/** Account id of the shared session kept on the phone, '' when none (no network). */
export function uidSession(): string {
  try {
    const brut = localStorage.getItem(SESSION_STORAGE_KEY);
    const s = brut ? (JSON.parse(brut) as { access_token?: string; user?: { id?: string } }) : null;
    return s?.access_token ? (s.user?.id ?? '') : '';
  } catch {
    return '';
  }
}

function lireGarde(uid: string): ModuleHote[] | null {
  try {
    const g = JSON.parse(localStorage.getItem(CLE) ?? 'null') as Garde | null;
    return g && g.uid === uid ? modulesDesIds(g.ids) : null;
  } catch {
    return null;
  }
}

function ecrireGarde(g: Garde): void {
  try {
    localStorage.setItem(CLE, JSON.stringify(g));
  } catch {
    // No storage: the list is simply read again next time.
  }
}

let courant: { uid: string; modules: ModuleHote[] | null } = { uid: '', modules: null };
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

function poser(uid: string, modules: ModuleHote[] | null) {
  courant = { uid, modules };
  notifier();
}

/** Reads the `users` row of `uid`; resolves null when unknown (offline, network, timeout, no row). */
async function lireServeur(uid: string): Promise<ModuleHote[] | null> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    const sb = await withTimeout(clientFormateur());
    const { data, error } = await withTimeout(sb.from('users').select('role, preferences').eq('id', uid).maybeSingle());
    if (error || !data) return null;
    return modulesDuCompte(data as CompteModules);
  } catch {
    return null;
  }
}

/** Quiet refresh from the server; keeps the known list when the server does not answer. */
export async function rafraichirModules(uid: string = courant.uid): Promise<void> {
  if (!uid) return;
  const modules = await lireServeur(uid);
  if (!modules || courant.uid !== uid) return;
  poser(uid, modules);
  ecrireGarde({ uid, ids: modules.map((m) => m.id) });
}

/** Start: nothing without a kept session; otherwise the kept list, then the server. */
function demarrer(): void {
  const uid = uidSession();
  if (uid === courant.uid) return;
  poser(uid, uid ? lireGarde(uid) : null);
  if (uid) void rafraichirModules(uid);
}

/** Known list of the signed-in account (other modules only), null while unknown or signed out. */
export function useModulesCompte(): ModuleHote[] | null {
  useEffect(() => {
    demarrer();
    const surStockage = (e: StorageEvent) => {
      if (e.key === null || e.key === SESSION_STORAGE_KEY) demarrer();
    };
    window.addEventListener('storage', surStockage);
    return () => window.removeEventListener('storage', surStockage);
  }, []);
  const etat = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => courant,
    () => courant
  );
  return etat.uid ? etat.modules : null;
}
