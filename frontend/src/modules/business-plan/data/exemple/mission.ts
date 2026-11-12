// JUS'NOSY example, "Ma mission de terrain" (example file of the fiches, step 7). Read only.
import type { Mission } from '../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: "3 responsables d'hôtel ou de restaurant d'Ambatoloaka.",
  prixARelever: 'Prix du concurrent local',
  elementsUnite: 'Mangue, fruit de la passion, citron (marché de Hell-Ville)\nSucre\nBouteille et étiquette',
  entretiens: [
    {
      id: 'ex-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: 'Restaurant de plage',
      aujourdhui: 'Sert des jus en brique',
      paie: 4000,
      embete: 'Les touristes demandent du local',
      probleme: 'oui',
      phrase: '« Si c\'est livré à l\'heure, je prends. »'
    }
  ],
  decision: 'continuer'
};
