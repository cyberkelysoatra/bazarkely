// The ONLY place that writes into ReleveTerrainDB (SCHEMA-STRUCTURE.md section 4).
// Every write from a screen sets maj_at, envoi = 'a_envoyer' and increments the relevé rev. A write
// from a screen holding an older rev than the stored one is refused (ConflitReleve); the other tabs
// are told through BroadcastChannel('releve-terrain'). A storage error (quota) becomes MemoirePleine,
// thrown before anything is lost. Phase 3 (RELEVE-CC-08) adds here the writes reserved to sync/:
// marquerEnvoye and appliquerServeur, which never set 'a_envoyer' on a sent row and never increase the rev
// of a relevé held by this phone, and, for D28, rattacherAuCompte, renouvelerIdsDomaine,
// renouvelerIdsReleve (new ids when the server refuses the old ones), plus the account keys.
import Dexie from 'dexie'
import { db } from './base'
import type {
  CasEnvoi,
  Chantier,
  Detenteur,
  DonneesParType,
  Domaine,
  Droit,
  EnteteReleve,
  Objet,
  ObjetBorne,
  ObjetSauvegarde,
  Releve,
  Saisie,
  SauvegardeReleve,
  TypeObjet,
  ValeursCles,
} from './types'

export const MESSAGE_CONFLIT = 'Ce relevé a changé dans un autre onglet : affichage mis à jour.'
export const MESSAGE_MEMOIRE = 'Mémoire du téléphone pleine : exportez vos relevés avant de continuer.'
export const MESSAGE_NOM_VIDE = 'Donnez un nom.'
export const HAUTEUR_DEFAUT = 1.5

/** The stored relevé is newer than the one on this screen (another tab wrote meanwhile). */
export class ConflitReleve extends Error {
  readonly releveId: string
  readonly revStockee: number
  constructor(releveId: string, revStockee: number) {
    super(MESSAGE_CONFLIT)
    this.name = 'ConflitReleve'
    this.releveId = releveId
    this.revStockee = revStockee
  }
}

/** The phone storage is full: nothing was written. */
export class MemoirePleine extends Error {
  constructor() {
    super(MESSAGE_MEMOIRE)
    this.name = 'MemoirePleine'
  }
}

/** Blank name refused. */
export class NomVide extends Error {
  constructor() {
    super(MESSAGE_NOM_VIDE)
    this.name = 'NomVide'
  }
}

/** The relevé does not exist (or is deleted). */
export class ReleveIntrouvable extends Error {
  constructor(id: string) {
    super(`Relevé introuvable : ${id}`)
    this.name = 'ReleveIntrouvable'
  }
}

export const MESSAGE_REPRISE_REFUS = 'Saisie reprise par le propriétaire : ce relevé est en lecture seule.'
export const MESSAGE_DROIT_RETIRE_REFUS = "Vous n'avez plus le droit de relever ici : ce relevé est en lecture seule."
export const MESSAGE_LECTURE_SEULE = 'Ce téléphone ne tient pas la saisie : ce relevé est en lecture seule.'

/** Phase 3b (6.8, 6.10): only the phone holding the input writes into a relevé. */
export class SaisieNonTenue extends Error {
  readonly saisie: Saisie | null
  constructor(saisie: Saisie | null) {
    super(saisie === 'reprise' ? MESSAGE_REPRISE_REFUS : saisie === 'lecture' ? MESSAGE_DROIT_RETIRE_REFUS : MESSAGE_LECTURE_SEULE)
    this.name = 'SaisieNonTenue'
    this.saisie = saisie
  }
}

/**
 * The input of a relevé is held by this phone: created here and not yet known by the server (null,
 * phase 2 relevés included), held ('ici'), or finished but not yet released ('fin_en_attente', H28).
 */
export function saisieTenueIci(r: Pick<Releve, 'saisie'> | null | undefined): boolean {
  const s = r?.saisie ?? null
  return s === null || s === 'ici' || s === 'fin_en_attente'
}

/** The file is not a backup of this tool. */
export class SauvegardeInvalide extends Error {
  constructor(raison: string) {
    super(raison)
    this.name = 'SauvegardeInvalide'
  }
}

// ---------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------

export function maintenant(): string {
  return new Date().toISOString()
}

/** Day (AAAA-MM-JJ) in Madagascar time (UTC+3), never the UTC day (memento 24). */
export function dateMadagascar(d: Date = new Date()): string {
  return new Date(d.getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10)
}

export function nouvelId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const o = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(o)
  else for (let i = 0; i < 16; i++) o[i] = Math.floor(Math.random() * 256)
  o[6] = (o[6] & 0x0f) | 0x40
  o[8] = (o[8] & 0x3f) | 0x80
  const h = [...o].map((b) => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function nomPropre(nom: string): string {
  const n = (nom ?? '').trim()
  if (!n) throw new NomVide()
  return n.slice(0, 120)
}

function estQuota(e: unknown): boolean {
  let x: unknown = e
  for (let i = 0; i < 4 && x; i++) {
    const nom = (x as { name?: string }).name
    if (nom === 'QuotaExceededError' || nom === Dexie.errnames.QuotaExceeded) return true
    x = (x as { inner?: unknown }).inner
  }
  return false
}

/** Runs a write; a quota error becomes MemoirePleine (nothing written, the screen keeps its state). */
async function proteger<T>(f: () => Promise<T>): Promise<T> {
  try {
    return await f()
  } catch (e) {
    if (estQuota(e)) throw new MemoirePleine()
    throw e
  }
}

// ---------------------------------------------------------------------------------------------
// Other tabs (BroadcastChannel)
// ---------------------------------------------------------------------------------------------

export type MessageCanal = { type: 'releve'; id: string; rev: number } | { type: 'terrains' }

const canal: BroadcastChannel | null = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('releve-terrain') : null
const ecouteursLocaux = new Set<(m: MessageCanal) => void>()

function annoncer(m: MessageCanal): void {
  try {
    canal?.postMessage(m)
  } catch {
    // Channel closed: the other tabs will read the database at their next look.
  }
}

/** Messages sent by the OTHER tabs of this browser. Returns the unsubscribe. */
export function ecouterAutresOnglets(f: (m: MessageCanal) => void): () => void {
  ecouteursLocaux.add(f)
  return () => {
    ecouteursLocaux.delete(f)
  }
}
if (canal) {
  canal.onmessage = (ev: MessageEvent<MessageCanal>) => {
    if (ev.data && typeof ev.data === 'object') ecouteursLocaux.forEach((f) => f(ev.data))
  }
}

// ---------------------------------------------------------------------------------------------
// Keys (cles)
// ---------------------------------------------------------------------------------------------

export async function lireCle<K extends keyof ValeursCles>(cle: K): Promise<ValeursCles[K] | undefined> {
  const l = await db.cles.get(cle)
  return l?.valeur as ValeursCles[K] | undefined
}

async function poserCle<K extends keyof ValeursCles>(cle: K, valeur: ValeursCles[K]): Promise<void> {
  await proteger(() => db.cles.put({ cle, valeur }))
}

/** Display preference of this phone (never sent). */
export async function ecrireVueIntervalle(intervalle: number): Promise<void> {
  await poserCle('vue_intervalle', intervalle)
}

/** Default settings of this phone. */
export async function ecrireReglagesDefaut(reglages: ValeursCles['reglages_defaut']): Promise<void> {
  await poserCle('reglages_defaut', reglages)
}

async function libelleAppareil(): Promise<string> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  type UAData = { platform?: string; mobile?: boolean; getHighEntropyValues?: (h: string[]) => Promise<{ model?: string; platform?: string }> }
  const ua = (nav as unknown as { userAgentData?: UAData } | undefined)?.userAgentData
  try {
    if (ua?.getHighEntropyValues) {
      const v = await ua.getHighEntropyValues(['model', 'platform'])
      const morceaux = [v.platform || ua.platform, v.model].filter((x) => x && x.trim())
      if (morceaux.length) return morceaux.join(', ').slice(0, 80)
    }
    if (ua?.platform) return ua.platform.slice(0, 80)
  } catch {
    // Fall back to the user agent.
  }
  const s = nav?.userAgent ?? ''
  const android = /Android[^;)]*;\s*([^;)]+)/.exec(s)
  if (android && android[1].trim() && android[1].trim() !== 'K') return `Android, ${android[1].trim()}`.slice(0, 80)
  if (/Android/.test(s)) return 'Android'
  if (/iPhone|iPad/.test(s)) return 'iPhone'
  if (/Windows/.test(s)) return 'Windows'
  if (/Mac OS/.test(s)) return 'Mac'
  if (/Linux/.test(s)) return 'Linux'
  return 'Téléphone'
}

/** Identity of this phone (D25): random uuid drawn at the first opening. */
export async function appareil(): Promise<ValeursCles['appareil']> {
  const deja = await lireCle('appareil')
  if (deja) return deja
  const valeur = { id: nouvelId(), libelle: await libelleAppareil() }
  // Two tabs opened together: the first stored identity wins.
  return proteger(() =>
    db.transaction('rw', db.cles, async () => {
      const l = await db.cles.get('appareil')
      if (l) return l.valeur as ValeursCles['appareil']
      await db.cles.put({ cle: 'appareil', valeur })
      return valeur
    }),
  )
}

// ---------------------------------------------------------------------------------------------
// Domains and work sites
// ---------------------------------------------------------------------------------------------

export async function creerDomaine(nom: string): Promise<Domaine> {
  const t = maintenant()
  const d: Domaine = { id: nouvelId(), nom: nomPropre(nom), proprietaire: 'local', a_moi: true, cree_at: t, maj_at: t, supprime_at: null, envoi: 'a_envoyer' }
  await proteger(() => db.domaines.add(d))
  annoncer({ type: 'terrains' })
  return d
}

export async function renommerDomaine(id: string, nom: string): Promise<void> {
  const n = nomPropre(nom)
  await proteger(() => db.domaines.update(id, { nom: n, maj_at: maintenant(), envoi: 'a_envoyer' }))
  annoncer({ type: 'terrains' })
}

/** Soft delete of relevés (rev + 1, so an older tab can no longer write into them). */
async function supprimerRelevesDe(chantierIds: string[], t: string): Promise<void> {
  if (!chantierIds.length) return
  const rs = await db.releves.where('chantier_id').anyOf(chantierIds).toArray()
  for (const r of rs) {
    if (r.supprime_at) continue
    await db.releves.update(r.id, { supprime_at: t, maj_at: t, envoi: 'a_envoyer', rev: r.rev + 1 })
  }
}

/** Soft delete of a domain, with its work sites and their relevés. */
export async function supprimerDomaine(id: string): Promise<void> {
  const t = maintenant()
  await proteger(() =>
    db.transaction('rw', db.domaines, db.chantiers, db.releves, async () => {
      await db.domaines.update(id, { supprime_at: t, maj_at: t, envoi: 'a_envoyer' })
      const cs = (await db.chantiers.where('domaine_id').equals(id).toArray()).filter((c) => !c.supprime_at)
      for (const c of cs) await db.chantiers.update(c.id, { supprime_at: t, maj_at: t, envoi: 'a_envoyer' })
      await supprimerRelevesDe(
        cs.map((c) => c.id),
        t,
      )
    }),
  )
  annoncer({ type: 'terrains' })
}

export async function creerChantier(domaineId: string, nom: string): Promise<Chantier> {
  const t = maintenant()
  const c: Chantier = { id: nouvelId(), domaine_id: domaineId, nom: nomPropre(nom), cree_at: t, maj_at: t, supprime_at: null, envoi: 'a_envoyer' }
  await proteger(() =>
    db.transaction('rw', db.domaines, db.chantiers, async () => {
      const d = await db.domaines.get(domaineId)
      if (!d || d.supprime_at) throw new Error('Domaine introuvable')
      await db.chantiers.add(c)
    }),
  )
  annoncer({ type: 'terrains' })
  return c
}

export async function renommerChantier(id: string, nom: string): Promise<void> {
  const n = nomPropre(nom)
  await proteger(() => db.chantiers.update(id, { nom: n, maj_at: maintenant(), envoi: 'a_envoyer' }))
  annoncer({ type: 'terrains' })
}

/** Soft delete of a work site, with its relevés. */
export async function supprimerChantier(id: string): Promise<void> {
  const t = maintenant()
  await proteger(() =>
    db.transaction('rw', db.chantiers, db.releves, async () => {
      await db.chantiers.update(id, { supprime_at: t, maj_at: t, envoi: 'a_envoyer' })
      await supprimerRelevesDe([id], t)
    }),
  )
  annoncer({ type: 'terrains' })
}

// ---------------------------------------------------------------------------------------------
// Relevés
// ---------------------------------------------------------------------------------------------

export interface NouveauReleve {
  nom: string
  date?: string
  operateurs?: string
  hi?: number
  ht?: number
}

function enteteVide(nom: string, date: string, operateurs: string, hi: number, ht: number): EnteteReleve {
  return {
    schema: 1,
    nom,
    date,
    operateurs,
    hi,
    ht,
    reglages: {},
    orientation: { cap_lu: null, source: null, declinaison: null },
    cote_c: null,
    calage: { etat: 'a_faire', le: null },
  }
}

/** An entete received from the server, completed with the defaults of schema 1 (never trusted as is). */
export function enteteDepuis(nom: string, e: unknown): EnteteReleve {
  const base = enteteVide(nom, dateMadagascar(), '', HAUTEUR_DEFAUT, HAUTEUR_DEFAUT)
  const entete = estObjetSimple(e) ? fusionProfonde(base, e) : base
  entete.schema = 1
  entete.nom = nom
  return entete
}

function objetNeuf<T extends TypeObjet>(releveId: string, type: T, donnees: DonneesParType[T], t: string, id = nouvelId()): Objet {
  return { id, releve_id: releveId, type, donnees, supprime: false, saisi_at: t, maj_at: t, apres_reprise: false, envoi: 'a_envoyer' } as Objet
}

function bornePrincipale(lettre: 'A' | 'B' | 'C', ordre: 1 | 2 | 3): DonneesParType['borne'] {
  return { lettre, usage: 1, nom: '', type: 'principale', ordre, rang: 0, plan: null, verifiee: false, station_origine: null, etat: 'active', retiree_le: null }
}

function hauteur(v: number | undefined): number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : HAUTEUR_DEFAUT
}

/** H01: new relevé with entete schema 1, today in Madagascar, hi = ht = 1,50 and the principal targets A, B, C. */
export async function creerReleve(chantierId: string, n: NouveauReleve): Promise<Releve> {
  const nom = nomPropre(n.nom)
  const t = maintenant()
  const r: Releve = {
    id: nouvelId(),
    chantier_id: chantierId,
    nom,
    entete: enteteVide(nom, n.date && /^\d{4}-\d{2}-\d{2}$/.test(n.date) ? n.date : dateMadagascar(), (n.operateurs ?? '').trim(), hauteur(n.hi), hauteur(n.ht)),
    cree_par: 'local',
    cree_at: t,
    maj_at: t,
    ouvert_at: null,
    rev: 1,
    supprime_at: null,
    envoi: 'a_envoyer',
    saisie: null,
    terminer_demande: null,
    serveur_connu: false,
  }
  const bornes = [bornePrincipale('A', 1), bornePrincipale('B', 2), bornePrincipale('C', 3)].map((d) => objetNeuf(r.id, 'borne', d, t))
  await proteger(() =>
    db.transaction('rw', db.chantiers, db.releves, db.objets, async () => {
      const c = await db.chantiers.get(chantierId)
      if (!c || c.supprime_at) throw new Error('Chantier introuvable')
      await db.releves.add(r)
      await db.objets.bulkAdd(bornes)
    }),
  )
  annoncer({ type: 'releve', id: r.id, rev: r.rev })
  annoncer({ type: 'terrains' })
  return r
}

/**
 * Write guard of a relevé: refused when the stored rev is higher than the screen's one; otherwise
 * `f` runs in the same transaction and the relevé gets rev + 1, maj_at and envoi = 'a_envoyer'.
 */
async function ecrireDansReleve<T>(
  releveId: string,
  revEcran: number,
  f: (r: Releve, t: string) => Promise<{ patch?: Partial<Releve>; retour: T }>,
  sansGardeSaisie = false,
): Promise<{ retour: T; rev: number }> {
  const t = maintenant()
  const res = await proteger(() =>
    db.transaction('rw', db.releves, db.objets, async () => {
      const r = await db.releves.get(releveId)
      if (!r || r.supprime_at) throw new ReleveIntrouvable(releveId)
      if (r.rev > revEcran) throw new ConflitReleve(releveId, r.rev)
      // Phase 3b: a relevé this phone does not hold is read-only, whatever the screen shows.
      if (!sansGardeSaisie && !saisieTenueIci(r)) throw new SaisieNonTenue(r.saisie)
      const { patch, retour } = await f(r, t)
      const rev = r.rev + 1
      await db.releves.update(releveId, { ...(patch ?? {}), rev, maj_at: t, envoi: 'a_envoyer' })
      return { retour, rev }
    }),
  )
  annoncer({ type: 'releve', id: releveId, rev: res.rev })
  return res
}

export async function renommerReleve(releveId: string, nom: string, revEcran: number): Promise<number> {
  const n = nomPropre(nom)
  const { rev } = await ecrireDansReleve(releveId, revEcran, async (r) => ({ patch: { nom: n, entete: { ...r.entete, nom: n } }, retour: null }))
  annoncer({ type: 'terrains' })
  return rev
}

/**
 * Soft delete of a relevé (its objects stay attached to it). Not bound to the input: the server
 * arbitrates (RT_RELEVE_TENU_AILLEURS restores it), and a relevé held elsewhere is refused before.
 */
export async function supprimerReleve(releveId: string, revEcran: number): Promise<number> {
  const t = maintenant()
  const { rev } = await ecrireDansReleve(releveId, revEcran, async () => ({ patch: { supprime_at: t }, retour: null }), true)
  annoncer({ type: 'terrains' })
  return rev
}

/** Opening of a relevé on this phone: ouvert_at and the key dernier_releve (no rev, nothing to send). */
export async function marquerOuvert(releveId: string): Promise<void> {
  const t = maintenant()
  await proteger(() =>
    db.transaction('rw', db.releves, db.cles, async () => {
      const r = await db.releves.get(releveId)
      if (!r || r.supprime_at) return
      await db.releves.update(releveId, { ouvert_at: t })
      await db.cles.put({ cle: 'dernier_releve', valeur: { releve_id: releveId, le: t } })
    }),
  )
}

function estObjetSimple(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Deep merge: plain objects merged key by key, everything else (arrays, null, numbers) replaced. */
export function fusionProfonde<T>(base: T, patch: unknown): T {
  if (!estObjetSimple(base) || !estObjetSimple(patch)) return (patch === undefined ? base : patch) as T
  const out: Record<string, unknown> = { ...base }
  for (const [k, v] of Object.entries(patch)) {
    // A backup file is untrusted: never let a key reach the prototype chain.
    if (v === undefined || k === '__proto__' || k === 'constructor' || k === 'prototype') continue
    out[k] = estObjetSimple(v) && estObjetSimple(out[k]) ? fusionProfonde(out[k], v) : v
  }
  return out as T
}

export type PatchProfond<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object | null ? PatchProfond<NonNullable<T[K]>> | T[K] : T[K] }

/** Deep merge into the entete (screens 6, 7 and 12). `nom` also renames the relevé. */
export async function modifierEntete(releveId: string, patch: PatchProfond<EnteteReleve>, revEcran: number): Promise<number> {
  const { rev } = await ecrireDansReleve(releveId, revEcran, async (r) => {
    const entete = fusionProfonde(r.entete, patch)
    entete.schema = 1
    const p: Partial<Releve> = { entete }
    if (typeof patch.nom === 'string' && patch.nom.trim()) {
      entete.nom = patch.nom.trim()
      p.nom = entete.nom
    } else entete.nom = r.nom
    return { patch: p, retour: null }
  })
  if (typeof patch.nom === 'string') annoncer({ type: 'terrains' })
  return rev
}

// ---------------------------------------------------------------------------------------------
// Objects
// ---------------------------------------------------------------------------------------------

/** An object to write: a new one (no id) or the replacement of an existing one (same id). */
export type ObjetAEcrire = { [T in TypeObjet]: { id?: string; type: T; donnees: DonneesParType[T]; saisi_at?: string } }[TypeObjet]

/** Creates or replaces objects by id, in one write of the relevé. Returns the objects written and the new rev. */
export async function ecrireObjets(releveId: string, objets: ObjetAEcrire[], revEcran: number): Promise<{ objets: Objet[]; rev: number }> {
  const { retour, rev } = await ecrireDansReleve(releveId, revEcran, async (_r, t) => {
    const ecrits: Objet[] = []
    for (const o of objets) {
      const ancien = o.id ? await db.objets.get(o.id) : undefined
      if (ancien && ancien.releve_id !== releveId) throw new Error(`Objet ${o.id} d'un autre relevé`)
      const objet = {
        id: o.id ?? nouvelId(),
        releve_id: releveId,
        type: o.type,
        donnees: o.donnees,
        supprime: false,
        saisi_at: o.saisi_at ?? ancien?.saisi_at ?? t,
        maj_at: t,
        apres_reprise: ancien?.apres_reprise ?? false,
        envoi: 'a_envoyer',
      } as Objet
      ecrits.push(objet)
    }
    await db.objets.bulkPut(ecrits)
    return { retour: ecrits }
  })
  return { objets: retour, rev }
}

export async function ecrireObjet(releveId: string, objet: ObjetAEcrire, revEcran: number): Promise<{ objet: Objet; rev: number }> {
  const { objets, rev } = await ecrireObjets(releveId, [objet], revEcran)
  return { objet: objets[0], rev }
}

/** Soft delete of objects of a relevé. */
export async function supprimerObjets(releveId: string, ids: string[], revEcran: number): Promise<number> {
  const { rev } = await ecrireDansReleve(releveId, revEcran, async (_r, t) => {
    for (const id of ids) {
      const o = await db.objets.get(id)
      if (!o || o.releve_id !== releveId) continue
      await db.objets.update(id, { supprime: true, maj_at: t, envoi: 'a_envoyer' })
    }
    return { retour: null }
  })
  return rev
}

export async function supprimerObjet(releveId: string, objetId: string, revEcran: number): Promise<number> {
  return supprimerObjets(releveId, [objetId], revEcran)
}

// ---------------------------------------------------------------------------------------------
// Duplicate, backup import (H03, H20)
// ---------------------------------------------------------------------------------------------

/** New ids for every object, links (cote de/vers, sights, origin station, set-aside sight) kept. */
function remapper<T extends { id: string; type: TypeObjet; donnees: unknown }>(objets: T[]): { objets: T[]; correspondance: Map<string, string> } {
  const m = new Map<string, string>()
  for (const o of objets) m.set(o.id, nouvelId())
  const lien = (id: string | null): string | null => (id === null ? null : (m.get(id) ?? id))
  const out = objets.map((o) => {
    const d = JSON.parse(JSON.stringify(o.donnees)) as Record<string, unknown>
    if (o.type === 'cote') {
      d.de = lien(d.de as string)
      d.vers = lien(d.vers as string)
    } else if (o.type === 'station') {
      d.visees = (d.visees as { borne_id: string }[]).map((v) => ({ ...v, borne_id: lien(v.borne_id) }))
      d.sans_visee = lien((d.sans_visee as string | null) ?? null)
    } else if (o.type === 'borne') {
      d.station_origine = lien((d.station_origine as string | null) ?? null)
    }
    return { ...o, id: m.get(o.id)!, donnees: d }
  })
  return { objets: out as T[], correspondance: m }
}

/** H03: copy of a relevé in the same work site, « <nom> (copie) », new ids, links kept. */
export async function dupliquerReleve(releveId: string): Promise<Releve> {
  const t = maintenant()
  const res = await proteger(() =>
    db.transaction('rw', db.releves, db.objets, async () => {
      const r = await db.releves.get(releveId)
      if (!r || r.supprime_at) throw new ReleveIntrouvable(releveId)
      const objets = (await db.objets.where('releve_id').equals(releveId).toArray()).filter((o) => !o.supprime)
      const nom = `${r.nom} (copie)`.slice(0, 120)
      const copie: Releve = {
        ...r,
        id: nouvelId(),
        nom,
        entete: { ...JSON.parse(JSON.stringify(r.entete)), nom },
        cree_par: 'local',
        cree_at: t,
        maj_at: t,
        ouvert_at: null,
        rev: 1,
        supprime_at: null,
        envoi: 'a_envoyer',
        saisie: null,
        terminer_demande: null,
        serveur_connu: false,
      }
      const { objets: nouveaux } = remapper(objets)
      await db.releves.add(copie)
      await db.objets.bulkAdd(nouveaux.map((o) => ({ ...o, releve_id: copie.id, maj_at: t, apres_reprise: false, envoi: 'a_envoyer' as const })))
      return copie
    }),
  )
  annoncer({ type: 'terrains' })
  return res
}

const TYPES: TypeObjet[] = ['borne', 'cote', 'station', 'point_plan', 'journal']

/** Checks the shape of a backup file (format, schema 1, entete, objects). */
export function verifierSauvegarde(s: unknown): SauvegardeReleve {
  if (!estObjetSimple(s) || s.format !== 'releve-terrain') throw new SauvegardeInvalide("Ce fichier n'est pas une sauvegarde de relevé.")
  if (s.schema !== 1) throw new SauvegardeInvalide('Cette sauvegarde vient d’une version plus récente de l’outil.')
  const r = s.releve
  if (!estObjetSimple(r) || typeof r.nom !== 'string' || !estObjetSimple(r.entete)) throw new SauvegardeInvalide('Sauvegarde incomplète : relevé absent.')
  if (!Array.isArray(s.objets)) throw new SauvegardeInvalide('Sauvegarde incomplète : objets absents.')
  for (const o of s.objets) {
    if (!estObjetSimple(o) || typeof o.id !== 'string' || !TYPES.includes(o.type as TypeObjet) || !estObjetSimple(o.donnees)) {
      throw new SauvegardeInvalide('Sauvegarde abîmée : un objet est illisible.')
    }
  }
  return s as unknown as SauvegardeReleve
}

/**
 * H20: imports a backup into a work site. Only the objects of the file (no target created).
 * 'garder_les_deux': new ids for the relevé and every object, links kept.
 * 'remplacer': ids of the file kept; the relevé of the same name in this work site is replaced.
 */
export async function importerReleve(chantierId: string, sauvegarde: SauvegardeReleve, mode: 'remplacer' | 'garder_les_deux'): Promise<Releve> {
  const s = verifierSauvegarde(sauvegarde)
  const t = maintenant()
  const entete: EnteteReleve = fusionProfonde(enteteVide(s.releve.nom, dateMadagascar(), '', HAUTEUR_DEFAUT, HAUTEUR_DEFAUT), s.releve.entete)
  entete.schema = 1
  const res = await proteger(() =>
    db.transaction('rw', db.chantiers, db.releves, db.objets, async () => {
      const c = await db.chantiers.get(chantierId)
      if (!c || c.supprime_at) throw new Error('Chantier introuvable')
      const memes = (await db.releves.where('chantier_id').equals(chantierId).toArray()).filter((r) => !r.supprime_at)
      const base = s.objets.map((o: ObjetSauvegarde) => ({ id: o.id, type: o.type, donnees: o.donnees, supprime: o.supprime === true, saisi_at: o.saisi_at ?? t }))
      let id: string
      let nom = s.releve.nom.trim() || 'Relevé importé'
      let rev = 1
      let objets = base
      if (mode === 'garder_les_deux') {
        id = nouvelId()
        objets = remapper(base).objets
        const noms = new Set(memes.map((r) => r.nom))
        if (noms.has(nom)) {
          let k = 2
          while (noms.has(`${nom} (${k})`)) k++
          nom = `${nom} (${k})`
        }
      } else {
        id = s.releve.id
        // The relevé of the same name in this work site is replaced (soft delete when its id differs).
        for (const r of memes) {
          if (r.nom === nom && r.id !== id) await db.releves.update(r.id, { supprime_at: t, maj_at: t, envoi: 'a_envoyer', rev: r.rev + 1 })
        }
        const existant = await db.releves.get(id)
        if (existant && !existant.supprime_at && !saisieTenueIci(existant)) throw new SaisieNonTenue(existant.saisie)
        if (existant) {
          rev = existant.rev + 1
          const idsFichier = new Set(base.map((o) => o.id))
          const anciens = await db.objets.where('releve_id').equals(id).toArray()
          for (const o of anciens) if (!idsFichier.has(o.id) && !o.supprime) await db.objets.update(o.id, { supprime: true, maj_at: t, envoi: 'a_envoyer' })
        }
      }
      entete.nom = nom
      const r: Releve = {
        id,
        chantier_id: chantierId,
        nom,
        entete,
        cree_par: 'local',
        cree_at: typeof s.releve.cree_at === 'string' ? s.releve.cree_at : t,
        maj_at: t,
        ouvert_at: null,
        rev,
        supprime_at: null,
        envoi: 'a_envoyer',
        saisie: null,
        terminer_demande: null,
        serveur_connu: false,
      }
      await db.releves.put(r)
      await db.objets.bulkPut(objets.map((o) => ({ ...o, releve_id: id, maj_at: t, apres_reprise: false, envoi: 'a_envoyer' as const }) as Objet))
      return r
    }),
  )
  annoncer({ type: 'releve', id: res.id, rev: res.rev })
  annoncer({ type: 'terrains' })
  return res
}

/** Backup file of a relevé (used by the exports of RELEVE-CC-06). */
export async function lireSauvegarde(releveId: string): Promise<SauvegardeReleve> {
  const r = await db.releves.get(releveId)
  if (!r) throw new ReleveIntrouvable(releveId)
  const c = await db.chantiers.get(r.chantier_id)
  const d = c ? await db.domaines.get(c.domaine_id) : undefined
  const objets = (await db.objets.where('releve_id').equals(releveId).toArray()).filter((o) => !o.supprime)
  return {
    format: 'releve-terrain',
    schema: 1,
    domaine: { nom: d?.nom ?? '' },
    chantier: { nom: c?.nom ?? '' },
    releve: { id: r.id, nom: r.nom, entete: r.entete, cree_at: r.cree_at },
    objets: objets.map((o) => ({ id: o.id, type: o.type, donnees: o.donnees, saisi_at: o.saisi_at, maj_at: o.maj_at }) as ObjetSauvegarde),
  }
}

// ---------------------------------------------------------------------------------------------
// Phase 3 (RELEVE-CC-08): writes reserved to sync/. None of them sets 'a_envoyer' on a row that was
// sent, none increases the rev of a relevé held by this phone.
// ---------------------------------------------------------------------------------------------

export type TableEnvoi = 'domaines' | 'chantiers' | 'releves' | 'objets'

/** A row as read for sending: its table, its id and its maj_at at that moment. */
export interface LigneLue {
  table: TableEnvoi
  id: string
  maj_at: string
}

/**
 * Sets envoi = 'envoye' on the rows whose maj_at has not changed since they were read for sending
 * (a row written meanwhile stays 'a_envoyer' and leaves at the next pass). Never touches rev.
 * Returns the number of rows marked.
 */
export async function marquerEnvoye(lignes: LigneLue[]): Promise<number> {
  if (!lignes.length) return 0
  const n = await proteger(() =>
    db.transaction('rw', db.domaines, db.chantiers, db.releves, db.objets, async () => {
      let k = 0
      for (const l of lignes) {
        const table = db[l.table] as unknown as Dexie.Table<{ id: string; maj_at: string; envoi: string }, string>
        const r = await table.get(l.id)
        if (!r || r.envoi !== 'a_envoyer' || r.maj_at !== l.maj_at) continue
        await table.update(l.id, { envoi: 'envoye' })
        k++
      }
      return k
    }),
  )
  annoncer({ type: 'terrains' })
  return n
}

export interface DomaineServeur {
  id: string
  nom: string
  a_moi: boolean
  proprietaire_nom?: string
}

export interface ChantierServeur {
  id: string
  domaine_id: string
  nom: string
  droit: Droit | null
}

export interface ReleveServeur {
  id: string
  chantier_id: string
  nom: string
  entete: EnteteReleve
  cree_par: string
  cree_par_nom?: string
  cree_at: string
  maj_at: string
  saisie: Detenteur | null
  derniere_donnee_at?: string | null
  nb_stations?: number
  /** Phase 3b: time of the last take-over by the owner. */
  reprise_at?: string | null
}

export interface ObjetServeur {
  id: string
  releve_id: string
  type: TypeObjet
  donnees: unknown
  supprime: boolean
  saisi_at: string | null
  recu_at?: string
  apres_reprise: boolean
}

/** Local state of a relevé set by sync/ (never envoi, rev or maj_at). */
export interface EtatLocalReleve {
  id: string
  serveur_connu?: boolean
  saisie?: Saisie | null
  lu_donnee_at?: string | null
  /** Phase 3b. */
  terminer_demande?: boolean | null
  detenteur?: Detenteur | null
  reprise_at?: string | null
  reprise_a_accuser?: boolean
}

/**
 * H28: « Terminer la saisie » pressed. The relevé stays held ('fin_en_attente') until every waiting row
 * has reached the server, then sync/ calls rt_saisie_terminer last. No rev, nothing more to send.
 */
export async function demanderFinSaisie(releveId: string): Promise<boolean> {
  const ok = await proteger(() =>
    db.transaction('rw', db.releves, async () => {
      const r = await db.releves.get(releveId)
      if (!r || r.supprime_at) throw new ReleveIntrouvable(releveId)
      if (!saisieTenueIci(r)) throw new SaisieNonTenue(r.saisie)
      if (r.saisie === 'fin_en_attente' && r.terminer_demande) return false
      await db.releves.update(releveId, { saisie: 'fin_en_attente', terminer_demande: true })
      return true
    }),
  )
  annoncer({ type: 'terrains' })
  return ok
}

export interface IdsTerrains {
  domaines?: string[]
  chantiers?: string[]
  releves?: string[]
}

/** What sync/ writes from the server (and the local states it decides). */
export interface DonneesServeur {
  /** Account of this phone (owner of the domains `a_moi`). */
  compteId?: string
  /** Identity of this phone (input held here when the holder is this device). */
  appareilId?: string
  domaines?: DomaineServeur[]
  chantiers?: ChantierServeur[]
  releves?: ReleveServeur[]
  objets?: ObjetServeur[]
  etats?: EtatLocalReleve[]
  /** No longer returned by the server (DR11): removed, except what still has rows 'a_envoyer'. */
  retirer?: IdsTerrains
  /** Deletion refused by the server: the rows come back on the phone. */
  restaurer?: IdsTerrains
}

/** What appliquerServeur did. */
export interface BilanServeur {
  /** Relevés kept in read-only because rows still wait to be sent (DR11). */
  gardesEnLecture: string[]
  retires: { domaines: number; chantiers: number; releves: number }
  /** Phase 3b: relevés this phone held and learnt, by reading, that the owner took over. */
  reprises: string[]
}

/** What the phone knows besides the holder, to read the server's answer (phase 3b). */
export interface ContexteSaisie {
  /** Time of the last take-over, as returned by the server. */
  repriseAt?: string | null
  /** Rows of the relevé still waiting to be sent. */
  enAttente?: number
  /** Holder known on the phone before this answer. */
  detenteurConnu?: Detenteur | null
  /** The phone still has to send and acknowledge after a take-over. */
  aAccuser?: boolean
}

/**
 * Input state from the holder returned by the server (6.8, 6.10). A phone that held the input and now
 * sees another holder (or none) after a take-over is 'reprise' (D19); a relevé kept read-only after a
 * withdrawn right keeps its waiting rows apart ('lecture', DR10).
 */
export function saisieDepuisServeur(det: Detenteur | null | undefined, appareilId: string | undefined, actuelle: Saisie | null, droit: Droit | null | undefined, c: ContexteSaisie = {}): Saisie {
  if (droit === 'consulter') return 'lecture'
  if (det && appareilId && det.appareil === appareilId) return actuelle === 'fin_en_attente' ? 'fin_en_attente' : 'ici'
  if (actuelle === 'lecture' && (c.enAttente ?? 0) > 0) return 'lecture'
  if (actuelle === 'reprise' && (det || c.aAccuser)) return 'reprise'
  if (actuelle === 'ici' || actuelle === 'fin_en_attente') {
    if (det && c.repriseAt) return 'reprise'
    if (!det && c.repriseAt) {
      const depuis = c.detenteurConnu?.depuis ? Date.parse(c.detenteurConnu.depuis) : NaN
      if (Number.isNaN(depuis) || Date.parse(c.repriseAt) >= depuis) return 'reprise'
    }
  }
  if (det) return 'ailleurs'
  return 'libre'
}

/** Deep equality, key order ignored (the server's jsonb sorts the keys). */
function memeJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => memeJson(x, b[i]))
  const ka = Object.keys(a as object).filter((k) => (a as Record<string, unknown>)[k] !== undefined)
  const kb = Object.keys(b as object).filter((k) => (b as Record<string, unknown>)[k] !== undefined)
  return ka.length === kb.length && ka.every((k) => memeJson((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]))
}

/**
 * Writes what the server returns. Never sets 'a_envoyer', never overwrites a row 'a_envoyer' (only
 * its server fields: author name, holder, last data), never increases the rev of a relevé held by
 * this phone. Removal (DR11) keeps every relevé that still has rows 'a_envoyer', in read-only.
 * The other tabs are told through the BroadcastChannel.
 */
export async function appliquerServeur(donnees: DonneesServeur): Promise<BilanServeur> {
  const t = maintenant()
  const changes = new Map<string, number>()
  const bilan: BilanServeur = { gardesEnLecture: [], retires: { domaines: 0, chantiers: 0, releves: 0 }, reprises: [] }
  await proteger(() =>
    db.transaction('rw', db.domaines, db.chantiers, db.releves, db.objets, async () => {
      const droits = new Map<string, Droit | null>()
      for (const c of donnees.chantiers ?? []) droits.set(c.id, c.droit)

      for (const d of donnees.domaines ?? []) {
        const l = await db.domaines.get(d.id)
        const proprietaire = d.a_moi ? (donnees.compteId ?? l?.proprietaire ?? 'local') : 'partage'
        if (!l) {
          await db.domaines.add({ id: d.id, nom: d.nom, proprietaire, a_moi: d.a_moi, cree_at: t, maj_at: t, supprime_at: null, envoi: 'envoye', proprietaire_nom: d.proprietaire_nom })
        } else if (l.envoi === 'a_envoyer') {
          await db.domaines.update(d.id, { proprietaire_nom: d.proprietaire_nom })
        } else {
          await db.domaines.update(d.id, { nom: d.nom, a_moi: d.a_moi, proprietaire, proprietaire_nom: d.proprietaire_nom, supprime_at: null })
        }
      }

      for (const c of donnees.chantiers ?? []) {
        const l = await db.chantiers.get(c.id)
        const droit = c.droit ?? undefined
        if (!l) {
          await db.chantiers.add({ id: c.id, domaine_id: c.domaine_id, nom: c.nom, cree_at: t, maj_at: t, supprime_at: null, envoi: 'envoye', droit })
        } else if (l.envoi === 'a_envoyer') {
          await db.chantiers.update(c.id, { droit })
        } else {
          await db.chantiers.update(c.id, { nom: c.nom, domaine_id: c.domaine_id, supprime_at: null, droit })
        }
      }

      for (const s of donnees.releves ?? []) {
        const l = await db.releves.get(s.id)
        const droit = droits.get(s.chantier_id) ?? (await db.chantiers.get(s.chantier_id))?.droit
        const meta = {
          cree_par: s.cree_par,
          cree_par_nom: s.cree_par_nom,
          detenteur: s.saisie ?? null,
          derniere_donnee_at: s.derniere_donnee_at ?? null,
          nb_stations: s.nb_stations,
          serveur_connu: true,
          reprise_at: s.reprise_at ?? null,
        }
        if (!l) {
          await db.releves.add({
            id: s.id,
            chantier_id: s.chantier_id,
            nom: s.nom,
            entete: s.entete,
            cree_at: s.cree_at,
            maj_at: s.maj_at,
            ouvert_at: null,
            rev: 1,
            supprime_at: null,
            envoi: 'envoye',
            saisie: saisieDepuisServeur(s.saisie, donnees.appareilId, null, droit),
            terminer_demande: null,
            lu_donnee_at: null,
            ...meta,
          })
          changes.set(s.id, 1)
          continue
        }
        const enAttente = (await db.objets.where('releve_id').equals(s.id).toArray()).filter((o) => o.envoi === 'a_envoyer').length + (l.envoi === 'a_envoyer' ? 1 : 0)
        const saisie = saisieDepuisServeur(s.saisie, donnees.appareilId, l.saisie, droit, {
          repriseAt: s.reprise_at ?? null,
          enAttente,
          detenteurConnu: l.detenteur ?? null,
          aAccuser: l.reprise_a_accuser === true,
        })
        // D19: this phone held the input and learns the take-over by reading: it still sends what it typed,
        // then acknowledges; meanwhile it is read-only.
        const repris = saisie === 'reprise' && (l.saisie === 'ici' || l.saisie === 'fin_en_attente')
        const suite: Partial<Releve> = repris ? { reprise_a_accuser: true, terminer_demande: null } : {}
        if (repris) bilan.reprises.push(s.id)
        if (l.envoi === 'a_envoyer') {
          await db.releves.update(s.id, { ...meta, saisie, ...suite })
          continue
        }
        const contenu = l.nom !== s.nom || !memeJson(l.entete, s.entete) || l.chantier_id !== s.chantier_id || l.supprime_at !== null
        const tenuIci = saisie === 'ici' || l.saisie === 'ici'
        const patch: Partial<Releve> = { ...meta, saisie, ...suite }
        if (contenu) Object.assign(patch, { nom: s.nom, entete: s.entete, chantier_id: s.chantier_id, supprime_at: null, maj_at: s.maj_at })
        if (contenu && !tenuIci) patch.rev = l.rev + 1
        await db.releves.update(s.id, patch)
        if (patch.rev) changes.set(s.id, patch.rev)
      }

      const objetsParReleve = new Map<string, ObjetServeur[]>()
      for (const o of donnees.objets ?? []) objetsParReleve.set(o.releve_id, [...(objetsParReleve.get(o.releve_id) ?? []), o])
      for (const [releveId, liste] of objetsParReleve) {
        const r = await db.releves.get(releveId)
        if (!r) continue
        let modifie = false
        for (const o of liste) {
          const l = await db.objets.get(o.id)
          if (l && (l.envoi === 'a_envoyer' || l.releve_id !== releveId)) continue
          const neuf = {
            id: o.id,
            releve_id: releveId,
            type: o.type,
            donnees: o.donnees,
            supprime: o.supprime === true,
            saisi_at: o.saisi_at ?? o.recu_at ?? t,
            maj_at: o.recu_at ?? t,
            apres_reprise: o.apres_reprise === true,
            envoi: 'envoye',
          } as Objet
          if (l && memeJson(l.donnees, neuf.donnees) && l.supprime === neuf.supprime && l.apres_reprise === neuf.apres_reprise) continue
          await db.objets.put(neuf)
          modifie = true
        }
        if (modifie && r.saisie !== 'ici') {
          const rev = (changes.get(releveId) ?? r.rev) + (changes.has(releveId) ? 0 : 1)
          await db.releves.update(releveId, { rev })
          changes.set(releveId, rev)
        }
      }

      for (const e of donnees.etats ?? []) {
        const l = await db.releves.get(e.id)
        if (!l) continue
        const patch: Partial<Releve> = {}
        if (e.serveur_connu !== undefined) patch.serveur_connu = e.serveur_connu
        if (e.saisie !== undefined) patch.saisie = e.saisie
        if (e.lu_donnee_at !== undefined) patch.lu_donnee_at = e.lu_donnee_at
        if (e.terminer_demande !== undefined) patch.terminer_demande = e.terminer_demande
        if (e.detenteur !== undefined) patch.detenteur = e.detenteur
        if (e.reprise_at !== undefined) patch.reprise_at = e.reprise_at
        if (e.reprise_a_accuser !== undefined) patch.reprise_a_accuser = e.reprise_a_accuser
        await db.releves.update(e.id, patch)
      }

      // Deletion refused by the server: the rows come back. A domain or a work site keeps its envoi (sent
      // again, idempotent); a relevé known by the server is the server's again ('envoye').
      const rest = donnees.restaurer
      if (rest) {
        for (const id of rest.domaines ?? []) await db.domaines.update(id, { supprime_at: null })
        for (const id of rest.chantiers ?? []) await db.chantiers.update(id, { supprime_at: null })
        for (const id of rest.releves ?? []) {
          const l = await db.releves.get(id)
          if (!l) continue
          const rev = l.saisie === 'ici' ? l.rev : l.rev + 1
          await db.releves.update(id, l.serveur_connu ? { supprime_at: null, envoi: 'envoye', rev } : { supprime_at: null, rev })
          changes.set(id, rev)
        }
      }

      const ret = donnees.retirer
      if (ret) {
        // A relevé with rows still to send stays, read-only and exportable; its work site and domain stay too.
        const retirerReleve = async (r: Releve): Promise<boolean> => {
          const objets = await db.objets.where('releve_id').equals(r.id).toArray()
          if (r.envoi === 'a_envoyer' || objets.some((o) => o.envoi === 'a_envoyer')) {
            if (r.saisie !== 'lecture') await db.releves.update(r.id, { saisie: 'lecture' })
            bilan.gardesEnLecture.push(r.id)
            return false
          }
          await db.objets.bulkDelete(objets.map((o) => o.id))
          await db.releves.delete(r.id)
          bilan.retires.releves++
          return true
        }
        const retirerChantier = async (c: Chantier): Promise<boolean> => {
          let tous = true
          for (const r of await db.releves.where('chantier_id').equals(c.id).toArray()) if (!(await retirerReleve(r))) tous = false
          if (!tous || c.envoi === 'a_envoyer') return false
          await db.chantiers.delete(c.id)
          bilan.retires.chantiers++
          return true
        }
        for (const id of ret.releves ?? []) {
          const r = await db.releves.get(id)
          if (r) await retirerReleve(r)
        }
        for (const id of ret.chantiers ?? []) {
          const c = await db.chantiers.get(id)
          if (c) await retirerChantier(c)
        }
        for (const id of ret.domaines ?? []) {
          const d = await db.domaines.get(id)
          if (!d) continue
          let tous = true
          for (const c of await db.chantiers.where('domaine_id').equals(id).toArray()) if (!(await retirerChantier(c))) tous = false
          if (tous && d.envoi !== 'a_envoyer') {
            await db.domaines.delete(id)
            bilan.retires.domaines++
          }
        }
      }
    }),
  )
  for (const [id, rev] of changes) annoncer({ type: 'releve', id, rev })
  annoncer({ type: 'terrains' })
  return bilan
}

/** D28: the domains and relevés made before the account become the account's (ids kept). */
export async function rattacherAuCompte(compteId: string): Promise<string[]> {
  const ids = await proteger(() =>
    db.transaction('rw', db.domaines, db.releves, async () => {
      const ds = (await db.domaines.toArray()).filter((d) => d.proprietaire === 'local')
      for (const d of ds) await db.domaines.update(d.id, { proprietaire: compteId, a_moi: true })
      const rs = (await db.releves.toArray()).filter((r) => r.cree_par === 'local')
      for (const r of rs) await db.releves.update(r.id, { cree_par: compteId })
      return ds.map((d) => d.id)
    }),
  )
  if (ids.length) annoncer({ type: 'terrains' })
  return ids
}

/** Applies an id mapping to the ids and the links (sides, sights, origin station) of objects. */
function appliquerCorrespondance(objets: Objet[], m: Map<string, string>): { objet: Objet; change: boolean }[] {
  const lien = (id: string | null): string | null => (id === null ? null : (m.get(id) ?? id))
  return objets.map((o) => {
    const d = JSON.parse(JSON.stringify(o.donnees)) as Record<string, unknown>
    if (o.type === 'cote') {
      d.de = lien(d.de as string)
      d.vers = lien(d.vers as string)
    } else if (o.type === 'station') {
      d.visees = ((d.visees as { borne_id: string }[]) ?? []).map((v) => ({ ...v, borne_id: lien(v.borne_id) }))
      d.sans_visee = lien((d.sans_visee as string | null) ?? null)
    } else if (o.type === 'borne') {
      d.station_origine = lien((d.station_origine as string | null) ?? null)
    }
    const id = m.get(o.id) ?? o.id
    const change = id !== o.id || !memeJson(d, o.donnees)
    return { objet: { ...o, id, donnees: d } as unknown as Objet, change }
  })
}

function journalIds(releveId: string, t: string, detail: Record<string, unknown>): Objet {
  return objetNeuf(releveId, 'journal', { action: 'ids_renouveles', detail, le: t }, t)
}

/** Sending journal kept on the phone (last 200 cases). */
export async function ajouterJournalEnvoi(cas: Omit<CasEnvoi, 'le'>): Promise<void> {
  const t = maintenant()
  await proteger(() =>
    db.transaction('rw', db.cles, async () => {
      const l = ((await db.cles.get('journal_envoi'))?.valeur as CasEnvoi[] | undefined) ?? []
      await db.cles.put({ cle: 'journal_envoi', valeur: [...l, { ...cas, le: t }].slice(-200) })
    }),
  )
}

/**
 * D28: the server refused the id of a domain (taken, or owned by another account): the domain and
 * all its children get new ids on the phone (links kept), every row 'a_envoyer', relevés not yet known
 * by the server, held by this phone. A journal object is added to each relevé. Returns the mapping.
 */
export async function renouvelerIdsDomaine(domaineId: string, raison: string): Promise<Map<string, string>> {
  const t = maintenant()
  const m = new Map<string, string>()
  const res = await proteger(() =>
    db.transaction('rw', [db.domaines, db.chantiers, db.releves, db.objets, db.cles], async () => {
      const d = await db.domaines.get(domaineId)
      if (!d) return []
      m.set(d.id, nouvelId())
      const chantiers = await db.chantiers.where('domaine_id').equals(d.id).toArray()
      for (const c of chantiers) m.set(c.id, nouvelId())
      const releves = chantiers.length ? await db.releves.where('chantier_id').anyOf(chantiers.map((c) => c.id)).toArray() : []
      for (const r of releves) m.set(r.id, nouvelId())
      const objets = releves.length ? await db.objets.where('releve_id').anyOf(releves.map((r) => r.id)).toArray() : []
      for (const o of objets) m.set(o.id, nouvelId())
      await db.domaines.delete(d.id)
      await db.domaines.add({ ...d, id: m.get(d.id)!, maj_at: t, envoi: 'a_envoyer' })
      for (const c of chantiers) {
        await db.chantiers.delete(c.id)
        await db.chantiers.add({ ...c, id: m.get(c.id)!, domaine_id: m.get(d.id)!, maj_at: t, envoi: 'a_envoyer' })
      }
      const annonces: { id: string; rev: number }[] = []
      for (const r of releves) {
        const nid = m.get(r.id)!
        await db.releves.delete(r.id)
        await db.releves.add({ ...r, id: nid, chantier_id: m.get(r.chantier_id)!, maj_at: t, envoi: 'a_envoyer', serveur_connu: false, saisie: 'ici', detenteur: null, rev: r.rev + 1 })
        annonces.push({ id: nid, rev: r.rev + 1 })
        annonces.push({ id: r.id, rev: r.rev + 1 })
      }
      const remappes = appliquerCorrespondance(objets, m)
      await db.objets.bulkDelete(objets.map((o) => o.id))
      await db.objets.bulkAdd(remappes.map(({ objet }) => ({ ...objet, releve_id: m.get(objet.releve_id) ?? objet.releve_id, maj_at: t, envoi: 'a_envoyer' as const }) as Objet))
      for (const r of releves) await db.objets.add(journalIds(m.get(r.id)!, t, { raison, domaine: { ancien: d.id, nouveau: m.get(d.id) }, releve: { ancien: r.id, nouveau: m.get(r.id) } }))
      const dernier = (await db.cles.get('dernier_releve'))?.valeur as ValeursCles['dernier_releve'] | undefined
      if (dernier && m.has(dernier.releve_id)) await db.cles.put({ cle: 'dernier_releve', valeur: { ...dernier, releve_id: m.get(dernier.releve_id)! } })
      return annonces
    }),
  )
  for (const a of res) annoncer({ type: 'releve', ...a })
  annoncer({ type: 'terrains' })
  return m
}

/**
 * The server refused the id of a relevé (RT_ID_PRIS) or of some of its objects: new ids on the phone
 * for the relevé and all its objects (`objets` absent), or for the listed objects only. Links kept,
 * changed rows 'a_envoyer', journal object added. Returns the mapping.
 */
export async function renouvelerIdsReleve(releveId: string, raison: string, objets?: string[]): Promise<Map<string, string>> {
  const t = maintenant()
  const m = new Map<string, string>()
  const res = await proteger(() =>
    db.transaction('rw', db.releves, db.objets, db.cles, async () => {
      const r = await db.releves.get(releveId)
      if (!r) return null
      const tous = await db.objets.where('releve_id').equals(r.id).toArray()
      const cibles = objets ? tous.filter((o) => objets.includes(o.id)) : tous
      for (const o of cibles) m.set(o.id, nouvelId())
      let id = r.id
      if (!objets) {
        id = nouvelId()
        m.set(r.id, id)
        await db.releves.delete(r.id)
        await db.releves.add({ ...r, id, maj_at: t, envoi: 'a_envoyer', serveur_connu: false, saisie: 'ici', detenteur: null, rev: r.rev + 1 })
      } else {
        await db.releves.update(r.id, { maj_at: t, envoi: 'a_envoyer' })
      }
      const aEcrire = appliquerCorrespondance(tous, m)
        .map((x, i) => ({ ...x, ancienId: tous[i].id }))
        .filter((x) => x.change || !objets)
      await db.objets.bulkDelete(aEcrire.map((x) => x.ancienId))
      await db.objets.bulkPut(aEcrire.map(({ objet }) => ({ ...objet, releve_id: id, maj_at: t, envoi: 'a_envoyer' as const }) as Objet))
      await db.objets.add(journalIds(id, t, { raison, releve: { ancien: r.id, nouveau: id }, objets: [...m.entries()].filter(([a]) => a !== r.id).map(([ancien, nouveau]) => ({ ancien, nouveau })) }))
      const dernier = (await db.cles.get('dernier_releve'))?.valeur as ValeursCles['dernier_releve'] | undefined
      if (dernier && dernier.releve_id === r.id && id !== r.id) await db.cles.put({ cle: 'dernier_releve', valeur: { ...dernier, releve_id: id } })
      return { id, ancien: r.id, rev: r.rev + 1 }
    }),
  )
  if (res) {
    annoncer({ type: 'releve', id: res.id, rev: res.rev })
    if (res.ancien !== res.id) annoncer({ type: 'releve', id: res.ancien, rev: res.rev })
  }
  annoncer({ type: 'terrains' })
  return m
}

/** Account known on this phone (rt_ouvrir). */
export async function poserCompte(compte: ValeursCles['compte']): Promise<void> {
  await poserCle('compte', compte)
}

/** The server refused this phone's identity (another account): a new one is drawn, same label. */
export async function renouvelerAppareil(): Promise<ValeursCles['appareil']> {
  const ancien = await appareil()
  const valeur = { id: nouvelId(), libelle: ancien.libelle }
  await poserCle('appareil', valeur)
  return valeur
}

/** Principal targets of a relevé, in order A, B, C (ordre 1, 2, 3). */
export function principales(objets: Objet[]): ObjetBorne[] {
  return objets
    .filter((o): o is ObjetBorne => o.type === 'borne' && !o.supprime && o.donnees.type === 'principale')
    .sort((a, b) => (a.donnees.ordre ?? 9) - (b.donnees.ordre ?? 9))
}
