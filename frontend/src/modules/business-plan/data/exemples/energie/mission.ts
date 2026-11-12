// JIRO KELY example, "Ma mission de terrain" (source step 7). Decision left empty: the source makes it
// conditional ("ajuster si les vendeurs trouvent 1 000 Ar trop cher ; sinon continuer").
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: '3 vendeurs du soir, 2 foyers du quartier.',
  prixARelever: "Litre de pétrole lampant\nBougies\nRecharge de téléphone au marché\nPrix d'une lampe solaire en boutique",
  entretiens: [
    {
      id: 'en-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: 'Vendeuse de brochettes',
      aujourdhui: 'Lampe à pétrole',
      paie: 500,
      embete: 'La fumée sur la nourriture',
      probleme: 'oui',
      phrase: '« Avec une vraie lumière, je resterais une heure de plus. »'
    }
  ],
  decision: ''
};
