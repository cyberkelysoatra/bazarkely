import { describe, expect, it, vi } from 'vitest';
import { adresseConnexionHote, isAuthSessionKey, pickNewerSession, sessionAAdopter } from './sessionNavy';
import { pudiReturnPath } from '../../navy-ay/components/OpenModulePage';

// Host page under test for its pure return-path rule only: its data layers are not loaded.
vi.mock('../../../stores/appStore', () => ({ useAppStore: () => undefined }));
vi.mock('../../navy-ay/services/modulePrefsSync', () => ({ queuePreferencesPatch: () => undefined }));
vi.mock('../../navy-ay/utils/moduleAccess', () => ({ MODULE_IDS: { BAZARKELY: 'bazarkely' } }));

const s = (o: Record<string, unknown>) => JSON.stringify(o);
const A = (exp: number, rt = 'r') => s({ access_token: 'a', refresh_token: rt, expires_at: exp, user: { id: 'u1' } });

describe('PUDi session shared with the NAVY ay app', () => {
  it('recognises only the session key', () => {
    expect(isAuthSessionKey('sb-ofzmwrzatcztoekrpvkj-auth-token')).toBe(true);
    expect(isAuthSessionKey('sb-ofzmwrzatcztoekrpvkj-auth-token-code-verifier')).toBe(false);
    expect(isAuthSessionKey('pudi_canal')).toBe(false);
  });

  it('keeps the host rule when the page holds a session', () => {
    expect(pickNewerSession(A(100), A(200))).toBe('native');
    expect(pickNewerSession(A(200), A(100))).toBe('local');
    expect(pickNewerSession(A(100), s({ expires_at: 900, user: { id: 'u2' } }))).toBe('local');
    expect(sessionAAdopter(A(100), A(200))).toBe('native');
    expect(sessionAAdopter(A(200), A(200))).toBe('local');
  });

  it('adopts the app session when the page has none', () => {
    expect(pickNewerSession(null, A(200))).toBe('local');
    expect(sessionAAdopter(null, A(200))).toBe('native');
    expect(sessionAAdopter(null, s({ user: { id: 'u1' } }))).toBe('local');
    expect(sessionAAdopter(null, null)).toBe('local');
  });

  it('builds the host sign-in address back to the PUDi page', () => {
    expect(adresseConnexionHote('/pudi/envoyer', 'wa-x')).toBe('/ouvrir/pudi?retour=%2Fpudi%2Fenvoyer%3Fc%3Dwa-x');
    expect(adresseConnexionHote('/pudi/', null)).toBe('/ouvrir/pudi?retour=%2Fpudi%2F');
    expect(adresseConnexionHote('/autre', null)).toBe('/ouvrir/pudi?retour=%2Fpudi%2F');
  });

  it('host /ouvrir/pudi follows only /pudi/ return paths', () => {
    expect(pudiReturnPath('/pudi/?c=X')).toBe('/pudi/?c=X');
    expect(pudiReturnPath('/pudi/envoyer')).toBe('/pudi/envoyer');
    expect(pudiReturnPath('https://evil.example')).toBe('/pudi/');
    expect(pudiReturnPath('//evil')).toBe('/pudi/');
    expect(pudiReturnPath('/pudix')).toBe('/pudi/');
    expect(pudiReturnPath(null)).toBe('/pudi/');
  });
});
