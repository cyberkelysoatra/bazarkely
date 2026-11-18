// Local database of "Relevé terrain" (SCHEMA-STRUCTURE.md section 4), version 1. Every write goes
// through db/depot.ts.
import Dexie, { type Table } from 'dexie'
import type { Chantier, Domaine, LigneCle, NomCle, Objet, Releve } from './types'

export class ReleveTerrainDB extends Dexie {
  domaines!: Table<Domaine, string>
  chantiers!: Table<Chantier, string>
  releves!: Table<Releve, string>
  objets!: Table<Objet, string>
  cles!: Table<LigneCle, NomCle>

  constructor(nom = 'ReleveTerrainDB') {
    super(nom)
    this.version(1).stores({
      domaines: 'id, maj_at',
      chantiers: 'id, domaine_id',
      releves: 'id, chantier_id, maj_at',
      objets: 'id, releve_id, [releve_id+type]',
      cles: 'cle',
    })
  }
}

export const db = new ReleveTerrainDB()
