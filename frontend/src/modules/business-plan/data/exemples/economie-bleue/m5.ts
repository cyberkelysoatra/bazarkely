// FRAÎCHEUR BAY example, module 5 (source step 8), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 12 800, 10 800, 23 800 (product 1 = the old single product); fixed costs 785 000;
// needs = resources = 7 655 000; growth = exact ratio of the old sales (550 / 400, 700 / 550).
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { direct, inv, k, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('eb-p1', 'Poisson frais livré', 'kg', 17000, 400, [
      k('eb-c1', 'Poisson acheté au pêcheur', 220000, 20, 'kg', 1),
      k('eb-c2', 'Glace', 20000, 25, 'kg', 1),
      direct('eb-c3', 'Transport (entretien et pièces du vélo, au kg)', 700),
      k('eb-c4', 'Sacs et emballage', 30000, 100, 'piece', 1)
    ]),
    produit('eb-p2', 'Poulpe nettoyé', 'kg', 14000, 80, [
      k('eb-c5', 'Poulpe', 90000, 10, 'kg', 1),
      k('eb-c6', 'Glace', 20000, 25, 'kg', 1),
      direct('eb-c7', 'Transport', 700),
      k('eb-c8', 'Sacs', 30000, 100, 'piece', 1)
    ]),
    produit('eb-p3', 'Crevettes', 'kg', 30000, 30, [
      k('eb-c9', 'Crevettes', 110000, 5, 'kg', 1),
      k('eb-c10', 'Glace', 20000, 25, 'kg', 1),
      direct('eb-c11', 'Transport', 700),
      k('eb-c12', 'Sacs', 30000, 100, 'piece', 1)
    ])
  ],
  // Salaries: my pay 300 000 + the delivery man (full time) 315 000.
  chargesFixes: { loyer: null, salaires: 615000, energie: 80000, transport: null, telephone: 40000, autres: null, lignes: [l('eb-f1', 'Entretien du matériel', 30000), l('eb-f2', 'Promotion', 20000)] },
  joursParMois: 25,
  investissements: [
    inv('eb-i1', 'Vélo cargo', 1, 1200000),
    inv('eb-i2', 'Glacières de 100 litres', 3, 300000),
    inv('eb-i3', 'Congélateur coffre', 1, 1800000),
    inv('eb-i4', 'Balance', 1, 300000),
    inv('eb-i5', 'Téléphone', 1, 500000),
    inv('eb-i6', 'Démarches de formalisation', 1, 200000)
  ],
  stockDepart: 400000,
  fondsRoulementSaisi: null,
  ressources: [res('eb-res1', 'argent', 'Mes économies', 1155000), res('eb-res2', 'subvention', 'Concours GEW', 4500000), res('eb-res3', 'pret', 'Prêt', 2000000)],
  hausses: [(550 / 400 - 1) * 100, (700 / 550 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 945000 }, { chargesFixesMois: 1100000 }],
  tauxImpot: null,
  hypotheses:
    "Prix du poisson relevés au retour des pirogues ; 10 % du marché la première année ; ventes de l'année 3 sous la capacité (700 sur 1 500). Charges fixes de l'année 2 : second livreur à mi-temps (945 000 par mois) ; de l'année 3 : à temps plein (1 100 000 par mois).",
  risques: [
    { id: 'eb-r1', risque: 'Mauvais temps : les pirogues ne sortent pas.', reponse: 'Stock de 2 jours au congélateur.' },
    { id: 'eb-r2', risque: "Hausse du prix d'achat : la marge est serrée, 1 000 Ar de plus au kg font perdre un quart de la marge.", reponse: '' },
    { id: 'eb-r3', risque: 'Un client qui ne paie pas.', reponse: 'Paiement à la livraison.' }
  ]
};
