// JUS'NOSY example, identity card (workbook pages 1 and 3).
import type { Plan } from '../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif du cahier',
  nomProjet: "JUS'NOSY",
  secteur: 'agriculture',
  lieu: 'Hell-Ville, Nosy Be',
  unePhrase: "Jus de fruits frais de l'île livrés aux hôtels et restaurants de Nosy Be",
  avancement: 'essais',
  porteurs: 'Projet fictif du cahier',
  attentes: 'Vérifier que le prix couvre les coûts et préparer la demande de subvention.'
};

/** Sale unit of the example (shared by 3a and 5a). */
export const uniteVente = 'bouteille de 50 cl';
