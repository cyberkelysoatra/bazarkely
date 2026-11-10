// The 10 points of the peer review (workbook page 17), and the suggestion computed from the answers
// when it can be: 'oui' (looks right) or 'verifier' (to check); null when only a person can judge.
import type { Plan } from '../../types';
import { calculer } from '../../utils/chiffres';
import { calculerMarche } from '../m3/calculs';

export type Suggestion = 'oui' | 'verifier' | null;

export interface Point {
  id: string;
  texte: string;
  suggestion: (plan: Plan) => Suggestion;
}

const sans = (): Suggestion => null;
const si = (v: boolean): Suggestion => (v ? 'oui' : 'verifier');

export const POINTS: Point[] = [
  { id: 'probleme', texte: 'Le problème est précis et réel', suggestion: sans },
  { id: 'client', texte: 'Le client est décrit avec des chiffres', suggestion: (p) => si(p.m1.client.combien.trim() !== '') },
  { id: 'phrase', texte: 'La proposition de valeur tient en une phrase', suggestion: sans },
  { id: 'concurrent', texte: 'Au moins un concurrent est cité', suggestion: (p) => si(p.m3.concurrents.some((c) => c.nom.trim() !== '')) },
  {
    id: 'marge',
    texte: 'Le prix couvre le coût variable avec une marge',
    suggestion: (p) => {
      const c = calculer(p);
      return si(c.marge !== null && c.marge > 0);
    }
  },
  {
    id: 'equilibre',
    texte: 'Le total des ressources égale le total des besoins',
    suggestion: (p) => {
      const c = calculer(p);
      return si(c.besoins > 0 && c.ecart === 0);
    }
  },
  {
    id: 'seuil',
    texte: 'Le seuil de rentabilité est calculé et comparé aux ventes par mois',
    suggestion: (p) => {
      const c = calculer(p);
      return si(c.seuilMois !== null && c.chargesFixes > 0 && p.m5.annees[0]?.ventesParMois !== null);
    }
  },
  {
    id: 'ventes',
    texte: "Les ventes de l'année 1 viennent du calcul de marché (3a)",
    suggestion: (p) => {
      const v = calculerMarche(p.m3).ventesMois;
      return si(v !== null && v === p.m5.annees[0]?.ventesParMois);
    }
  },
  { id: 'calendrier', texte: 'Le calendrier contient des objectifs SMART', suggestion: (p) => si(p.m4.calendrier.length > 0 && p.m4.calendrier.every((c) => c.objectif.trim() !== '')) },
  { id: 'forme', texte: 'La forme juridique est choisie', suggestion: (p) => si(p.m4.forme.trim() !== '') }
];

/** Points answered (Oui or À revoir). */
export function pointsRepondus(plan: Plan): number {
  return POINTS.filter((pt) => plan.relecture.points[pt.id] === 'oui' || plan.relecture.points[pt.id] === 'revoir').length;
}
