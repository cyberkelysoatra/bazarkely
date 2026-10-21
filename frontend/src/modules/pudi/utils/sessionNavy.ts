// Pure rules of the session shared with the NAVY ay Android app (native bridge "NavyNative").
// Copies of the host rules, never imported (PUDi loads nothing from the host):
// isAuthSessionKey / pickNewerSession come from src/modules/navy-ay/utils/backgroundRules.ts,
// used by navyAppSessionStorage() in src/lib/supabase.ts.

interface SessionLike {
  expires_at?: number;
  refresh_token?: string;
  user?: { id?: string };
}

function parseSession(json: string | null | undefined): SessionLike | null {
  if (!json) return null;
  try {
    const s = JSON.parse(json) as SessionLike;
    return s && typeof s === 'object' ? s : null;
  } catch {
    return null;
  }
}

/** Supabase auth storage key ("sb-<ref>-auth-token"), not its "-user" or "-code-verifier" companions. */
export function isAuthSessionKey(key: string): boolean {
  return /^sb-[a-z0-9]+-auth-token$/.test(key);
}

/**
 * Same rule as the host: the native copy wins only for the SAME account and a strictly later
 * expiry (the app refreshed it while the screen was off); any doubt keeps the page's copy.
 */
export function pickNewerSession(local: string | null, native: string | null): 'local' | 'native' {
  const n = parseSession(native);
  if (!n) return 'local';
  const l = parseSession(local);
  if (!l) return 'local'; // signed out on the page: the page decides
  const lu = l.user?.id;
  const nu = n.user?.id;
  if (!lu || !nu || lu !== nu) return 'local';
  return (n.expires_at ?? 0) > (l.expires_at ?? 0) ? 'native' : 'local';
}

/**
 * PUDi only: also adopts the app's session when the page holds none at all (the app is signed
 * in, the page copy is missing). The host keeps "the page decides" there; PUDi never signs in
 * on its own inside the app, so the app's copy is the session to show. A page copy that exists
 * always goes through pickNewerSession.
 */
export function sessionAAdopter(local: string | null, native: string | null): 'local' | 'native' {
  const l = parseSession(local);
  if (l) return pickNewerSession(local, native);
  const n = parseSession(native);
  return n?.user?.id && n.refresh_token ? 'native' : 'local';
}

/** Host address that signs in inside the app then comes back to this PUDi page. */
export function adresseConnexionHote(chemin: string, canal: string | null): string {
  const base = chemin.startsWith('/pudi/') ? chemin : '/pudi/';
  const retour = `${base}${canal ? `?c=${encodeURIComponent(canal)}` : ''}`;
  return `/ouvrir/pudi?retour=${encodeURIComponent(retour)}`;
}
