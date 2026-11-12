// Progress of "Impact et emplois": 100 % once done (a job in year 1 and an impact sentence), else the share
// of the loop, year 1, clients served and sentence.
import type { Plan } from '../../types';
import { impactDe } from '../../etat/vide';
import { impactTermine, totaux } from './regles';

export function progression(plan: Plan): number {
  if (impactTermine(plan)) return 100;
  const impact = impactDe(plan);
  const etapes = [impact.boucle.statut !== '', totaux(impact)[0] > 0, impact.clientsMois !== null, impact.phrase.trim() !== ''];
  return Math.min(90, Math.round((etapes.filter(Boolean).length / etapes.length) * 100));
}
