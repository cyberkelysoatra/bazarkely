// The ONLY place that writes into ReleveTerrainDB (SCHEMA-STRUCTURE.md section 4).
// Every write from a screen sets maj_at, envoi = 'a_envoyer' and increments the relevé rev. A write
// from a screen holding an older rev than the stored one is refused (ConflitReleve); the other tabs
// are told through BroadcastChannel('releve-terrain'). A storage error (quota) becomes MemoirePleine,
// thrown before anything is lost. Phase 3 (RELEVE-CC-08) adds here marquerEnvoye and appliquerServeur,
// which never set 'a_envoyer' and never increase rev.
import Dexie from 'dexie'
import { db } from './base'
import type {
  Chantier,
  DonneesParType,
  Domaine,
  EnteteReleve,
  Objet,
  ObjetBorne,
  ObjetSauvegarde,
  Releve,
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
async function ecrireDansReleve<T>(releveId: string, revEcran: number, f: (r: Releve, t: string) => Promise<{ patch?: Partial<Releve>; retour: T }>): Promise<{ retour: T; rev: number }> {
  const t = maintenant()
  const res = await proteger(() =>
    db.transaction('rw', db.releves, db.objets, async () => {
      const r = await db.releves.get(releveId)
      if (!r || r.supprime_at) throw new ReleveIntrouvable(releveId)
      if (r.rev > revEcran) throw new ConflitReleve(releveId, r.rev)
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

/** Soft delete of a relevé (its objects stay attached to it). */
export async function supprimerReleve(releveId: string, revEcran: number): Promise<number> {
  const t = maintenant()
  const { rev } = await ecrireDansReleve(releveId, revEcran, async () => ({ patch: { supprime_at: t }, retour: null }))
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

/** Principal targets of a relevé, in order A, B, C (ordre 1, 2, 3). */
export function principales(objets: Objet[]): ObjetBorne[] {
  return objets
    .filter((o): o is ObjetBorne => o.type === 'borne' && !o.supprime && o.donnees.type === 'principale')
    .sort((a, b) => (a.donnees.ordre ?? 9) - (b.donnees.ordre ?? 9))
}
