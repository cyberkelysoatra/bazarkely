// Sending marker of the band (H02, phase 3): « Tout est envoyé » or « N saisies en attente d'envoi », live,
// N = rows 'a_envoyer' of the relevé shown (or of the whole phone on the home and work site screens).
// Without an account, the band keeps « Enregistré sur ce téléphone ». A relevé whose sending the server
// stopped shows « Envoi suspendu pour ce relevé » (full behaviour in RELEVE-CC-09).
import type { PropsBandeau } from '../composants/Bandeau'
import { compterEnAttente, enAttenteReleve } from '../db/lecture'
import type { Releve } from '../db/types'
import { SAISIES_SUSPENDUES } from '../sync/envoi'
import { MESSAGE_SUSPENDU, messageAttente } from '../sync/messages'
import { useSession } from '../sync/session'
import { useRequete } from './useRequete'

const VERT = '#15803D'
const ORANGE = '#C2410C'
const GRIS = '#3F3F3A'

function marque(n: number | undefined): Omit<PropsBandeau, 'compacte'> | undefined {
  if (n === undefined) return undefined
  return { texte: messageAttente(n), point: n === 0 ? VERT : ORANGE }
}

/** Band of a relevé screen; undefined keeps the phase 2 band. */
export function useBandeauReleve(releve: Releve | undefined): Omit<PropsBandeau, 'compacte'> | undefined {
  const session = useSession()
  const id = releve?.id ?? ''
  const n = useRequete(`attente:${id}`, () => (id ? enAttenteReleve(id) : Promise.resolve(0)))
  if (!session || !releve) return undefined
  if (releve.saisie && SAISIES_SUSPENDUES.includes(releve.saisie)) return { texte: MESSAGE_SUSPENDU, point: GRIS }
  return marque(n)
}

/** Band of the home and work site screens: every row waiting on this phone. */
export function useBandeauTelephone(): Omit<PropsBandeau, 'compacte'> | undefined {
  const session = useSession()
  const n = useRequete('attente:tout', compterEnAttente)
  if (!session) return undefined
  return marque(n)
}
