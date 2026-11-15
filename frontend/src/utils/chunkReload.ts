/**
 * Blank-page recovery (MICRO-CC-01, H4 of HOTE-CC-01).
 * When a code file of the app cannot be loaded (old index.html kept somewhere, file missing
 * during a deployment), reload the page ONCE with a cache-busting query. The guard lives in
 * sessionStorage with the app version in its key: a second failure in the same tab and version
 * does not reload again and lets the existing error screen show (no loop).
 */
import { APP_VERSION } from '../constants/appVersion';

export const CHUNK_RELOAD_PARAM = '_r';

export function chunkReloadKey(version: string = APP_VERSION): string {
  return `bazarkely_chunk_reload_${version}`;
}

/** Errors thrown by browsers when a dynamic import or a module preload fails. */
export function isChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|ChunkLoadError|Loading chunk .* failed/i.test(message);
}

/** Same address with a fresh `_r` query (other query values and the hash are kept). */
export function cacheBustedUrl(href: string, now: number = Date.now()): string {
  const url = new URL(href);
  url.searchParams.set(CHUNK_RELOAD_PARAM, String(now));
  return url.toString();
}

interface ReloadDeps {
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
  href?: string;
  replace?: (url: string) => void;
  version?: string;
  now?: number;
}

/**
 * Reloads once and returns true; returns false when the reload was already done for this
 * version in this tab (or when sessionStorage is unusable: never risk a loop).
 */
export function reloadOnceAfterChunkError(deps: ReloadDeps = {}): boolean {
  let storage = deps.storage;
  if (storage === undefined) {
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
  }
  if (!storage) return false;
  const key = chunkReloadKey(deps.version);
  try {
    if (storage.getItem(key)) return false;
    storage.setItem(key, String(deps.now ?? Date.now()));
  } catch {
    return false;
  }
  const href = deps.href ?? window.location.href;
  const replace = deps.replace ?? ((url: string) => window.location.replace(url));
  console.warn('[chunkReload] Code file failed to load: reloading the page once');
  replace(cacheBustedUrl(href, deps.now));
  return true;
}

/** Listens to Vite's `vite:preloadError` (fired for a failed preload AND a failed import). */
export function installChunkReloadListener(target: Window = window): void {
  target.addEventListener('vite:preloadError', (event: Event) => {
    if (reloadOnceAfterChunkError()) event.preventDefault();
  });
}
