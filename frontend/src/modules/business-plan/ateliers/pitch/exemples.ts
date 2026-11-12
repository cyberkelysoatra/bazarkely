// Inline example of the frame: the worked example of the participant's sector (NEC-CC-13), else
// JUS'NOSY. Tourism is TRANO KELY, the worked example of step 9: its frame is the one of the workbook.
import type { Plan } from '../../types';
import { EXEMPLES } from '../../data/exemples';
import { trame } from './trame';

export interface ExempleTrame {
  nom: string;
  /** Keywords of the 5 parts, in the order of TEMPS. */
  mots: string[];
}

const TRANO_KELY: ExempleTrame = {
  nom: 'TRANO KELY',
  mots: [
    'Voyageurs petit budget ; peu de chambres propres réservables en ligne',
    '45 000 Ar ; en ligne ; deux fois moins cher que les hôtels',
    "400 nuits par mois ; je vise 54 ; pension voisine, hôtels, chez l'habitant",
    '7,8 millions pour démarrer ; seuil 23 nuits ; résultat année 1 : 11 millions',
    '5 millions de subvention ; 2 emplois, 3 en 2028 ; NIF en mars 2027'
  ]
};

/** The example shown under each part (null for an example plan: it is its own example). */
export function exempleDuSecteur(plan: Plan): ExempleTrame | null {
  if (plan.exemple) return null;
  const secteur = plan.identite.secteur;
  if (secteur === 'tourisme') return TRANO_KELY;
  const e = EXEMPLES.find((x) => x.secteur === secteur) ?? EXEMPLES.find((x) => x.secteur === 'agriculture')!;
  return { nom: e.nom, mots: trame(e.plan()).map((t) => t.mots) };
}
