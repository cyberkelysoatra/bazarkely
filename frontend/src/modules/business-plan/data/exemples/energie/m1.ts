// JIRO KELY example, module 1 (source step 2).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: "Dépenses de pétrole chaque soir, fumée, risque d'incendie, téléphones non rechargés, heures de vente perdues.",
  probleme: "Les vendeurs qui travaillent le soir et les foyers non raccordés de Hell-Ville s'éclairent au pétrole ou à la bougie, chers, enfumés et dangereux.",
  causes: "Pas de raccordement ou coupures fréquentes ; une lampe solaire coûte trop cher à acheter d'un coup (cause sur laquelle le projet agit).",
  client: {
    qui: 'Vendeurs du soir (gargotes, étals) et foyers sans électricité près du marché.',
    ou: 'Autour du marché de Hell-Ville, à 10 minutes à pied au plus.',
    combien: "Environ 300 (je l'estime : 120 étals comptés le soir, plus les foyers voisins).",
    aujourdhui: 'Lampe à pétrole ou bougies ; recharge du téléphone chez un commerçant.',
    prixAujourdhui: "Environ 500 Ar de pétrole par soir et 500 Ar par recharge de téléphone (je l'ai demandé à 4 vendeurs).",
    decideur: 'Le vendeur ou le chef de famille.'
  },
  pv: {
    pour: 'les vendeurs du soir et les foyers de Hell-Ville',
    qui: "n'ont pas d'électricité",
    propose: "la location d'une lampe solaire puissante à 1 000 Ar la nuit",
    quiBenefice: 'recharge aussi leur téléphone, sans fumée ni risque de feu',
    contrairement: 'la lampe à pétrole'
  },
  pourquoiMoi: "Formation d'électricien ; j'ai installé des panneaux solaires chez un oncle ; ma famille a un étal au marché et connaît les vendeurs."
};
