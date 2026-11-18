// Screens 11 (Carte) and 12 (Résultats, exports): filled by RELEVE-CC-06, the only session that edits
// this file. `ouvrirSauvegarde` and `exporterSauvegarde` stay undefined until that session provides them;
// the screens of RELEVE-CC-03 show « Ouvrir une sauvegarde ici » and « Exporter ... d'abord » only when defined.
import { lazy } from 'react'
import type { ExporterSauvegarde, LigneEcran, OuvrirSauvegarde } from './typesRegistre'

export const ecrans: LigneEcran[] = [
  { route: '/r/:releve/carte', composant: lazy(() => import('./Prochainement')), titre: 'Carte' },
  { route: '/r/:releve/resultats', composant: lazy(() => import('./Prochainement')), titre: 'Étape 4 : résultats' },
]

/** Chooses a `.releve.json` file and imports it into the work site (H20). */
export const ouvrirSauvegarde: OuvrirSauvegarde | undefined = undefined

/** Saves the backup file of a relevé on the phone. */
export const exporterSauvegarde: ExporterSauvegarde | undefined = undefined
