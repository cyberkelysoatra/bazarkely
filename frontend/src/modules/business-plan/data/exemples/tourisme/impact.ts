// TRANO KELY example, "Impact et emplois" (source ETAPE-06).
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'to-j1', role: "Moi, gérant, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'to-j2', role: 'Femme de ménage', statut: 'salarie', annees: ['partiel', 'plein', 'plein'] },
    { id: 'to-j3', role: 'Accueil du soir', statut: 'salarie', annees: ['', 'partiel', 'partiel'] },
    { id: 'to-j4', role: 'Ma mère, petit-déjeuner', statut: 'benevole', annees: ['', '', ''] }
  ],
  clientsMois: 13,
  partenaires: [
    { id: 'to-p1', nom: 'la blanchisserie', local: true },
    { id: 'to-p2', nom: 'un taxi', local: true },
    { id: 'to-p3', nom: "des guides d'excursion", local: true }
  ],
  phrase: 'TRANO KELY fait vivre 2 personnes dès la première année, 3 en 2028, et fait travailler une blanchisserie, un taxi et des guides de Nosy Be.'
};
