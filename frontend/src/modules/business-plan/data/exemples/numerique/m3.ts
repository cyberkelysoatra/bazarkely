// FIX'NOSY example, module 3 (source step 4): 600 x 1 x 1 = 600 repairs per month, 15 %.
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 600,
  nbClientsSource: "Estimé : 3 réparateurs de rue en font chacun environ 200 par mois, je l'ai demandé à 2 d'entre eux.",
  qteParAchat: 1,
  qteSource: '',
  achatsParMois: 1,
  achatsSource: '',
  prixPrevu: 25000,
  partVisee: 15,
  concurrents: [
    { id: 'nu-k1', nom: 'Réparateurs de rue', type: 'direct', prix: '20 000 Ar', forts: 'Partout, pas chers.', faibles: 'Aucune garantie, pièces de mauvaise qualité.', mieux: 'Garantie 3 mois, pièce de qualité.' },
    { id: 'nu-k2', nom: 'Envoi à Antananarivo', type: 'indirect', prix: '40 000 Ar et 2 semaines', forts: "Pièces d'origine.", faibles: 'Long, risque de perte.', mieux: 'Une heure, sur place.' },
    { id: 'nu-k3', nom: 'Racheter un téléphone', type: 'indirect', prix: '150 000 Ar', forts: 'Neuf.', faibles: 'Très cher.', mieux: '6 fois moins cher.' },
    { id: 'nu-k4', nom: 'Garder le téléphone fêlé', type: 'indirect', prix: '0 Ar', forts: 'Rien à payer.', faibles: 'Panne complète un jour.', mieux: 'Réparé avant la panne.' }
  ],
  swot: {
    forces: 'Savoir-faire, cousin fournisseur.',
    faiblesses: 'Je suis seul (parade : apprenti en année 2) ; pas encore de local (parade : petit local repéré près du marché).',
    opportunites: 'Tout le monde vend par téléphone, de plus en plus de smartphones.',
    menaces:
      "Coupures d'électricité (parade : batterie de secours pour la station de soudure) ; pièces bloquées en route (parade : stock d'un mois des pièces courantes) ; prix des pièces qui montent (parade : prix revu chaque trimestre)."
  }
};
