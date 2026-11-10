// The 9 blocks of the Business Model Canvas in filling order (workbook pages 6 and 7), and the date helpers
// of "Version du" (Madagascar time, UTC+3 all year).
import type { Plan } from '../../types';

export type CleBloc = Exclude<keyof Plan['m2'], 'versionDu'>;

export interface Bloc {
  n: number;
  cle: CleBloc;
  titre: string;
  question: string;
  exemple: string;
  /** Placement in the canvas layout (10 columns, 3 rows) from 768 px wide. */
  grille: string;
}

export const BLOCS: Bloc[] = [
  { n: 1, cle: 'segments', titre: 'Segments de clients', question: 'Pour qui créons-nous de la valeur ?', exemple: 'Hôtels, restaurants, épiceries de Nosy Be.', grille: 'md:col-start-9 md:col-span-2 md:row-start-1 md:row-span-2' },
  { n: 2, cle: 'proposition', titre: 'Proposition de valeur', question: 'Quel problème réglons-nous ? Pourquoi nous ?', exemple: 'Jus frais local, livré deux fois par semaine.', grille: 'md:col-start-5 md:col-span-2 md:row-start-1 md:row-span-2' },
  { n: 3, cle: 'canaux', titre: 'Canaux', question: 'Comment le client nous connaît-il, achète-t-il, est-il livré ?', exemple: 'Visite directe, WhatsApp, livraison en scooter.', grille: 'md:col-start-7 md:col-span-2 md:row-start-2' },
  { n: 4, cle: 'relation', titre: 'Relation client', question: 'Quel lien gardons-nous avec lui ?', exemple: 'Commande hebdomadaire, dégustation, fidélité.', grille: 'md:col-start-7 md:col-span-2 md:row-start-1' },
  { n: 5, cle: 'revenus', titre: 'Sources de revenus', question: 'Pour quoi le client paie-t-il ? Comment ?', exemple: 'Vente à la bouteille, paiement à 15 jours.', grille: 'md:col-start-6 md:col-span-5 md:row-start-3' },
  { n: 6, cle: 'ressources', titre: 'Ressources clés', question: 'De quoi avons-nous absolument besoin ?', exemple: 'Local, extracteur, réfrigérateur, bouteilles.', grille: 'md:col-start-3 md:col-span-2 md:row-start-2' },
  { n: 7, cle: 'activites', titre: 'Activités clés', question: 'Que devons-nous faire très bien ?', exemple: "Achat des fruits, hygiène, livraison à l'heure.", grille: 'md:col-start-3 md:col-span-2 md:row-start-1' },
  { n: 8, cle: 'partenaires', titre: 'Partenaires clés', question: 'Sur qui nous appuyons-nous ?', exemple: "Coopérative de producteurs, imprimeur d'étiquettes.", grille: 'md:col-start-1 md:col-span-2 md:row-start-1 md:row-span-2' },
  { n: 9, cle: 'couts', titre: 'Structure de coûts', question: 'Quels sont nos principaux coûts ?', exemple: 'Fruits, salaires, loyer, énergie, transport.', grille: 'md:col-start-1 md:col-span-5 md:row-start-3' }
];

/** Today in Madagascar as "YYYY-MM-DD" (no daylight saving time there). */
export function aujourdhuiMadagascar(maintenant = Date.now()): string {
  return new Date(maintenant + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** "2026-11-11" -> "11 novembre 2026"; anything else -> "". */
export function jourFr(jour: string): string {
  const r = /^(\d{4})-(\d{2})-(\d{2})$/.exec(jour);
  if (!r) return '';
  const mois = MOIS[Number(r[2]) - 1];
  return mois ? `${Number(r[3])} ${mois} ${r[1]}` : '';
}
