// Progress of "Mes notes": 100 as soon as something is written.
import type { Plan } from '../../types';

export function progression(plan: Plan): number {
  return plan.notes.trim() ? 100 : 0;
}
