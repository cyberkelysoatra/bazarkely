// Progress of "Et après ?": my three next actions written (an action counts when its text is filled).
import type { Plan } from '../../types';
import { NB_ACTIONS } from './calendrier';

export function progression(plan: Plan): number {
  const faites = plan.actions.slice(0, NB_ACTIONS).filter((a) => a.action.trim()).length;
  return Math.round((faites / NB_ACTIONS) * 100);
}
