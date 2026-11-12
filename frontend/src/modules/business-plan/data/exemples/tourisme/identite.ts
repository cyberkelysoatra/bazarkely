// TRANO KELY example (tourisme, also shown for "autre" and an empty sector), identity card.
// Source: "Exemple résolu" sections of ETAPE-01 to ETAPE-09 of the content of the training.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: 'TRANO KELY',
  secteur: 'tourisme',
  lieu: 'Ambatoloaka',
  unePhrase: 'Des chambres propres réservables en ligne, pour les voyageurs à petit budget',
  avancement: 'idee',
  porteurs: 'Un porteur, gérant',
  attentes: 'Chiffrer mon projet, avoir un plan pour le concours GEW.'
};

/** Sale unit (shared by 3a and 5a). */
export const uniteVente = 'nuit dans une chambre';
