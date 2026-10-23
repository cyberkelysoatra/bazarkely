// PUDI-CC-14.2: unread dot of the account menu when an organisers' answer is waiting. Signed-in
// visitors only; checked on opening and at most once a minute while the page is visible and
// online. Plain fetch with the stored session (no supabase-js on the home page).
import { useEffect, useSyncExternalStore } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';
import { jetonLocal } from './api';

const INTERVALLE_MS = 60000;
let nonLu = false;
let derniereVerif = 0;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

/** The private messages page was opened (the server marked the answers read). */
export function marquerPriveLu(): void {
  if (!nonLu) return;
  nonLu = false;
  prevenir();
}

async function verifier(force = false): Promise<void> {
  if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
  if (!force && Date.now() - derniereVerif < INTERVALLE_MS) return;
  const jeton = jetonLocal();
  if (!jeton) return;
  derniereVerif = Date.now();
  try {
    const r = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_prive_non_lu`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
        body: '{}'
      })
    );
    if (!r.ok) return;
    const v = (await r.json()) === true;
    if (v !== nonLu) {
      nonLu = v;
      prevenir();
    }
  } catch {
    /* the dot stays as it was */
  }
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** `actif`: signed in and not in JOEL's preview (nothing is read in the preview). */
export function usePriveNonLu(actif: boolean): boolean {
  useEffect(() => {
    if (!actif) return;
    void verifier(true);
    const id = window.setInterval(() => void verifier(), INTERVALLE_MS);
    const visible = () => void verifier();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [actif]);
  const v = useSyncExternalStore(abonner, () => nonLu, () => false);
  return actif && v;
}
