// FIX'NOSY example, module 5 (source step 8): cost 13 500, margin 11 500 (46 %), fixed costs 580 000,
// break-even 51 repairs (2 per day on 26 days), needs = resources = 6 740 000,
// results 5 460 000, 9 060 000, 11 340 000.
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [l('nu-c1', 'Pièce', 12000), l('nu-c2', 'Transport de la pièce depuis Antananarivo', 1000), l('nu-c3', 'Consommables (soudure, colle, nettoyant)', 500)],
  prixVente: 25000,
  // Salaries: my pay 300 000 (alone in year 1).
  chargesFixes: { loyer: 150000, salaires: 300000, energie: 40000, transport: null, telephone: 40000, autres: null, lignes: [l('nu-f1', 'Promotion', 30000), l('nu-f2', 'Entretien des outils', 20000)] },
  joursParMois: 26,
  investissements: [
    l('nu-i1', 'Station de soudure et outillage', 1500000),
    l('nu-i2', 'Loupe binoculaire', 600000),
    l('nu-i3', 'Aménagement du local (comptoir, éclairage)', 700000),
    l('nu-i4', 'Démarches de formalisation', 200000)
  ],
  // Starting stock of parts, inside the working capital (3 months of fixed costs 1 740 000 + 2 000 000).
  stockDepart: 2000000,
  fondsRoulementSaisi: null,
  ressources: { apport: 1240000, subvention: 4000000, pret: 1500000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 90, chargesFixesMois: null },
    { ventesParMois: 130, chargesFixesMois: 740000 },
    { ventesParMois: 160, chargesFixesMois: 895000 }
  ],
  tauxImpot: null,
  hypotheses:
    "Panier moyen de 25 000 Ar d'après 5 vendeurs interrogés ; les ventes d'accessoires (coques, câbles) ne sont pas comptées, par prudence ; ventes de l'année 2 sous la capacité avec l'apprenti (130 sur 234). Charges fixes de l'année 2 : apprenti à mi-temps (740 000 par mois) ; de l'année 3 : à temps plein (895 000 par mois).",
  risques: [
    { id: 'nu-r1', risque: 'Pièces bloquées en route.', reponse: "Stock d'un mois des pièces courantes." },
    { id: 'nu-r2', risque: 'Retours sous garantie.', reponse: '' },
    { id: 'nu-r3', risque: 'Un réparateur qui baisse ses prix.', reponse: '' }
  ]
};
