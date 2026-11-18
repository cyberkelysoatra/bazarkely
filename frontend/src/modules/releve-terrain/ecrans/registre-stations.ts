// Screens 8 (Saisir une station), 9 (Station rouge) and 10 (Borne éphémère): filled by RELEVE-CC-05, the
// only session that edits this file. Screen 9 opens inside the Saisir route (`?vue=resultat` on an orange
// or red station).
import { lazy } from 'react'
import type { LigneEcran } from './typesRegistre'

export const ecrans: LigneEcran[] = [
  { route: '/r/:releve/saisir/:station?', composant: lazy(() => import('./saisir/Saisir')), titre: 'Étape 3 : saisir une station' },
  { route: '/r/:releve/ephemere', composant: lazy(() => import('./ephemere/Ephemere')), titre: 'Borne éphémère' },
  // RELEVE-CC-09: screens 13 and 14 (state of the input when this phone does not write here).
  { route: '/r/:releve/saisie', composant: lazy(() => import('./saisie/EcranSaisie')), titre: 'Saisie du relevé' },
]
