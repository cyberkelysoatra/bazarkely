// JIRO KELY example, module 3 (source step 4): 300 x 1 x 26 = 7 800 rentals per month, 20 %.
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 300,
  nbClientsSource: 'Estimé : 120 étals comptés le soir, plus les foyers voisins.',
  qteParAchat: 1,
  qteSource: 'Une lampe par client (demandé à 4 vendeurs).',
  achatsParMois: 26,
  achatsSource: '26 nuits par mois (demandé à 4 vendeurs).',
  prixPrevu: 1000,
  partVisee: 20,
  concurrents: [
    { id: 'en-k1', nom: 'Lampe à pétrole', type: 'indirect', prix: 'Environ 500 Ar la nuit', forts: "Tout le monde l'a.", faibles: 'Fumée, odeur, risque de feu, faible lumière.', mieux: 'Lumière forte sans fumée, téléphone rechargé en plus.' },
    { id: 'en-k2', nom: 'Bougies', type: 'indirect', prix: 'Environ 300 Ar la nuit', forts: 'Bon marché.', faibles: 'Très peu de lumière, risque de feu.', mieux: 'Lumière pour vendre et lire.' },
    { id: 'en-k3', nom: 'Recharge chez un commerçant au groupe électrogène (direct pour la recharge)', type: 'direct', prix: '500 Ar', forts: 'Rapide.', faibles: "Ne règle pas l'éclairage.", mieux: 'Les deux pour 1 000 Ar.' },
    { id: 'en-k4', nom: 'Acheter sa propre lampe solaire', type: 'indirect', prix: '40 000 Ar en une fois', forts: 'Aucune dépense ensuite.', faibles: "Trop cher d'un coup.", mieux: 'Rien à avancer.' }
  ],
  swot: {
    forces: 'Électricien, réseau des vendeurs.',
    faiblesses: "Gros matériel à acheter (parade : subvention et prêt) ; une seule station (parade : 2 jours de batteries d'avance).",
    opportunites: 'Coupures fréquentes, intérêt pour le solaire.',
    menaces:
      'Lampes non rendues ou volées (parade : caution de 10 000 Ar) ; saison des pluies, moins de soleil (parade : panneaux dimensionnés pour 2 jours) ; raccordement du quartier (parade : clientèle des coupures).'
  }
};
