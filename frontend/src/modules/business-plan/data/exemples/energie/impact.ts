// JIRO KELY example, "Impact et emplois" (source step 6).
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'en-j1', role: "Moi, gérant et entretien, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'en-j2', role: 'Aide, soir et matin', statut: 'salarie', annees: ['partiel', 'partiel', 'plein'] }
  ],
  // Source: "environ 60 vendeurs et foyers par soir".
  clientsMois: 60,
  partenaires: [{ id: 'en-p1', nom: "l'association des commerçants (emplacement)", local: true }],
  autreEffet: "Moins de fumée et de risque d'incendie, téléphones rechargés, heures de vente gagnées le soir.",
  // NEC-CC-17: answers of ETAPE-06 v0.2, part 7 bis.
  envTrace: "Batteries usées",
  envReduction: "Rendues au fournisseur, jamais à la décharge",
  phrase: 'JIRO KELY fait vivre 2 personnes et éclaire chaque soir 60 vendeurs et familles de Hell-Ville, sans fumée.'
};
