// Texts of the sending and of the account (phase 3), shared by sync/ and the screens.
import { dateMadagascar } from '../db/depot'
import type { Detenteur } from '../db/types'
import { heureMadagascar, pluriel } from '../etat/navigation'

export const MESSAGE_SUSPENDU = 'Envoi suspendu pour ce relevé'
export const MESSAGE_TOUT_ENVOYE = 'Tout est envoyé'

/** « 3 saisies en attente d'envoi » (H02). */
export function messageAttente(n: number): string {
  return n === 0 ? MESSAGE_TOUT_ENVOYE : `${pluriel(n, 'saisie en attente', 'saisies en attente')} d'envoi`
}

/** Section 8: logout refused while rows wait to be sent. */
export function messageDeconnexionRefusee(n: number): string {
  return `${pluriel(n, 'saisie pas encore envoyée', 'saisies pas encore envoyées')} : attendez le réseau ou exportez la sauvegarde`
}

/** « En saisie sur le téléphone de X depuis le JJ/MM à HH:MM. » (6.8, section 8). */
export function messageTenuAilleurs(det: Detenteur | null | undefined): string {
  if (!det) return 'En saisie sur un autre téléphone.'
  const d = new Date(det.depuis)
  if (Number.isNaN(d.getTime())) return `En saisie sur le téléphone de ${det.nom}.`
  const [, mois, jour] = dateMadagascar(d).split('-')
  return `En saisie sur le téléphone de ${det.nom} depuis le ${jour}/${mois} à ${heureMadagascar(det.depuis)}.`
}
