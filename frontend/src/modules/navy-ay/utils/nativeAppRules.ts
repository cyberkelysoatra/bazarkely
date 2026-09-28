/**
 * NAVY ay Android app (phase 3A): pure rules shared by the app shell and the public
 * download page. No Capacitor import here, so the web bundle stays unaffected.
 */

/** Application id of the Android app, also the scheme of its deep links (definitive). */
export const NAVY_APP_ID = 'com.cyberkely.navyay';
/** Where Supabase sends the Chrome Custom Tab back after Google sign-in, inside the app. */
export const NAVY_AUTH_CALLBACK_URL = `${NAVY_APP_ID}://auth-callback`;
/** Stable download address of the latest signed APK (GitHub Releases). */
export const NAVY_APK_URL = 'https://github.com/cyberkelysoatra/bazarkely/releases/latest/download/navy-ay.apk';
/** Small file served by the site: latest app version and its download address. */
export const NAVY_APP_VERSION_JSON = '/navy/app/version.json';
/** Public download page of the app. */
export const NAVY_APP_PAGE = '/navy/app';

export interface NavyAppVersionInfo {
  version: string;
  apkUrl: string;
  apkSizeBytes: number | null;
  publishedAt: string | null;
}

export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'error'; description: string };

/**
 * Reads the deep link received by the app after Google sign-in. The app signs in with
 * the PKCE flow: the link only carries a one-time code (?code=...), useless without the
 * verifier kept inside the app, so another app catching the link cannot open the account.
 * Tokens in a fragment are never accepted from a deep link.
 * Returns the code, an error, or null when the link is not a sign-in return.
 */
export function parseAuthCallbackUrl(url: string | null | undefined): AuthCallback | null {
  if (!url || !url.toLowerCase().startsWith(NAVY_AUTH_CALLBACK_URL)) return null;
  const rest = url.slice(NAVY_AUTH_CALLBACK_URL.length);
  if (rest !== '' && !/^[/?#]/.test(rest)) return null; // e.g. ...://auth-callbackXYZ
  const hashAt = url.indexOf('#');
  const queryAt = url.indexOf('?');
  const fragment = hashAt >= 0 ? url.slice(hashAt + 1) : '';
  const query = queryAt >= 0 ? url.slice(queryAt + 1, hashAt > queryAt ? hashAt : undefined) : '';
  const queryParams = new URLSearchParams(query);
  const hashParams = new URLSearchParams(fragment);
  const code = queryParams.get('code');
  if (code && /^[A-Za-z0-9._~-]{8,512}$/.test(code)) {
    return { kind: 'code', code };
  }
  const error =
    queryParams.get('error_description') ||
    queryParams.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error');
  return { kind: 'error', description: error || 'Connexion Google interrompue.' };
}

/** Numeric parts of "1.2.3" (a leading "v" and any "-suffix" are ignored). */
function versionParts(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, '')
    .split('-')[0]
    .split('.')
    .map((p) => {
      const n = parseInt(p, 10);
      return Number.isFinite(n) && n >= 0 ? n : 0;
    });
}

/** -1, 0 or 1, comparing dotted versions number by number ("1.10.0" > "1.9.3"). */
export function compareVersions(a: string, b: string): number {
  const pa = versionParts(a);
  const pb = versionParts(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

/** True only when both versions are known and the published one is strictly newer. */
export function isNewerAppVersion(installed: string | null | undefined, latest: string | null | undefined): boolean {
  if (!installed || !latest) return false;
  if (!/\d/.test(installed) || !/\d/.test(latest)) return false;
  return compareVersions(latest, installed) > 0;
}

/** Validates the content of version.json; null when unusable. */
export function readVersionInfo(raw: unknown): NavyAppVersionInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(r.version)) return null;
  const apkUrl = typeof r.apkUrl === 'string' && r.apkUrl.startsWith('https://') ? r.apkUrl : NAVY_APK_URL;
  const size = typeof r.apkSizeBytes === 'number' && r.apkSizeBytes > 0 ? r.apkSizeBytes : null;
  const publishedAt = typeof r.publishedAt === 'string' ? r.publishedAt : null;
  return { version: r.version, apkUrl, apkSizeBytes: size, publishedAt };
}

/** "4,2 Mo" (French decimal comma, megabytes of 1 000 000 bytes as phones display them). */
export function formatFileSize(bytes: number | null | undefined): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} ko`;
  return `${(bytes / 1_000_000).toFixed(1).replace('.', ',')} Mo`;
}

/** versionCode of the Android build from its name: 1.2.3 → 10203 (must always grow). */
export function versionCodeOf(version: string): number {
  const [maj = 0, min = 0, pat = 0] = versionParts(version);
  return maj * 10000 + min * 100 + pat;
}
