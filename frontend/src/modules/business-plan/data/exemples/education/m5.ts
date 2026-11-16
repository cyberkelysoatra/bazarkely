// MIANATRA PLUS example, module 5 (source step 8), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 2 500, 2 500, 130 (product 1 = the old single product); fixed costs 750 000;
// needs = resources = 8 150 000. The source counts 10 paying months a year while the app counts sales per
// month x 12 (NEC-CC-15-B): 50 pupils per month = 600 subscriptions a year. Growth = exact ratio of the old
// sales (700 / 600, 800 / 700). Working days left at 0: the source gives none (no "per day" break-even).
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { direct, inv, k, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('ed-p1', "Cours d'informatique, abonnement mensuel", 'élève', 20000, 50, [
      k('ed-c1', 'Ramette de papier', 25000, 500, 'piece', 30),
      direct('ed-c2', 'Électricité des ordinateurs (par élève)', 1000)
    ]),
    produit('ed-p2', "Stage de vacances d'une semaine", 'élève', 30000, 10, [k('ed-c3', 'Ramette de papier', 25000, 500, 'piece', 20), direct('ed-c4', 'Électricité', 1500)]),
    produit('ed-p3', 'Saisie et impression de documents', 'page', 500, 400, [
      k('ed-c5', 'Ramette de papier', 25000, 500, 'piece', 1),
      k('ed-c6', "Cartouche d'encre (1 000 pages)", 60000, 1000, 'piece', 1),
      direct('ed-c7', 'Électricité', 20)
    ])
  ],
  // Salaries: my pay 300 000 + the part-time teacher (half time) 160 000. Rent: the room.
  chargesFixes: { loyer: 200000, salaires: 460000, energie: null, transport: null, telephone: 40000, autres: null, lignes: [l('ed-f1', 'Entretien des ordinateurs', 30000), l('ed-f2', 'Promotion', 20000)] },
  joursParMois: 0,
  investissements: [
    inv('ed-i1', 'Ordinateurs reconditionnés', 4, 900000),
    inv('ed-i2', 'Tables et chaises pour 20', 1, 1200000),
    inv('ed-i3', 'Tableau et éclairage solaire', 1, 800000),
    inv('ed-i4', 'Démarches de formalisation', 1, 200000)
  ],
  // Teaching material, inside the working capital (3 months of fixed costs 2 250 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: [res('ed-res1', 'argent', 'Mes économies', 1150000), res('ed-res2', 'subvention', 'Concours GEW', 5000000), res('ed-res3', 'pret', 'Prêt', 2000000)],
  hausses: [(700 / 600 - 1) * 100, (800 / 700 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 750000 }, { chargesFixesMois: 775000 }],
  tauxImpot: null,
  hypotheses:
    "Cours payés 10 mois par an : ventes ramenées à une moyenne sur 12 mois (60, 70 et 80 élèves par mois d'école, soit 600, 700 et 800 abonnements par an). 10 mois payants par an, 12 mois de charges ; le stage d'août n'est pas compté, par prudence ; 80 élèves en année 3 = la salle pleine. Charges fixes de l'année 3 : hausse du loyer (775 000 par mois).",
  risques: [
    { id: 'ed-r1', risque: 'Vacances sans revenus.', reponse: "Stage de révision en août (non compté)." },
    { id: 'ed-r2', risque: 'Parents qui paient en retard.', reponse: "Paiement d'avance." },
    { id: 'ed-r3', risque: 'Une école qui ouvre des cours gratuits.', reponse: 'Informatique et petits groupes.' }
  ]
};
