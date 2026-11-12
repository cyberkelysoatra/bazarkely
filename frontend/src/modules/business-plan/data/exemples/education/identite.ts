// MIANATRA PLUS example (education), identity card. Source: EXEMPLE-EDUCATION-MIANATRA-PLUS.md, step 1.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: 'MIANATRA PLUS',
  secteur: 'education',
  lieu: 'Hell-Ville',
  unePhrase: "Des cours du soir de soutien et d'informatique pour les élèves en classe d'examen",
  avancement: 'idee',
  porteurs: 'Un porteur',
  attentes: 'Avoir un plan pour le concours GEW, savoir comment devenir légal.'
};

/** Sale unit (shared by 3a and 5a): "un élève par mois" in the source, worded so "par mois" is not repeated. */
export const uniteVente = "élève (abonnement d'un mois)";
