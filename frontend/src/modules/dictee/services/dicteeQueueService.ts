/**
 * Local queue of dictations: ONE path for every recording.
 *
 *  - a recording is written to Dexie `pendingDictations` first, then processed
 *    at once if online; offline it waits for the network;
 *  - one dictation at a time, never twice in parallel (lock);
 *  - triggers: right after a recording, app start (+8 s), SIGNED_IN, `online`
 *    (see ../demarrage.ts, same style as ecritureAutomatiqueService);
 *  - 200: result kept, audio deleted at once. Sure → saved directly with an
 *    « Annuler » toast. Otherwise `needs_review` (sheet or recap on screen).
 */
import accountService from '../../../services/accountService'
import { db } from '../../../lib/database'
import { supabase } from '../../../lib/supabase'
import { useAppStore } from '../../../stores/appStore'
import type { PendingDictation } from '../types'
import { deciderDictee } from '../utils/decision'
import { estAPurger, estEligible, estEnAttente, prochaineDictee, versAnalysee, versAttenteSession, versEchec, versTraitement } from '../utils/etatFile'
import { convertirEnWav } from '../utils/wav'
import { isoAvecDecalage } from '../utils/dates'
import { sousVerrou } from '../utils/verrouPartage'
import { envoyerDictee } from './dicteeApi'
import { enregistrerDictee } from './dicteeSaveService'
import { toastDicteeEnregistree } from '../components/toastDictee'

export const EVENEMENT_DICTEE = 'bazarkely:dictee'

export function signalerChangement(id?: string, status?: string): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENEMENT_DICTEE, { detail: { id, status } }))
}

/** Offline-safe: store first, then local session. Never getUser() (network). */
export async function utilisateurCourant(): Promise<string | null> {
  try {
    const u = useAppStore.getState().user
    if (u?.id) return u.id
  } catch {
    /* store not ready */
  }
  try {
    const { data } = await supabase.auth.getSession()
    return data?.session?.user?.id ?? null
  } catch {
    return null
  }
}

export async function ajouterDictee(params: {
  userId: string
  audio: Blob
  mime: string
  durationMs: number
}): Promise<PendingDictation> {
  const maintenant = new Date()
  const dictee: PendingDictation = {
    id: crypto.randomUUID(),
    userId: params.userId,
    recordedAt: isoAvecDecalage(maintenant),
    audio: params.audio,
    mime: params.mime,
    durationMs: params.durationMs,
    status: 'waiting',
    attempts: 0,
    updatedAt: maintenant.toISOString()
  }
  await db.pendingDictations.put(dictee)
  signalerChangement(dictee.id, dictee.status)
  return dictee
}

export async function lireDictee(id: string): Promise<PendingDictation | undefined> {
  return db.pendingDictations.get(id)
}

export async function dicteesEnAttente(userId: string): Promise<PendingDictation[]> {
  const toutes = await db.pendingDictations.where('userId').equals(userId).toArray()
  return toutes.filter(estEnAttente).sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
}

export async function supprimerDictee(id: string): Promise<void> {
  await db.pendingDictations.delete(id)
  signalerChangement(id, 'deleted')
}

async function purger(): Promise<void> {
  const maintenant = Date.now()
  const terminees = await db.pendingDictations.where('status').equals('done').toArray()
  const ids = terminees.filter((d) => estAPurger(d, maintenant)).map((d) => d.id)
  if (ids.length) await db.pendingDictations.bulkDelete(ids)
}

/** Sure → saved at once. Returns true when saved. */
export async function enregistrerSiSure(copie: PendingDictation): Promise<boolean> {
  const dictee = await db.pendingDictations.get(copie.id)
  if (!dictee || dictee.status !== 'needs_review' || !dictee.result) return false
  // A save already started (ids frozen) is always finished from the screen.
  if (dictee.transactionIds) return false
  const comptes = await accountService.getAccounts()
  const decision = deciderDictee(dictee.result.items, comptes.map((c) => c.id))
  if (decision.kind !== 'sure') return false
  const terminee = await enregistrerDictee(
    dictee,
    dictee.result.items.map((item, origine) => ({ item, origine }))
  )
  signalerChangement(terminee.id, terminee.status)
  toastDicteeEnregistree(terminee, dictee.result.items, comptes)
  return true
}

async function traiterUne(dictee: PendingDictation): Promise<'continuer' | 'arreter'> {
  // Atomic claim: IndexedDB serialises read-write transactions across tabs,
  // so only one tab can move this dictation from eligible to `processing`.
  const pris = await db.transaction('rw', db.pendingDictations, async () => {
    const actuelle = await db.pendingDictations.get(dictee.id)
    if (!actuelle || !estEligible(actuelle)) return null
    const p = versTraitement(actuelle)
    await db.pendingDictations.put(p)
    return p
  })
  if (!pris) return 'continuer'
  let enCours: PendingDictation = pris
  signalerChangement(enCours.id, enCours.status)

  if (!enCours.audio) {
    // Nothing to send any more (should not happen): drop to failed, kept for phase 2.
    await db.pendingDictations.put(versEchec(enCours, 'audio_absent'))
    return 'continuer'
  }

  const comptes = await accountService.getAccounts()
  let reponse = await envoyerDictee({
    audio: enCours.audio,
    mime: enCours.mime,
    recordedAt: enCours.recordedAt,
    durationMs: enCours.durationMs,
    comptes
  })

  // The AI refuses the recorder's format: 16 kHz mono WAV, then retry once.
  if (reponse.kind === 'format' && enCours.mime !== 'audio/wav') {
    try {
      const wav = await convertirEnWav(enCours.audio)
      enCours = { ...enCours, audio: wav, mime: 'audio/wav', updatedAt: new Date().toISOString() }
      await db.pendingDictations.put(enCours)
      reponse = await envoyerDictee({
        audio: wav,
        mime: 'audio/wav',
        recordedAt: enCours.recordedAt,
        durationMs: enCours.durationMs,
        comptes
      })
    } catch (erreur) {
      console.warn('[Dictée] Conversion WAV impossible:', erreur)
      reponse = { kind: 'erreur', code: 'conversion_wav' }
    }
  }

  if (reponse.kind === 'ok') {
    const analysee = versAnalysee(enCours, reponse.result)
    await db.pendingDictations.put(analysee)
    signalerChangement(analysee.id, analysee.status)
    try {
      await enregistrerSiSure(analysee)
    } catch (erreur) {
      // Stays needs_review with its ids: the recap finishes it, nothing duplicated.
      console.error('[Dictée] Enregistrement direct interrompu:', erreur)
    }
    return 'continuer'
  }
  if (reponse.kind === 'session') {
    await db.pendingDictations.put(versAttenteSession(enCours))
    signalerChangement(enCours.id, 'waiting')
    return 'arreter'
  }
  const code = reponse.kind === 'format' ? 'format_refuse' : reponse.code
  await db.pendingDictations.put(versEchec(enCours, code))
  signalerChangement(enCours.id, 'failed')
  // Network trouble: the next ones would fail the same way.
  return code === 'reseau' || code === 'delai_depasse' ? 'arreter' : 'continuer'
}

let verrou = false
/** A dictation left `processing` longer than this was abandoned (tab closed, crash). */
const TRAITEMENT_ABANDONNE_MS = 2 * 60 * 1000

/** One pass over the queue. Never two at a time, in any tab. Never throws. */
export async function traiterFile(): Promise<void> {
  if (verrou) return
  if (typeof navigator !== 'undefined' && !navigator.onLine) return
  verrou = true
  try {
    await sousVerrou('bazarkely-dictee-file', 'essayer', passe)
  } catch (erreur) {
    console.error('[Dictée] Passe de la file en échec (non bloquant):', erreur)
  } finally {
    verrou = false
  }
}

async function passe(): Promise<void> {
  {
    await purger()
    const userId = await utilisateurCourant()
    if (!userId) return
    // A crash during processing leaves `processing`: back to waiting, but only
    // when clearly abandoned (another tab may be working on it right now).
    const bloquees = await db.pendingDictations.where('[userId+status]').equals([userId, 'processing']).toArray()
    for (const d of bloquees) {
      if (Date.now() - new Date(d.updatedAt).getTime() > TRAITEMENT_ABANDONNE_MS) {
        await db.pendingDictations.put({ ...d, status: 'waiting' })
      }
    }

    for (let tour = 0; tour < 50; tour++) {
      if (!navigator.onLine) break
      const file = await db.pendingDictations.where('userId').equals(userId).toArray()
      const suivante = prochaineDictee(file)
      if (!suivante) break
      if ((await traiterUne(suivante)) === 'arreter') break
    }
  }
}
