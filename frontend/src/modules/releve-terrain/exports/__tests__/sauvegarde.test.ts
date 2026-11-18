// H20: backup round trip on game F against a real IndexedDB (fake-indexeddb): export, re-import
// « Garder les deux » (same calculation, new ids, no extra borne), « Remplacer » (ids kept), wrong file.
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The global test setup mocks Dexie for the host app: this module uses the real one.
vi.unmock('dexie')

import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'
import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()

const { db } = await import('../../db/base')
const depot = await import('../../db/depot')
const { jeuF } = await import('../../etat/jeux')
const { calculerReleve } = await import('../../etat/releveCalcule')
const sauvegarde = await import('../sauvegarde')

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})

async function chantier() {
  const d = await depot.creerDomaine('Domaine A')
  return depot.creerChantier(d.id, 'Premier chantier')
}

async function calcul(id: string) {
  const r = (await db.releves.get(id))!
  const objets = (await db.objets.where('releve_id').equals(id).toArray()).filter((o) => !o.supprime)
  const c = calculerReleve(r.entete, objets)
  // Positions and colours by readable key (letter and usage, station number), ids left aside.
  return {
    bornes: c.bornes.map((b) => ({ cle: `${b.donnees.lettre}${b.donnees.usage}`, position: b.position, active: b.active, rang: b.donnees.rang })),
    stations: c.stations.map((s) => {
      // Altitudes per borne are keyed by borne id: compared by letter.
      const lettre = new Map(c.bornes.map((b) => [b.id, `${b.donnees.lettre}${b.donnees.usage}`]))
      const r = s.retenu
      const parBorne = r ? Object.fromEntries(Object.entries(r.altitudesParBorne).map(([k, v]) => [lettre.get(k) ?? '?', v])) : null
      return { numero: s.numero, retenu: r ? { ...r, altitudesParBorne: parBorne } : null, couleur: s.couleur, incomplete: s.incomplete }
    }),
    courbes: c.pointsCourbes.map((p) => [p.x, p.y, p.z]),
  }
}

const fichier = (texte: string) => new Blob([texte], { type: 'application/json' })

describe('sauvegarde complète', () => {
  it('nom du fichier Releve_<nom>_<AAAA-MM-JJ>.releve.json, format du schéma 1', async () => {
    const c = await chantier()
    const r = await depot.importerReleve(c.id, jeuF(), 'garder_les_deux')
    const f = await sauvegarde.fichierSauvegarde(r.id)
    expect(f.name).toMatch(/^Releve_Stations-B-F-G_\d{4}-\d{2}-\d{2}\.releve\.json$/)
    const s = JSON.parse(await sauvegarde.lireTexte(f))
    expect(s.format).toBe('releve-terrain')
    expect(s.schema).toBe(1)
    expect(s.domaine.nom).toBe('Domaine A')
    expect(s.chantier.nom).toBe('Premier chantier')
    expect(s.releve.id).toBe(r.id)
    expect(Array.isArray(s.objets)).toBe(true)
  })

  it('aller-retour « Garder les deux » : même calcul, tous les ids différents, aucune borne en plus', async () => {
    const c = await chantier()
    const r = await depot.importerReleve(c.id, jeuF(), 'garder_les_deux')
    const f = await sauvegarde.fichierSauvegarde(r.id)
    let demande: string | null = null
    const id2 = await sauvegarde.importerFichier(c.id, f, async (nom) => {
      demande = nom
      return 'garder_les_deux'
    })
    expect(demande).toBe(r.nom)
    expect(id2).not.toBeNull()
    expect(id2).not.toBe(r.id)
    expect((await db.releves.get(id2!))!.nom).toBe(`${r.nom} (2)`)
    expect(await calcul(id2!)).toStrictEqual(await calcul(r.id))
    const a = await db.objets.where('releve_id').equals(r.id).toArray()
    const b = await db.objets.where('releve_id').equals(id2!).toArray()
    expect(b).toHaveLength(a.length)
    const idsA = new Set(a.map((o) => o.id))
    expect(b.some((o) => idsA.has(o.id))).toBe(false)
    expect(b.filter((o) => o.type === 'borne')).toHaveLength(a.filter((o) => o.type === 'borne').length)
  })

  it('« Remplacer » garde les ids ; une sauvegarde sans conflit garde aussi ses ids', async () => {
    const c = await chantier()
    const r = await depot.importerReleve(c.id, jeuF(), 'garder_les_deux')
    const avant = await db.objets.where('releve_id').equals(r.id).toArray()
    const f = await sauvegarde.fichierSauvegarde(r.id)
    const id = await sauvegarde.importerFichier(c.id, f, async () => 'remplacer')
    expect(id).toBe(r.id)
    const apres = (await db.objets.where('releve_id').equals(r.id).toArray()).filter((o) => !o.supprime)
    expect(new Set(apres.map((o) => o.id))).toEqual(new Set(avant.map((o) => o.id)))
    expect((await db.releves.where('chantier_id').equals(c.id).toArray()).filter((x) => !x.supprime_at)).toHaveLength(1)
    // Annuler : rien n'est écrit.
    expect(await sauvegarde.importerFichier(c.id, f, async () => null)).toBeNull()
    // Into another work site where nothing matches but the id already lives elsewhere: a copy is made.
    const d2 = await depot.creerChantier((await db.chantiers.get(c.id))!.domaine_id, 'Deuxième chantier')
    const copie = await sauvegarde.importerFichier(d2.id, f, async () => 'remplacer')
    expect(copie).not.toBe(r.id)
    expect((await db.releves.get(r.id))!.chantier_id).toBe(c.id)
  })

  it('fichier faux refusé : « Ce fichier n\'est pas une sauvegarde de relevé. »', async () => {
    const c = await chantier()
    const msg = "Ce fichier n'est pas une sauvegarde de relevé."
    await expect(sauvegarde.importerFichier(c.id, fichier('pas du json'))).rejects.toThrow(msg)
    await expect(sauvegarde.importerFichier(c.id, fichier(JSON.stringify({ format: 'autre' })))).rejects.toThrow(msg)
    await expect(sauvegarde.importerFichier(c.id, fichier(JSON.stringify({ format: 'releve-terrain', schema: 1, releve: { nom: 'x', entete: {} }, objets: [{ id: 1 }] })))).rejects.toThrow(msg)
    await expect(sauvegarde.importerFichier(c.id, new Blob([new Uint8Array(5 * 1024 * 1024 + 1)]))).rejects.toThrow(msg)
    await expect(sauvegarde.importerFichier(c.id, fichier(JSON.stringify({ ...jeuF(), schema: 2 })))).rejects.toThrow('plus récente')
    expect(await db.releves.count()).toBe(0)
  })
})
