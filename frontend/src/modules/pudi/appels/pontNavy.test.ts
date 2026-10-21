// Simulated NAVY ay bridge (window.Capacitor, like the phase 3B tests) around the real supabase-js
// client of PUDi: storage, refresh hand-over, sign-out, sign-in hand-off.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const CLE = 'sb-ofzmwrzatcztoekrpvkj-auth-token';
const UID = '00000000-0000-4000-8000-000000000001';

function jwt(exp: number): string {
  const b64 = (o: unknown) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: UID, role: 'authenticated', exp, email: 'joel@example.test' })}.sig`;
}

function session(exp: number, refresh: string) {
  return {
    access_token: jwt(exp),
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: exp,
    refresh_token: refresh,
    user: { id: UID, aud: 'authenticated', role: 'authenticated', email: 'joel@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-10-21T00:00:00Z' }
  };
}

const maintenant = () => Math.floor(Date.now() / 1000);

let natif: string | null = null;
let appels: { methode: string; options: Record<string, unknown> }[] = [];

function installerPont() {
  (window as unknown as { Capacitor?: unknown }).Capacitor = {
    isNativePlatform: () => true,
    PluginHeaders: [{ name: 'NavyNative' }],
    nativePromise: async (_p: string, methode: string, options: Record<string, unknown> = {}) => {
      appels.push({ methode, options });
      if (methode === 'getSession') return { session: natif };
      if (methode === 'setSession') natif = options.session as string;
      if (methode === 'clearSession') natif = null;
      return {};
    }
  };
}

let requetesToken: string[] = [];

/** Real in-memory Web Storage (the global test setup replaces it with empty mocks). */
function memoire(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    key: (i: number) => [...m.keys()][i] ?? null,
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear()
  };
}

beforeEach(() => {
  vi.resetModules();
  Object.defineProperty(window, 'localStorage', { configurable: true, writable: true, value: memoire() });
  Object.defineProperty(window, 'sessionStorage', { configurable: true, writable: true, value: memoire() });
  natif = null;
  appels = [];
  requetesToken = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes('/auth/v1/token')) {
        requetesToken.push(String(init?.body ?? ''));
        return new Response(JSON.stringify(session(maintenant() + 3600, 'R2-rafraichi')), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      if (String(url).includes('/auth/v1/logout')) return new Response(null, { status: 204 });
      return new Response('null', { status: 200, headers: { 'Content-Type': 'application/json' } });
    })
  );
});

afterEach(async () => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  vi.unstubAllGlobals();
});

async function client() {
  const { getSupabase } = await import('./supabaseClient');
  const sb = await getSupabase();
  await sb.auth.stopAutoRefresh();
  return sb;
}

describe('G1 shared session inside the NAVY ay app', () => {
  it('shows the signed-in hint when only the app holds the session', async () => {
    installerPont();
    natif = JSON.stringify(session(maintenant() + 3600, 'R1'));
    const { sessionLocale } = await import('./session');
    const { lireSessionNative } = await import('./pontNavy');
    expect(sessionLocale()).toBeNull();
    expect(await lireSessionNative()).toBe(true);
    expect(sessionLocale()?.email).toBe('joel@example.test');
    const sb = await client();
    const { data } = await sb.auth.getSession();
    expect(data.session?.refresh_token).toBe('R1');
  });

  it('hands a refresh done by PUDi to the app, once', async () => {
    installerPont();
    const vieille = JSON.stringify(session(maintenant() - 60, 'R1'));
    localStorage.setItem(CLE, vieille);
    natif = vieille;
    const sb = await client();
    const { data } = await sb.auth.getSession();
    expect(data.session?.refresh_token).toBe('R2-rafraichi');
    const confiees = appels.filter((a) => a.methode === 'setSession').map((a) => JSON.parse(a.options.session as string).refresh_token);
    expect(confiees.filter((r) => r === 'R2-rafraichi')).toHaveLength(1);
    expect(JSON.parse(natif!).refresh_token).toBe('R2-rafraichi');
  });

  it('sign-out from PUDi clears the app session', async () => {
    installerPont();
    const s = JSON.stringify(session(maintenant() + 3600, 'R1'));
    localStorage.setItem(CLE, s);
    natif = s;
    await client();
    const { deconnexion } = await import('./session');
    await deconnexion();
    expect(appels.some((a) => a.methode === 'clearSession')).toBe(true);
    expect(natif).toBeNull();
    expect(localStorage.getItem(CLE)).toBeNull();
  });

  it('outside the app the storage is plain localStorage', async () => {
    const { stockageNavy, pontNavy } = await import('./pontNavy');
    expect(pontNavy()).toBeNull();
    expect(stockageNavy()).toBeUndefined();
    (window as unknown as { Capacitor?: unknown }).Capacitor = { isNativePlatform: () => true, PluginHeaders: [], nativePromise: async () => ({}) };
    expect(pontNavy()).toBeNull(); // app 1.0.0 without the bridge
  });
});

describe('G2 no double refresh', () => {
  it('uses the newer app session and never refreshes with the older token', async () => {
    installerPont();
    localStorage.setItem(CLE, JSON.stringify(session(maintenant() - 60, 'R1-ancien')));
    natif = JSON.stringify(session(maintenant() + 3600, 'R2-app'));
    const sb = await client();
    const { data } = await sb.auth.getSession();
    expect(data.session?.refresh_token).toBe('R2-app');
    expect(requetesToken).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem(CLE)!).refresh_token).toBe('R2-app');
  });
});

describe('G6 sign-in handed to the host inside the app', () => {
  it('goes to /ouvrir/pudi with the redirect stored, never signInWithOAuth', async () => {
    installerPont();
    localStorage.setItem('pudi_canal', 'wa-gihtnb');
    const assign = vi.fn();
    const ancien = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...ancien, pathname: '/pudi/envoyer', origin: 'https://1sakely.org', assign } });
    try {
      const { connexionGoogle } = await import('./session');
      await connexionGoogle('/pudi/envoyer');
      const attendu = '/ouvrir/pudi?retour=%2Fpudi%2Fenvoyer%3Fc%3Dwa-gihtnb';
      expect(assign).toHaveBeenCalledWith(attendu);
      expect(sessionStorage.getItem('bazarkely_post_login_redirect')).toBe(attendu);
      // signInWithOAuth would assign the Supabase /authorize address: one call, ours only.
      expect(assign).toHaveBeenCalledTimes(1);
      expect(String(assign.mock.calls[0][0])).not.toContain('authorize');
    } finally {
      Object.defineProperty(window, 'location', { configurable: true, value: ancien });
    }
  });
});
