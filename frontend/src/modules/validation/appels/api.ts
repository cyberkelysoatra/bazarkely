// Server calls of the Validation client module: only the vc_* SQL functions, by RPC, each under
// an 8 s timeout (the vc_* tables are closed, phase 1).
import { getSupabase, withTimeout } from './supabaseClient';
import type { Apercu, Espace, ResultatInvitation, ResultatInfos } from '../utils/types';

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
