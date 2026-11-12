// TRANO KELY example, module 1 (source ETAPE-02, sub-pages 1a to 1d).
import type { Plan } from '../../../types';

export const m1: Partial<Plan['m1']> = {
  consequences: 'Ces voyageurs raccourcissent leur séjour ou vont ailleurs ; les petites pensions restent vides hors saison.',
  probleme: 'Les voyageurs à petit budget trouvent peu de chambres propres et abordables qu\'on peut réserver en ligne à Nosy Be.',
  causes: 'La plupart des petites pensions ne sont pas sur internet (cause sur laquelle le projet agit) ; les hôtels visibles en ligne sont chers.',
  client: {
    qui: 'Voyageurs à petit budget, 20 à 35 ans, seuls ou en couple.',
    ou: 'Arrivent à Nosy Be par avion ou bateau, cherchent sur leur téléphone avant de venir.',
    combien: "Environ 40 par semaine en haute saison (estimation à vérifier auprès de l'office du tourisme).",
    aujourdhui: 'Réserve un hôtel trop cher pour lui, ou cherche une pension sur place en arrivant.',
    prixAujourdhui: 'De 60 000 à 120 000 Ar la nuit.',
    decideur: 'Le voyageur lui-même.'
  },
  pv: {
    pour: 'les voyageurs à petit budget',
    qui: 'veulent rester plusieurs nuits à Nosy Be',
    propose: 'des chambres propres à 45 000 Ar la nuit, réservables en ligne',
    quiBenefice: 'leur permettent de rester plus longtemps pour le même budget',
    contrairement: 'les hôtels visibles en ligne, deux fois plus chers'
  },
  pourquoiMoi: "J'ai travaillé 2 ans à l'accueil d'un hôtel d'Ambatoloaka. Ma famille possède la maison, 3 chambres déjà construites. Je parle français, anglais et italien."
};
