// Calls of the trainer screen (NEC-CC-02), through the session shared with 1sakely.org. Whether the
// visitor is the trainer is decided by the server only: bp_admin_* raise NON_AUTORISE otherwise.
import type { AutoPretest, ReponsePretest } from '../types';
import type { LigneServeur } from '../utils/posttest';
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
  /** NEC-CC-20: paper pre-test typed by the trainer (null = none). */
  pretest_formateur?: PretestPapier | null;
  /** NEC-CC-20: validated pre-test held by the plan: typed in the app, or the paper one received. */
  pretest_valide?: 'app' | 'formateur' | null;
}

/** NEC-CC-20: what the trainer types from the paper copy (bp_admin_poser_pretest). */
export interface PretestPapier {
  reponses: Record<number, ReponsePretest>;
  auto: AutoPretest[];
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

export function planParticipant(
  planId: string
): Promise<Acces<{ plan_id: string; prenom: string; contenu: Record<string, unknown>; maj_at: string; pretest_formateur?: PretestPapier | null } | null>> {
  return appeler('bp_admin_plan', { p_plan_id: planId });
}

export function changerSession(code: string, ouverte: boolean): Promise<Acces<{ ok: boolean }>> {
  return appeler('bp_admin_session', { p_code: code, p_ouverte: ouverte });
}

/** NEC-CC-10: removes one plan from the server; the server never accepts it again (tombstone). */
export function retirerPlan(planId: string): Promise<Acces<{ ok: boolean; efface: number }>> {
  return appeler('bp_admin_retirer', { p_plan_id: planId });
}

/** NEC-CC-20: writes (or clears with null) the paper pre-test of one plan; the phone pulls it. */
export function poserPretest(planId: string, pretest: PretestPapier | null): Promise<Acces<{ ok: boolean; raison?: string }>> {
  return appeler('bp_admin_poser_pretest', { p_plan_id: planId, p_pretest: pretest });
}

/** NEC-CC-10: closes the session and erases (and tombstones) every plan received in it. */
export function effacerSession(code: string): Promise<Acces<{ ok: boolean; efface?: number; raison?: string }>> {
  return appeler('bp_admin_effacer_session', { p_code: code });
}

/** NEC-CC-22: the trainer opens or closes the post-test of the session. */
export function changerPosttest(code: string, ouvert: boolean): Promise<Acces<{ ok: boolean }>> {
  return appeler('bp_admin_posttest', { p_code: code, p_ouvert: ouvert });
}

/** NEC-CC-22: state of the session (null when the code is unknown). */
export function etatSession(code: string): Promise<Acces<{ ouverte: boolean; posttest_ouvert: boolean; posttest_ouvert_at: string | null } | null>> {
  return appeler('bp_admin_etat_session', { p_code: code });
}

/** NEC-CC-22: every row needed by the evaluation tab (pre-tests, post-tests, progress). */
export function lireEvaluation(code: string): Promise<Acces<LigneServeur[]>> {
  return appeler<LigneServeur[]>('bp_admin_evaluation', { p_code: code });
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
