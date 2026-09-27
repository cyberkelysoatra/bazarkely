/**
 * NAVY ay vector map file (phase 2C1): the whole island of Nosy Be in ONE file
 * (/navy-ay/map/nosybe-<date>.pmtiles, ~1.5 MB), served by Cloudflare Pages with the app.
 *
 * - First NAVY map opened online: read by byte ranges when the server honours them
 *   (then the WHOLE file is downloaded once in the background), or from the whole file
 *   when the server ignores ranges (Cloudflare Pages: one 1.5 MB download). Either way
 *   the file is kept in Cache Storage (`navy-map-<date>`), with the label glyphs.
 * - Then the map reads the kept copy: it shows without any network.
 * - A new date in map-version.json replaces the file (older `navy-map-*` caches deleted).
 * - The phase 1B tile cache (`navy-osm-tiles-v1`) is deleted.
 *
 * Nothing here touches the network when the phone is offline.
 */
import { FileSource, PMTiles, type RangeResponse, type Source } from 'pmtiles';

export const MAP_BASE = '/navy-ay/map/';
export const MAP_CACHE_PREFIX = 'navy-map-';
export const OLD_TILE_CACHE = 'navy-osm-tiles-v1';
export const GLYPH_FONTS = ['Noto Sans Regular', 'Noto Sans Medium'];
export const GLYPH_RANGES = ['0-255', '256-511', '8192-8447'];

export interface MapVersion {
  file: string;
  date: string;
  bytes: number;
}

/** local = kept on the phone; remote = read online by ranges; missing = offline and never kept. */
export type MapFileState = 'local' | 'remote' | 'missing';

export interface MapFile {
  state: MapFileState;
  /** Key of the archive in the pmtiles protocol (style url = `pmtiles://${key}`). */
  key: string | null;
  archive: PMTiles | null;
  cacheName: string | null;
}

export function cacheNameFor(v: Pick<MapVersion, 'date'>): string {
  return `${MAP_CACHE_PREFIX}${v.date}`;
}

export function isValidVersion(v: unknown): v is MapVersion {
  const o = v as MapVersion | null;
  return (
    !!o &&
    typeof o.file === 'string' &&
    /^nosybe-\d{8}\.pmtiles$/.test(o.file) &&
    typeof o.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(o.date)
  );
}

/** `navy-map-*` caches other than the current one (older map files to delete). */
export function staleMapCaches(names: string[], current: string): string[] {
  return names.filter((n) => n.startsWith(MAP_CACHE_PREFIX) && n !== current);
}

/** `navy-map-<date>` cache names, newest first (dates sort as text). */
export function mapCachesNewestFirst(names: string[]): string[] {
  return names.filter((n) => /^navy-map-\d{4}-\d{2}-\d{2}$/.test(n)).sort().reverse();
}

function absolute(path: string): string {
  return new URL(path, window.location.origin).href;
}

export function glyphUrl(font: string, range: string): string {
  return absolute(`${MAP_BASE}fonts/${encodeURIComponent(font)}/${range}.pbf`);
}

function online(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine;
}

function cachesAvailable(): boolean {
  return typeof caches !== 'undefined';
}

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    window.clearTimeout(t);
  }
}

async function readVersion(): Promise<MapVersion | null> {
  if (!online()) return null;
  try {
    const resp = await fetchWithTimeout(absolute(`${MAP_BASE}map-version.json`), 6000, { cache: 'no-cache' });
    if (!resp.ok) return null;
    const v = await resp.json();
    return isValidVersion(v) ? v : null;
  } catch {
    return null;
  }
}

/** The .pmtiles kept in a cache, as a pmtiles Source keyed like the online one. */
async function keptSource(cacheName: string): Promise<{ key: string; source: Source } | null> {
  if (!cachesAvailable()) return null;
  try {
    if (!(await caches.has(cacheName))) return null;
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    const req = keys.find((r) => r.url.endsWith('.pmtiles'));
    if (!req) return null;
    const hit = await cache.match(req);
    if (!hit) return null;
    const blob = await hit.blob();
    if (blob.size < 1024) return null;
    return { key: req.url, source: new FileSource(new File([blob], req.url)) };
  } catch {
    return null;
  }
}

async function deleteCaches(names: string[]) {
  await Promise.all(names.map((n) => caches.delete(n).catch(() => false)));
}

let keeping: Promise<boolean> | null = null;

/**
 * Keep the whole file (plus the glyphs) in `navy-map-<date>`, then delete older map
 * caches. `getBlob` gives the file (already in memory, or downloaded). Resolves true
 * when the file is kept on the phone.
 */
function keepWhole(v: MapVersion, url: string, getBlob: () => Promise<Blob | null>): Promise<boolean> {
  if (keeping) return keeping;
  keeping = (async () => {
    if (!cachesAvailable()) return false;
    const name = cacheNameFor(v);
    try {
      const blob = await getBlob();
      if (!blob) return false;
      // Guard against the SPA fallback (index.html served with 200 for a missing file).
      const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
      if (blob.size < 1024 || head[0] !== 0x50 || head[1] !== 0x4d) return false;
      const cache = await caches.open(name);
      await cache.put(url, new Response(blob, { headers: { 'Content-Type': 'application/octet-stream' } }));
      for (const font of GLYPH_FONTS) {
        for (const range of GLYPH_RANGES) {
          const g = glyphUrl(font, range);
          if (await cache.match(g)) continue;
          const r = await fetchWithTimeout(g, 30000).catch(() => null);
          if (r?.ok) await cache.put(g, r);
        }
      }
      await deleteCaches(staleMapCaches(await caches.keys(), name));
      return true;
    } catch {
      return false;
    } finally {
      keeping = null;
    }
  })();
  return keeping;
}

async function downloadBlob(url: string): Promise<Blob | null> {
  const resp = await fetchWithTimeout(url, 120000, { cache: 'no-cache' });
  return resp.ok ? resp.blob() : null;
}

/**
 * Online reading of the island file. Reads by byte ranges when the server honours them
 * (206). Cloudflare Pages ignores `Range` and answers 200 with the WHOLE file: the
 * source then keeps that one download in memory and serves every slice from it, and
 * the same bytes are kept for offline use (no second download).
 */
export class RangeOrWholeSource implements Source {
  private whole: Promise<ArrayBuffer> | null = null;
  private rangesSeen = false;

  private readonly url: string;
  private readonly onWhole: (buf: ArrayBuffer) => void;
  private readonly onRanges: () => void;

  constructor(url: string, onWhole: (buf: ArrayBuffer) => void, onRanges: () => void) {
    this.url = url;
    this.onWhole = onWhole;
    this.onRanges = onRanges;
  }

  getKey(): string {
    return this.url;
  }

  async getBytes(offset: number, length: number): Promise<RangeResponse> {
    if (this.whole) return { data: (await this.whole).slice(offset, offset + length) };
    const resp = await fetch(this.url, { headers: { range: `bytes=${offset}-${offset + length - 1}` }, cache: 'no-store' });
    if (resp.status === 206) {
      if (!this.rangesSeen) {
        this.rangesSeen = true;
        this.onRanges();
      }
      return { data: await resp.arrayBuffer() };
    }
    if (resp.status === 200) {
      if (this.whole) {
        void resp.body?.cancel().catch(() => {});
      } else {
        const whole = resp.arrayBuffer();
        this.whole = whole;
        whole.then(this.onWhole, () => {
          if (this.whole === whole) this.whole = null;
        });
      }
      return { data: (await this.whole).slice(offset, offset + length) };
    }
    throw new Error(`island map file: HTTP ${resp.status}`);
  }
}

let oldCacheDropped = false;

/** Phase 1B tile cache, replaced by the island file. */
export function dropOldTileCache() {
  if (oldCacheDropped || !cachesAvailable()) return;
  oldCacheDropped = true;
  void caches.delete(OLD_TILE_CACHE).catch(() => false);
}

let current: MapFile | null = null;
let currentCacheName: string | null = null;

/** Name of the cache holding the file in use (glyphs are read from it too). */
export function currentMapCache(): string | null {
  return currentCacheName;
}

/**
 * Open the island map: the kept copy when there is one, otherwise online by ranges
 * (and start the one-time download). `onLocal` fires when a background download
 * finishes, with the local archive to swap in.
 */
const localListeners = new Set<(archive: PMTiles, key: string) => void>();
let opening: Promise<MapFile> | null = null;

export function openMapFile(onLocal?: (archive: PMTiles, key: string) => void): Promise<MapFile> {
  if (onLocal) localListeners.add(onLocal);
  // Maps opened together (two maps on one screen) share ONE opening and ONE download.
  if (!opening) {
    opening = openOnce().finally(() => {
      opening = null;
    });
  }
  return opening;
}

async function openOnce(): Promise<MapFile> {
  dropOldTileCache();
  const v = await readVersion();

  if (!v) {
    // Offline (or version unreadable): newest kept copy, whatever its date.
    const names = cachesAvailable() ? await caches.keys().catch(() => [] as string[]) : [];
    if (current?.state === 'local') return current;
    for (const name of mapCachesNewestFirst(names)) {
      const kept = await keptSource(name);
      if (!kept) continue;
      currentCacheName = name;
      current = { state: 'local', key: kept.key, archive: new PMTiles(kept.source), cacheName: name };
      return current;
    }
    return { state: 'missing', key: null, archive: null, cacheName: null };
  }

  const name = cacheNameFor(v);
  const url = absolute(`${MAP_BASE}${v.file}`);
  currentCacheName = name;
  if (current?.cacheName === name && current.state === 'local') return current;

  const kept = await keptSource(name);
  if (kept) {
    current = { state: 'local', key: kept.key, archive: new PMTiles(kept.source), cacheName: name };
    // Older dates left behind (a download interrupted by a closed app).
    if (cachesAvailable()) void caches.keys().then((all) => deleteCaches(staleMapCaches(all, name))).catch(() => {});
    return current;
  }

  const swapToKept = async (ok: boolean) => {
    if (!ok) return;
    const local = await keptSource(name);
    if (!local) return;
    current = { state: 'local', key: local.key, archive: new PMTiles(local.source), cacheName: name };
    const archive = current.archive as PMTiles;
    localListeners.forEach((fn) => fn(archive, local.key));
  };
  const source = new RangeOrWholeSource(
    url,
    // Server sent the whole file (Cloudflare Pages): keep those very bytes.
    (buf) => void keepWhole(v, url, async () => new Blob([buf])).then(swapToKept),
    // Server honours ranges: download the whole file once in the background.
    () => void keepWhole(v, url, () => downloadBlob(url)).then(swapToKept)
  );
  current = { state: 'remote', key: url, archive: new PMTiles(source), cacheName: name };
  return current;
}

/** Glyph bytes: kept copy first, then the network (and keep it). */
export async function loadGlyph(font: string, range: string, signal?: AbortSignal): Promise<ArrayBuffer> {
  const url = glyphUrl(font, range);
  const name = currentCacheName;
  if (cachesAvailable() && name) {
    try {
      const cache = await caches.open(name);
      const hit = await cache.match(url);
      if (hit) return await hit.arrayBuffer();
    } catch {
      /* fall through to the network */
    }
  }
  const resp = await fetch(url, { signal });
  if (!resp.ok) throw new Error(`glyphs ${resp.status}`);
  const buf = await resp.arrayBuffer();
  if (cachesAvailable() && name) {
    void caches
      .open(name)
      .then((c) => c.put(url, new Response(buf.slice(0), { headers: { 'Content-Type': 'application/x-protobuf' } })))
      .catch(() => {});
  }
  return buf;
}
