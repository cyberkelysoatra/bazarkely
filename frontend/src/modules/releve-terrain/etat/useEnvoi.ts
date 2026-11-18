// Band of the relevé screens (phase 3b, PRD 4 P6, H02, H27 to H29, 6.10): who holds the input and the
// sending marker (« Tout est envoyé » or « N saisies en attente d'envoi », live). Held here: « Vous tenez
// la saisie » and « Terminer la saisie »; elsewhere: the holder and the last data received; free:
// « Prendre la saisie »; finish waiting for the network (screen 13); taken over; right withdrawn.
// Without an account the band keeps « Enregistré sur ce téléphone ». Home and work site: phone marker.
import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { PropsBandeau } from '../composants/Bandeau'
import { saisieTenueIci } from '../db/depot'
import { compterEnAttente, enAttenteReleve } from '../db/lecture'
import type { Chantier, Domaine, Releve } from '../db/types'
import {
  MESSAGE_DROIT_RETIRE,
  MESSAGE_FIN_EN_ATTENTE,
  MESSAGE_RESEAU_PRENDRE,
  messageAttente,
  messageDerniereDonnee,
  messageReprise,
  messageTenuAilleurs,
} from '../sync/messages'
import { contextePage, synchroniser } from '../sync/moteur'
import { prendreSaisie, reprendreSaisie, terminerSaisie } from '../sync/saisie'
import { useSession } from '../sync/session'
import { montrerAvis } from './avis'
import { useRequete } from './useRequete'

const VERT = '#15803D'
const ORANGE = '#C2410C'

export type PropsBandeauReleve = Omit<PropsBandeau, 'compacte'>

function marque(n: number | undefined): PropsBandeauReleve | undefined {
  if (n === undefined) return undefined
  return { texte: messageAttente(n), point: n === 0 ? VERT : ORANGE }
}

function enLigne(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

/** « Tout est envoyé » → « tout est envoyé », for the one-line band (D21). */
function minuscule(t: string): string {
  return t.charAt(0).toLowerCase() + t.slice(1)
}

/** The account owns the domain of this relevé (6.10: only the owner takes the input over). */
export function estProprietaire(chantier: Chantier | null | undefined, domaine: Domaine | null | undefined): boolean {
  if (chantier?.droit) return chantier.droit === 'proprietaire'
  return domaine?.a_moi !== false
}

/** Actions of the input lock from a screen (take, take over, finish), with their notices. */
export function useActionsSaisie(releveId: string | undefined) {
  const naviguer = useNavigate()
  const prendre = useCallback(async (): Promise<boolean> => {
    if (!releveId) return false
    if (!enLigne()) {
      montrerAvis(MESSAGE_RESEAU_PRENDRE, 'alerte')
      return false
    }
    const res = await prendreSaisie(await contextePage().catch(() => null), releveId)
    if (!res.ok) montrerAvis(res.message, 'alerte')
    else montrerAvis('Vous tenez la saisie.')
    return res.ok
  }, [releveId])
  const reprendre = useCallback(async (): Promise<boolean> => {
    if (!releveId) return false
    if (!enLigne()) {
      montrerAvis(MESSAGE_RESEAU_PRENDRE, 'alerte')
      return false
    }
    const res = await reprendreSaisie(await contextePage().catch(() => null), releveId)
    if (!res.ok) montrerAvis(res.message, 'alerte')
    else montrerAvis('Saisie reprise : vous tenez la saisie.')
    return res.ok
  }, [releveId])
  const terminer = useCallback(async (): Promise<void> => {
    if (!releveId) return
    try {
      await terminerSaisie(releveId)
    } catch (e) {
      montrerAvis(e instanceof Error ? e.message : String(e), 'alerte')
      return
    }
    if (!enLigne()) montrerAvis(MESSAGE_FIN_EN_ATTENTE)
    void synchroniser()
    naviguer(`/r/${releveId}/saisie`)
  }, [releveId, naviguer])
  return { prendre, reprendre, terminer }
}

/** Band of a relevé screen; undefined keeps the phase 2 band. */
export function useBandeauReleve(releve: Releve | undefined, options: { compacte?: boolean; chantier?: Chantier | null } = {}): PropsBandeauReleve | undefined {
  const session = useSession()
  const id = releve?.id ?? ''
  const n = useRequete(`attente:${id}`, () => (id ? enAttenteReleve(id) : Promise.resolve(0)))
  const { prendre, terminer } = useActionsSaisie(releve?.id)
  if (!session || !releve) return undefined
  const envoi = marque(n)
  const saisie = releve.saisie
  if (saisieTenueIci(releve) && saisie !== 'fin_en_attente') {
    const texteEnvoi = envoi?.texte ?? messageAttente(0)
    return options.compacte
      ? { etat: 'tenue', texte: `Vous tenez la saisie, ${minuscule(texteEnvoi)}`, point: envoi?.point, action: { libelle: 'Terminer', onClick: () => void terminer() } }
      : { etat: 'tenue', texte: 'Vous tenez la saisie', sousTexte: texteEnvoi, point: envoi?.point, action: { libelle: 'Terminer la saisie', onClick: () => void terminer() } }
  }
  if (saisie === 'fin_en_attente') return { etat: 'fin_en_attente', texte: MESSAGE_FIN_EN_ATTENTE, sousTexte: envoi?.texte }
  if (saisie === 'reprise') return { etat: 'reprise', texte: messageReprise(releve.reprise_at) }
  if (saisie === 'lecture' && n === undefined) return { etat: 'libre', texte: 'Lecture seule.' }
  if (saisie === 'lecture' && (n ?? 0) > 0) return { etat: 'retire', texte: MESSAGE_DROIT_RETIRE }
  const derniere = messageDerniereDonnee(releve.derniere_donnee_at)
  const det = releve.detenteur
  if (det) {
    const texte = det.moi ? messageTenuAilleurs(det) : `${messageTenuAilleurs(det)} Lecture seule.`
    return { etat: 'ailleurs', texte, sousTexte: derniere }
  }
  const consulter = saisie === 'lecture' || options.chantier?.droit === 'consulter'
  if (consulter) return { etat: 'libre', texte: 'Saisie libre. Lecture seule.', sousTexte: derniere }
  return { etat: 'libre', texte: 'Saisie libre', sousTexte: derniere, action: { libelle: options.compacte ? 'Prendre' : 'Prendre la saisie', onClick: () => void prendre() } }
}

/** Band of the home and work site screens: every row waiting on this phone. */
export function useBandeauTelephone(): PropsBandeauReleve | undefined {
  const session = useSession()
  const n = useRequete('attente:tout', compterEnAttente)
  if (!session) return undefined
  return marque(n)
}
