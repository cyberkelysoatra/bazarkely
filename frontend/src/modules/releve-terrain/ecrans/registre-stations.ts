// Screens 8 (Saisir une station), 9 (Station rouge) and 10 (Borne éphémère): filled by RELEVE-CC-05, the
// only session that edits this file. Screen 9 opens inside the Saisir route.
import { lazy } from 'react'
import type { LigneEcran } from './typesRegistre'

export const ecrans: LigneEcran[] = [
  { route: '/r/:releve/saisir/:station?', composant: lazy(() => import('./Prochainement')), titre: 'Étape 3 : saisir une station' },
  { route: '/r/:releve/ephemere', composant: lazy(() => import('./Prochainement')), titre: 'Borne éphémère' },
]
