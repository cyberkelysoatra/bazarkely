/**
 * Couche de tuiles Leaflet « hors-ligne d'abord » + pré-téléchargement d'une zone.
 *
 * - `OfflineTileLayer` lit chaque tuile depuis le cache local (eauTiles), sinon depuis le
 *   réseau OSM (et la met alors en cache). Hors-ligne sans cache → tuile en erreur (le
 *   composant carte bascule alors vers la liste des compteurs).
 * - `downloadZoneTiles` pré-télécharge STRICTEMENT la zone configurée (centre+rayon, plage
 *   de zoom bornée), plafonné à MAX_TILES (politique OSM).
 */
import L from 'leaflet';
import { tileKey, getTileBlob, putTileBlob, hasTile } from '../../db/eauTiles';

export const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const OSM_ATTRIBUTION = '© OpenStreetMap';

/** Plafond de tuiles pré-téléchargées (respect de la politique d'usage OSM). */
export const MAX_TILES = 1500;

function isOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

/** Couche de tuiles qui privilégie le cache IndexedDB local. */
export class OfflineTileLayer extends L.TileLayer {
  /** Nombre de tuiles demandées qui manquaient au cache hors-ligne (→ repli liste). */
  public missingOffline = 0;

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img');
    img.setAttribute('role', 'presentation');
    img.alt = '';

    const key = tileKey(coords.z, coords.x, coords.y);

    void (async () => {
      try {
        const cached = await getTileBlob(key);
        if (cached) {
          img.src = URL.createObjectURL(cached);
          done(undefined, img);
          return;
        }
        if (isOnline()) {
          const url = this.getTileUrl(coords);
          const resp = await fetch(url);
          if (resp.ok) {
            const blob = await resp.blob();
            await putTileBlob(key, blob).catch(() => {});
            img.src = URL.createObjectURL(blob);
            done(undefined, img);
            return;
          }
          done(new Error(`tile ${key} http ${resp.status}`), img);
          return;
        }
        // Hors-ligne sans tuile en cache.
        this.missingOffline++;
        done(new Error(`tile ${key} indisponible hors-ligne`), img);
      } catch (e) {
        done(e as Error, img);
      }
    })();

    return img;
  }
}

export function offlineTileLayer(): OfflineTileLayer {
  return new OfflineTileLayer(OSM_URL, {
    attribution: OSM_ATTRIBUTION,
    maxZoom: 19,
    crossOrigin: true,
  });
}

// ───────────────────────── Maths tuiles (lon/lat ⇄ x/y) ─────────────────────────
function lng2tileX(lng: number, z: number): number {
  return Math.floor(((lng + 180) / 360) * Math.pow(2, z));
}
function lat2tileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z));
}

/** Bornes lat/lng approximatives d'un disque (centre + rayon km). */
export function boundsFromCenter(lat: number, lng: number, radiusKm: number): L.LatLngBounds {
  const dLat = radiusKm / 111; // ~111 km par degré de latitude
  const dLng = radiusKm / (111 * Math.cos((lat * Math.PI) / 180) || 1);
  return L.latLngBounds([lat - dLat, lng - dLng], [lat + dLat, lng + dLng]);
}

export interface ZoneSpec {
  lat: number;
  lng: number;
  radiusKm: number;
  zoomMin: number;
  zoomMax: number;
}

/** Compte (sans télécharger) le nombre de tuiles d'une zone — pour informer l'utilisateur. */
export function countZoneTiles(zone: ZoneSpec): number {
  const bounds = boundsFromCenter(zone.lat, zone.lng, zone.radiusKm);
  let total = 0;
  for (let z = zone.zoomMin; z <= zone.zoomMax; z++) {
    const x0 = lng2tileX(bounds.getWest(), z);
    const x1 = lng2tileX(bounds.getEast(), z);
    const y0 = lat2tileY(bounds.getNorth(), z);
    const y1 = lat2tileY(bounds.getSouth(), z);
    total += (Math.abs(x1 - x0) + 1) * (Math.abs(y1 - y0) + 1);
  }
  return total;
}

export interface DownloadProgress {
  done: number;
  total: number;
}

/**
 * Pré-télécharge les tuiles de la zone (plafonné à MAX_TILES). Ne re-télécharge pas une
 * tuile déjà en cache. Best-effort : avale les erreurs réseau ponctuelles.
 */
export async function downloadZoneTiles(
  zone: ZoneSpec,
  onProgress?: (p: DownloadProgress) => void
): Promise<{ saved: number; total: number; capped: boolean }> {
  const bounds = boundsFromCenter(zone.lat, zone.lng, zone.radiusKm);
  const coordsList: Array<{ z: number; x: number; y: number }> = [];
  for (let z = zone.zoomMin; z <= zone.zoomMax; z++) {
    const x0 = Math.min(lng2tileX(bounds.getWest(), z), lng2tileX(bounds.getEast(), z));
    const x1 = Math.max(lng2tileX(bounds.getWest(), z), lng2tileX(bounds.getEast(), z));
    const y0 = Math.min(lat2tileY(bounds.getNorth(), z), lat2tileY(bounds.getSouth(), z));
    const y1 = Math.max(lat2tileY(bounds.getNorth(), z), lat2tileY(bounds.getSouth(), z));
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        coordsList.push({ z, x, y });
      }
    }
  }

  const capped = coordsList.length > MAX_TILES;
  const toFetch = capped ? coordsList.slice(0, MAX_TILES) : coordsList;
  const total = toFetch.length;
  let saved = 0;
  let done = 0;

  for (const c of toFetch) {
    const key = tileKey(c.z, c.x, c.y);
    try {
      if (!(await hasTile(key))) {
        const url = OSM_URL.replace('{z}', String(c.z)).replace('{x}', String(c.x)).replace('{y}', String(c.y));
        const resp = await fetch(url);
        if (resp.ok) {
          await putTileBlob(key, await resp.blob());
          saved++;
        }
      }
    } catch {
      /* tuile sautée — best-effort */
    }
    done++;
    if (onProgress && (done % 10 === 0 || done === total)) onProgress({ done, total });
  }

  return { saved, total, capped };
}
