// Progress of the synthesis: cards filled out of 6.
import type { Plan } from '../../types';
import { CARTES, cartesRemplies } from './brouillons';

export function progression(plan: Plan): number {
  return Math.round((cartesRemplies(plan) / CARTES.length) * 100);
}
