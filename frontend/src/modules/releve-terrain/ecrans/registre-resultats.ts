// Screens 11 (Carte) and 12 (Résultats, exports): filled by RELEVE-CC-06, the only session that edits
// this file. `ouvrirSauvegarde` and `exporterSauvegarde` are defined: the screens of RELEVE-CC-03 show
// « Ouvrir une sauvegarde ici » and « Exporter ... d'abord ».
import { lazy } from 'react'
import * as sauvegarde from '../exports/sauvegarde'
import type { ExporterSauvegarde, LigneEcran, OuvrirSauvegarde } from './typesRegistre'

export const ecrans: LigneEcran[] = [
  { route: '/r/:releve/carte', composant: lazy(() => import('./carte/Carte')), titre: 'Carte' },
  { route: '/r/:releve/resultats', composant: lazy(() => import('./resultats/Resultats')), titre: 'Étape 4 : résultats' },
]

/** Chooses a `.releve.json` file and imports it into the work site (H20). Static import: the file
 * picker opens inside the touch, without waiting for a chunk. */
export const ouvrirSauvegarde: OuvrirSauvegarde | undefined = (chantierId) => sauvegarde.ouvrirSauvegarde(chantierId)

/** Saves the backup file of a relevé on the phone (share sheet, else download). */
export const exporterSauvegarde: ExporterSauvegarde | undefined = (releveId) => sauvegarde.exporterSauvegarde(releveId)
