// Every section of the workbook, in order. A later phase replaces ateliers/<id>/Page.tsx and
// ateliers/<id>/progression.ts of ITS sections only: nothing to change here.
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AtelierProps, Plan } from '../types';
import { progression as pIdentite } from '../ateliers/identite/progression';
import { progression as pM1 } from '../ateliers/m1/progression';
import { progression as pM2 } from '../ateliers/m2/progression';
import { progression as pM3 } from '../ateliers/m3/progression';
import { progression as pM4 } from '../ateliers/m4/progression';
import { progression as pM5 } from '../ateliers/m5/progression';
import { progression as pSynthese } from '../ateliers/synthese/progression';
import { progression as pRelecture } from '../ateliers/relecture/progression';
import { progression as pApres } from '../ateliers/apres/progression';
import { progression as pPrix } from '../ateliers/prix/progression';
import { progression as pNotes } from '../ateliers/notes/progression';

export type IdRubrique = 'identite' | 'm1' | 'm2' | 'm3' | 'm4' | 'm5' | 'synthese' | 'relecture' | 'apres' | 'prix' | 'notes';

export interface Rubrique {
  id: IdRubrique;
  titre: string;
  sousTitre: string;
  /** Route segment under /plan/p/:id/ */
  chemin: string;
  page: LazyExoticComponent<ComponentType<AtelierProps>>;
  progression: (plan: Plan) => number;
}

export const RUBRIQUES: Rubrique[] = [
  { id: 'identite', titre: "Fiche d'identité", sousTitre: 'Vous et votre projet', chemin: 'identite', page: lazy(() => import('../ateliers/identite/Page')), progression: pIdentite },
  { id: 'm1', titre: 'Module 1 : Le problème et le client', sousTitre: 'Problème, client, proposition de valeur', chemin: 'm1', page: lazy(() => import('../ateliers/m1/Page')), progression: pM1 },
  { id: 'm2', titre: 'Module 2 : Mon modèle économique', sousTitre: 'Les 9 cases du modèle', chemin: 'm2', page: lazy(() => import('../ateliers/m2/Page')), progression: pM2 },
  { id: 'm3', titre: 'Module 3 : Mon marché', sousTitre: 'Clients, concurrents, forces et faiblesses', chemin: 'm3', page: lazy(() => import('../ateliers/m3/Page')), progression: pM3 },
  { id: 'm4', titre: 'Module 4 : Mon organisation', sousTitre: 'Marketing, équipe, calendrier, démarches', chemin: 'm4', page: lazy(() => import('../ateliers/m4/Page')), progression: pM4 },
  { id: 'm5', titre: 'Module 5 : Les chiffres clés', sousTitre: 'Coûts, prix, seuil, financement, résultats', chemin: 'm5', page: lazy(() => import('../ateliers/m5/Page')), progression: pM5 },
  { id: 'synthese', titre: 'Ma synthèse', sousTitre: 'Le projet en une page', chemin: 'synthese', page: lazy(() => import('../ateliers/synthese/Page')), progression: pSynthese },
  { id: 'relecture', titre: 'Relecture en binôme', sousTitre: 'Les points à vérifier avec un autre participant', chemin: 'relecture', page: lazy(() => import('../ateliers/relecture/Page')), progression: pRelecture },
  { id: 'apres', titre: 'Après le camp', sousTitre: 'Mes prochaines actions', chemin: 'apres', page: lazy(() => import('../ateliers/apres/Page')), progression: pApres },
  { id: 'prix', titre: 'Mes prix relevés', sousTitre: 'Les prix vus sur le terrain', chemin: 'prix', page: lazy(() => import('../ateliers/prix/Page')), progression: pPrix },
  { id: 'notes', titre: 'Mes notes', sousTitre: 'Tout ce que vous voulez garder', chemin: 'notes', page: lazy(() => import('../ateliers/notes/Page')), progression: pNotes }
];

export function rubrique(chemin: string | undefined): Rubrique | undefined {
  return RUBRIQUES.find((r) => r.chemin === chemin);
}

/** Global progress of a plan: mean of the 11 sections. */
export function progressionGlobale(plan: Plan): number {
  const total = RUBRIQUES.reduce((t, r) => t + Math.max(0, Math.min(100, r.progression(plan))), 0);
  return Math.round(total / RUBRIQUES.length);
}
