// JUS'NOSY example, module 5 (workbook pages 13 to 15), NEC-CC-38: 3 products with their recipes,
// detailed investments, one list of resources (LISTES-M5-EXEMPLES.md v0.3, validated by CGA on 16/11/2026).
// Exact figures (tests in utils/chiffres.test.ts): costs 1 400, 1 070, 150; turnover 4 500 000 per month,
// variable costs 2 091 000, margin 2 409 000; fixed costs 1 230 000; break-even 2 297 634 Ar per month,
// 91 906 Ar per day; needs 9 000 000 (4 200 000 bought + 800 000 brought + working capital 4 000 000)
// = resources 9 000 000; results 14 148 000, 22 487 640, 29 699 550 (growth 33 % then 25 %).
import type { Plan } from '../../types';
import { direct, inv, k, produit, res } from '../exemples/assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('ex-p1', 'Jus de fruits 1 L', 'bouteille', 3000, 1200, [
      k('ex-c1', 'Mangues', 16000, 20, 'kg', 1),
      k('ex-c2', 'Sucre', 150000, 50, 'kg', 50, 'g'),
      direct('ex-c3', 'Part de la bouteille consignée (casse, lavage)', 200),
      k('ex-c4', 'Étiquette et bouchon', 10000, 100, 'piece', 1),
      direct('ex-c5', 'Énergie de production', 150)
    ]),
    produit('ex-p2', 'Jus citron gingembre 50 cl', 'petite bouteille', 2000, 300, [
      k('ex-c6', 'Citrons', 20000, 10, 'kg', 0.25),
      k('ex-c7', 'Gingembre', 6000, 1, 'kg', 20, 'g'),
      k('ex-c8', 'Sucre', 150000, 50, 'kg', 40, 'g'),
      direct('ex-c9', 'Part de la petite bouteille', 150),
      k('ex-c10', 'Étiquette et bouchon', 10000, 100, 'piece', 1),
      direct('ex-c11', 'Énergie', 80)
    ]),
    produit('ex-p3', 'Glace de fruits', 'sachet', 500, 600, [
      k('ex-c12', 'Mangues', 16000, 20, 'kg', 100, 'g'),
      k('ex-c13', 'Sucre', 150000, 50, 'kg', 10, 'g'),
      k('ex-c14', 'Sachets', 15000, 1000, 'piece', 1),
      direct('ex-c15', 'Énergie', 25)
    ])
  ],
  chargesFixes: { loyer: 300000, salaires: 630000, energie: 100000, transport: 150000, telephone: 50000, autres: null, lignes: [] },
  joursParMois: 25,
  investissements: [
    inv('ex-i1', 'Extracteur de jus professionnel', 1, 1500000),
    inv('ex-i2', 'Réfrigérateur vitré', 1, 2000000),
    inv('ex-i4', 'Bouteilles en verre', 1000, 700)
  ],
  stockDepart: 310000,
  fondsRoulementSaisi: null,
  ressources: [
    res('ex-res1', 'argent', 'Mes économies', 1200000),
    res('ex-res2', 'materiel', "Matériel de cuisine et d'hygiène que je possède", 800000),
    res('ex-res3', 'subvention', 'Concours GEW', 5000000),
    res('ex-res4', 'pret', 'Prêt', 2000000)
  ],
  hausses: [33, 25],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 1330000 }, { chargesFixesMois: 1530000 }],
  tauxImpot: null,
  hypotheses:
    "Les ventes viennent de 6 hôtels et 4 restaurants de Hell-Ville et d'Ambatoloaka rencontrés pendant l'enquête : environ 40 bouteilles par jour au départ. Les fruits sont achetés au marché de Hell-Ville au prix relevé en novembre. Le prix de 3 000 Ar est celui accepté par les hôtels interrogés. La hausse des années 2 et 3 vient de nouveaux clients pendant la haute saison touristique.",
  risques: [
    { id: 'ex-r1', risque: "Les fruits manquent ou deviennent chers hors saison.", reponse: "Travailler avec 3 producteurs sous contrat et changer de fruit selon la saison (mangue, ananas, citron)." },
    { id: 'ex-r2', risque: 'Les hôtels paient en retard.', reponse: 'Paiement à la livraison pour les nouveaux clients, et pas plus de 15 jours de crédit pour les autres.' },
    { id: 'ex-r3', risque: 'Le réfrigérateur tombe en panne ou le courant est coupé.', reponse: "Contrat d'entretien avec un réparateur de Hell-Ville et glacières pour tenir une journée." }
  ]
};
