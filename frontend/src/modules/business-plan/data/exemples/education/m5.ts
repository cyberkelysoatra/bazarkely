// MIANATRA PLUS example, module 5 (source step 8): cost 2 500, margin 17 500 (88 %), fixed costs 750 000,
// break-even 43 pupils, needs = resources = 8 150 000. The source counts 10 paying months a year
// (results 1 500 000, 3 250 000, 4 700 000); the app counts 12 (sales per month x 12): see the
// NEC-CC-13 report. Working days left at 0: the source gives none (no "per day" break-even).
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [l('ed-c1', 'Supports et photocopies', 1500), l('ed-c2', 'Électricité des ordinateurs (par élève)', 1000)],
  prixVente: 20000,
  // Salaries: my pay 300 000 + the part-time teacher (half time) 160 000. Rent: the room.
  chargesFixes: { loyer: 200000, salaires: 460000, energie: null, transport: null, telephone: 40000, autres: null, lignes: [l('ed-f1', 'Entretien des ordinateurs', 30000), l('ed-f2', 'Promotion', 20000)] },
  joursParMois: 0,
  investissements: [
    l('ed-i1', '4 ordinateurs reconditionnés', 3600000),
    l('ed-i2', 'Tables et chaises pour 20', 1200000),
    l('ed-i3', 'Tableau et éclairage solaire', 800000),
    l('ed-i4', 'Démarches de formalisation', 200000)
  ],
  // Teaching material, inside the working capital (3 months of fixed costs 2 250 000 + 100 000).
  stockDepart: 100000,
  fondsRoulementSaisi: null,
  ressources: { apport: 1150000, subvention: 5000000, pret: 2000000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 60, chargesFixesMois: null },
    { ventesParMois: 70, chargesFixesMois: 750000 },
    { ventesParMois: 80, chargesFixesMois: 775000 }
  ],
  tauxImpot: null,
  hypotheses:
    "10 mois payants par an, 12 mois de charges ; le stage d'août n'est pas compté, par prudence ; 80 élèves en année 3 = la salle pleine. Charges fixes de l'année 3 : hausse du loyer (775 000 par mois).",
  risques: [
    { id: 'ed-r1', risque: 'Vacances sans revenus.', reponse: "Stage de révision en août (non compté)." },
    { id: 'ed-r2', risque: 'Parents qui paient en retard.', reponse: "Paiement d'avance." },
    { id: 'ed-r3', risque: 'Une école qui ouvre des cours gratuits.', reponse: 'Informatique et petits groupes.' }
  ]
};
