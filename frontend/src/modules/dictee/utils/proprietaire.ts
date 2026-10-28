/**
 * Who may adopt a dictation recorded with nobody signed in (DICTEE-CC-02).
 *
 * At each sign-in the user id is kept on this phone. A dictation recorded with
 * no session stores that « last signed-in user »; only that user may adopt it.
 * Anyone else signing in sees it with « Supprimer » only, and it is never sent.
 * Kept tiny: demarrage.ts (main bundle) writes the key.
 */
import type { PendingDictation } from '../types'

export const CLE_DERNIER_UTILISATEUR = 'bazarkely_dictee_dernier_utilisateur'

export function memoriserUtilisateur(userId: string | null | undefined): void {
  if (!userId) return
  try {
    localStorage.setItem(CLE_DERNIER_UTILISATEUR, userId)
  } catch {
    /* storage blocked: the dictation simply stays unowned */
  }
}

export function dernierUtilisateurConnu(): string | null {
  try {
    return localStorage.getItem(CLE_DERNIER_UTILISATEUR) || null
  } catch {
    return null
  }
}

/** Pure, tested. Unowned, and recorded right after this user's session on this phone. */
export function peutAdopter(d: Pick<PendingDictation, 'userId' | 'dernierUtilisateur'>, userId: string | null | undefined): boolean {
  return d.userId === '' && Boolean(userId) && Boolean(d.dernierUtilisateur) && d.dernierUtilisateur === userId
}

/** Unowned and not adoptable by this user: shown with « Supprimer » only. */
export function estOrphelineEtrangere(d: Pick<PendingDictation, 'userId' | 'dernierUtilisateur' | 'status'>, userId: string | null | undefined): boolean {
  return d.userId === '' && d.status !== 'done' && !peutAdopter(d, userId)
}
