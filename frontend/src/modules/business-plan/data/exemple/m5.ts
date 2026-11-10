// JUS'NOSY example, module 5 (workbook pages 13 to 14). Exact figures: see utils/chiffres.test.ts.
import type { Plan } from '../../types';

const l = (id: string, libelle: string, montant: number) => ({ id, libelle, montant });

export const m5: Partial<Plan['m5']> = {
  couts: [
    l('ex-c1', 'Fruits', 800),
    l('ex-c2', 'Sucre', 150),
    l('ex-c3', 'Part de la bouteille consignée (casse, lavage)', 200),
    l('ex-c4', 'Étiquette et bouchon', 100),
    l('ex-c5', 'Énergie de production', 150)
  ],
  prixVente: 3000,
  chargesFixes: { loyer: 300000, salaires: 600000, energie: 100000, transport: 150000, telephone: 50000, autres: null, lignes: [] },
  joursParMois: 25,
  investissements: [
    l('ex-i1', 'Extracteur de jus professionnel', 1500000),
    l('ex-i2', 'Réfrigérateur vitré', 2000000),
    l('ex-i3', "Matériel de cuisine et d'hygiène", 800000),
    l('ex-i4', '1 000 bouteilles en verre', 700000)
  ],
  stockDepart: 400000,
  fondsRoulementSaisi: null,
  ressources: { apport: 2000000, subvention: 5000000, pret: 2000000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 1200, chargesFixesMois: null },
    { ventesParMois: 1600, chargesFixesMois: 1300000 },
    { ventesParMois: 2000, chargesFixesMois: 1500000 }
  ],
  tauxImpot: null,
  hypotheses:
    "Les ventes viennent de 6 hôtels et 4 restaurants de Hell-Ville et d'Ambatoloaka rencontrés pendant l'enquête : environ 40 bouteilles par jour au départ. Les fruits sont achetés au marché de Hell-Ville au prix relevé en novembre. Le prix de 3 000 Ar est celui accepté par les hôtels interrogés. La hausse des années 2 et 3 vient de nouveaux clients pendant la haute saison touristique.",
  risques: [
    { id: 'ex-r1', risque: "Les fruits manquent ou deviennent chers hors saison.", reponse: "Travailler avec 3 producteurs sous contrat et changer de fruit selon la saison (mangue, ananas, citron)." },
    { id: 'ex-r2', risque: 'Les hôtels paient en retard.', reponse: 'Paiement à la livraison pour les nouveaux clients, et pas plus de 15 jours de crédit pour les autres.' },
    { id: 'ex-r3', risque: 'Le réfrigérateur tombe en panne ou le courant est coupé.', reponse: "Contrat d'entretien avec un réparateur de Hell-Ville et glacières pour tenir une journée." }
  ]
};
