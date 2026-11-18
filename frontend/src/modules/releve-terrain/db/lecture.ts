// Read-only queries of ReleveTerrainDB (lists of the screens). No write here: see depot.ts.
import { db } from './base'
import type { Chantier, Domaine, Objet, Releve } from './types'

export interface ChantierListe {
  chantier: Chantier
  releves: number
}

export interface DomaineListe {
  domaine: Domaine
  chantiers: ChantierListe[]
  releves: number
}

const parCreation = <T extends { cree_at: string }>(a: T, b: T) => a.cree_at.localeCompare(b.cree_at)

/**
 * Domains of this phone with their work sites and number of relevés (deleted ones left out). The
 * domains shared with the account (phase 3 reads them already) wait for « Partagés avec moi » (phase 4).
 */
export async function listeTerrains(): Promise<DomaineListe[]> {
  const [domaines, chantiers, releves] = await Promise.all([db.domaines.toArray(), db.chantiers.toArray(), db.releves.toArray()])
  const nb = new Map<string, number>()
  for (const r of releves) if (!r.supprime_at) nb.set(r.chantier_id, (nb.get(r.chantier_id) ?? 0) + 1)
  return domaines
    .filter((d) => !d.supprime_at && d.a_moi !== false)
    .sort(parCreation)
    .map((domaine) => {
      const cs = chantiers
        .filter((c) => c.domaine_id === domaine.id && !c.supprime_at)
        .sort(parCreation)
        .map((chantier) => ({ chantier, releves: nb.get(chantier.id) ?? 0 }))
      return { domaine, chantiers: cs, releves: cs.reduce((s, c) => s + c.releves, 0) }
    })
}

export interface ChantierComplet {
  chantier: Chantier
  domaine: Domaine | null
  releves: { releve: Releve; objets: Objet[] }[]
}

/** A work site with its relevés (and their objects, for the step and the calibration colour). */
export async function lireChantier(chantierId: string): Promise<ChantierComplet | null> {
  const chantier = await db.chantiers.get(chantierId)
  if (!chantier || chantier.supprime_at) return null
  const domaine = (await db.domaines.get(chantier.domaine_id)) ?? null
  const releves = (await db.releves.where('chantier_id').equals(chantierId).toArray()).filter((r) => !r.supprime_at).sort((a, b) => b.cree_at.localeCompare(a.cree_at))
  const ids = releves.map((r) => r.id)
  const objets = ids.length ? await db.objets.where('releve_id').anyOf(ids).toArray() : []
  return {
    chantier,
    domaine: domaine && !domaine.supprime_at ? domaine : null,
    releves: releves.map((releve) => ({ releve, objets: objets.filter((o) => o.releve_id === releve.id && !o.supprime) })),
  }
}

export interface ReleveComplet {
  releve: Releve
  objets: Objet[]
  chantier: Chantier | null
  domaine: Domaine | null
}

/** A relevé with its live objects, its work site and its domain; null when absent or deleted. */
export async function lireReleve(releveId: string): Promise<ReleveComplet | null> {
  const releve = await db.releves.get(releveId)
  if (!releve || releve.supprime_at) return null
  const objets = (await db.objets.where('releve_id').equals(releveId).toArray()).filter((o) => !o.supprime)
  const chantier = (await db.chantiers.get(releve.chantier_id)) ?? null
  const domaine = chantier ? ((await db.domaines.get(chantier.domaine_id)) ?? null) : null
  return { releve, objets, chantier, domaine }
}

/** Input held by this phone (created here and not yet sent, held, or finish waiting for the network). */
function tenuIci(r: Releve): boolean {
  return r.saisie === null || r.saisie === undefined || r.saisie === 'ici' || r.saisie === 'fin_en_attente'
}

/**
 * Block « Reprendre » of the home screen (P1): the relevé whose input THIS phone holds, the last opened
 * first, else the most recently opened or changed one held here; null when it holds none.
 */
export async function dernierReleve(): Promise<ReleveComplet | null> {
  const l = await db.cles.get('dernier_releve')
  const v = l?.valeur as { releve_id?: string } | undefined
  const valide = (r: ReleveComplet | null): r is ReleveComplet => !!r && !!r.chantier && !r.chantier.supprime_at && !!r.domaine && !r.domaine.supprime_at && tenuIci(r.releve)
  if (v?.releve_id) {
    const r = await lireReleve(v.releve_id)
    if (valide(r)) return r
  }
  const candidats = (await db.releves.toArray())
    .filter((r) => !r.supprime_at && tenuIci(r))
    .sort((a, b) => (b.ouvert_at ?? b.maj_at).localeCompare(a.ouvert_at ?? a.maj_at))
  for (const c of candidats) {
    const r = await lireReleve(c.id)
    if (valide(r)) return r
  }
  return null
}

/**
 * Waiting rows of a relevé, as the band counts them (H02): its objects 'a_envoyer', or 1 when only the
 * relevé itself (its entete, its deletion) waits.
 */
export function compterReleve(releve: Releve | undefined, objets: Objet[]): number {
  const n = objets.filter((o) => o.envoi === 'a_envoyer').length
  return n > 0 ? n : releve?.envoi === 'a_envoyer' ? 1 : 0
}

/** Rows of a relevé waiting to be sent (live in the band). */
export async function enAttenteReleve(releveId: string): Promise<number> {
  const [r, objets] = await Promise.all([db.releves.get(releveId), db.objets.where('releve_id').equals(releveId).toArray()])
  return compterReleve(r, objets)
}

/** Every row waiting to be sent on this phone (domains, work sites, relevés counted as in the band). */
export async function compterEnAttente(): Promise<number> {
  const [domaines, chantiers, releves, objets] = await Promise.all([db.domaines.toArray(), db.chantiers.toArray(), db.releves.toArray(), db.objets.toArray()])
  const parReleve = new Map<string, Objet[]>()
  for (const o of objets) if (o.envoi === 'a_envoyer') parReleve.set(o.releve_id, [...(parReleve.get(o.releve_id) ?? []), o])
  let n = domaines.filter((d) => d.envoi === 'a_envoyer').length + chantiers.filter((c) => c.envoi === 'a_envoyer').length
  const vus = new Set<string>()
  for (const r of releves) {
    vus.add(r.id)
    n += compterReleve(r, parReleve.get(r.id) ?? [])
  }
  for (const [id, l] of parReleve) if (!vus.has(id)) n += l.length
  return n
}

/**
 * First live relevé of a relevé, a work site or a domain known to be held by another phone (holder
 * returned by the server, not this device), or null.
 */
export async function releveTenuAilleurs(cible: { releveId: string } | { chantierId: string } | { domaineId: string }, appareilId: string | null): Promise<Releve | null> {
  let releves: Releve[]
  if ('releveId' in cible) {
    const r = await db.releves.get(cible.releveId)
    releves = r ? [r] : []
  } else {
    const chantiers =
      'chantierId' in cible ? [cible.chantierId] : (await db.chantiers.where('domaine_id').equals(cible.domaineId).toArray()).filter((c) => !c.supprime_at).map((c) => c.id)
    releves = chantiers.length ? await db.releves.where('chantier_id').anyOf(chantiers).toArray() : []
  }
  return releves.find((r) => !r.supprime_at && r.detenteur && r.detenteur.appareil !== appareilId) ?? null
}

/** Ids of the live relevés of a domain or of a work site (export before deletion). */
export async function idsReleves(cible: { domaineId: string } | { chantierId: string }): Promise<string[]> {
  const chantiers =
    'chantierId' in cible ? [cible.chantierId] : (await db.chantiers.where('domaine_id').equals(cible.domaineId).toArray()).filter((c) => !c.supprime_at).map((c) => c.id)
  if (!chantiers.length) return []
  return (await db.releves.where('chantier_id').anyOf(chantiers).toArray()).filter((r) => !r.supprime_at).map((r) => r.id)
}
