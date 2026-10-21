// Google session shared with 1sakely.org. Whether the visitor is signed in is read from the
// session key in localStorage (no supabase-js, no network): the header shows the right trigger
// without loading anything. Sign-in and sign-out load the lazy Supabase client.
import { useSyncExternalStore } from 'react';
import { SESSION_STORAGE_KEY, getSupabase, withTimeout } from './supabaseClient';
import { lireCanal } from './provenance';

export interface SessionLocale {
  email: string;
}

let cache: SessionLocale | null = null;
let brut: string | null | undefined;
const abonnes = new Set<() => void>();

function lire(): SessionLocale | null {
  let v: string | null = null;
  try {
    v = localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    v = null;
  }
  if (v === brut) return cache;
  brut = v;
  try {
    const s = v ? (JSON.parse(v) as { access_token?: string; user?: { email?: string } }) : null;
    cache = s?.access_token ? { email: s.user?.email ?? '' } : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function sessionLocale(): SessionLocale | null {
  return lire();
}

/** Call after a sign-in or sign-out done in this page. */
export function signalerSession(): void {
  abonnes.forEach((f) => f());
}

function abonner(f: () => void): () => void {
  abonnes.add(f);
  const surStockage = (e: StorageEvent) => {
    if (e.key === null || e.key === SESSION_STORAGE_KEY) f();
  };
  window.addEventListener('storage', surStockage);
  return () => {
    abonnes.delete(f);
    window.removeEventListener('storage', surStockage);
  };
}

export function useSessionLocale(): SessionLocale | null {
  return useSyncExternalStore(abonner, lire, () => null);
}

/** Google sign-in, back to the current PUDi page (with the channel code when there is one). */
export async function connexionGoogle(chemin: string = window.location.pathname): Promise<void> {
  const sb = await withTimeout(getSupabase());
  const canal = lireCanal();
  const base = chemin.startsWith('/pudi') ? chemin : '/pudi/';
  const redirectTo = `${window.location.origin}${base}${canal ? `?c=${encodeURIComponent(canal)}` : ''}`;
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
  if (error) throw error;
}

/** Signs out of the shared session (also signs out of the other 1sakely.org modules). */
export async function deconnexion(): Promise<void> {
  const sb = await withTimeout(getSupabase());
  try {
    await withTimeout(sb.auth.signOut({ scope: 'local' }));
  } finally {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* no storage */
    }
    signalerSession();
  }
}
