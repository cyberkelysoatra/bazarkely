// MADIO NOSY example, "Ma mission de terrain" (source step 7). Decision left empty: the source makes it
// conditional ("ajuster si les établissements trouvent 50 000 Ar trop cher ; sinon continuer").
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: "3 restaurants d'Ambatoloaka, 2 hôtels de Hell-Ville (le gérant ou le chef de cuisine).",
  prixARelever:
    "Prix d'un ramasseur à la charrette\nPrix d'un bac fermé de 50 litres\nPrix d'un sac de compost ou de fumier au marché\nLoyer d'un petit terrain à l'écart des maisons",
  entretiens: [
    {
      id: 'ev-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: "Chef de cuisine d'un restaurant de plage",
      aujourdhui: 'Ramasseur à la charrette deux fois par semaine',
      paie: 40000,
      embete: 'Les odeurs et les chiens le jour où il ne passe pas',
      probleme: 'oui',
      phrase: "« Si quelqu'un passe à heure fixe avec des bacs fermés, je paie un peu plus. »"
    }
  ],
  decision: ''
};
