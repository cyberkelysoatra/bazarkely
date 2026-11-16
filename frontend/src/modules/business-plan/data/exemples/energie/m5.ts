// JIRO KELY example, module 5 (source step 8), NEC-CC-38: 3 products (LISTES-M5-EXEMPLES.md v0.3).
// Costs 150, 30, 200 (product 1 = the old single product); fixed costs 590 000;
// needs = resources = 9 370 000; growth = exact ratio of the old sales (2 000 / 1 560, 2 400 / 2 000).
// Figures computed by the app: see data/exemples/exemples.test.ts.
import type { Plan } from '../../../types';
import { direct, inv, l, produit, res } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  modele: 2,
  produits: [
    produit('en-p1', 'Location de lampe solaire', 'nuit', 1000, 1560, [direct('en-c1', 'Entretien et casse (réserve par nuit)', 100), direct('en-c2', 'Nettoyage et petits consommables', 50)]),
    produit('en-p2', 'Recharge de téléphone', 'recharge', 300, 600, [direct('en-c3', 'Usure des batteries', 30)]),
    produit('en-p3', 'Location de batterie pour radio', 'jour', 1500, 100, [direct('en-c4', 'Entretien et casse', 200)])
  ],
  // Salaries: my pay 300 000 + the helper (half time) 160 000. Rent: the place at the market.
  chargesFixes: { loyer: 50000, salaires: 460000, energie: null, transport: null, telephone: 30000, autres: null, lignes: [l('en-f1', 'Entretien des panneaux', 30000), l('en-f2', 'Promotion', 20000)] },
  joursParMois: 26,
  investissements: [
    inv('en-i1', 'Lampes solaires', 120, 25000),
    inv('en-i2', 'Station de recharge solaire (panneaux, batteries, régulateur)', 1, 3500000),
    inv('en-i3', 'Kiosque et étagères', 1, 800000),
    inv('en-i4', 'Démarches de formalisation', 1, 200000)
  ],
  // Spare parts, inside the working capital (3 months of fixed costs 1 770 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: [res('en-res1', 'argent', 'Mes économies', 870000), res('en-res2', 'subvention', 'Concours GEW', 6000000), res('en-res3', 'pret', 'Prêt', 2500000)],
  hausses: [(2000 / 1560 - 1) * 100, (2400 / 2000 - 1) * 100],
  annees: [{ chargesFixesMois: null }, { chargesFixesMois: 590000 }, { chargesFixesMois: 745000 }],
  tauxImpot: null,
  hypotheses:
    "La moitié des lampes sorties chaque soir en année 1 ; les cautions ne sont pas comptées comme revenus ; les lampes s'usent : la réserve de 100 Ar par nuit sert à les remplacer (pas d'amortissement). Charges fixes de l'année 3 : l'aide passe à temps plein (745 000 par mois).",
  risques: [
    { id: 'en-r1', risque: 'Lampes non rendues.', reponse: 'Caution de 10 000 Ar.' },
    { id: 'en-r2', risque: 'Moins de soleil en saison des pluies.', reponse: 'Panneaux dimensionnés pour 2 jours.' },
    { id: 'en-r3', risque: 'Raccordement du quartier.', reponse: 'Clientèle des coupures.' }
  ]
};
