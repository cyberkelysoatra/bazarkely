/**
 * NAVY ay map tiles (phase 1B): OpenStreetMap online, and the tiles ALREADY SEEN kept
 * on the phone (Cache Storage) so a map opened offline shows what is available.
 * Inspired by gestion-eau/components/map/offlineTiles.ts (not modified, not shared).
 *
 * OSM tile usage policy: visible attribution, NO bulk download (only the tiles the
 * person actually looks at are kept), a bounded cache. The full offline map of the
 * island is phase 4.
 */
import L from 'leaflet';

export const NAVY_OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const NAVY_OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>';

const CACHE_NAME = 'navy-osm-tiles-v1';
/** Upper bound of tiles kept on the phone (≈ 10–15 MB). */
const MAX_CACHED_TILES = 800;
const TRIM_EVERY = 50;

let putsSinceTrim = 0;

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined';
}

async function openCache(): Promise<Cache | null> {
  if (!cachesAvailable()) return null;
  try {
    return await caches.open(CACHE_NAME);
  } catch {
    return null;
  }
}

/** Drop the oldest tiles above the bound (Cache Storage keeps insertion order). */
async function trim(cache: Cache) {
  try {
    const keys = await cache.keys();
    const extra = keys.length - MAX_CACHED_TILES;
    for (let i = 0; i < extra; i++) await cache.delete(keys[i]);
  } catch {
    /* best effort */
  }
}

/** Number of tiles kept on this phone (0 when the cache is unavailable). */
export async function countCachedTiles(): Promise<number> {
  const cache = await openCache();
  if (!cache) return 0;
  try {
    return (await cache.keys()).length;
  } catch {
    return 0;
  }
}

/** Tile layer: network first when online (and keep the tile), cache when offline. */
export class NavyTileLayer extends L.TileLayer {
  /** Tiles that could not be shown (offline and never seen before). */
  public missing = 0;

  createTile(coords: L.Coords, done: L.DoneCallback): HTMLElement {
    const img = document.createElement('img');
    img.setAttribute('role', 'presentation');
    img.alt = '';
    const url = this.getTileUrl(coords);

    const show = (blob: Blob) => {
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        done(undefined, img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        done(new Error('tile decode'), img);
      };
      img.src = objectUrl;
    };

    void (async () => {
      const cache = await openCache();
      try {
        if (online()) {
          const resp = await fetch(url, { mode: 'cors', credentials: 'omit' });
          if (resp.ok) {
            const blob = await resp.blob();
            if (cache) {
              void cache.put(url, new Response(blob, { headers: { 'Content-Type': 'image/png' } })).then(() => {
                if (++putsSinceTrim >= TRIM_EVERY) {
                  putsSinceTrim = 0;
                  void trim(cache);
                }
              }).catch(() => {});
            }
            show(blob);
            return;
          }
        }
      } catch {
        /* network failed: try the phone copy below */
      }
      try {
        const hit = cache ? await cache.match(url) : undefined;
        if (hit) {
          show(await hit.blob());
          return;
        }
      } catch {
        /* no phone copy */
      }
      this.missing++;
      this.fire('navymissing');
      done(new Error('tile unavailable offline'), img);
    })();

    return img;
  }
}

export function navyTileLayer(): NavyTileLayer {
  return new NavyTileLayer(NAVY_OSM_URL, {
    attribution: NAVY_OSM_ATTRIBUTION,
    maxZoom: 19,
    crossOrigin: true,
  });
}
