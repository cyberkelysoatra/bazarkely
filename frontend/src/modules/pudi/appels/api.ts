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
  /** Time of the FIRST publication (null before). */
  publie_at?: string | null;
  cloture_at: string;
  /** PUDI-CC-17: freeze of the member lists and time of the 12-vote rule (absent on an older answer). */
  gel_listes_at?: string | null;
  regle_voix_at?: string | null;
  maintenant: string;
  /** Effective closing (server): switch on and date passed. The only source of « closed ». */
  clos: boolean;
  /** PUDI-CC-21: the closing date is passed (closed only if verrou_cloture is on). Absent on an older answer. */
  cloture_depassee?: boolean;
  /** PUDI-CC-21: organiser switch « Verrouillage à la date de clôture ». Absent on an older answer. */
  verrou_cloture?: boolean;
  connecte: boolean;
  a_vote: boolean;
  est_admin: boolean;
  /** PUDI-CC-19: « Afficher tous les chiffres au public » (super administrator switch). */
  chiffres_publics?: boolean;
  /** Manager of at least one channel (PUDI-CC-07); absent on an older server answer. */
  est_responsable?: boolean;
}

export interface MonVote {
  fokontany: string;
  fokontany_autre: string | null;
  profil: string;
  priorites: string[];
  /** Stored by the old question (before PUDI-CC-18); never sent again by the client. */
  urgents?: string[];
  manquant: string | null;
  canal_code: string | null;
  created_at: string;
  updated_at: string;
  nb_modifications: number;
  est_test: boolean;
  masque: boolean;
  /** PUDI-CC-18: old 3-programme vote converted once to 4 + 4 + 4, not sent again since. */
  converti_4x?: boolean;
}

export interface LigneResultat {
  id: string;
  /** Voters (distinct people); same value as `votants` since PUDI-CC-17. PUDI-CC-19: organisers only (or switch on). */
  n?: number;
  pct?: number;
  /** PUDI-CC-17: votes received (occurrences), voters, shares and votes with 6 or more on it. */
  voix?: number;
  votants?: number;
  pct_voix?: number;
  pct_votants?: number;
  concentration?: number;
  tranche_pudi?: number;
  /** PUDI-CC-18: among the `top_ecart` programmes with the most votes while the PUDi plans it after 2030. */
  ecart_pudi?: boolean;
}

/** Proposal of the results, counted SEPARATELY from the 52 programmes. */
export interface LigneProposition {
  id: string;
  intitule: string;
  ajoute_at: string;
  n_priorite?: number;
  pct_priorite?: number;
  voix?: number;
  votants?: number;
  pct_voix?: number;
  pct_votants?: number;
  concentration?: number;
}

/** PUDI-CC-17: votes with 6 or more votes on one programme (transparency). */
export interface Concentration {
  votes: number;
  pct_votes: number;
  voix: number;
  pct_voix: number;
}

export interface Resultats {
  clos: boolean;
  /** PUDI-CC-21: see EtatConsultation. */
  cloture_depassee?: boolean;
  verrou_cloture?: boolean;
  cloture_at: string;
  publie_at?: string | null;
  calcule_at: string;
  /** PUDI-CC-19: false = reduced content (no voter count, breakdowns in %); absent = complete (older server). */
  complet?: boolean;
  nb_votants?: number;
  priorites: LigneResultat[];
  par_profil: Record<string, number>;
  par_fokontany: Record<string, number>;
  reseaux: { dans_nos_reseaux: number; hors_reseaux: number };
  manquants: string[];
  propositions?: LigneProposition[];
  voix_placees?: number;
  /** Voters who used 1, 2… 12 votes (keys "1" to "12"). */
  repartition?: Record<string, number>;
  concentration?: Concentration;
  /** PUDI-CC-18: old 3-programme votes converted to 4 + 4 + 4 and kept as they are since. */
  nb_votes_convertis?: number;
  /** PUDI-CC-18: size of the « écart avec le PUDi » window (15). */
  top_ecart?: number;
  regle_voix_at?: string | null;
}

export interface FormulaireVote {
  fokontany: string;
  fokontanyAutre: string;
  profil: string;
  telephone: string;
  resident: boolean;
}

/** Access token of the shared session, read from the default storage (no network). */
export function jetonLocal(): string | null {
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

export async function rpcFetch(fn: string, jeton: string | null): Promise<Response> {
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

export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await withTimeout(getSupabase());
  const { data, error } = await withTimeout(sb.rpc(fn, args ?? {}));
  if (error) throw error;
  return data as T;
}

export const lireEtatConnecte = () => rpc<EtatConsultation>('pudi_etat');
export const ping = () => rpc<null>('pudi_ping');
export const lireMonVote = () => rpc<MonVote | null>('pudi_mon_vote');
export const lireResultats = () => rpc<Resultats>('pudi_resultats');

/** Administrators only: same aggregates including the test votes (preview before publication). */
export interface ResultatsApercu extends Resultats {
  apercu_avec_tests: true;
  nb_tests: number;
}
export const lireApercu = () => rpc<ResultatsApercu>('pudi_admin_resultats_apercu');

/** Submits or modifies the vote. Throws the server error (or {erreur} for PUDI_NUMERO_DEJA_UTILISE / PUDI_PERSONNE_DEJA_VOTEE). */
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
    // PUDI-CC-18: no urgents question any more; null keeps what an old vote stored.
    p_urgents: null,
    p_manquant: b.manquant.trim() || null,
    p_canal: canal
  });
  if (res && typeof res === 'object' && 'erreur' in res) throw res;
  return res as MonVote;
}
