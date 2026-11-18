// Assembles the three screen registries (one per parallel session, never edited by the others).
import * as bornes from './registre-bornes'
import * as resultats from './registre-resultats'
import * as stations from './registre-stations'
import type { ExporterSauvegarde, LigneEcran, OuvrirSauvegarde } from './typesRegistre'

export type { LigneEcran } from './typesRegistre'

export const ECRANS: LigneEcran[] = [...bornes.ecrans, ...stations.ecrans, ...resultats.ecrans]

export const ouvrirSauvegarde: OuvrirSauvegarde | undefined = resultats.ouvrirSauvegarde
export const exporterSauvegarde: ExporterSauvegarde | undefined = resultats.exporterSauvegarde
