// MADIO NOSY example (environnement), identity card. Source: EXEMPLE-ENVIRONNEMENT-MADIO-NOSY.md, step 1.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: 'MADIO NOSY',
  secteur: 'environnement',
  lieu: 'Ambatoloaka et Hell-Ville',
  unePhrase: "Je débarrasse les hôtels et restaurants de leurs déchets de cuisine et j'en fais du compost",
  avancement: 'idee',
  porteurs: 'Un porteur',
  attentes: 'Savoir si on peut gagner sa vie avec les déchets, avoir un plan pour le concours GEW.'
};

/** Sale unit (shared by 3a and 5a): "un mois de collecte pour un établissement" in the source, worded so the plural reads well. */
export const uniteVente = "abonnement d'un mois";
