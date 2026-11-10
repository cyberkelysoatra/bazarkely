// Backup of a plan as a JSON file, and its restoration as a NEW plan (new id, never overwrites).
import type { Plan } from '../types';
import { completerPlan, copier } from '../etat/vide';

export const FORMAT_SAUVEGARDE = 'nec-business-plan';

export interface Sauvegarde {
  format: typeof FORMAT_SAUVEGARDE;
  version: 1;
  enregistreLe: string;
  plan: Plan;
}

/** "JUS'NOSY (ma copie)" -> "JUS-NOSY-ma-copie"; "" -> "projet". */
export function nomFichier(nomProjet: string): string {
  const n = nomProjet
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return n || 'projet';
}

export function nomSauvegarde(plan: Plan): string {
  return `Business-plan_${nomFichier(plan.identite.nomProjet)}.json`;
}

export function texteSauvegarde(plan: Plan, maintenant = new Date()): string {
  const s: Sauvegarde = { format: FORMAT_SAUVEGARDE, version: 1, enregistreLe: maintenant.toISOString(), plan: copier(plan) };
  return JSON.stringify(s, null, 1);
}

export class SauvegardeInvalide extends Error {}

const MESSAGE = "Ce fichier n'est pas une sauvegarde de Mon business plan. Choisissez le fichier « Business-plan_... .json » enregistré depuis l'app.";

function estObjet(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const OBJETS = ['identite', 'm1', 'm2', 'm3', 'm4', 'm5', 'synthese', 'relecture'] as const;

/** Reads a backup file (or a bare plan) and checks its shape. Throws SauvegardeInvalide with a plain message. */
export function lireSauvegarde(texte: string): Plan {
  let brut: unknown;
  try {
    brut = JSON.parse(texte);
  } catch {
    throw new SauvegardeInvalide(MESSAGE);
  }
  const plan = estObjet(brut) && brut.format === FORMAT_SAUVEGARDE ? brut.plan : brut;
  if (!estObjet(plan) || typeof plan.id !== 'string') throw new SauvegardeInvalide(MESSAGE);
  for (const k of OBJETS) if (!estObjet(plan[k])) throw new SauvegardeInvalide(MESSAGE);
  const m5 = plan.m5 as Record<string, unknown>;
  if (!Array.isArray(m5.couts) || !Array.isArray(m5.investissements) || !estObjet(m5.ressources)) throw new SauvegardeInvalide(MESSAGE);
  for (const k of ['actions', 'prix'] as const) if (plan[k] !== undefined && !Array.isArray(plan[k])) throw new SauvegardeInvalide(MESSAGE);
  if (plan.notes !== undefined && typeof plan.notes !== 'string') throw new SauvegardeInvalide(MESSAGE);
  if (!estObjet(plan.identite) || typeof plan.identite.nomProjet !== 'string') throw new SauvegardeInvalide(MESSAGE);
  return completerPlan(plan as Partial<Plan> & { id: string });
}
