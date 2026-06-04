/**
 * Cache de tuiles cartographiques (OpenStreetMap) pour l'usage HORS-LIGNE.
 *
 * Base Dexie SÉPARÉE de GestionEauDB (et hors EAU_TABLES) : ces blobs ne sont JAMAIS
 * synchronisés vers Supabase — c'est un cache local pur, propre à l'appareil. L'isolation
 * évite tout impact sur le schéma synchronisé (pas de migration sur la base métier).
 *
 * Politique OSM : on ne pré-télécharge QUE la zone configurée (centre + rayon + plage de
 * zoom bornée). Le téléchargement est plafonné (MAX_TILES) pour rester raisonnable.
 */
import Dexie, { type Table } from 'dexie';

export interface TileRecord {
  /** Clé `z/x/y`. */
  key: string;
  blob: Blob;
  saved_at: string;
}

class EauTilesDB extends Dexie {
  tiles!: Table<TileRecord, string>;

  constructor() {
    super('GestionEauTilesDB');
    this.version(1).stores({ tiles: 'key' });
  }
}

export const eauTilesDb = new EauTilesDB();

export function tileKey(z: number, x: number, y: number): string {
  return `${z}/${x}/${y}`;
}

export async function getTileBlob(key: string): Promise<Blob | null> {
  const rec = await eauTilesDb.tiles.get(key);
  return rec?.blob ?? null;
}

export async function putTileBlob(key: string, blob: Blob): Promise<void> {
  await eauTilesDb.tiles.put({ key, blob, saved_at: new Date().toISOString() });
}

export async function hasTile(key: string): Promise<boolean> {
  return (await eauTilesDb.tiles.where('key').equals(key).count()) > 0;
}

export async function countTiles(): Promise<number> {
  return eauTilesDb.tiles.count();
}

export async function clearTiles(): Promise<void> {
  await eauTilesDb.tiles.clear();
}
