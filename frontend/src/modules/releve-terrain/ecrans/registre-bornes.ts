// Screens 6 (Bornes) and 7 (Calage): filled by RELEVE-CC-04, the only session that edits this file.
import { lazy } from 'react'
import type { LigneEcran } from './typesRegistre'

export const ecrans: LigneEcran[] = [
  { route: '/r/:releve/bornes', composant: lazy(() => import('./bornes/EcranBornes')), titre: 'Étape 1 : bornes' },
  { route: '/r/:releve/calage', composant: lazy(() => import('./calage/EcranCalage')), titre: 'Étape 2 : calage' },
]
