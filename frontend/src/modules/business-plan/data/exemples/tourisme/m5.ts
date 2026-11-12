// TRANO KELY example, module 5 (source ETAPE-08): cost 15 250, margin 29 750 (66 %), fixed costs 680 000,
// break-even 23 nights, needs = resources = 7 830 000, results 11 118 000, 12 336 000, 13 404 000.
// The source gives the working capital (2 130 000) but not the starting stock: typed as is.
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [
    l('to-c1', 'Lessive et séchage du linge', 3000),
    l('to-c2', 'Électricité et eau de la chambre', 4000),
    l('to-c3', "Produits d'accueil (savon, papier)", 1500),
    l('to-c4', 'Commission du site de réservation (15 % de 45 000, à vérifier)', 6750)
  ],
  prixVente: 45000,
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
    l('to-i1', '3 lits et matelas', 1800000),
    l('to-i2', 'Linge (draps, serviettes)', 600000),
    l('to-i3', '3 ventilateurs', 450000),
    l('to-i4', "Petits travaux (peinture, salle d'eau)", 1500000),
    l('to-i5', "Lampes solaires et réservoir d'eau", 650000),
    l('to-i6', 'Téléphone pour les réservations', 500000),
    l('to-i7', 'Démarches de formalisation', 200000)
  ],
  stockDepart: null,
  fondsRoulementSaisi: 2130000,
  ressources: { apport: 830000, subvention: 5000000, pret: 2000000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 54, chargesFixesMois: null },
    { ventesParMois: 68, chargesFixesMois: 995000 },
    { ventesParMois: 72, chargesFixesMois: 1025000 }
  ],
  tauxImpot: null,
  hypotheses:
    "Prix : 45 000 Ar, comparé à 3 concurrents relevés à la mission. Occupation : 60 % en année 1, à cause de la basse saison. Commission : 15 %, à vérifier sur le site. La maison familiale est un apport en nature : non chiffré. Charges fixes en hausse en année 2 : la femme de ménage passe à temps plein (315 000 Ar) et un accueil du soir est embauché à mi-temps (160 000 Ar). Par prudence, les séjours au mois des volontaires ne sont pas comptés.",
  risques: [
    { id: 'to-r1', risque: 'Basse saison.', reponse: 'Prix au mois pour les volontaires.' },
    { id: 'to-r2', risque: 'Aucun avis au démarrage.', reponse: 'Un avis demandé à chaque départ.' },
    { id: 'to-r3', risque: "Coupures d'eau.", reponse: 'Réservoir.' }
  ]
};
