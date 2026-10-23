// PUDI-CC-14.2: private messages with the organisers (specification v8, 4.16). Signed in only,
// through rpc(); every send carries a client id so that a retried send never writes twice.
import { rpc } from './api';

export interface MessagePrive {
  id: string;
  texte: string;
  supprime: boolean;
  cree_at: string;
  role: 'votant' | 'organisateur';
  est_moi: boolean;
  auteur_nom: string;
}

export interface MaConversation {
  conversation: string | null;
  messages: MessagePrive[];
}

export interface ConversationAdmin {
  id: string;
  auteur_nom: string;
  auteur_email: string | null;
  non_lu: boolean;
  dernier_at: string | null;
  nb_messages: number;
}

export interface ConversationDetail {
  conversation: string;
  auteur_nom: string;
  auteur_email: string | null;
  messages: MessagePrive[];
}

export const MAX_PRIVE = 1000;

export const lireMaConversation = () => rpc<MaConversation>('pudi_prive_lire');
export const ecrirePrive = (texte: string, clientId: string) => rpc<{ id: string }>('pudi_prive_ecrire', { p_texte: texte, p_client_id: clientId });
export const listerConversations = () => rpc<ConversationAdmin[] | null>('pudi_admin_prives').then((l) => l ?? []);
export const lireConversation = (id: string) => rpc<ConversationDetail>('pudi_admin_prive_lire', { p_conversation: id });
export const repondrePrive = (id: string, texte: string, clientId: string) =>
  rpc<{ id: string }>('pudi_admin_prive_repondre', { p_conversation: id, p_texte: texte, p_client_id: clientId });
export const supprimerPrive = (id: string, motif: string) => rpc<{ id: string }>('pudi_admin_prive_supprimer', { p_message: id, p_motif: motif });

/** Client id of a message (crypto.randomUUID, with a fallback for old WebViews). */
export function nouvelIdClient(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const h = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  h[12] = '4';
  h[16] = ((parseInt(h[16], 16) & 3) | 8).toString(16);
  const s = h.join('');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}
