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
  // NEC-CC-17: answers of ETAPE-06 v0.2, part 7 bis.
  envTrace: "Papier ; électricité des ordinateurs",
  envReduction: "Exercices sur écran, impression recto verso ; ordinateurs éteints après les cours",
  phrase: 'MIANATRA PLUS fait vivre 2 personnes et accompagne chaque année 60 élèves de Hell-Ville vers leur examen.'
};
