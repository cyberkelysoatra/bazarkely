// Progress of "Mon pitch de 2 minutes": the frame (5 parts within 12 words), one full rehearsal, the 3 answers.
import type { Plan } from '../../types';
import { pitchDe } from '../../etat/vide';
import { MAX_MOTS, compterMots, trame } from './trame';
import { questionsPieges } from './questions';

export function trameComplete(plan: Plan): boolean {
  return trame(plan).every((t) => t.mots.trim() && compterMots(t.mots) <= MAX_MOTS);
}

export function repete(plan: Plan): boolean {
  return pitchDe(plan).essais.some((e) => e.mode === 'complet');
}

export function reponsesFaites(plan: Plan): number {
  const r = pitchDe(plan).reponses;
  return questionsPieges(plan).filter((q) => (r[q.id] ?? '').trim()).length;
}

export function progression(plan: Plan): number {
  const points = [trameComplete(plan) ? 1 : 0, repete(plan) ? 1 : 0, reponsesFaites(plan) / 3];
  return Math.round(((points[0] + points[1] + points[2]) / 3) * 100);
}
