// Other modules of the signed-in account (VALIDCLIENT-CC-11, VC-45), for the header logo.
// Read from the account's own `users` row (role, preferences), read only, with the module's
// Supabase client: the one exception to « vc_* only », same as PUDi. The last known list is kept
// on the phone (key `modules`), so an offline start uses it; refreshed quietly at each online start.
import { useSyncExternalStore } from 'react';
import { getSupabase, withTimeout } from './supabaseClient';
import { ecrireLocal, lireLocal } from './local';
import { modulesDesIds, modulesDuCompte, type CompteModules, type ModuleHote } from '../utils/modulesCompte';

interface Garde {
  uid: string;
  ids: string[];
}

let courant: { uid: string; modules: ModuleHote[] | null } = { uid: '', modules: null };
const abonnes = new Set<() => void>();
const notifier = () => abonnes.forEach((f) => f());

function poser(uid: string, modules: ModuleHote[] | null) {
  courant = { uid, modules };
  notifier();
}

/** Reads the `users` row of `uid`; resolves null when unknown (network, timeout, no row). */
async function lireServeur(uid: string): Promise<ModuleHote[] | null> {
  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
    const sb = await withTimeout(getSupabase());
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
  void ecrireLocal('modules', { uid, ids: modules.map((m) => m.id) } satisfies Garde);
}

/** Start (or sign-in, sign-out): the list kept on the phone first, then the server. */
export async function demarrerModules(uid: string): Promise<void> {
  if (uid === courant.uid) return;
  poser(uid, null);
  if (!uid) return;
  const garde = await lireLocal<Garde>('modules');
  if (courant.uid !== uid) return;
  if (garde?.uid === uid && !courant.modules) {
    const modules = modulesDesIds(garde.ids);
    if (modules) poser(uid, modules);
  }
  await rafraichirModules(uid);
}

/** Known list of the signed-in account, null while unknown. */
export function useModulesCompte(uid: string): ModuleHote[] | null {
  const etat = useSyncExternalStore(
    (f) => {
      abonnes.add(f);
      return () => abonnes.delete(f);
    },
    () => courant,
    () => courant
  );
  return etat.uid && etat.uid === uid ? etat.modules : null;
}
