// FIX'NOSY example, "Impact et emplois" (source step 6): one job in year 1, my own.
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'nu-j1', role: "Moi, réparateur, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'nu-j2', role: 'Apprenti', statut: 'salarie', annees: ['', 'partiel', 'plein'] }
  ],
  clientsMois: 90,
  partenaires: [
    { id: 'nu-p1', nom: 'le transporteur des colis', local: true },
    { id: 'nu-p2', nom: "les vendeurs d'accessoires voisins (clients envoyés)", local: true }
  ],
  autreEffet: 'Moins de téléphones jetés ; un jeune formé au métier en année 2.',
  // NEC-CC-17: answers of ETAPE-06 v0.2, part 7 bis.
  envTrace: "Batteries et pièces cassées",
  envReduction: "Pièces encore bonnes réutilisées ; batteries rendues à un collecteur",
  phrase: 'FIX\'NOSY crée mon emploi dès la première année, forme un apprenti en 2028, et répare 90 téléphones par mois au lieu de les jeter.'
};
