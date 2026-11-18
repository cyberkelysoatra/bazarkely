// The sending and reading engine (F8, D32). One cycle: rt_ouvrir (first cycle of the page: module added
// to the account, phone registered), local data attached to the account (D28), sending, reading. Triggers:
// start, `online`, 2 s after a local write, return to the foreground, every 60 s while visible and online,
// sign-in. One engine at a time across tabs (Web Lock 'releve-envoi'); every call under a 10 s timeout;
// back-off 5 s doubling to 60 s after a network failure.
import { liveQuery } from 'dexie'
import { useSyncExternalStore } from 'react'
import { db } from '../db/base'
import * as depot from '../db/depot'
import { compterEnAttente, releveTenuAilleurs } from '../db/lecture'
import { ErreurReseau } from './client'
import { envoyerTout, type BilanEnvoi, type ContexteSync } from './envoi'
import { lireReleve, lireServeur, type BilanLecture } from './lecture'
import { messageTenuAilleurs } from './messages'
import { ErreurServeur, rpcSupabase, type Rpc } from './rpc'
import { ecouterSession, sessionLocale } from './session'

export const DELAI_ECRITURE_MS = 2000
export const PERIODE_MS = 60000

/** Back-off after `echecs` network failures in a row: 5 s, 10 s, 20 s, 40 s, then 60 s. */
export function delaiReprise(echecs: number): number {
  return Math.min(5000 * 2 ** Math.max(0, echecs - 1), 60000)
}

export interface EtatSynchro {
  enCours: boolean
  /** Last cycle done without network failure. */
  derniere: string | null
  echecs: number
}

let etat: EtatSynchro = { enCours: false, derniere: null, echecs: 0 }
const abonnes = new Set<() => void>()
function changer(m: Partial<EtatSynchro>): void {
  etat = { ...etat, ...m }
  abonnes.forEach((f) => f())
}
export function useEtatSynchro(): EtatSynchro {
  return useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      return () => abonnes.delete(f)
    },
    () => etat,
    () => etat,
  )
}

/** rt_ouvrir: module added to the account, phone registered. A phone of another account draws a new identity. */
export async function ouvrir(rpc: Rpc): Promise<{ user_id: string; nom: string; appareil: { id: string; libelle: string } }> {
  let ap = await depot.appareil()
  for (let essai = 0; essai < 2; essai++) {
    try {
      const rep = (await rpc('rt_ouvrir', { p_appareil: ap.id, p_libelle: ap.libelle.slice(0, 60) })) as { user_id?: string; nom?: string } | null
      if (!rep?.user_id) throw new ErreurReseau('rt_ouvrir sans compte')
      await depot.poserCompte({ user_id: rep.user_id, nom: rep.nom ?? '' })
      return { user_id: rep.user_id, nom: rep.nom ?? '', appareil: ap }
    } catch (e) {
      if (e instanceof ErreurServeur && e.code === 'RT_APPAREIL_AUTRE_COMPTE' && essai === 0) {
        const ancien = ap.id
        ap = await depot.renouvelerAppareil()
        await depot.ajouterJournalEnvoi({ cas: 'appareil_renouvele', detail: { ancien, nouveau: ap.id } })
        continue
      }
      throw e
    }
  }
  throw new ErreurReseau('rt_ouvrir')
}

/** One full cycle with a given adapter (used by the engine and the tests). */
export async function cycle(rpc: Rpc, ouvertPour?: { user_id: string; appareil: { id: string; libelle: string } } | null): Promise<{ ctx: ContexteSync; envoi: BilanEnvoi; lecture: BilanLecture }> {
  const o = ouvertPour ?? (await ouvrir(rpc))
  await depot.rattacherAuCompte(o.user_id)
  const ctx: ContexteSync = { rpc, appareil: o.appareil, compteId: o.user_id }
  const envoi = await envoyerTout(ctx)
  const lecture = await lireServeur(ctx)
  // D19: a take-over learnt by reading: the old phone sends what it still holds and acknowledges now.
  if (lecture.reprises.length) {
    const suite = await envoyerTout(ctx)
    envoi.appels += suite.appels
    envoi.marques += suite.marques
    envoi.suspendus.push(...suite.suspendus)
    envoi.refus.push(...suite.refus)
  }
  return { ctx, envoi, lecture }
}

/** Context of the page engine for an action of the user (take, take over), or null without network or session. */
export async function contextePage(): Promise<ContexteSync | null> {
  if (!rpcPage || !sessionLocale() || !enLigne()) return null
  const o = ouvert ?? (await ouvrir(rpcPage))
  ouvert = { user_id: o.user_id, appareil: o.appareil }
  return { rpc: rpcPage, appareil: o.appareil, compteId: o.user_id }
}

// ------------------------------------------------------------------------------------------------
// Engine of the page
// ------------------------------------------------------------------------------------------------

let rpcPage: Rpc | null = null
let signalerPage: (message: string) => void = () => undefined
let ouvert: { user_id: string; appareil: { id: string; libelle: string } } | null = null
let minuterie: ReturnType<typeof setTimeout> | null = null
let enCours: Promise<void> | null = null

function enLigne(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

function planifier(ms: number): void {
  if (minuterie) clearTimeout(minuterie)
  minuterie = setTimeout(() => {
    minuterie = null
    void synchroniser()
  }, ms)
}

async function sousVerrou(f: () => Promise<void>): Promise<boolean> {
  const locks = typeof navigator !== 'undefined' ? (navigator as unknown as { locks?: { request: (n: string, o: object, cb: (l: unknown) => Promise<unknown>) => Promise<unknown> } }).locks : undefined
  if (!locks?.request) {
    await f()
    return true
  }
  let pris = false
  await locks.request('releve-envoi', { ifAvailable: true }, async (l) => {
    if (!l) return
    pris = true
    await f()
  })
  return pris
}

/** Messages of the deletions refused by the server, once the holder is known (after the reading). */
async function messagesRestaures(b: BilanEnvoi, appareilId: string): Promise<void> {
  for (const r of b.restaures) {
    const cible = r.type === 'releve' ? { releveId: r.id } : r.type === 'chantier' ? { chantierId: r.id } : { domaineId: r.id }
    const tenu = await releveTenuAilleurs(cible, appareilId)
    signalerPage(r.code === 'RT_RELEVE_TENU_AILLEURS' || tenu ? messageTenuAilleurs(tenu?.detenteur) : 'Suppression refusée par le serveur : les données sont revenues sur ce téléphone.')
  }
}

/** One cycle now (or soon, when another tab holds the engine). Never throws. */
export function synchroniser(): Promise<void> {
  if (enCours) return enCours
  enCours = (async () => {
    const s = sessionLocale()
    if (!s || !enLigne() || !rpcPage) return
    changer({ enCours: true })
    try {
      const pris = await sousVerrou(async () => {
        if (ouvert && ouvert.user_id !== s.id) ouvert = null
        const r = await cycle(rpcPage!, ouvert)
        ouvert = { user_id: r.ctx.compteId, appareil: r.ctx.appareil }
        await messagesRestaures(r.envoi, r.ctx.appareil.id)
      })
      if (!pris) planifier(DELAI_ECRITURE_MS)
      else changer({ derniere: new Date().toISOString(), echecs: 0 })
    } catch (e) {
      const echecs = etat.echecs + 1
      changer({ echecs })
      if (!(e instanceof ErreurReseau)) console.error('[releve] envoi', e)
      planifier(delaiReprise(echecs))
    } finally {
      changer({ enCours: false })
    }
  })().finally(() => {
    enCours = null
  })
  return enCours
}

/** Opening a relevé this phone does not hold: its objects from the server (H29), when online and signed in. */
export async function lireReleveOuvert(releveId: string): Promise<void> {
  if (!rpcPage || !sessionLocale() || !enLigne()) return
  const r = await db.releves.get(releveId)
  if (!r || !r.serveur_connu || r.saisie === 'ici' || r.saisie === 'fin_en_attente') return
  try {
    const o = ouvert ?? (await ouvrir(rpcPage))
    ouvert = { user_id: o.user_id, appareil: o.appareil }
    await lireReleve({ rpc: rpcPage, appareil: o.appareil, compteId: o.user_id }, releveId)
  } catch {
    // Read again at the next cycle.
  }
}

/** Starts the engine of the page. Returns the stop. */
export function demarrerSynchro(options: { rpc?: Rpc; signaler?: (message: string) => void } = {}): () => void {
  rpcPage = options.rpc ?? rpcSupabase()
  signalerPage = options.signaler ?? (() => undefined)
  const arrets: (() => void)[] = []
  const ecouter = (cible: EventTarget, nom: string, f: () => void) => {
    cible.addEventListener(nom, f)
    arrets.push(() => cible.removeEventListener(nom, f))
  }
  ecouter(window, 'online', () => void synchroniser())
  ecouter(document, 'visibilitychange', () => {
    if (document.visibilityState === 'visible') void synchroniser()
  })
  const periode = setInterval(() => {
    if (document.visibilityState === 'visible' && enLigne()) void synchroniser()
  }, PERIODE_MS)
  arrets.push(() => clearInterval(periode))
  arrets.push(ecouterSession(() => void synchroniser()))
  // 2 s after a local write (a new row waiting, in this tab or another).
  let avant = -1
  const abonnement = liveQuery(compterEnAttente).subscribe({
    next: (n) => {
      if (avant >= 0 && n > avant) planifier(DELAI_ECRITURE_MS)
      avant = n
    },
    error: () => undefined,
  })
  arrets.push(() => abonnement.unsubscribe())
  void synchroniser()
  return () => {
    arrets.forEach((f) => f())
    if (minuterie) clearTimeout(minuterie)
    minuterie = null
    rpcPage = null
    ouvert = null
  }
}
