// Calls of the trainer screen (NEC-CC-02), through the session shared with 1sakely.org. Whether the
// visitor is the trainer is decided by the server only: bp_admin_* raise NON_AUTORISE otherwise.
import { clientFormateur, withTimeout } from './supabase';

export interface Participant {
  plan_id: string;
  prenom: string;
  nom_projet: string;
  progression: Record<string, number>;
  alertes: string[];
  rev: number;
  maj_at: string;
  vu_at: string;
}

export type Acces<T> = { statut: 'ok'; valeur: T } | { statut: 'refuse' } | { statut: 'erreur' };

function refus(e: { message?: string; code?: string } | null): boolean {
  return !!e && (/NON_AUTORISE/.test(e.message ?? '') || e.code === '42501');
}

/** Waits for the shared session to be resolved (refreshed when expired); null when signed out. */
async function sessionResolue() {
  const sb = await withTimeout(clientFormateur());
  const { data } = await withTimeout(sb.auth.getSession());
  return data.session ? sb : null;
}

async function appeler<T>(nom: string, args: Record<string, unknown>): Promise<Acces<T>> {
  try {
    const sb = await sessionResolue();
    if (!sb) return { statut: 'refuse' };
    const { data, error } = await withTimeout(sb.rpc(nom, args));
    if (error) return refus(error) ? { statut: 'refuse' } : { statut: 'erreur' };
    return { statut: 'ok', valeur: data as T };
  } catch {
    return { statut: 'erreur' };
  }
}

export function listeParticipants(code: string): Promise<Acces<Participant[]>> {
  return appeler<Participant[]>('bp_admin_liste', { p_code: code });
}

export function planParticipant(planId: string): Promise<Acces<{ plan_id: string; prenom: string; contenu: Record<string, unknown>; maj_at: string } | null>> {
  return appeler('bp_admin_plan', { p_plan_id: planId });
}

export function changerSession(code: string, ouverte: boolean): Promise<Acces<{ ok: boolean }>> {
  return appeler('bp_admin_session', { p_code: code, p_ouverte: ouverte });
}

/** Open or closed (read with bp_rejoindre, the call every participant makes); null when unknown. */
export async function sessionOuverte(code: string): Promise<boolean | null> {
  try {
    const sb = await withTimeout(clientFormateur());
    const { data, error } = await withTimeout(sb.rpc('bp_rejoindre', { p_code: code }));
    if (error) return null;
    const r = data as { ok?: boolean; raison?: string };
    return r.ok ? true : r.raison === 'SESSION_FERMEE' ? false : null;
  } catch {
    return null;
  }
}

/** Short text of each module 5 alert (the server keeps only their ids). */
export const TEXTES_ALERTES: Record<string, string> = {
  marge: "Le prix ne couvre pas le coût d'une unité",
  seuil: 'Ventes prévues sous le seuil de rentabilité',
  financement: 'Financement du démarrage pas équilibré',
  fonds: 'Fonds de roulement trop faible'
};
