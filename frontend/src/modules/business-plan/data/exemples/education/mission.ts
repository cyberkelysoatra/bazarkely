// MIANATRA PLUS example, "Ma mission de terrain" (source step 7).
import type { Mission } from '../../../types';

export const mission: Partial<Mission> = {
  boucle: { statut: 'reussi', explications: 0 },
  prerempli: true,
  clientsAInterroger: "3 parents d'élèves en classe d'examen, 2 élèves.",
  prixARelever: "Heure de cours particulier\nSoutien de l'école\nHeure de cybercafé\nPrix d'un ordinateur reconditionné",
  chargesADemander: 'Loyer de la salle',
  entretiens: [
    {
      id: 'ed-me1',
      date: '2026-11-12T13:10:00+03:00',
      typeClient: "Mère d'un élève de 3e",
      aujourdhui: 'Cours particuliers une heure par semaine',
      paie: 40000,
      embete: "C'est trop cher pour plus d'heures",
      probleme: 'oui',
      phrase: "« S'il y a la lumière et quelqu'un pour l'aider, je paie. »"
    }
  ],
  decision: 'continuer'
};
