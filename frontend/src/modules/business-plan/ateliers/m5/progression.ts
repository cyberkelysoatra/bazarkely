// Progress of module 5: one step per required item (years 2 and 3 are optional).
import type { Plan } from '../../types';
import { chargesFixesMois, somme } from '../../utils/chiffres';

export function progression(plan: Plan): number {
  const m5 = plan.m5;
  const etapes = [
    plan.uniteVente.trim() !== '',
    m5.couts.some((l) => l.montant !== null),
    m5.prixVente !== null,
    chargesFixesMois(m5) > 0,
    somme(m5.investissements) > 0 || m5.stockDepart !== null,
    [m5.ressources.apport, m5.ressources.subvention, m5.ressources.pret, m5.ressources.autre].some((v) => v !== null),
    m5.annees[0]?.ventesParMois !== null && m5.annees[0]?.ventesParMois !== undefined,
    m5.hypotheses.trim() !== '',
    m5.risques.some((r) => r.risque.trim() !== '')
  ];
  return Math.round((etapes.filter(Boolean).length / etapes.length) * 100);
}
