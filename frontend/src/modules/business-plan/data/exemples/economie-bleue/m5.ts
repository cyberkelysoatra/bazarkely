// FRAÎCHEUR BAY example, module 5 (source step 8): cost 12 800, margin 4 200 (25 %), fixed costs 785 000,
// break-even 187 kg, needs = resources = 7 655 000, results 10 740 000, 16 380 000, 22 080 000.
import type { Plan } from '../../../types';
import { l } from '../assembler';

export const m5: Partial<Plan['m5']> = {
  couts: [l('eb-c1', 'Poisson acheté au pêcheur', 11000), l('eb-c2', 'Glace', 800), l('eb-c3', 'Transport (entretien et pièces du vélo, au kg)', 700), l('eb-c4', 'Sacs et emballage', 300)],
  prixVente: 17000,
  // Salaries: my pay 300 000 + the delivery man (full time) 315 000.
  chargesFixes: { loyer: null, salaires: 615000, energie: 80000, transport: null, telephone: 40000, autres: null, lignes: [l('eb-f1', 'Entretien du matériel', 30000), l('eb-f2', 'Promotion', 20000)] },
  joursParMois: 25,
  investissements: [
    l('eb-i1', 'Vélo cargo', 1200000),
    l('eb-i2', '3 glacières de 100 litres', 900000),
    l('eb-i3', 'Congélateur coffre', 1800000),
    l('eb-i4', 'Balance', 300000),
    l('eb-i5', 'Téléphone', 500000),
    l('eb-i6', 'Démarches de formalisation', 200000)
  ],
  stockDepart: 400000,
  fondsRoulementSaisi: null,
  ressources: { apport: 1155000, subvention: 4500000, pret: 2000000, autre: null, autreLibelle: '' },
  annees: [
    { ventesParMois: 400, chargesFixesMois: null },
    { ventesParMois: 550, chargesFixesMois: 945000 },
    { ventesParMois: 700, chargesFixesMois: 1100000 }
  ],
  tauxImpot: null,
  hypotheses:
    "Prix du poisson relevés au retour des pirogues ; 10 % du marché la première année ; ventes de l'année 3 sous la capacité (700 sur 1 500). Charges fixes de l'année 2 : second livreur à mi-temps (945 000 par mois) ; de l'année 3 : à temps plein (1 100 000 par mois).",
  risques: [
    { id: 'eb-r1', risque: 'Mauvais temps : les pirogues ne sortent pas.', reponse: 'Stock de 2 jours au congélateur.' },
    { id: 'eb-r2', risque: "Hausse du prix d'achat : la marge est serrée, 1 000 Ar de plus au kg font perdre un quart de la marge.", reponse: '' },
    { id: 'eb-r3', risque: 'Un client qui ne paie pas.', reponse: 'Paiement à la livraison.' }
  ]
};
