// C7 (H09, section 8): replacing a typed reading of a computed station asks for confirmation, then the old
// reading is kept in `historique` of the STORED station (real IndexedDB through db/depot.ts).
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.unmock('dexie')

import { IDBKeyRange, indexedDB } from 'fake-indexeddb'
import Dexie from 'dexie'
import { webcrypto } from 'node:crypto'

Dexie.dependencies.indexedDB = indexedDB
Dexie.dependencies.IDBKeyRange = IDBKeyRange
const cryptoGlobal = globalThis.crypto as unknown as { randomUUID: () => string }
cryptoGlobal.randomUUID = () => webcrypto.randomUUID()

const { db } = await import('../../../db/base')
const depot = await import('../../../db/depot')
const { jeuB } = await import('../../../etat/jeux')
const { calculerReleve } = await import('../../../etat/releveCalcule')
const { demandeRemplacement, modifierVisee, nouvelleStation, texteRemplacement, pasVisiblesRepetes, lignesStation, lettresManquantes, texteManquantes } = await import('../logique')
import type { ObjetStation } from '../../../db/types'

beforeEach(async () => {
  await Promise.all([db.domaines.clear(), db.chantiers.clear(), db.releves.clear(), db.objets.clear(), db.cles.clear()])
})

async function releveB() {
  const d = await depot.creerDomaine('Essai')
  const c = await depot.creerChantier(d.id, 'Jeux du PRD')
  const r = await depot.importerReleve(c.id, jeuB(), 'garder_les_deux')
  const objets = await db.objets.where('releve_id').equals(r.id).toArray()
  return { r, objets }
}

describe('remplacement d’une visée (H09)', () => {
  it('station calculée : confirmation demandée, ancienne valeur dans l’historique de l’objet stocké', async () => {
    const { r, objets } = await releveB()
    const calcule = calculerReleve(r.entete, objets)
    const s01 = calcule.stations.find((s) => s.numero === 'S01')!
    expect(s01.resultat.calculee).toBe(true)
    const b = calcule.bornes.find((x) => x.donnees.lettre === 'B')!

    // A confirmation is required, with the old reading in its text.
    const ancienne = demandeRemplacement(s01, b.id)
    expect(ancienne).not.toBeNull()
    expect(texteRemplacement('B', ancienne!)).toBe("Remplacer la visée vers B (36,06 m ; −10,3°) ? L'ancienne valeur reste dans l'historique.")

    // Confirmed: new distance written, the old reading kept.
    const le = '2026-11-18T09:00:00.000Z'
    const neuves = modifierVisee(s01.donnees, b.id, { champ: 'distance', valeur: 35.4 }, { le })
    const rev = (await db.releves.get(r.id))!.rev
    await depot.ecrireObjet(r.id, { id: s01.id, type: 'station', donnees: neuves }, rev)

    const stocke = (await db.objets.get(s01.id)) as ObjetStation
    const v = stocke.donnees.visees.find((x) => x.borne_id === b.id)!
    expect(v.distance).toBe(35.4)
    expect(v.pente).toBe(-10.3)
    expect(v.historique).toEqual([{ distance: 36.06, pente: -10.3, remplace_le: le }])
    // The other sights are untouched.
    expect(stocke.donnees.visees.filter((x) => x.borne_id !== b.id).every((x) => x.historique.length === 0)).toBe(true)

    // Recalculated with the new value.
    const apres = calculerReleve((await db.releves.get(r.id))!.entete, await db.objets.where('releve_id').equals(r.id).toArray())
    const s01b = apres.stations.find((s) => s.id === s01.id)!
    expect(s01b.resultat.x).not.toBeCloseTo(s01.resultat.x!, 2)
  })

  it('station pas encore calculée : aucune confirmation ; « pas visible » sur une lecture remplacée la garde aussi', async () => {
    const { r, objets } = await releveB()
    const calcule = calculerReleve(r.entete, objets)
    const [a, b] = calcule.bornes
    let d = nouvelleStation('S09', '2026-11-18T09:00:00.000Z')
    d = modifierVisee(d, a.id, { champ: 'distance', valeur: 20 }, null)
    d = modifierVisee(d, a.id, { champ: 'pente', valeur: 3 }, null)
    const rev = (await db.releves.get(r.id))!.rev
    const { objet } = await depot.ecrireObjet(r.id, { type: 'station', donnees: d }, rev)
    const c2 = calculerReleve(r.entete, await db.objets.where('releve_id').equals(r.id).toArray())
    const s = c2.stations.find((x) => x.id === objet.id)!
    expect(s.resultat.calculee).toBe(false)
    expect(demandeRemplacement(s, a.id)).toBeNull()

    const cache = modifierVisee(s01Like(), b.id, { champ: 'pas_visible', valeur: true }, { le: 'x' })
    const vb = cache.visees.find((v) => v.borne_id === b.id)!
    expect(vb.pas_visible).toBe(true)
    expect(vb.distance).toBeNull()
    expect(vb.historique).toEqual([{ distance: 30, pente: -2, remplace_le: 'x' }])

    function s01Like() {
      return modifierVisee(modifierVisee(nouvelleStation('S10', 'h'), b.id, { champ: 'distance', valeur: 30 }, null), b.id, { champ: 'pente', valeur: -2 }, null)
    }
  })
})

describe('lignes, manquantes, H15', () => {
  it('lignes dans l’ordre des lettres ; manquante C ; deux stations de suite avec C pas visible', async () => {
    const { r, objets } = await releveB()
    const calcule = calculerReleve(r.entete, objets)
    const [a, b, c] = calcule.bornes
    let d = nouvelleStation('S09', 'h')
    d = modifierVisee(d, a.id, { champ: 'distance', valeur: 31.26 }, null)
    d = modifierVisee(d, a.id, { champ: 'pente', valeur: 13.3 }, null)
    d = modifierVisee(d, b.id, { champ: 'distance', valeur: 25.05 }, null)
    d = modifierVisee(d, b.id, { champ: 'pente', valeur: -9.4 }, null)
    d = modifierVisee(d, c.id, { champ: 'pas_visible', valeur: true }, null)
    const lignes = lignesStation(calcule.bornes, d)
    expect(lignes.map((l) => l.libelle)).toEqual(['A, Borne ouest', 'B, Borne nord', 'C, Borne sud-est'])
    expect(texteManquantes(lettresManquantes(lignes))).toBe('Station incomplète : il manque la borne C.')
    expect(texteManquantes(['B', 'C'])).toBe('Station incomplète : il manque les bornes B et C.')

    let rev = (await db.releves.get(r.id))!.rev
    rev = (await depot.ecrireObjet(r.id, { type: 'station', donnees: d }, rev)).rev
    const { objet } = await depot.ecrireObjet(r.id, { type: 'station', donnees: { ...d, numero: 'S10' } }, rev)
    const c2 = calculerReleve(r.entete, await db.objets.where('releve_id').equals(r.id).toArray())
    expect(pasVisiblesRepetes(c2.stations, objet.id, c2.bornes).map((x) => x.donnees.lettre)).toEqual(['C'])
    expect(c2.stationsIncompletes).toBe(2)
  })
})
