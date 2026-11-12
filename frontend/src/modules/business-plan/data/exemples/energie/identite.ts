// JIRO KELY example (energie), identity card. Source: EXEMPLE-ENERGIE-JIRO-KELY.md, step 1.
import type { Plan } from '../../../types';

export const identite: Partial<Plan['identite']> = {
  nomPrenom: 'Projet fictif',
  nomProjet: 'JIRO KELY',
  secteur: 'energie',
  lieu: 'Hell-Ville, marché',
  unePhrase: 'Des lampes solaires louées à la nuit, pour ceux qui travaillent le soir sans électricité',
  avancement: 'idee',
  porteurs: 'Un porteur',
  attentes: 'Comprendre comment monter un projet, avoir un plan pour le concours GEW.'
};

/** Sale unit (shared by 3a and 5a): "une lampe louée une nuit" in the source, worded so the plural reads well. */
export const uniteVente = "location d'une lampe pour une nuit";
