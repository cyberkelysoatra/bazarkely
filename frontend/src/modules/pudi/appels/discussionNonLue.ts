// PUDI-CC-12: small dot on the « Discussion » button when a message is newer than the last one
// seen (localStorage). Checked at most once a minute, only while the page is visible and online.
// Plain fetch of the newest message (no supabase-js on the home page).
import { useEffect, useSyncExternalStore } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';

const CLE_VU = 'pudi_discussion_vu';
const INTERVALLE_MS = 60000;
let dernierMessage: string | null = null;
let derniereVerif = 0;
let vuMemoire: string | null = null;
const abonnes = new Set<() => void>();
const prevenir = () => abonnes.forEach((f) => f());

function lireVu(): string | null {
  try {
    return localStorage.getItem(CLE_VU) ?? vuMemoire;
  } catch {
    return vuMemoire;
  }
}

/** The discussion page shows messages up to this date. */
export function marquerDiscussionVue(creeAt: string | null | undefined): void {
  if (!creeAt) return;
  const vu = lireVu();
  if (vu && Date.parse(vu) >= Date.parse(creeAt)) return;
  vuMemoire = creeAt;
  try {
    localStorage.setItem(CLE_VU, creeAt);
  } catch {
    /* memory only */
  }
  prevenir();
}

function nonLue(): boolean {
  if (!dernierMessage) return false;
  const vu = lireVu();
  return !vu || Date.parse(dernierMessage) > Date.parse(vu);
}

async function verifier(): Promise<void> {
  if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
  if (Date.now() - derniereVerif < INTERVALLE_MS) return;
  derniereVerif = Date.now();
  try {
    const r = await withTimeout(
      fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_discussion_lire`, {
        method: 'POST',
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: '{"p_limite":1}'
      })
    );
    if (!r.ok) return;
    const l = (await r.json()) as { cree_at: string }[];
    dernierMessage = l.length ? l[l.length - 1].cree_at : null;
    prevenir();
  } catch {
    /* the dot stays as it was */
  }
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

export function useDiscussionNonLue(): boolean {
  useEffect(() => {
    void verifier();
    const id = window.setInterval(() => void verifier(), INTERVALLE_MS);
    const visible = () => void verifier();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, []);
  return useSyncExternalStore(abonner, nonLue, () => false);
}
