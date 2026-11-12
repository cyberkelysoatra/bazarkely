// FRAÎCHEUR BAY example, "Ma mission de terrain" (source step 7).
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: '3 cuisiniers de restaurants de plage.',
  prixARelever: 'Prix du mareyeur\nPrix du congelé au supermarché',
  elementsUnite: 'Poisson au retour des pirogues (3 espèces)\nGlace au kg',
  entretiens: [
    {
      id: 'eb-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: 'Restaurant de plage',
      aujourdhui: 'Le cuisinier va à la plage à 7 h',
      paie: 15000,
      embete: 'Il quitte la cuisine une heure',
      probleme: 'oui',
      phrase: '« Si tu viens avant 11 h, je te prends 10 kg. »'
    }
  ],
  decision: 'continuer'
};
