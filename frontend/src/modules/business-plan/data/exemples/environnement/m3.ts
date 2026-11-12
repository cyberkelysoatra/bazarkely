// MADIO NOSY example, module 3 (source step 4): 120 x 1 x 1 = 120 subscriptions per month, 20 % = 24.
import type { Plan } from '../../../types';

export const m3: Partial<Plan['m3']> = {
  nbClients: 120,
  nbClientsSource: "Estimé : liste des établissements de l'office du tourisme et tour à pied d'Ambatoloaka.",
  qteParAchat: 1,
  qteSource: '',
  achatsParMois: 1,
  achatsSource: '',
  prixPrevu: 50000,
  partVisee: 20,
  concurrents: [
    {
      id: 'ev-k1',
      nom: 'Ramasseur à la charrette',
      type: 'direct',
      prix: 'Environ 40 000 Ar par mois',
      forts: 'Connu, souple.',
      faibles: 'Passages irréguliers, déchets jetés dans la nature.',
      mieux: 'Passages fixes, bacs propres, déchets valorisés et attestés.'
    },
    {
      id: 'ev-k2',
      nom: 'Ramassage public de la commune',
      type: 'indirect',
      prix: 'Taxe déjà payée',
      forts: 'Rien de plus à payer.',
      faibles: 'Irrégulier, bacs ouverts qui débordent.',
      mieux: "Régularité, pas d'odeur devant l'établissement."
    },
    {
      id: 'ev-k3',
      nom: 'Brûler ou enterrer soi-même',
      type: 'indirect',
      prix: 'Gratuit',
      forts: 'Aucun prestataire.',
      faibles: 'Fumée, odeurs, mauvaise image, interdit à certains endroits.',
      mieux: "Rien à faire pour l'établissement, image propre."
    }
  ],
  swot: {
    forces: "Connaissance des cuisines d'hôtel, savoir-faire en compostage.",
    faiblesses:
      "Un seul tricycle (parade : contrat d'entretien avec un garage, location d'une charrette en dépannage) ; compost encore inconnu des maraîchers (parade : sacs d'essai offerts).",
    opportunites: "Touristes attentifs à l'environnement, hôtels qui cherchent des labels, plaintes contre les déchets sur les plages.",
    menaces:
      "La commune organise elle-même une collecte (parade : proposer une convention avec elle) ; odeurs sur l'aire de compostage et plaintes des voisins (parade : terrain à l'écart, tas couverts et retournés chaque semaine) ; saison basse où les hôtels réduisent (parade : abonnement plus léger, 2 passages par semaine)."
  }
};
