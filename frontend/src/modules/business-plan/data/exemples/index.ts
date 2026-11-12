// NEC-CC-13: one worked example per sector of the fiche d'identité. JUS'NOSY (agriculture) keeps its
// own folder data/exemple/ and its id 'exemple' (existing links and tests); the 5 others are assembled
// from data/exemples/<secteur>/. All bundled with the app: available offline, never sent anywhere.
import type { Plan } from '../../types';
import { ID_EXEMPLE, planExemple as planJusNosy } from '../exemple';
import { assembler, type SectionsExemple } from './assembler';
import { sections as economieBleue } from './economie-bleue';
import { sections as tourisme } from './tourisme';
import { sections as energie } from './energie';
import { sections as numerique } from './numerique';
import { sections as education } from './education';

export interface ExempleSecteur {
  /** Value of `identite.secteur` (SECTEURS of ateliers/identite/Page.tsx). */
  secteur: string;
  libelleSecteur: string;
  /** Route id: /p/<id>. */
  id: string;
  nom: string;
  /** A fresh read-only copy each call. */
  plan: () => Plan;
}

const depuis = (secteur: string, libelleSecteur: string, s: SectionsExemple): ExempleSecteur => {
  const id = `exemple-${secteur}`;
  return { secteur, libelleSecteur, id, nom: s.identite.nomProjet ?? '', plan: () => assembler(id, s) };
};

/** In the order of the sectors of the fiche d'identité. */
export const EXEMPLES: ExempleSecteur[] = [
  { secteur: 'agriculture', libelleSecteur: 'Agriculture', id: ID_EXEMPLE, nom: "JUS'NOSY", plan: planJusNosy },
  depuis('economie-bleue', 'Économie bleue', economieBleue),
  depuis('tourisme', 'Tourisme', tourisme),
  depuis('energie', 'Énergie', energie),
  depuis('numerique', 'Numérique', numerique),
  depuis('education', 'Éducation', education)
];

/** Example shown for "autre", an empty or an unknown sector. */
export const SECTEUR_PAR_DEFAUT = 'tourisme';

export function exempleDuSecteur(secteur: string | undefined): ExempleSecteur {
  return EXEMPLES.find((e) => e.secteur === secteur) ?? EXEMPLES.find((e) => e.secteur === SECTEUR_PAR_DEFAUT)!;
}

export function exempleParId(id: string | undefined): ExempleSecteur | undefined {
  return EXEMPLES.find((e) => e.id === id);
}

/** The example plan of a route id, or null when the id is not an example. */
export function planExempleParId(id: string | undefined): Plan | null {
  return exempleParId(id)?.plan() ?? null;
}
