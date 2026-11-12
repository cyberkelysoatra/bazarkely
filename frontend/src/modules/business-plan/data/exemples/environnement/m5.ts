// MADIO NOSY example, module 5 (source step 8): cost 13 000, margin 37 000 (74 %), fixed costs 740 000,
// break-even 20 subscribed businesses, needs = resources = 10 720 000, results 1 776 000, 6 216 000,
// 7 848 000. The compost sale is NOT a revenue: it stays in the assumptions (safety margin).
// Working days left at 0: a monthly subscription has no "per day" break-even.
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [
    l('ev-c1', 'Carburant du tricycle (13 passages)', 8000),
    l('ev-c2', 'Sciure, sacs et produit de lavage', 3000),
    l('ev-c3', 'Usure et remplacement des bacs', 2000)
  ],
  prixVente: 50000,
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
    l('ev-i1', "Tricycle motorisé de collecte, d'occasion", 5500000),
    l('ev-i2', '60 bacs fermés de 50 litres', 1500000),
    l('ev-i3', 'Aire de compostage (bâche, abri, clôture, outils)', 1200000),
    l('ev-i4', 'Démarches de formalisation', 200000)
  ],
  // Sawdust and bags to start, inside the working capital (3 months of fixed costs 2 220 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: { apport: 920000, subvention: 6500000, pret: 3300000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 24, chargesFixesMois: null },
    { ventesParMois: 34, chargesFixesMois: 740000 },
    { ventesParMois: 42, chargesFixesMois: 900000 }
  ],
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
