// JIRO KELY example, module 5 (source step 8): cost 150, margin 850 (85 %), fixed costs 590 000,
// break-even 695 rentals (27 per evening on 26 nights), needs = resources = 9 370 000,
// results 8 832 000, 13 320 000, 15 540 000.
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [l('en-c1', 'Entretien et casse (réserve par nuit)', 100), l('en-c2', 'Nettoyage et petits consommables', 50)],
  prixVente: 1000,
  // Salaries: my pay 300 000 + the helper (half time) 160 000. Rent: the place at the market.
  chargesFixes: { loyer: 50000, salaires: 460000, energie: null, transport: null, telephone: 30000, autres: null, lignes: [l('en-f1', 'Entretien des panneaux', 30000), l('en-f2', 'Promotion', 20000)] },
  joursParMois: 26,
  investissements: [
    l('en-i1', '120 lampes solaires', 3000000),
    l('en-i2', 'Station de recharge solaire (panneaux, batteries, régulateur)', 3500000),
    l('en-i3', 'Kiosque et étagères', 800000),
    l('en-i4', 'Démarches de formalisation', 200000)
  ],
  // Spare parts, inside the working capital (3 months of fixed costs 1 770 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: { apport: 870000, subvention: 6000000, pret: 2500000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 1560, chargesFixesMois: null },
    { ventesParMois: 2000, chargesFixesMois: 590000 },
    { ventesParMois: 2400, chargesFixesMois: 745000 }
  ],
  tauxImpot: null,
  hypotheses:
    "La moitié des lampes sorties chaque soir en année 1 ; les cautions ne sont pas comptées comme revenus ; les lampes s'usent : la réserve de 100 Ar par nuit sert à les remplacer (pas d'amortissement). Charges fixes de l'année 3 : l'aide passe à temps plein (745 000 par mois).",
  risques: [
    { id: 'en-r1', risque: 'Lampes non rendues.', reponse: 'Caution de 10 000 Ar.' },
    { id: 'en-r2', risque: 'Moins de soleil en saison des pluies.', reponse: 'Panneaux dimensionnés pour 2 jours.' },
    { id: 'en-r3', risque: 'Raccordement du quartier.', reponse: 'Clientèle des coupures.' }
  ]
};
