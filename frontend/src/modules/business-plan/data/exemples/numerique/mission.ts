// FIX'NOSY example, "Ma mission de terrain" (source step 7).
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: '3 vendeurs du marché, 2 étudiants.',
  prixARelever: "Réparation d'écran chez 2 réparateurs de rue",
  elementsUnite: "Prix d'un écran et d'une batterie chez un vendeur d'accessoires",
  chargesADemander: "Loyer d'un petit local près du marché",
  entretiens: [
    {
      id: 'nu-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: 'Vendeuse de vêtements',
      aujourdhui: 'Téléphone fêlé, elle reçoit les paiements Mvola dessus ; réparé chez un réparateur de rue',
      paie: 20000,
      embete: "L'écran a lâché au bout d'un mois",
      probleme: 'oui',
      phrase: '« Je paierais plus si c\'est garanti. »'
    }
  ],
  decision: 'continuer'
};
