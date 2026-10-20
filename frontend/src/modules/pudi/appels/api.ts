// Calls to the PUDi server functions (see the API contract of phase 1).
// pudi_etat uses a plain fetch (no supabase-js on the home and discovery pages); the
// other calls go through the lazy Supabase client, which carries the Google session.
import type { Brouillon } from '../utils/regles';
import {
  SESSION_STORAGE_KEY,
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  getSupabase,
  withTimeout
} from './supabaseClient';

export interface EtatConsultation {
  publie: boolean;
  cloture_at: string;
  maintenant: string;
  clos: boolean;
  connecte: boolean;
  a_vote: boolean;
  est_admin: boolean;
}

export interface MonVote {
  fokontany: string;
  fokontany_autre: string | null;
  profil: string;
  priorites: string[];
  urgents: string[];
  manquant: string | null;
  canal_code: string | null;
  created_at: string;
  updated_at: string;
  nb_modifications: number;
  est_test: boolean;
  masque: boolean;
}

export interface LigneResultat {
  id: string;
  n: number;
  pct: number;
  tranche_pudi?: number;
  ecart?: boolean;
}

export interface Resultats {
  clos: boolean;
  cloture_at: string;
  calcule_at: string;
  nb_votants: number;
  priorites: LigneResultat[];
  urgents: LigneResultat[];
  par_profil: Record<string, number>;
  par_fokontany: Record<string, number>;
  reseaux: { dans_nos_reseaux: number; hors_reseaux: number };
  manquants: string[];
}

export interface FormulaireVote {
  fokontany: string;
  fokontanyAutre: string;
  profil: string;
  telephone: string;
  resident: boolean;
}

/** Access token of the shared session, read from the default storage (no network). */
function jetonLocal(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as { access_token?: string; expires_at?: number };
    if (!s.access_token) return null;
    if (s.expires_at && s.expires_at * 1000 < Date.now() + 30000) return null;
    return s.access_token;
  } catch {
    return null;
  }
}

async function rpcFetch(fn: string, jeton: string | null): Promise<Response> {
  return withTimeout(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jeton ?? SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: '{}'
    })
  );
}

/** State of the consultation (anon, or with the stored session when there is one). */
export async function lireEtat(): Promise<EtatConsultation> {
  const jeton = jetonLocal();
  let r = await rpcFetch('pudi_etat', jeton);
  if (!r.ok && jeton) r = await rpcFetch('pudi_etat', null);
  if (!r.ok) throw new Error(`pudi_etat ${r.status}`);
  return (await r.json()) as EtatConsultation;
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await withTimeout(getSupabase());
  const { data, error } = await withTimeout(sb.rpc(fn, args ?? {}));
  if (error) throw error;
  return data as T;
}

export const lireEtatConnecte = () => rpc<EtatConsultation>('pudi_etat');
export const ping = () => rpc<null>('pudi_ping');
export const lireMonVote = () => rpc<MonVote | null>('pudi_mon_vote');
export const lireResultats = () => rpc<Resultats>('pudi_resultats');

/** Submits or modifies the vote. Throws the server error (or {erreur} for PUDI_NUMERO_DEJA_UTILISE). */
export async function soumettreVote(
  b: Brouillon,
  f: FormulaireVote,
  canal: string | null
): Promise<MonVote> {
  const res = await rpc<MonVote | { erreur: string }>('pudi_soumettre_vote', {
    p_fokontany: f.fokontany,
    p_fokontany_autre: f.fokontany === 'AUTRE' ? f.fokontanyAutre : null,
    p_profil: f.profil,
    p_telephone: f.telephone.trim() || null,
    p_resident: f.resident,
    p_priorites: b.priorites,
    p_urgents: b.urgents,
    p_manquant: b.manquant.trim() || null,
    p_canal: canal
  });
  if (res && typeof res === 'object' && 'erreur' in res) throw res;
  return res as MonVote;
}
