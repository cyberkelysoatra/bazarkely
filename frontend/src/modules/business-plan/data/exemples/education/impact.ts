// MIANATRA PLUS example, "Impact et emplois" (source step 6).
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'ed-j1', role: "Moi, enseignant et gérant, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'ed-j2', role: 'Enseignant vacataire, mi-temps', statut: 'salarie', annees: ['partiel', 'partiel', 'partiel'] }
  ],
  clientsMois: 60,
  partenaires: [
    { id: 'ed-p1', nom: 'le propriétaire de la salle', local: true },
    { id: 'ed-p2', nom: 'le réparateur informatique', local: true }
  ],
  autreEffet: "Des élèves qui arrivent à l'université en sachant se servir d'un ordinateur.",
  phrase: 'MIANATRA PLUS fait vivre 2 personnes et accompagne chaque année 60 élèves de Hell-Ville vers leur examen.'
};
