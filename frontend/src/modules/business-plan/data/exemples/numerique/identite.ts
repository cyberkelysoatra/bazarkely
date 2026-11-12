// FIX'NOSY example (numerique), identity card. Source: EXEMPLE-NUMERIQUE-FIX-NOSY.md, step 1.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: "FIX'NOSY",
  secteur: 'numerique',
  lieu: 'Hell-Ville, près du marché',
  unePhrase: 'Des téléphones réparés en une heure, avec garantie, pour les vendeurs et les jeunes de Hell-Ville',
  avancement: 'essais',
  porteurs: 'Un porteur',
  attentes: 'Chiffrer mon projet, savoir comment devenir légal.'
};

/** Sale unit (shared by 3a and 5a). */
export const uniteVente = 'réparation (panier moyen, pièce comprise)';
