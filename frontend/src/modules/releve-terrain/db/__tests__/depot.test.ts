// db/depot.ts against a real IndexedDB (fake-indexeddb): rev, older-rev refusal, soft deletes with
// their children, envoi marks, modifierEntete, dupliquerReleve, importerReleve (both modes).
import { beforeEach, describe, expect, it, vi } from 'vitest'

// The global test setup mocks Dexie for the host app: this module uses the real one.
vi.unmock('dexie')

import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'

import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
// The global test setup replaces randomUUID by a constant: real random ids here.
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string; getRandomValues?: unknown }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()

const { db } = await import('../base')
const depot = await import('../depot')
const { jeuF, jeuB } = await import('../../etat/jeux')
const { calculerReleve } = await import('../../etat/releveCalcule')
const { executer, lireAvis } = await import('../../etat/avis')

async function vider() {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
}

async function terrain() {
  const d = await depot.creerDomaine('Domaine essai')
  const c = await depot.creerChantier(d.id, 'Chantier essai')
  return { d, c }
}

beforeEach(vider)

describe('domaines et chantiers', () => {
  it('nom vide refusé (« Donnez un nom. »)', async () => {
    await expect(depot.creerDomaine('   ')).rejects.toThrow('Donnez un nom.')
    const { d } = await terrain()
    await expect(depot.renommerDomaine(d.id, '')).rejects.toThrow('Donnez un nom.')
  })

  it('création : envoi à envoyer, propriétaire local ; renommer pose maj_at et envoi', async () => {
    const { d, c } = await terrain()
    expect(d.envoi).toBe('a_envoyer')
    expect(d.proprietaire).toBe('local')
    expect(c.domaine_id).toBe(d.id)
    await db.domaines.update(d.id, { envoi: 'envoye' })
    await depot.renommerDomaine(d.id, 'Nouveau nom')
    const d2 = await db.domaines.get(d.id)
    expect(d2?.nom).toBe('Nouveau nom')
    expect(d2?.envoi).toBe('a_envoyer')
    expect(d2!.maj_at >= d.maj_at).toBe(true)
  })

  it('suppression douce d’un domaine avec ses chantiers et leurs relevés', async () => {
    const { d, c } = await terrain()
    const c2 = await depot.creerChantier(d.id, 'Deuxième')
    const r1 = await depot.creerReleve(c.id, { nom: 'R1' })
    const r2 = await depot.creerReleve(c2.id, { nom: 'R2' })
    const autre = await depot.creerDomaine('Autre')
    const c3 = await depot.creerChantier(autre.id, 'Hors champ')
    const r3 = await depot.creerReleve(c3.id, { nom: 'R3' })
    await depot.supprimerDomaine(d.id)
    expect((await db.domaines.get(d.id))?.supprime_at).not.toBeNull()
    expect((await db.chantiers.get(c.id))?.supprime_at).not.toBeNull()
    expect((await db.chantiers.get(c2.id))?.supprime_at).not.toBeNull()
    const s1 = await db.releves.get(r1.id)
    expect(s1?.supprime_at).not.toBeNull()
    expect(s1?.rev).toBe(r1.rev + 1)
    expect((await db.releves.get(r2.id))?.supprime_at).not.toBeNull()
    // Nothing else touched; nothing hard-deleted
    expect((await db.domaines.get(autre.id))?.supprime_at).toBeNull()
    expect((await db.releves.get(r3.id))?.supprime_at).toBeNull()
    expect(await db.objets.where('releve_id').equals(r1.id).count()).toBe(3)
  })

  it('suppression douce d’un chantier avec ses relevés', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    await depot.supprimerChantier(c.id)
    expect((await db.chantiers.get(c.id))?.supprime_at).not.toBeNull()
    expect((await db.releves.get(r.id))?.supprime_at).not.toBeNull()
  })
})

describe('relevés', () => {
  it('creerReleve : entête schéma 1, date de Madagascar, 1,50 m, calage à faire, bornes A, B, C', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: '  Plates-formes  ' })
    expect(r.nom).toBe('Plates-formes')
    expect(r.rev).toBe(1)
    expect(r.entete.schema).toBe(1)
    expect(r.entete.date).toBe(depot.dateMadagascar())
    expect(r.entete.hi).toBe(1.5)
    expect(r.entete.ht).toBe(1.5)
    expect(r.entete.calage).toEqual({ etat: 'a_faire', le: null })
    const bornes = (await db.objets.where('[releve_id+type]').equals([r.id, 'borne']).toArray()).map((o) => o.donnees)
    const lignes = bornes.map((b) => ('lettre' in b ? [b.lettre, b.ordre, b.nom, b.rang, b.usage, b.type] : [])).sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    expect(lignes).toEqual([
      ['A', 1, '', 0, 1, 'principale'],
      ['B', 2, '', 0, 1, 'principale'],
      ['C', 3, '', 0, 1, 'principale'],
    ])
  })

  it('date du jour en heure de Madagascar (21 h 30 UTC = lendemain)', () => {
    expect(depot.dateMadagascar(new Date('2026-11-18T21:30:00Z'))).toBe('2026-11-19')
    expect(depot.dateMadagascar(new Date('2026-11-18T20:59:00Z'))).toBe('2026-11-18')
  })

  it('chaque écriture : rev + 1, maj_at, envoi à envoyer (relevé et objet)', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    await db.releves.update(r.id, { envoi: 'envoye' })
    const { objet, rev } = await depot.ecrireObjet(r.id, { type: 'point_plan', donnees: { nom: 'P1', x: 1, y: 2, z: 3 } }, r.rev)
    expect(rev).toBe(2)
    expect(objet.envoi).toBe('a_envoyer')
    const s = await db.releves.get(r.id)
    expect(s?.rev).toBe(2)
    expect(s?.envoi).toBe('a_envoyer')
    // Replace by id
    const r3 = await depot.ecrireObjet(r.id, { id: objet.id, type: 'point_plan', donnees: { nom: 'P1 bis', x: 1, y: 2, z: 4 } }, 2)
    expect(r3.rev).toBe(3)
    expect(r3.objet.saisi_at).toBe(objet.saisi_at)
    expect((await db.objets.get(objet.id))?.donnees).toMatchObject({ nom: 'P1 bis' })
    // Soft delete of an object
    const r4 = await depot.supprimerObjet(r.id, objet.id, 3)
    expect(r4).toBe(4)
    expect((await db.objets.get(objet.id))?.supprime).toBe(true)
  })

  it('C4 : écriture refusée depuis un onglet qui tient une rev plus ancienne, puis avis de 6 s', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    // Tab 1 and tab 2 both show rev 1; tab 2 writes first.
    await depot.modifierEntete(r.id, { operateurs: 'Onglet 2' }, 1)
    await expect(depot.modifierEntete(r.id, { operateurs: 'Onglet 1' }, 1)).rejects.toBeInstanceOf(depot.ConflitReleve)
    await expect(depot.ecrireObjet(r.id, { type: 'point_plan', donnees: { nom: 'x', x: 0, y: 0, z: 0 } }, 1)).rejects.toThrow(
      'Ce relevé a changé dans un autre onglet : affichage mis à jour.',
    )
    const s = await db.releves.get(r.id)
    expect(s?.entete.operateurs).toBe('Onglet 2')
    expect(s?.rev).toBe(2)
    // Through the screen helper: refused, message shown 6 s
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    try {
      const res = await executer(() => depot.modifierEntete(r.id, { operateurs: 'Onglet 1' }, 1))
      expect(res).toBeNull()
      expect(lireAvis()?.texte).toBe('Ce relevé a changé dans un autre onglet : affichage mis à jour.')
      vi.advanceTimersByTime(5900)
      expect(lireAvis()).not.toBeNull()
      vi.advanceTimersByTime(200)
      expect(lireAvis()).toBeNull()
    } finally {
      vi.useRealTimers()
    }
  })

  it('mémoire pleine : message avant toute perte, rien d’écrit', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    const espion = vi.spyOn(db.releves, 'update').mockRejectedValueOnce(Object.assign(new Error('quota'), { name: 'QuotaExceededError' }))
    const res = await executer(() => depot.modifierEntete(r.id, { operateurs: 'x' }, 1))
    espion.mockRestore()
    expect(res).toBeNull()
    expect(lireAvis()?.texte).toBe('Mémoire du téléphone pleine : exportez vos relevés avant de continuer.')
    expect((await db.releves.get(r.id))?.rev).toBe(1)
  })

  it('modifierEntete : fusion profonde, nom synchronisé', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    let rev = await depot.modifierEntete(r.id, { orientation: { cap_lu: 74.4, source: 'boussole' } }, r.rev)
    rev = await depot.modifierEntete(r.id, { reglages: { coupure: 20, indice: { orange: 3 } } }, rev)
    rev = await depot.modifierEntete(r.id, { calage: { etat: 'valide', le: '2026-11-18T08:00:00.000Z' }, nom: 'Nouveau' }, rev)
    const s = (await db.releves.get(r.id))!
    expect(s.entete.orientation).toEqual({ cap_lu: 74.4, source: 'boussole', declinaison: null })
    expect(s.entete.reglages).toEqual({ coupure: 20, indice: { orange: 3 } })
    expect(s.entete.calage.etat).toBe('valide')
    expect(s.entete.hi).toBe(1.5)
    expect(s.nom).toBe('Nouveau')
    expect(s.entete.nom).toBe('Nouveau')
    expect(s.rev).toBe(4)
  })

  it('suppression douce d’un relevé (rev contrôlée) et marquerOuvert', async () => {
    const { c } = await terrain()
    const r = await depot.creerReleve(c.id, { nom: 'R' })
    await depot.marquerOuvert(r.id)
    expect((await db.releves.get(r.id))?.ouvert_at).not.toBeNull()
    expect((await db.releves.get(r.id))?.rev).toBe(1)
    expect(await depot.lireCle('dernier_releve')).toMatchObject({ releve_id: r.id })
    await expect(depot.supprimerReleve(r.id, 0)).rejects.toBeInstanceOf(depot.ConflitReleve)
    await depot.supprimerReleve(r.id, 1)
    expect((await db.releves.get(r.id))?.supprime_at).not.toBeNull()
    await expect(depot.ecrireObjet(r.id, { type: 'point_plan', donnees: { nom: 'x', x: 0, y: 0, z: 0 } }, 9)).rejects.toBeInstanceOf(depot.ReleveIntrouvable)
  })

  it('clés : appareil tiré une seule fois, vue_intervalle', async () => {
    const a1 = await depot.appareil()
    const a2 = await depot.appareil()
    expect(a1.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(a2).toEqual(a1)
    expect(a1.libelle.length).toBeGreaterThan(0)
    await depot.ecrireVueIntervalle(0.5)
    expect(await depot.lireCle('vue_intervalle')).toBe(0.5)
  })
})

describe('dupliquerReleve (H03)', () => {
  it('nouveaux identifiants, liens gardés, nom « (copie) », mêmes résultats', async () => {
    const { c } = await terrain()
    const r = await depot.importerReleve(c.id, jeuF(), 'remplacer')
    const copie = await depot.dupliquerReleve(r.id)
    expect(copie.nom).toBe('Stations B F G (copie)')
    expect(copie.entete.nom).toBe('Stations B F G (copie)')
    expect(copie.id).not.toBe(r.id)
    const objOrig = await db.objets.where('releve_id').equals(r.id).toArray()
    const objCopie = await db.objets.where('releve_id').equals(copie.id).toArray()
    expect(objCopie).toHaveLength(objOrig.length)
    const idsOrig = new Set(objOrig.map((o) => o.id))
    expect(objCopie.every((o) => !idsOrig.has(o.id))).toBe(true)
    const idsCopie = new Set(objCopie.map((o) => o.id))
    // Every link points inside the copy
    for (const o of objCopie) {
      if (o.type === 'station') for (const v of o.donnees.visees) expect(idsCopie.has(v.borne_id)).toBe(true)
      if (o.type === 'borne' && o.donnees.station_origine) expect(idsCopie.has(o.donnees.station_origine)).toBe(true)
    }
    const a = calculerReleve(r.entete, objOrig)
    const b = calculerReleve(copie.entete, objCopie)
    expect(b.stations.map((s) => s.resultat.x)).toEqual(a.stations.map((s) => s.resultat.x))
    expect(b.pointsCourbes).toHaveLength(a.pointsCourbes.length)
  })
})

describe('importerReleve (H20)', () => {
  it('remplacer : identifiants du fichier gardés, aucune borne ajoutée, relevé du même nom remplacé', async () => {
    const { c } = await terrain()
    const s = jeuB()
    const existant = await depot.creerReleve(c.id, { nom: 'Stations B' })
    const r = await depot.importerReleve(c.id, s, 'remplacer')
    expect(r.id).toBe(s.releve.id)
    const objets = await db.objets.where('releve_id').equals(r.id).toArray()
    expect(objets.map((o) => o.id).sort()).toEqual(s.objets.map((o) => o.id).sort())
    expect(objets.filter((o) => o.type === 'borne')).toHaveLength(3)
    expect((await db.releves.get(existant.id))?.supprime_at).not.toBeNull()
    // Again: same id replaced, rev up, no duplicate
    const r2 = await depot.importerReleve(c.id, s, 'remplacer')
    expect(r2.id).toBe(r.id)
    expect(r2.rev).toBe(r.rev + 1)
    const vivants = (await db.releves.where('chantier_id').equals(c.id).toArray()).filter((x) => !x.supprime_at)
    expect(vivants).toHaveLength(1)
  })

  it('garder les deux : nouveaux identifiants, liens gardés, aucune borne ajoutée, nom numéroté', async () => {
    const { c } = await terrain()
    const s = jeuF()
    const r1 = await depot.importerReleve(c.id, s, 'garder_les_deux')
    const r2 = await depot.importerReleve(c.id, s, 'garder_les_deux')
    expect(r1.id).not.toBe(s.releve.id)
    expect(r2.id).not.toBe(r1.id)
    expect(r1.nom).toBe('Stations B F G')
    expect(r2.nom).toBe('Stations B F G (2)')
    const o1 = await db.objets.where('releve_id').equals(r1.id).toArray()
    const o2 = await db.objets.where('releve_id').equals(r2.id).toArray()
    expect(o1).toHaveLength(s.objets.length)
    expect(o1.filter((o) => o.type === 'borne')).toHaveLength(4)
    const ids1 = new Set(o1.map((o) => o.id))
    expect(o2.some((o) => ids1.has(o.id))).toBe(false)
    expect(o1.some((o) => s.objets.some((x) => x.id === o.id))).toBe(false)
    const d = o1.find((o) => o.type === 'borne' && o.donnees.lettre === 'D')!
    if (d.type !== 'borne') throw new Error('type')
    const s06 = o1.find((o) => o.type === 'station' && o.donnees.numero === 'S06')!
    expect(d.donnees.station_origine).toBe(s06.id)
    const calc = calculerReleve(r1.entete, o1)
    const s10 = calc.stations.find((k) => k.numero === 'S10')!
    expect(Math.abs((s10.resultat.x ?? 0) - 54.993)).toBeLessThan(0.01)
  })

  it('fichier invalide refusé', async () => {
    const { c } = await terrain()
    await expect(depot.importerReleve(c.id, { format: 'autre' } as never, 'remplacer')).rejects.toBeInstanceOf(depot.SauvegardeInvalide)
  })

  it('lireSauvegarde puis importerReleve redonne le même relevé', async () => {
    const { c } = await terrain()
    const r = await depot.importerReleve(c.id, jeuB(), 'garder_les_deux')
    const s = await depot.lireSauvegarde(r.id)
    expect(s.format).toBe('releve-terrain')
    expect(s.domaine.nom).toBe('Domaine essai')
    const r2 = await depot.importerReleve(c.id, JSON.parse(JSON.stringify(s)), 'garder_les_deux')
    const o2 = await db.objets.where('releve_id').equals(r2.id).toArray()
    expect(calculerReleve(r2.entete, o2).pointsCourbes).toHaveLength(11)
  })
})
