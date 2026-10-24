// PUDI-CC-16.2: choice of this device noted anonymously (pudi_choix_noter), so the organisers can
// count the choices made but never sent. Debounced 3 s, online only, only while the funnel is on
// (published, never in « Voir comme »), at least one priority. Never counted as a vote.
// Lazy chunk: loaded by the shared state on the first draft change.
import { jetonLocal } from './api';
import { lireCanal } from './provenance';
import { parcoursActif, visiteurPret } from './parcours';
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';
import type { Brouillon } from '../utils/regles';

export const DELAI_CHOIX_MS = 3000;
/** The server accepts one call per 5 s per device. */
const ECART_MIN_MS = 5500;

let minuteur = 0;
let dernierEnvoi = 0;
let dernierContenu = '';

async function appeler(fn: string, corps: Record<string, unknown>): Promise<Response> {
  const jeton = jetonLocal();
  return withTimeout(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton ?? SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps),
      keepalive: true
    })
  );
}

async function envoyer(b: Brouillon, contenu: string): Promise<void> {
  if (navigator.onLine === false || !parcoursActif() || contenu === dernierContenu) return;
  const attente = dernierEnvoi + ECART_MIN_MS - Date.now();
  if (attente > 0) {
    minuteur = window.setTimeout(() => void envoyer(b, contenu), attente);
    return;
  }
  dernierEnvoi = Date.now();
  try {
    const r = await appeler('pudi_choix_noter', {
      p_visiteur: await visiteurPret(),
      p_priorites: b.priorites,
      p_urgents: b.urgents,
      p_manquant: b.manquant.trim() || null,
      p_canal: lireCanal()
    });
    if (!r.ok) return;
    const res = (await r.json()) as { ok?: boolean; erreur?: string } | null;
    if (res?.ok) dernierContenu = contenu;
    else if (res?.erreur === 'PUDI_TROP_TOT') minuteur = window.setTimeout(() => void envoyer(b, contenu), ECART_MIN_MS);
  } catch {
    /* ignored: the measure never disturbs the visitor */
  }
}

/** Draft changed: noted 3 s after the last change (nothing without a priority). */
export function planifierChoix(b: Brouillon): void {
  window.clearTimeout(minuteur);
  if (!b.priorites.length) return;
  const contenu = JSON.stringify([b.priorites, b.urgents, b.manquant.trim()]);
  minuteur = window.setTimeout(() => void envoyer(b, contenu), DELAI_CHOIX_MS);
}

/** A vote was sent (or exists) for the signed-in account: this device no longer counts as unsent. */
export async function lierVote(): Promise<void> {
  if (!jetonLocal() || navigator.onLine === false) return;
  try {
    await appeler('pudi_choix_lier_vote', { p_visiteur: await visiteurPret() });
  } catch {
    /* ignored */
  }
}
