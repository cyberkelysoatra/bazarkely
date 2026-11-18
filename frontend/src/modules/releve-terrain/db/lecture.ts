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

/** Domains of this phone with their work sites and number of relevés (deleted ones left out). */
export async function listeTerrains(): Promise<DomaineListe[]> {
  const [domaines, chantiers, releves] = await Promise.all([db.domaines.toArray(), db.chantiers.toArray(), db.releves.toArray()])
  const nb = new Map<string, number>()
  for (const r of releves) if (!r.supprime_at) nb.set(r.chantier_id, (nb.get(r.chantier_id) ?? 0) + 1)
  return domaines
    .filter((d) => !d.supprime_at)
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

/** The last relevé opened on this phone (block « Reprendre »), when it still exists. */
export async function dernierReleve(): Promise<ReleveComplet | null> {
  const l = await db.cles.get('dernier_releve')
  const v = l?.valeur as { releve_id?: string } | undefined
  if (!v?.releve_id) return null
  const r = await lireReleve(v.releve_id)
  if (!r || !r.chantier || r.chantier.supprime_at || !r.domaine || r.domaine.supprime_at) return null
  return r
}

/** Ids of the live relevés of a domain or of a work site (export before deletion). */
export async function idsReleves(cible: { domaineId: string } | { chantierId: string }): Promise<string[]> {
  const chantiers =
    'chantierId' in cible ? [cible.chantierId] : (await db.chantiers.where('domaine_id').equals(cible.domaineId).toArray()).filter((c) => !c.supprime_at).map((c) => c.id)
  if (!chantiers.length) return []
  return (await db.releves.where('chantier_id').anyOf(chantiers).toArray()).filter((r) => !r.supprime_at).map((r) => r.id)
}
