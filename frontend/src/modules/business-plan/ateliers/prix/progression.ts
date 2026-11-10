// Progress of "Mes prix relevés": 3 filled lines or more = 100 %, proportionally below.
import type { Plan } from '../../types';

export function progression(plan: Plan): number {
  const pleines = plan.prix.filter((l) => l.element.trim() && l.prix !== null).length;
  return Math.round((Math.min(pleines, 3) / 3) * 100);
}
