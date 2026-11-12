// FRAÎCHEUR BAY example, module 3 (source step 4): 40 x 8 x 12 = 3 840 kg per month, 10 %.
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 40,
  nbClientsSource: 'Compté en longeant la plage.',
  qteParAchat: 8,
  qteSource: 'Demandé à 4 restaurants : 8 kg par livraison.',
  achatsParMois: 12,
  achatsSource: '3 livraisons par semaine (demandé à 4 restaurants).',
  prixPrevu: 17000,
  partVisee: 10,
  concurrents: [
    { id: 'eb-k1', nom: 'Un mareyeur qui livre en moto', type: 'direct', prix: '18 000 Ar le kg', forts: 'Déjà installé.', faibles: 'Pas de glace, livre tard.', mieux: 'Glacière, avant 11 h.' },
    { id: 'eb-k2', nom: 'Achat sur la plage par le cuisinier', type: 'indirect', prix: '14 000 Ar le kg et une heure du cuisinier', forts: 'Le moins cher.', faibles: 'Le cuisinier quitte la cuisine.', mieux: 'Il reste en cuisine.' },
    { id: 'eb-k3', nom: 'Poisson congelé du supermarché', type: 'indirect', prix: '20 000 Ar le kg', forts: 'Toujours disponible.', faibles: 'Pas frais, cher.', mieux: 'Frais du matin, moins cher.' }
  ],
  swot: {
    forces: 'Je connais les pêcheurs, je sais choisir.',
    faiblesses: "Un seul vélo (parade : second vélo financé par les résultats de l'année 1) ; pas de chambre froide (parade : congélateur de 2 jours de stock).",
    opportunites: 'Touristes qui veulent du poisson frais, restaurants qui veulent du local.',
    menaces:
      'Mauvais temps, les pirogues ne sortent pas (parade : stock de 2 jours au congélateur) ; hausse du prix de la glace (parade : prix revu chaque mois) ; périodes de fermeture de pêche de certaines espèces (parade : varier les espèces).'
  }
};
