// Progress of the peer review: points answered (Oui or À revoir) out of 10.
import type { Plan } from '../../types';
import { POINTS, pointsRepondus } from './points';

export function progression(plan: Plan): number {
  return Math.round((pointsRepondus(plan) / POINTS.length) * 100);
}
