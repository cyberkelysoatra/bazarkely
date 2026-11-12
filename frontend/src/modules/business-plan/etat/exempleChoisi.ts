// NEC-CC-13: which worked example the inline "Exemple <PROJET>" boxes of a plan show. Default: the example
// of the sector of the fiche d'identité (TRANO KELY for "autre" or empty). "Voir un autre exemple" keeps
// the choice for this plan on this phone only (localStorage, never synced); every box of the page follows.
import { useCallback, useSyncExternalStore } from 'react';
import type { Plan } from '../types';
import { EXEMPLES, exempleDuSecteur, exempleParId, type ExempleSecteur } from '../data/exemples';

const cle = (planId: string) => `bp_exemple_choisi_${planId}`;
const abonnes = new Set<() => void>();
const memoire = new Map<string, string>();

function lire(planId: string): string | null {
  try {
    return window.localStorage.getItem(cle(planId));
  } catch {
    return null;
  }
}

export function choisirExemple(planId: string, secteur: string): void {
  try {
    window.localStorage.setItem(cle(planId), secteur);
  } catch {
    // Private mode or storage blocked: the choice still applies until the page is reloaded.
    memoire.set(planId, secteur);
  }
  abonnes.forEach((f) => f());
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** The example shown in the inline boxes of this plan, and how to switch to another sector. */
export function useExempleDuPlan(plan: Plan): { exemple: ExempleSecteur; choisir: (secteur: string) => void } {
  const choisi = useSyncExternalStore(abonner, () => lire(plan.id) ?? memoire.get(plan.id) ?? null);
  // An example opened read-only shows itself by default; a participant's plan shows his sector.
  const parDefaut = (plan.exemple ? exempleParId(plan.id) : undefined) ?? exempleDuSecteur(plan.identite.secteur);
  const exemple = (choisi && EXEMPLES.find((e) => e.secteur === choisi)) || parDefaut;
  const choisir = useCallback((secteur: string) => choisirExemple(plan.id, secteur), [plan.id]);
  return { exemple, choisir };
}
