// FRAÎCHEUR BAY example, "Impact et emplois" (source step 6).
import type { Impact } from '../../../types';

export const impact: Partial<Impact> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  emplois: [
    { id: 'eb-j1', role: "Moi, achat et vente, j'en vis", statut: 'moi', annees: ['plein', 'plein', 'plein'] },
    { id: 'eb-j2', role: 'Livreur, temps plein', statut: 'salarie', annees: ['plein', 'plein', 'plein'] },
    { id: 'eb-j3', role: 'Second livreur', statut: 'salarie', annees: ['', 'partiel', 'plein'] }
  ],
  clientsMois: 13,
  partenaires: [
    { id: 'eb-p1', nom: "8 pêcheurs d'Ambatozavavy, payés comptant", local: true },
    { id: 'eb-p2', nom: 'le fabricant de glace', local: true }
  ],
  autreEffet: 'Moins de poisson perdu.',
  // NEC-CC-17: answers of ETAPE-06 v0.2, part 7 bis.
  envTrace: "Viscères de poisson ; caisses en polystyrène ; risque de pêcher des poissons trop petits",
  envReduction: "Viscères données aux éleveurs ; glacières réutilisables ; je n'achète pas les poissons sous la taille permise",
  phrase: "FRAÎCHEUR BAY fait vivre 2 personnes dès la première année, 3 en 2028, et achète comptant la pêche de 8 pêcheurs d'Ambatozavavy."
};
