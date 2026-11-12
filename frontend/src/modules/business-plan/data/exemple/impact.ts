// JUS'NOSY example, "Impact et emplois" (example file of the fiches, step 6). Read only.
import type { Impact } from '../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'ex-i1', role: "Moi, production, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'ex-i2', role: 'Associé, vente et livraison', statut: 'salarie', annees: ['plein', 'plein', 'plein'] },
    { id: 'ex-i3', role: 'Livreur, mi-temps', statut: 'salarie', annees: ['', '', 'partiel'] }
  ],
  clientsMois: 12,
  partenaires: [
    { id: 'ex-ip1', nom: 'la coopérative de producteurs', local: true },
    { id: 'ex-ip2', nom: 'un imprimeur de Hell-Ville', local: true }
  ],
  autreEffet: 'Moins de bouteilles en plastique (verre consigné).',
  phrase: "JUS'NOSY fait vivre 2 personnes dès la première année, 3 en 2029, et achète ses fruits à une coopérative de Nosy Be."
};
