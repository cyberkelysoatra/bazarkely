// Shape of a line of the screen registries (one file per parallel session: registre-bornes.ts,
// registre-stations.ts, registre-resultats.ts, assembled by registre.ts).
import type { ComponentType, LazyExoticComponent } from 'react'

export interface LigneEcran {
  /** Route inside the basename /releve, React Router syntax (`/r/:releve/saisir/:station?`). */
  route: string
  /** Screen loaded on demand: `lazy(() => import('./MonEcran'))` (default export). */
  composant: LazyExoticComponent<ComponentType>
  /** Title of the screen (documentation and placeholder). */
  titre: string
}

/** Backup functions provided by RELEVE-CC-06 (screens of this phase show their item only when defined). */
export type OuvrirSauvegarde = (chantierId: string) => void | Promise<void>
export type ExporterSauvegarde = (releveId: string) => void | Promise<void>
