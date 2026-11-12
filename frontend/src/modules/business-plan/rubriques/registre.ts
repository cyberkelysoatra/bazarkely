// Every section of the workbook, in order, with the module titles of the workbook (NEC-CC-05).
import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { AtelierProps, Plan } from '../types';
import { progression as pIdentite } from '../ateliers/identite/progression';
import { progression as pM1 } from '../ateliers/m1/progression';
import { progression as pM2 } from '../ateliers/m2/progression';
import { progression as pM3 } from '../ateliers/m3/progression';
import { progression as pM4 } from '../ateliers/m4/progression';
import { progression as pImpact } from '../ateliers/impact/progression';
import { progression as pMission } from '../ateliers/mission/progression';
import { progression as pM5 } from '../ateliers/m5/progression';
import { progression as pSynthese } from '../ateliers/synthese/progression';
import { progression as pPitch } from '../ateliers/pitch/progression';
import { progression as pRelecture } from '../ateliers/relecture/progression';
import { progression as pApres } from '../ateliers/apres/progression';
import { progression as pPrix } from '../ateliers/prix/progression';
import { progression as pNotes } from '../ateliers/notes/progression';

export type IdRubrique = 'identite' | 'm1' | 'm2' | 'm3' | 'm4' | 'impact' | 'mission' | 'm5' | 'synthese' | 'pitch' | 'relecture' | 'apres' | 'prix' | 'notes';

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
  { id: 'm1', titre: 'Module 1. Structurer le projet', sousTitre: 'Problème, client, proposition de valeur', chemin: 'm1', page: lazy(() => import('../ateliers/m1/Page')), progression: pM1 },
  { id: 'm2', titre: 'Module 2. Le Business Model Canvas', sousTitre: 'Les 9 blocs du canvas', chemin: 'm2', page: lazy(() => import('../ateliers/m2/Page')), progression: pM2 },
  { id: 'm3', titre: 'Module 3. Marché et concurrence', sousTitre: 'Taille du marché, concurrents, SWOT', chemin: 'm3', page: lazy(() => import('../ateliers/m3/Page')), progression: pM3 },
  { id: 'm4', titre: 'Module 4. Stratégie commerciale, organisation et formalisation', sousTitre: '4 P, équipe, calendrier, démarches', chemin: 'm4', page: lazy(() => import('../ateliers/m4/Page')), progression: pM4 },
  { id: 'impact', titre: 'Impact et emplois', sousTitre: 'Les personnes payées par mon projet, qui en profite', chemin: 'impact', page: lazy(() => import('../ateliers/impact/Page')), progression: pImpact },
  { id: 'mission', titre: 'Ma mission de terrain', sousTitre: 'Interroger 3 clients, relever les prix, décider', chemin: 'mission', page: lazy(() => import('../ateliers/mission/Page')), progression: pMission },
  { id: 'm5', titre: 'Module 5. Les chiffres clés', sousTitre: 'Coûts, prix, seuil, financement, résultats', chemin: 'm5', page: lazy(() => import('../ateliers/m5/Page')), progression: pM5 },
  { id: 'synthese', titre: 'Synthèse', sousTitre: 'Le résumé de mon business plan', chemin: 'synthese', page: lazy(() => import('../ateliers/synthese/Page')), progression: pSynthese },
  { id: 'pitch', titre: 'Mon pitch de 2 minutes', sousTitre: 'Ma trame, ma répétition chronométrée, les 3 questions pièges', chemin: 'pitch', page: lazy(() => import('../ateliers/pitch/Page')), progression: pPitch },
  { id: 'relecture', titre: 'Relecture en binôme', sousTitre: 'Les 10 points vérifiés par un autre participant', chemin: 'relecture', page: lazy(() => import('../ateliers/relecture/Page')), progression: pRelecture },
  { id: 'apres', titre: 'Et après ?', sousTitre: 'Le calendrier NEC et mes trois prochaines actions', chemin: 'apres', page: lazy(() => import('../ateliers/apres/Page')), progression: pApres },
  { id: 'prix', titre: 'Mes prix relevés', sousTitre: 'Les prix vus sur le terrain', chemin: 'prix', page: lazy(() => import('../ateliers/prix/Page')), progression: pPrix },
  { id: 'notes', titre: 'Mes notes', sousTitre: 'Tout ce que vous voulez garder', chemin: 'notes', page: lazy(() => import('../ateliers/notes/Page')), progression: pNotes }
];

export function rubrique(chemin: string | undefined): Rubrique | undefined {
  return RUBRIQUES.find((r) => r.chemin === chemin);
}

/** Global progress of a plan: mean of the sections. */
export function progressionGlobale(plan: Plan): number {
  const total = RUBRIQUES.reduce((t, r) => t + Math.max(0, Math.min(100, r.progression(plan))), 0);
  return Math.round(total / RUBRIQUES.length);
}
