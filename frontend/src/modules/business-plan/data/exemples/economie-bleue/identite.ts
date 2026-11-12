// FRAÎCHEUR BAY example (economie-bleue), identity card. Source: EXEMPLE-ECONOMIE-BLEUE-FRAICHEUR-BAY.md, step 1.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: 'FRAÎCHEUR BAY',
  secteur: 'economie-bleue',
  lieu: 'Ambatozavavy',
  unePhrase: 'Du poisson frais du matin, livré en glacière aux restaurants de Nosy Be',
  avancement: 'idee',
  porteurs: 'Un porteur',
  attentes: 'Chiffrer mon projet, savoir comment devenir légal.'
};

/** Sale unit (shared by 3a and 5a). */
export const uniteVente = 'kg de poisson livré';
