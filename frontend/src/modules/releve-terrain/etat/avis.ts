// Short notices of the app (6 s): relevé changed in another tab, phone memory full, blank name...
// `executer` runs a write of db/depot.ts from a screen and turns its known errors into a notice.
import { useSyncExternalStore } from 'react'
import { ConflitReleve, MemoirePleine, NomVide, SaisieNonTenue, SauvegardeInvalide } from '../db/depot'

export interface Avis {
  n: number
  texte: string
  ton: 'info' | 'alerte'
}

const DUREE = 6000
let courant: Avis | null = null
let compteur = 0
let minuterie: ReturnType<typeof setTimeout> | null = null
const abonnes = new Set<() => void>()
const notifier = () => abonnes.forEach((f) => f())

/** Shows a notice for 6 s (the memory-full one stays until touched). */
export function montrerAvis(texte: string, ton: Avis['ton'] = 'info', duree: number | null = DUREE): void {
  compteur += 1
  courant = { n: compteur, texte, ton }
  if (minuterie) clearTimeout(minuterie)
  minuterie = duree === null ? null : setTimeout(fermerAvis, duree)
  notifier()
}

export function fermerAvis(): void {
  if (minuterie) clearTimeout(minuterie)
  minuterie = null
  courant = null
  notifier()
}

export function lireAvis(): Avis | null {
  return courant
}

function suivre(f: () => void) {
  abonnes.add(f)
  return () => {
    abonnes.delete(f)
  }
}

export function useAvis(): Avis | null {
  return useSyncExternalStore(suivre, lireAvis, () => null)
}

/** Listeners told when a write was refused because another tab changed the relevé (useReleve reloads). */
const conflits = new Set<(releveId: string) => void>()
export function ecouterConflits(f: (releveId: string) => void): () => void {
  conflits.add(f)
  return () => {
    conflits.delete(f)
  }
}

/**
 * Runs a write from a screen. Known errors become a notice and the result is null:
 * older tab (ConflitReleve, the screen reloads), memory full, blank name, invalid backup.
 * Any other error is shown as a plain notice too and the result is null.
 */
export async function executer<T>(f: () => Promise<T>): Promise<T | null> {
  try {
    return await f()
  } catch (e) {
    if (e instanceof ConflitReleve) {
      conflits.forEach((g) => g(e.releveId))
      montrerAvis(e.message)
    } else if (e instanceof MemoirePleine) {
      montrerAvis(e.message, 'alerte', null)
    } else if (e instanceof NomVide || e instanceof SauvegardeInvalide || e instanceof SaisieNonTenue) {
      montrerAvis(e.message, 'alerte')
    } else {
      montrerAvis("L'enregistrement n'a pas pu se faire : réessayez.", 'alerte')
      console.error('[releve] écriture refusée', e)
    }
    return null
  }
}
