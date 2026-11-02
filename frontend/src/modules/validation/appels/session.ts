// Session shared with 1sakely.org (D5). Whether the visitor is signed in is read from the
// session key in localStorage (no network); sign-in and sign-out load the lazy Supabase client.
// Pattern of src/modules/pudi/appels/session.ts.
import { useSyncExternalStore } from 'react';
import { SESSION_STORAGE_KEY, getSupabase, withTimeout } from './supabaseClient';

export interface SessionLocale {
  id: string;
  email: string;
  /** Name given by Google (user_metadata), empty for an e-mail account. */
  nomGoogle: string;
  /** 'google' or 'email'. */
  fournisseur: string;
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
    const s = v
      ? (JSON.parse(v) as {
          access_token?: string;
          user?: { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string }; app_metadata?: { provider?: string } };
        })
      : null;
    cache = s?.access_token
      ? {
          id: s.user?.id ?? '',
          email: s.user?.email ?? '',
          nomGoogle: s.user?.user_metadata?.full_name ?? s.user?.user_metadata?.name ?? '',
          fournisseur: s.user?.app_metadata?.provider ?? 'email'
        }
      : null;
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

/** True while the address carries the answer of a Google or e-mail sign-in. */
export function retourDeConnexion(): boolean {
  return /[#&](access_token|error_description)=/.test(window.location.hash) || /[?&]code=/.test(window.location.search);
}

let retourEnCours: Promise<void> | null = null;
/**
 * Back from a sign-in: lets supabase-js store the session from the address, then refreshes the
 * pages. Resolves at once when there is nothing to read. Never throws.
 */
export function lireRetourConnexion(): Promise<void> {
  if (!retourEnCours) {
    retourEnCours = retourDeConnexion()
      ? getSupabase()
          .then((sb) => withTimeout(sb.auth.getSession()))
          .then(() => undefined)
          .catch(() => undefined)
          .finally(signalerSession)
      : Promise.resolve();
  }
  return retourEnCours;
}

/** True when the address says the e-mail link was a password reset. */
export function retourMotDePasse(): boolean {
  return /[#&]type=recovery/.test(window.location.hash);
}

/** Google sign-in, back to the current /validation/... address. */
export async function connexionGoogle(chemin: string = window.location.pathname): Promise<void> {
  const sb = await withTimeout(getSupabase());
  const base = chemin.startsWith('/validation') ? chemin : '/validation/';
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${base}` } });
  if (error) throw error;
}

export async function connexionEmail(email: string, motDePasse: string): Promise<void> {
  const sb = await withTimeout(getSupabase());
  const { error } = await withTimeout(sb.auth.signInWithPassword({ email: email.trim(), password: motDePasse }));
  signalerSession();
  if (error) throw error;
}

/** Account creation; resolves false when Supabase asks for an e-mail confirmation first. */
export async function creerCompte(email: string, motDePasse: string, retour: string): Promise<boolean> {
  const sb = await withTimeout(getSupabase());
  const { data, error } = await withTimeout(
    sb.auth.signUp({ email: email.trim(), password: motDePasse, options: { emailRedirectTo: `${window.location.origin}${retour}` } })
  );
  signalerSession();
  if (error) throw error;
  return !!data.session;
}

export async function motDePasseOublie(email: string): Promise<void> {
  const sb = await withTimeout(getSupabase());
  const { error } = await withTimeout(
    sb.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/validation/connexion` })
  );
  if (error) throw error;
}

export async function nouveauMotDePasse(motDePasse: string): Promise<void> {
  const sb = await withTimeout(getSupabase());
  const { error } = await withTimeout(sb.auth.updateUser({ password: motDePasse }));
  if (error) throw error;
}

/** Signs out of the shared session (also signs out of the other 1sakely.org modules). */
export async function deconnexion(): Promise<void> {
  try {
    const sb = await withTimeout(getSupabase());
    await withTimeout(sb.auth.signOut({ scope: 'local' }));
  } catch {
    /* the local copy is removed below anyway */
  } finally {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* no storage */
    }
    signalerSession();
  }
}
