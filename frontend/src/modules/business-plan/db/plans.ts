// Plans stored on this phone: list, get, create, save, delete, duplicate.
import { db } from './base';
import type { Plan } from '../types';
import { completerPlan, copier, nouvelId, planVide } from '../etat/vide';

// Safety copy: when the page is hidden or closed with a change not yet saved, the plan is also written
// synchronously to localStorage (an IndexedDB write may not finish while the page closes). The copy is
// put back into the database at the next opening, then removed.
const PREFIXE_SECOURS = 'nec.secours.';

// ---------------------------------------------------------------------------------------------------
// NEC-CC-25 (NEC-174): an old page never saves over a newer plan. A page saves from the rev it holds in
// memory (its base); the save is refused when the stored plan already carries a higher rev (written by
// another page meanwhile). Every successful save is announced to the other pages ({ id, rev } only).
// ---------------------------------------------------------------------------------------------------

/** true when a page whose plan is at `revDeBase` may save over the stored plan at `revStockee`. */
export function peutEnregistrer(revStockee: number | null | undefined, revDeBase: number | null | undefined): boolean {
  return revStockee == null || revStockee <= (revDeBase ?? 0);
}

/** Thrown by enregistrerPlan when the stored plan is newer than the page's one; carries the stored plan. */
export class ConflitPlan extends Error {
  readonly plan: Plan;
  constructor(plan: Plan) {
    super('ConflitPlan');
    this.name = 'ConflitPlan';
    this.plan = plan;
  }
}

/** Saves in progress on this page: a read waits for them, so a page opened right after sees them. */
const enVol = new Set<Promise<unknown>>();

async function attendreEnregistrements(): Promise<void> {
  if (enVol.size) await Promise.allSettled(Array.from(enVol));
}

const CANAL = 'bp-plans';
/** This page's id, so that a page ignores its own announcements. */
const SOURCE = Math.random().toString(36).slice(2);
let canal: BroadcastChannel | null | undefined;

function canalPlans(): BroadcastChannel | null {
  if (canal === undefined) {
    try {
      canal = typeof BroadcastChannel === 'function' ? new BroadcastChannel(CANAL) : null;
    } catch {
      canal = null;
    }
  }
  return canal;
}

/** Tells the other open pages that plan `id` was saved at `rev` (never the plan's contents). */
export function annoncerPlan(id: string, rev: number): void {
  try {
    canalPlans()?.postMessage({ id, rev, source: SOURCE });
  } catch {
    // No channel: the other pages still check when they come back to the front.
  }
}

/** Called with { id, rev } when another page saved a plan. Returns the unsubscribe (nothing without BroadcastChannel). */
export function ecouterPlans(f: (annonce: { id: string; rev: number }) => void): () => void {
  if (typeof BroadcastChannel !== 'function') return () => undefined;
  let ecoute: BroadcastChannel;
  try {
    ecoute = new BroadcastChannel(CANAL);
  } catch {
    return () => undefined;
  }
  ecoute.onmessage = (e: MessageEvent) => {
    const m = e.data as { id?: unknown; rev?: unknown; source?: unknown } | null;
    if (!m || m.source === SOURCE || typeof m.id !== 'string' || typeof m.rev !== 'number') return;
    f({ id: m.id, rev: m.rev });
  };
  return () => ecoute.close();
}

/**
 * Safety copy of a page being hidden or closed. NEC-CC-25: its rev must be the page's base rev + 1 (the
 * rev the save would give), so that a copy left by an old page loses at the replay.
 */
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
      await db.transaction('rw', db.plans, async () => {
        const enBase = await db.plans.get(copie.id);
        // The copy wins only over an older stored plan: same rule as a save from its base rev (copy rev - 1).
        // NEC-CC-25: a copy from an old page (base below the stored rev) is dropped.
        if (!enBase || peutEnregistrer(enBase.rev ?? 0, (copie.rev ?? 0) - 1)) await db.plans.put(copie);
      });
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
  await attendreEnregistrements();
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

/**
 * Saves a plan: `rev` + 1, `modifieLe` now. Returns the saved copy.
 * NEC-CC-25: read and written in one transaction; throws ConflitPlan (carrying the stored plan) without
 * writing when the stored plan has a higher rev than `plan.rev` (the rev this page started from).
 */
export async function enregistrerPlan(plan: Plan): Promise<Plan> {
  const travail = db.transaction('rw', db.plans, async () => {
    const stocke = await db.plans.get(plan.id);
    if (stocke && !peutEnregistrer(stocke.rev ?? 0, plan.rev ?? 0)) throw new ConflitPlan(completerPlan(stocke));
    const aSauver: Plan = { ...plan, rev: (plan.rev ?? 0) + 1, modifieLe: new Date().toISOString() };
    await db.plans.put(aSauver);
    return aSauver;
  });
  enVol.add(travail);
  try {
    const sauve = await travail;
    annoncerPlan(sauve.id, sauve.rev);
    return sauve;
  } finally {
    enVol.delete(travail);
  }
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
