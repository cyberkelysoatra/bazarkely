// TRANO KELY example, module 5 (source ETAPE-08), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 15 250, 2 900, 1 500 (product 1 = the old single product); fixed costs 680 000;
// needs = resources = 7 830 000; growth = exact ratio of the old sales (68 / 54, 72 / 68).
// The source gives the working capital (2 130 000) but not the starting stock: typed as is.
// The 3 bicycles are lent by the family: no investment added (said in the assumptions).
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { direct, inv, k, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('to-p1', 'Nuitée en chambre', 'nuit', 45000, 54, [
      direct('to-c1', 'Lessive et séchage du linge', 3000),
      direct('to-c2', 'Électricité et eau de la chambre', 4000),
      direct('to-c3', "Produits d'accueil (savon, papier)", 1500),
      direct('to-c4', 'Commission du site de réservation (15 % de 45 000)', 6750)
    ]),
    produit('to-p2', 'Petit-déjeuner', 'personne', 8000, 40, [
      direct('to-c5', 'Pain et beurre', 1000),
      k('to-c6', 'Fruits', 4000, 1, 'kg', 0.3),
      k('to-c7', 'Café', 20000, 1, 'kg', 0.02),
      direct('to-c8', 'Énergie', 300)
    ]),
    produit('to-p3', 'Location de vélo', 'jour', 15000, 15, [direct('to-c9', 'Entretien et pièces', 1500)])
  ],
  // Salaries: my pay 300 000 + the cleaning lady (half time) 160 000. Rent 0: family house.
  chargesFixes: {
    loyer: 0,
    salaires: 460000,
    energie: 50000,
    transport: null,
    telephone: 60000,
    autres: null,
    lignes: [l('to-f1', 'Promotion', 60000), l('to-f2', 'Entretien et petites réparations', 50000)]
  },
  // 3 rooms x 30 nights: the source counts 30 nights a month.
  joursParMois: 30,
  investissements: [
    inv('to-i1', 'Lits et matelas', 3, 600000),
    inv('to-i2', 'Linge (draps, serviettes)', 1, 600000),
    inv('to-i3', 'Ventilateurs', 3, 150000),
    inv('to-i4', "Petits travaux (peinture, salle d'eau)", 1, 1500000),
    inv('to-i5', "Lampes solaires et réservoir d'eau", 1, 650000),
    inv('to-i6', 'Téléphone pour les réservations', 1, 500000),
    inv('to-i7', 'Démarches de formalisation', 1, 200000)
  ],
  stockDepart: null,
  fondsRoulementSaisi: 2130000,
  ressources: [res('to-res1', 'argent', 'Mes économies', 830000), res('to-res2', 'subvention', 'Concours GEW', 5000000), res('to-res3', 'pret', 'Prêt', 2000000)],
  hausses: [(68 / 54 - 1) * 100, (72 / 68 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 995000 }, { chargesFixesMois: 1025000 }],
  tauxImpot: null,
  hypotheses:
    "Prix : 45 000 Ar, comparé à 3 concurrents relevés à la mission. Occupation : 60 % en année 1, à cause de la basse saison. Commission : 15 %, à vérifier sur le site. La maison familiale est un apport en nature : non chiffré. Charges fixes en hausse en année 2 : la femme de ménage passe à temps plein (315 000 Ar) et un accueil du soir est embauché à mi-temps (160 000 Ar). Par prudence, les séjours au mois des volontaires ne sont pas comptés.",
  risques: [
    { id: 'to-r1', risque: 'Basse saison.', reponse: 'Prix au mois pour les volontaires.' },
    { id: 'to-r2', risque: 'Aucun avis au démarrage.', reponse: 'Un avis demandé à chaque départ.' },
    { id: 'to-r3', risque: "Coupures d'eau.", reponse: 'Réservoir.' }
  ]
};
