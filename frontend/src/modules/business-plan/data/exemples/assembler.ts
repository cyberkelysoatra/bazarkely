// NEC-CC-13: builds one read-only worked example from its per-section files, exactly like
// data/exemple/index.ts does for JUS'NOSY (which stays untouched, same id 'exemple').
import type { Impact, Ligne, Mission, Plan } from '../../types';
import { completerPlan } from '../../etat/vide';

export interface SectionsExemple {
  identite: Partial<Plan['identite']>;
  uniteVente: string;
  m1: Partial<Plan['m1']>;
  m2: Partial<Plan['m2']>;
  m3: Partial<Plan['m3']>;
  m4: Partial<Plan['m4']>;
  m5: Partial<Plan['m5']>;
  impact: Partial<Impact>;
  mission: Partial<Mission>;
}

/** A cost or investment line of an example. */
export const l = (id: string, libelle: string, montant: number): Ligne => ({ id, libelle, montant });

type Demarche = Plan['m4']['demarches'][number];
/** The 7 procedures of 4d, in the app order, with the planned date of each ('' when not given). */
export function demarches(dates: Partial<Record<Demarche['id'], string>>, faites: Demarche['id'][] = []): Demarche[] {
  return (['statuts', 'nif', 'stat', 'rcs', 'carteFiscale', 'compte', 'cnaps'] as const).map((id) => ({ id, fait: faites.includes(id), datePrevue: dates[id] ?? '' }));
}

/** A fresh copy each call: nothing can change the original. Read only (`exemple: true`). */
export function assembler(id: string, s: SectionsExemple): Plan {
  const plan = completerPlan({ id, creeLe: '2026-11-12T08:00:00+03:00', modifieLe: '2026-11-12T08:00:00+03:00', rev: 0, uniteVente: s.uniteVente });
  plan.exemple = true;
  Object.assign(plan.identite, s.identite);
  Object.assign(plan.m1, s.m1);
  Object.assign(plan.m2, s.m2);
  Object.assign(plan.m3, s.m3);
  Object.assign(plan.m4, s.m4);
  Object.assign(plan.m5, s.m5);
  Object.assign(plan.impact!, s.impact);
  Object.assign(plan.mission!, s.mission);
  return JSON.parse(JSON.stringify(plan)) as Plan;
}
