// Server calls of the Validation client module: only the vc_* SQL functions, by RPC, each under
// an 8 s timeout (the vc_* tables are closed, phase 1).
import { getSupabase, withTimeout } from './supabaseClient';
import type {
  Apercu,
  DocumentTexte,
  Espace,
  MembreEquipe,
  MessageFil,
  ResultatEquipe,
  ResultatMessage,
  QuestionnaireComplet,
  ResultatConfirmation,
  ResultatInvitation,
  ResultatInfos,
  ResultatReponse
} from '../utils/types';

export async function rpc<T>(nom: string, args?: Record<string, unknown>): Promise<T> {
  const sb = await withTimeout(getSupabase());
  // getSession() renews an expired access token before the call (one refresh at most).
  await withTimeout(sb.auth.getSession());
  const { data, error } = await withTimeout(sb.rpc(nom, args ?? {}));
  if (error) throw new Error(error.message || nom);
  return data as T;
}

export const apercuInvitation = (jeton: string) => rpc<Apercu>('vc_invitation_apercu', { p_jeton: jeton });

export const utiliserInvitation = (jeton: string) => rpc<ResultatInvitation>('vc_invitation_utiliser', { p_jeton: jeton });

export const monEspace = () => rpc<Espace[]>('vc_mon_espace');

export const lireQuestionnaire = (id: string) => rpc<QuestionnaireComplet>('vc_questionnaire', { p_questionnaire: id });

export const lireEquipe = (client: string) => rpc<MembreEquipe[]>('vc_equipe', { p_client: client });

export const inviterEquipe = (p: { client: string; civilite: string | null; nom: string; fonction: string; whatsapp: string }) =>
  rpc<ResultatEquipe>('vc_equipe_inviter', {
    p_client: p.client,
    p_civilite: p.civilite,
    p_nom: p.nom,
    p_fonction: p.fonction,
    p_whatsapp: p.whatsapp
  });

export const noterPresence = (client: string, page: string) => rpc<null>('vc_noter_presence', { p_client: client, p_page: page });

// Project thread (VC-39, VC-40): the same four functions for the client and for Joël.
export const listerMessages = (client: string) => rpc<MessageFil[]>('vc_messages_lister', { p_client: client });

/** `id` is generated on the phone: a resend with the same id never adds a second row. */
export const envoyerMessage = (m: { id: string; client: string; texte: string; question: string | null }) =>
  rpc<ResultatMessage>('vc_message_envoyer', { p_id: m.id, p_client: m.client, p_texte: m.texte, p_question: m.question });

export const retirerMessage = (id: string) => rpc<ResultatMessage>('vc_message_retirer', { p_id: id });

export const marquerLu = (client: string) => rpc<null>('vc_marquer_lu', { p_client: client });

export const lireDocument =(id: string) => rpc<DocumentTexte>('vc_document', { p_document: id });

export const repondre = (r: { id: string; question: string; choix: string; commentaire: string | null; repondu_at: string; appareil: string }) =>
  rpc<ResultatReponse>('vc_repondre', {
    p_id: r.id,
    p_question: r.question,
    p_choix: r.choix,
    p_commentaire: r.commentaire,
    p_repondu_at: r.repondu_at,
    p_appareil: r.appareil
  });

export const confirmer = (questionnaire: string) => rpc<ResultatConfirmation>('vc_confirmer', { p_questionnaire: questionnaire });

export const enregistrerMesInfos = (p: {
  personne: string;
  civilite: string | null;
  entreprise: string;
  fonction: string;
  whatsapp: string;
  emailPro: string;
}) =>
  rpc<ResultatInfos>('vc_mes_infos', {
    p_personne: p.personne,
    p_civilite: p.civilite,
    p_entreprise: p.entreprise,
    p_fonction: p.fonction,
    p_whatsapp: p.whatsapp,
    p_email_pro: p.emailPro
  });

/**
 * 'oui' for Joël; 'non' when the server refused (the vc_admin_* functions raise VC_JOEL_REQUIS
 * for anybody else); 'erreur' when it did not answer (network, timeout): never a bounce then.
 */
export async function estPilote(): Promise<'oui' | 'non' | 'erreur'> {
  try {
    await rpc<unknown>('vc_admin_modeles');
    return 'oui';
  } catch (e) {
    const m = e instanceof Error ? e.message : '';
    return /VC_JOEL_REQUIS|VC_CONNEXION_REQUISE|permission denied|JWT/i.test(m) ? 'non' : 'erreur';
  }
}
