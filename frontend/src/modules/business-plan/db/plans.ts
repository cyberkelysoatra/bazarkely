// Plans stored on this phone: list, get, create, save, delete, duplicate.
import { db } from './base';
import type { Plan } from '../types';
import { completerPlan, copier, nouvelId, planVide } from '../etat/vide';

// Safety copy: when the page is hidden or closed with a change not yet saved, the plan is also written
// synchronously to localStorage (an IndexedDB write may not finish while the page closes). The copy is
// put back into the database at the next opening, then removed.
const PREFIXE_SECOURS = 'nec.secours.';

export function ecrireSecours(plan: Plan): void {
  try {
    localStorage.setItem(PREFIXE_SECOURS + plan.id, JSON.stringify(plan));
  } catch {
    // Storage full or unavailable: the IndexedDB write still runs.
  }
}

export function effacerSecours(id: string, rev: number): void {
  try {
    const brut = localStorage.getItem(PREFIXE_SECOURS + id);
    if (brut && (JSON.parse(brut) as Plan).rev <= rev) localStorage.removeItem(PREFIXE_SECOURS + id);
  } catch {
    // Nothing to remove.
  }
}

async function rejouerSecours(): Promise<void> {
  let cles: string[] = [];
  try {
    cles = Object.keys(localStorage).filter((k) => k.startsWith(PREFIXE_SECOURS));
  } catch {
    return;
  }
  for (const cle of cles) {
    try {
      const copie = completerPlan(JSON.parse(localStorage.getItem(cle) ?? 'null'));
      const enBase = await db.plans.get(copie.id);
      // The copy is newer unless the database already holds a later save.
      if (!enBase || (enBase.rev ?? 0) <= copie.rev) await db.plans.put(copie);
      localStorage.removeItem(cle);
    } catch {
      // Unreadable copy: kept for the next try.
    }
  }
}

export async function listerPlans(): Promise<Plan[]> {
  await rejouerSecours();
  const plans = await db.plans.orderBy('modifieLe').reverse().toArray();
  return plans.map(completerPlan);
}

export async function lirePlan(id: string): Promise<Plan | null> {
  await rejouerSecours();
  const stocke = await db.plans.get(id);
  return stocke ? completerPlan(stocke) : null;
}

export async function creerPlan(depart?: Partial<Plan>): Promise<Plan> {
  const vide = planVide();
  const plan = completerPlan({ ...copier(depart ?? {}), id: vide.id, creeLe: vide.creeLe, modifieLe: vide.modifieLe, rev: 0 });
  delete plan.exemple;
  await db.plans.put(plan);
  return plan;
}

/** Saves a plan: `rev` + 1, `modifieLe` now. Returns the saved copy. */
export async function enregistrerPlan(plan: Plan): Promise<Plan> {
  const aSauver: Plan = { ...plan, rev: (plan.rev ?? 0) + 1, modifieLe: new Date().toISOString() };
  await db.plans.put(aSauver);
  return aSauver;
}

export async function supprimerPlan(id: string): Promise<void> {
  try {
    localStorage.removeItem(PREFIXE_SECOURS + id);
  } catch {
    // Nothing to remove.
  }
  await db.plans.delete(id);
}

/** Copy of a plan (stored one or the example) as a new plan of this phone. */
export async function dupliquerPlan(source: Plan, nomProjet?: string): Promise<Plan> {
  const copie = copier(source);
  if (nomProjet !== undefined) copie.identite.nomProjet = nomProjet;
  // New ids for the lines, so that the copy never shares an id with its source.
  for (const l of [...copie.m5.couts, ...copie.m5.investissements, ...copie.m5.chargesFixes.lignes]) l.id = nouvelId();
  for (const r of copie.m5.risques) r.id = nouvelId();
  return creerPlan(copie);
}
