// MADIO NOSY example, "Impact et emplois" (source step 6).
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'ev-j1', role: "Moi, gérant, commercial et compostage, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'ev-j2', role: 'Collecteur et conducteur du tricycle', statut: 'salarie', annees: ['plein', 'plein', 'plein'] },
    { id: 'ev-j3', role: 'Aide au compostage, mi-temps', statut: 'salarie', annees: ['', '', 'partiel'] }
  ],
  clientsMois: 24,
  partenaires: [
    { id: 'ev-p1', nom: 'le propriétaire du terrain', local: true },
    { id: 'ev-p2', nom: 'le garage qui entretient le tricycle', local: true }
  ],
  autreEffet: 'Moins de déchets brûlés ou jetés dans la nature, du compost local pour les maraîchers.',
  // NEC-CC-17: answers of ETAPE-06 v0.2, part 7 bis.
  envTrace: 'Fumée et carburant du tricycle ; jus des tas de compost',
  envReduction: 'Tournées regroupées par quartier ; aire couverte, sur bâche, avec rigole',
  phrase:
    'MADIO NOSY fait vivre 2 personnes dès la première année, 3 en 2029, et transforme chaque mois environ 10 tonnes de déchets de cuisine en compost au lieu de les laisser dans la nature.'
};
