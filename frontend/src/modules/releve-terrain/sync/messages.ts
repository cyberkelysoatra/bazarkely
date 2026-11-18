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

/** « le JJ/MM à HH:MM » in Madagascar time, or null when the date is unreadable. */
export function leJourHeure(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  const [, mois, jour] = dateMadagascar(d).split('-')
  return `le ${jour}/${mois} à ${heureMadagascar(iso)}`
}

/** Who holds the input, as said in the messages: « le téléphone de X » or « votre autre téléphone, <modèle> ». */
export function nomTelephone(det: Detenteur): string {
  return det.moi ? `votre autre téléphone, ${det.appareil_libelle || 'téléphone'}` : `le téléphone de ${det.nom}`
}

/**
 * « En saisie sur le téléphone de X depuis le JJ/MM à HH:MM. » (6.8, section 8); the account's other
 * phone is named: « En saisie sur votre autre téléphone, <modèle>, depuis le JJ/MM à HH:MM. » (H27).
 */
export function messageTenuAilleurs(det: Detenteur | null | undefined): string {
  if (!det) return 'En saisie sur un autre téléphone.'
  const quand = leJourHeure(det.depuis)
  if (!quand) return `En saisie sur ${nomTelephone(det)}.`
  return det.moi ? `En saisie sur ${nomTelephone(det)}, depuis ${quand}.` : `En saisie sur ${nomTelephone(det)} depuis ${quand}.`
}

/** H27, section 8: taking (or taking over) the input needs the network. */
export const MESSAGE_RESEAU_PRENDRE = 'Il faut du réseau pour prendre la saisie : faites-le la veille au bureau'
/** H28: finish pressed without network (screen 13). */
export const MESSAGE_FIN_EN_ATTENTE = 'Fin de saisie enregistrée : elle partira au retour du réseau'
/** Section 8, DR10: right withdrawn while holding. */
export const MESSAGE_DROIT_RETIRE = "Vous n'avez plus le droit de relever ici : vos saisies non envoyées restent sur ce téléphone (exportez la sauvegarde)."
/** DR8b. */
export const MESSAGE_REPRISE_PROPRIETAIRE = 'Seul le propriétaire du domaine peut reprendre la saisie.'

/** « Saisie reprise par le propriétaire le JJ/MM à HH:MM. Lecture seule. » (6.10). */
export function messageReprise(repriseAt: string | null | undefined): string {
  const quand = leJourHeure(repriseAt)
  return quand ? `Saisie reprise par le propriétaire ${quand}. Lecture seule.` : 'Saisie reprise par le propriétaire. Lecture seule.'
}

/** Warning before a take-over (6.10), naming the phone. */
export function avertissementReprise(det: Detenteur | null | undefined): string {
  const qui = det ? nomTelephone(det) : 'un autre téléphone'
  const quand = det ? leJourHeure(det.depuis) : null
  return `La saisie est tenue par ${qui}${quand ? ` depuis ${quand}` : ''} ; ce qu'il n'a pas encore envoyé arrivera plus tard. La reprendre ?`
}

/** « dernière donnée reçue à HH:MM » (H29). */
export function messageDerniereDonnee(iso: string | null | undefined): string | null {
  if (!iso || Number.isNaN(Date.parse(iso))) return null
  return `dernière donnée reçue à ${heureMadagascar(iso)}`
}
