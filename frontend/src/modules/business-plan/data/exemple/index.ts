// JUS'NOSY example (fictitious project of the workbook), assembled from one file per section.
// Each later phase fills ITS file only (data/exemple/<id>.ts), nothing to change here.
import type { Plan } from '../../types';
import { completerPlan } from '../../etat/vide';
import { identite, uniteVente } from './identite';
import { m1 } from './m1';
import { m2 } from './m2';
import { m3 } from './m3';
import { m4 } from './m4';
import { m5 } from './m5';
import { synthese } from './synthese';
import { relecture } from './relecture';
import { apres } from './apres';
import { prix } from './prix';
import { notes } from './notes';

export const ID_EXEMPLE = 'exemple';

/** A fresh copy of the example each call: nothing can change the original. Read only. */
export function planExemple(): Plan {
  const plan = completerPlan({
    id: ID_EXEMPLE,
    creeLe: '2026-11-11T08:45:00+03:00',
    modifieLe: '2026-11-11T08:45:00+03:00',
    rev: 0,
    uniteVente,
    ...apres,
    ...prix,
    ...notes
  });
  plan.exemple = true;
  Object.assign(plan.identite, identite);
  Object.assign(plan.m1, m1);
  Object.assign(plan.m2, m2);
  Object.assign(plan.m3, m3);
  Object.assign(plan.m4, m4);
  Object.assign(plan.m5, m5);
  Object.assign(plan.synthese, synthese);
  Object.assign(plan.relecture, relecture);
  return JSON.parse(JSON.stringify(plan)) as Plan;
}
