// Progress of module 5: one step per required item (years 2 and 3 are optional).
// NEC-CC-38: the products weigh 3 steps (formerly costs, price and sales of the single product): a
// product counts when it has a name, a price, sales and at least one component with a computable cost.
import type { Plan } from '../../types';
import { chargesFixesMois, chiffresProduit, totalInvestissement } from '../../utils/chiffres';

/** True when a product has a name, a price, sales and a computable cost (NEC-CC-38). */
export function produitComplet(p: Plan['m5']['produits'][number]): boolean {
  return p.nom.trim() !== '' && p.prix !== null && p.ventesParMois !== null && chiffresProduit(p).coutCalcule;
}

export function progression(plan: Plan): number {
  const m5 = plan.m5;
  // Products started (anything typed); an untouched empty product never lowers the gauge.
  const entames = m5.produits.filter((p) => p.nom.trim() || p.prix !== null || p.ventesParMois !== null || p.composants.some((c) => c.designation.trim() || c.prixLot !== null));
  const complets = entames.filter(produitComplet).length;
  const partProduits = entames.length ? (3 * complets) / entames.length : 0;
  const etapes = [
    plan.uniteVente.trim() !== '' || m5.produits.some((p) => p.unite.trim() !== ''),
    chargesFixesMois(m5) > 0,
    m5.investissements.some((i) => totalInvestissement(i) > 0) || m5.stockDepart !== null,
    m5.ressources.some((r) => r.valeur !== null),
    m5.hypotheses.trim() !== '',
    m5.risques.some((r) => r.risque.trim() !== '')
  ];
  return Math.round(((etapes.filter(Boolean).length + partProduits) / (etapes.length + 3)) * 100);
}
