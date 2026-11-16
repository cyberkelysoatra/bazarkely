// MADIO NOSY example, module 5 (source step 8), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 13 000, 2 500, 17 000 (product 1 = the old single product); fixed costs 740 000;
// needs = resources = 10 720 000; growth = exact ratio of the old sales (34 / 24, 42 / 34).
// The compost sale is NOT a revenue: it stays in the assumptions (safety margin).
// Working days left at 0: a monthly subscription has no "per day" break-even.
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { direct, inv, k, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('ev-p1', 'Abonnement collecte entreprise', 'entreprise par mois', 50000, 24, [
      k('ev-c1', 'Carburant du tricycle (13 passages)', 5000, 1, 'l', 1.6),
      direct('ev-c2', 'Sciure, sacs et produit de lavage', 3000),
      direct('ev-c3', 'Usure et remplacement des bacs', 2000)
    ]),
    produit('ev-p2', 'Abonnement collecte foyer', 'foyer par mois', 10000, 40, [k('ev-c4', 'Carburant', 5000, 1, 'l', 0.4), direct('ev-c5', 'Sacs', 500)]),
    produit('ev-p3', "Collecte d'un événement", 'événement', 80000, 2, [k('ev-c6', 'Carburant', 5000, 1, 'l', 3), direct('ev-c7', 'Sacs et lavage', 2000)])
  ],
  // Salaries: my pay 300 000 + the collector (full time) 315 000. Rent: the composting ground.
  chargesFixes: {
    loyer: 50000,
    salaires: 615000,
    energie: null,
    transport: null,
    telephone: 20000,
    autres: null,
    lignes: [l('ev-f1', 'Entretien du tricycle', 40000), l('ev-f2', 'Promotion', 15000)]
  },
  joursParMois: 0,
  investissements: [
    inv('ev-i1', "Tricycle motorisé de collecte, d'occasion", 1, 5500000),
    inv('ev-i2', 'Bacs fermés de 50 litres', 60, 25000),
    inv('ev-i3', 'Aire de compostage (bâche, abri, clôture, outils)', 1, 1200000),
    inv('ev-i4', 'Démarches de formalisation', 1, 200000)
  ],
  // Sawdust and bags to start, inside the working capital (3 months of fixed costs 2 220 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: [res('ev-res1', 'argent', 'Mes économies', 920000), res('ev-res2', 'subvention', 'Concours GEW', 6500000), res('ev-res3', 'pret', 'Prêt', 3300000)],
  hausses: [(34 / 24 - 1) * 100, (42 / 34 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 740000 }, { chargesFixesMois: 900000 }],
  tauxImpot: null,
  hypotheses:
    "24 établissements en moyenne en année 1 ; la vente du compost n'est pas comptée : elle ne commence qu'au 4e mois et ses acheteurs restent à convaincre ; si elle marche (par exemple 40 sacs de 25 kg par mois à 15 000 Ar, soit 600 000 Ar par mois), c'est un bonus qui protège le projet. Le tricycle s'use : son entretien est dans les charges fixes (pas d'amortissement). Charges fixes de l'année 3 : une aide au compostage à mi-temps (900 000 par mois).",
  risques: [
    { id: 'ev-r1', risque: 'La commune lance sa propre collecte.', reponse: 'Proposer une convention avec elle.' },
    { id: 'ev-r2', risque: 'Plaintes des voisins pour les odeurs.', reponse: "Terrain à l'écart, tas couverts et retournés chaque semaine." },
    { id: 'ev-r3', risque: 'Panne du tricycle.', reponse: "Contrat d'entretien avec un garage, location d'une charrette en dépannage." },
    { id: 'ev-r4', risque: 'Saison basse.', reponse: 'Abonnement plus léger, 2 passages par semaine.' }
  ]
};
