// NAVY ay Android app (Capacitor, native bridge "NavyNative") ONLY. One Supabase session is
// shared with the app's native services: the screen-off location service may refresh it
// itself, and replaying an already used refresh token makes Supabase revoke the whole session.
// Same behaviour as navyAppSessionStorage() in src/lib/supabase.ts (copied, never imported):
// newest of the page and native copies on read, every written session handed to the app,
// cleared on removal. On the web (and in app 1.0.0, without the bridge) nothing here runs.
import { SESSION_STORAGE_KEY, SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';
import { isAuthSessionKey, sessionAAdopter } from '../utils/sessionNavy';

interface PontCapacitor {
  isNativePlatform?: () => boolean;
  PluginHeaders?: { name: string }[];
  nativePromise?: (plugin: string, method: string, options?: Record<string, unknown>) => Promise<unknown>;
}

const DELAI_PONT_MS = 1500;

/** The bridge, when this page runs inside the NAVY ay app 1.1.0+; null everywhere else. */
export function pontNavy(): PontCapacitor | null {
  if (typeof window === 'undefined') return null;
  const cap = (window as unknown as { Capacitor?: PontCapacitor }).Capacitor;
  // PluginHeaders: plugins declared by the app itself (injected before the page runs).
  if (!cap?.isNativePlatform?.() || !cap.PluginHeaders?.some((h) => h.name === 'NavyNative') || typeof cap.nativePromise !== 'function') {
    return null;
  }
  return cap;
}

function appel(cap: PontCapacitor, methode: string, options: Record<string, unknown> = {}): Promise<unknown> {
  return withTimeout(cap.nativePromise!('NavyNative', methode, options), DELAI_PONT_MS);
}

function confier(cap: PontCapacitor, session: string): void {
  void appel(cap, 'setSession', { session, url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }).catch(() => undefined);
}

/** Session held by the app, null when it holds none or does not answer. */
async function sessionNative(cap: PontCapacitor): Promise<string | null> {
  const r = (await appel(cap, 'getSession')) as { session?: string | null } | null;
  return r?.session ?? null;
}

/**
 * Brings the page copy up to date from the app (read path of the storage below), without
 * supabase-js. Returns true when the page copy changed. Never throws.
 */
export async function lireSessionNative(cle: string = SESSION_STORAGE_KEY): Promise<boolean> {
  const cap = pontNavy();
  if (!cap) return false;
  let local: string | null = null;
  try {
    local = localStorage.getItem(cle);
  } catch {
    return false;
  }
  try {
    const native = await sessionNative(cap);
    if (native && sessionAAdopter(local, native) === 'native') {
      if (native === local) return false;
      localStorage.setItem(cle, native);
      return true;
    }
    // The app does not hold this session yet (first start, older copy): hand it over.
    if (local && native !== local) confier(cap, local);
  } catch {
    // bridge busy: the page's copy
  }
  return false;
}

/** Sign-out: the app forgets the session too (no-op outside the app). */
export async function effacerSessionNative(): Promise<void> {
  const cap = pontNavy();
  if (!cap) return;
  await appel(cap, 'clearSession').catch(() => undefined);
}

/** supabase-js storage for the PUDi client inside the app; undefined (default storage) elsewhere. */
export function stockageNavy() {
  const cap = pontNavy();
  if (!cap) return undefined;
  return {
    async getItem(key: string): Promise<string | null> {
      if (isAuthSessionKey(key)) await lireSessionNative(key);
      return localStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      localStorage.setItem(key, value);
      if (isAuthSessionKey(key)) confier(cap, value);
    },
    removeItem(key: string) {
      localStorage.removeItem(key);
      if (isAuthSessionKey(key)) void appel(cap, 'clearSession').catch(() => undefined);
    }
  };
}
