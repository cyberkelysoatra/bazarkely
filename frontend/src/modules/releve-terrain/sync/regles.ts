// Account rules checked on the phone before acting (phase 3): a deletion is refused before sending when
// the relevé, or a relevé of the work site or domain, is known to be held by another phone; signing out is
// refused while rows wait to be sent (section 8).
import { lireCle } from '../db/depot'
import { compterEnAttente, releveTenuAilleurs } from '../db/lecture'
import { messageDeconnexionRefusee, messageTenuAilleurs } from './messages'

/** Message of the refusal, or null when the deletion may go on. */
export async function refusSuppression(cible: { releveId: string } | { chantierId: string } | { domaineId: string }): Promise<string | null> {
  const ap = await lireCle('appareil')
  const r = await releveTenuAilleurs(cible, ap?.id ?? null)
  return r ? messageTenuAilleurs(r.detenteur) : null
}

/** Sign-out allowed only when nothing waits to be sent. */
export async function verifierDeconnexion(): Promise<{ ok: true } | { ok: false; n: number; message: string }> {
  const n = await compterEnAttente()
  return n === 0 ? { ok: true } : { ok: false, n, message: messageDeconnexionRefusee(n) }
}
