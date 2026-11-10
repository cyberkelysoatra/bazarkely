// Progress of module 2: share of the 9 blocks of the canvas filled.
import type { Plan } from '../../types';
import { BLOCS } from './blocs';

export function progression(plan: Plan): number {
  return Math.round((BLOCS.filter((b) => plan.m2[b.cle].trim()).length / BLOCS.length) * 100);
}
