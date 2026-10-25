// PUDI-CC-12: the public discussion. Reading is a plain fetch (anonymous or with the stored
// session, like pudi_etat); writing, deleting and suspending go through rpc() (signed in only).
// Every right is checked on the server.
import { jetonLocal, rpc } from './api';
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';

export interface MessageDiscussion {
  id: string;
  auteur_nom: string;
  /** Empty when deleted. */
  texte: string;
  supprime: boolean;
  supprime_role: 'auteur' | 'responsable' | 'organisateur' | null;
  cree_at: string;
  reponse_a: { id: string; auteur_nom: string; extrait: string; supprime: boolean } | null;
  est_moi: boolean;
  peut_supprimer: boolean;
  /** Organisers only (null otherwise). */
  auteur_suspendu: boolean | null;
  /** PUDI-CC-16.3: edited by its author (absent on an older server answer). */
  modifie?: boolean;
  /** Author only: end of the 10-minute edit window (null otherwise). */
  modifiable_jusqu_a?: string | null;
  /** PUDI-CC-20: count per emoji (null on a deleted message, absent on an older server answer). */
  reactions?: Record<string, number> | null;
  /** Own emoji (signed in only). */
  ma_reaction?: string | null;
}

/** The six reactions, in display order (same list as the server check). */
export const EMOJIS = ['\u{1F44D}', '❤️', '\u{1F602}', '\u{1F62E}', '\u{1F622}', '\u{1F64F}'] as const;
/** PUDI-CC-20: one reaction per person and message; null removes it. Checked on the server. */
export const reagir = (message: string, emoji: string | null) => rpc<{ message: string; emoji: string | null }>('pudi_reagir', { p_message: message, p_emoji: emoji });
/** Organisers only: who reacted. */
export const lireReactions = (message: string) =>
  rpc<{ emoji: string; auteur_nom: string; at: string }[]>('pudi_admin_discussion_reactions', { p_message: message });

/** Counts after the person's own reaction changes from `avant` to `apres` (optimistic display). */
export function appliquerReaction(m: MessageDiscussion, apres: string | null): MessageDiscussion {
  const r: Record<string, number> = { ...(m.reactions ?? {}) };
  const avant = m.ma_reaction ?? null;
  if (avant) {
    r[avant] = (r[avant] ?? 1) - 1;
    if (r[avant] <= 0) delete r[avant];
  }
  if (apres) r[apres] = (r[apres] ?? 0) + 1;
  return { ...m, reactions: r, ma_reaction: apres };
}

export const LIMITE_PAGE = 50;

async function appelLecture(jeton: string | null, corps: Record<string, unknown>): Promise<Response> {
  return withTimeout(
    fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_discussion_lire`, {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${jeton ?? SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(corps)
    })
  );
}

/** Page of messages before `avant` (oldest first). `apercuCanal`: JOEL's « Responsable » preview. */
export async function lireMessages(avant: string | null = null, limite = LIMITE_PAGE, apercuCanal: string | null = null): Promise<MessageDiscussion[]> {
  const corps = { p_avant: avant, p_limite: limite, p_apercu_canal: apercuCanal };
  const jeton = jetonLocal();
  let r = await appelLecture(jeton, corps);
  if (!r.ok && jeton) r = await appelLecture(null, corps);
  if (!r.ok) throw new Error(`pudi_discussion_lire ${r.status}`);
  return (await r.json()) as MessageDiscussion[];
}

/** PUDI-CC-14.4: the client id makes a retried send idempotent on the server. */
export const ecrireMessage = (texte: string, reponseA: string | null, clientId: string) =>
  rpc<{ id: string }>('pudi_discussion_ecrire', { p_texte: texte, p_reponse_a: reponseA, p_client_id: clientId });
/** PUDI-CC-16.3: own message, 10 minutes after writing at most (checked on the server). */
export const modifierMessage = (id: string, texte: string) => rpc<{ id: string }>('pudi_discussion_modifier', { p_id: id, p_texte: texte });
export interface VersionsMessage {
  actuel: string | null;
  versions: { texte: string; cree_at: string }[];
}
/** Organisers only: previous texts of an edited message. */
export const lireVersions = (id: string) => rpc<VersionsMessage>('pudi_admin_discussion_versions', { p_message: id });
export const supprimerMessage =(id: string) => rpc<{ id: string; role?: string }>('pudi_discussion_supprimer', { p_id: id });
export const suspendreAuteur = (message: string, motif: string) => rpc<null>('pudi_admin_discussion_suspendre', { p_message: message, p_motif: motif });
export const retablirAuteur = (message: string) => rpc<null>('pudi_admin_discussion_retablir_auteur', { p_message: message });

export interface SuiviDiscussion {
  nb_messages: number;
  nb_auteurs: number;
  nb_supprimes: number;
  nb_suspendus: number;
  /** PUDI-CC-20 (absent on an older server answer). */
  nb_reactions?: number;
}
export const lireSuiviDiscussion = () => rpc<SuiviDiscussion>('pudi_admin_discussion_suivi');
