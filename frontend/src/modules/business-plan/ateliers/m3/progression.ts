// Progress of module 3: the 3a inputs, at least one competitor, the 4 SWOT cards.
import type { Plan } from '../../types';

export function progression(plan: Plan): number {
  const m3 = plan.m3;
  const t = (s: string) => s.trim() !== '';
  const etapes = [
    t(plan.uniteVente),
    m3.nbClients !== null,
    t(m3.nbClientsSource),
    m3.qteParAchat !== null,
    t(m3.qteSource),
    m3.achatsParMois !== null,
    t(m3.achatsSource),
    m3.prixPrevu !== null,
    m3.partVisee !== null,
    m3.concurrents.some((c) => t(c.nom)),
    t(m3.swot.forces),
    t(m3.swot.faiblesses),
    t(m3.swot.opportunites),
    t(m3.swot.menaces)
  ];
  return Math.round((etapes.filter(Boolean).length / etapes.length) * 100);
}
