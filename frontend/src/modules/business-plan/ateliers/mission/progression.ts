// Progress of "Ma mission de terrain": 100 % only once done (3 interviews, a decision, every update
// validated or refused); below, the share of the loop, the sentence, the 3 interviews and the decision.
import type { Plan } from '../../types';
import { missionDe } from '../../etat/vide';
import { MIN_ENTRETIENS, missionTerminee, nbEntretiens } from './regles';

export function progression(plan: Plan): number {
  if (missionTerminee(plan)) return 100;
  const m = missionDe(plan);
  const n = Math.min(nbEntretiens(plan), MIN_ENTRETIENS);
  const points = (m.boucle.statut !== '' ? 1 : 0) + (m.presentation.trim() ? 1 : 0) + n + (m.decision ? 1 : 0);
  return Math.min(90, Math.round((points / (MIN_ENTRETIENS + 3)) * 100));
}
