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
export const supprimerMessage = (id: string) => rpc<{ id: string; role?: string }>('pudi_discussion_supprimer', { p_id: id });
export const suspendreAuteur = (message: string, motif: string) => rpc<null>('pudi_admin_discussion_suspendre', { p_message: message, p_motif: motif });
export const retablirAuteur = (message: string) => rpc<null>('pudi_admin_discussion_retablir_auteur', { p_message: message });

export interface SuiviDiscussion {
  nb_messages: number;
  nb_auteurs: number;
  nb_supprimes: number;
  nb_suspendus: number;
}
export const lireSuiviDiscussion = () => rpc<SuiviDiscussion>('pudi_admin_discussion_suivi');
