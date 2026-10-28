/**
 * Background triggers of the dictation queue, started once from main.tsx.
 * Same style as ecritureAutomatiqueService: app start (+8 s), SIGNED_IN,
 * network back. The queue code itself is loaded on demand (lazy chunk), so the
 * main bundle only carries these few lines.
 */
import { supabase } from '../../lib/supabase'
import { db } from '../../lib/database'
import { memoriserUtilisateur } from './utils/proprietaire'

let demarre = false

function lancerPasse(): void {
  void import('./services/dicteeQueueService')
    .then((m) => m.traiterFile())
    .catch((erreur) => console.warn('[Dictée] Passe non lancée (non bloquant):', erreur))
}

/** Only loads the queue code when something is actually waiting. */
async function lancerSiFile(): Promise<void> {
  try {
    const n = await db.pendingDictations.where('status').anyOf('waiting', 'failed', 'processing').count()
    if (n > 0) lancerPasse()
  } catch {
    /* table not ready yet: next trigger */
  }
}

export function demarrerDictee(): void {
  if (demarre || typeof window === 'undefined') return
  demarre = true
  window.setTimeout(() => void lancerSiFile(), 8000)
  // The last user signed in on this phone: the only one who may adopt a
  // dictation recorded with nobody signed in (DICTEE-CC-02).
  void supabase.auth
    .getSession()
    .then(({ data }) => memoriserUtilisateur(data?.session?.user?.id))
    .catch(() => undefined)
  supabase.auth.onAuthStateChange((evenement, session) => {
    if (evenement === 'SIGNED_IN') {
      memoriserUtilisateur(session?.user?.id)
      window.setTimeout(() => void lancerSiFile(), 3000)
    }
  })
  window.addEventListener('online', () => window.setTimeout(() => void lancerSiFile(), 2000))
}

/** Waiting dictations of a user (counter of the floating button). */
export async function compterDicteesEnAttente(userId: string): Promise<number> {
  try {
    return await db.pendingDictations
      .where('userId')
      .equals(userId)
      .filter((d) => d.status !== 'done')
      .count()
  } catch {
    return 0
  }
}

export const EVENEMENT_DICTEE_LEGER = 'bazarkely:dictee'
