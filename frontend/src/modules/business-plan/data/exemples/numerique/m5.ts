// FIX'NOSY example, module 5 (source step 8), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 13 500, 10 500, 2 200 (product 1 = the old single product); fixed costs 580 000;
// needs = resources = 6 740 000; growth = exact ratio of the old sales (130 / 90, 160 / 130).
// CGA remark (v0.3, not blocking): the 12 000 Ar screen looks low, to review on the next pass on the examples.
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { inv, k, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('nu-p1', "Réparation d'écran de smartphone", 'réparation', 25000, 90, [
      k('nu-c1', 'Écran', 12000, 1, 'piece', 1),
      k('nu-c2', 'Transport de la pièce depuis Antananarivo', 10000, 10, 'piece', 1),
      k('nu-c3', 'Consommables (soudure, colle, nettoyant)', 40000, 80, 'piece', 1)
    ]),
    produit('nu-p2', 'Changement de batterie', 'réparation', 18000, 40, [
      k('nu-c4', 'Batterie', 9000, 1, 'piece', 1),
      k('nu-c5', 'Transport', 10000, 10, 'piece', 1),
      k('nu-c6', 'Consommables', 40000, 80, 'piece', 1)
    ]),
    produit('nu-p3', 'Verre de protection posé', 'pièce', 5000, 100, [k('nu-c7', 'Verres', 100000, 50, 'piece', 1), k('nu-c8', 'Transport', 10000, 50, 'piece', 1)])
  ],
  // Salaries: my pay 300 000 (alone in year 1).
  chargesFixes: { loyer: 150000, salaires: 300000, energie: 40000, transport: null, telephone: 40000, autres: null, lignes: [l('nu-f1', 'Promotion', 30000), l('nu-f2', 'Entretien des outils', 20000)] },
  joursParMois: 26,
  investissements: [
    inv('nu-i1', 'Station de soudure et outillage', 1, 1500000),
    inv('nu-i2', 'Loupe binoculaire', 1, 600000),
    inv('nu-i3', 'Aménagement du local (comptoir, éclairage)', 1, 700000),
    inv('nu-i4', 'Démarches de formalisation', 1, 200000)
  ],
  // Starting stock of parts, inside the working capital (3 months of fixed costs 1 740 000 + 2 000 000).
  stockDepart: 2000000,
  fondsRoulementSaisi: null,
  ressources: [res('nu-res1', 'argent', 'Mes économies', 1240000), res('nu-res2', 'subvention', 'Concours GEW', 4000000), res('nu-res3', 'pret', 'Prêt', 1500000)],
  hausses: [(130 / 90 - 1) * 100, (160 / 130 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 740000 }, { chargesFixesMois: 895000 }],
  tauxImpot: null,
  hypotheses:
    "Panier moyen de 25 000 Ar d'après 5 vendeurs interrogés ; les ventes d'accessoires (coques, câbles) ne sont pas comptées, par prudence ; ventes de l'année 2 sous la capacité avec l'apprenti (130 sur 234). Charges fixes de l'année 2 : apprenti à mi-temps (740 000 par mois) ; de l'année 3 : à temps plein (895 000 par mois).",
  risques: [
    { id: 'nu-r1', risque: 'Pièces bloquées en route.', reponse: "Stock d'un mois des pièces courantes." },
    { id: 'nu-r2', risque: 'Retours sous garantie.', reponse: '' },
    { id: 'nu-r3', risque: 'Un réparateur qui baisse ses prix.', reponse: '' }
  ]
};
