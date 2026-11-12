// MIANATRA PLUS example, module 1 (source step 2).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: "Révisions à la bougie, échec aux examens, retard en informatique à l'arrivée à l'université.",
  probleme:
    "Les élèves de 3e et de terminale de Hell-Ville n'ont pas d'endroit éclairé et calme pour réviser le soir, et presque aucun accès à un ordinateur avant l'université.",
  causes: 'Coupures et maisons mal éclairées ; cours particuliers trop chers pour la plupart des familles ; ordinateurs rares (cause sur laquelle le projet agit avec la salle équipée).',
  client: {
    qui: 'Collégiens de 3e et lycéens de terminale de Hell-Ville ; leurs parents.',
    ou: 'Dans les collèges et lycées de Hell-Ville, à 15 minutes à pied au plus.',
    combien: "Environ 1 500 élèves en classe d'examen (je l'estime, à vérifier auprès de la circonscription scolaire).",
    aujourdhui: 'Révise seul à la maison, ou prend des cours particuliers quand la famille peut payer.',
    prixAujourdhui: "10 000 Ar l'heure de cours particulier (je l'ai demandé à 4 parents).",
    decideur: "L'élève choisit d'y aller ; le parent décide et paie."
  },
  pv: {
    pour: "les élèves en classe d'examen de Hell-Ville et leurs parents",
    qui: "n'ont pas d'endroit éclairé pour réviser le soir",
    propose: "3 soirs par semaine de révision encadrée et d'informatique dans une salle éclairée, pour 20 000 Ar par mois",
    quiBenefice: "leur donne de meilleures chances à l'examen",
    contrairement: "les cours particuliers à 10 000 Ar l'heure"
  },
  pourquoiMoi: 'Licence de mathématiques ; 3 ans de cours particuliers ; une salle de 20 places à louer chez un voisin.'
};
