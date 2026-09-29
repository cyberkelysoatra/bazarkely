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
  /** Phase 3C (null in the files of 1.0.0 / 1.1.0). */
  versionCode: number | null;
  /** SHA-256 of this version's file, 64 hexadecimal characters. */
  sha256: string | null;
  /** This version's own Release file (the only address the app's updater accepts). */
  updateUrl: string | null;
  /** "Ce qui change", 1 to 3 lines of plain French (annotation of the tag). */
  notesFr: string | null;
  /** An older app shows a blocking screen (1.0.0 = nobody is blocked). */
  minimumVersion: string;
}

export type AuthCallback =
  | { kind: 'code'; code: string }
  | { kind: 'error'; description: string }
  /** Phase 3C: "Ouvrir l'appli pour la mettre à jour" from Chrome (intent link). */
  | { kind: 'open'; path: string };

/**
 * Phase 3C: link of the button "Ouvrir l'appli pour la mettre à jour" in Chrome. It goes
 * through the sign-in return address, the only one that app 1.1.0 already declares, with
 * a navy_open marker that the site (loaded by the app) recognises. When the app is not on
 * the phone, Chrome comes back to the page with ?appli=absente.
 */
export const NAVY_OPEN_APP_MARKER = 'navy_open';
export function openAppIntentUrl(pageUrl = 'https://1sakely.org/navy/app'): string {
  const fallback = encodeURIComponent(`${pageUrl}?appli=absente`);
  return `intent://auth-callback?${NAVY_OPEN_APP_MARKER}=update#Intent;scheme=${NAVY_APP_ID};package=${NAVY_APP_ID};S.browser_fallback_url=${fallback};end`;
}

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
  if (queryParams.get(NAVY_OPEN_APP_MARKER) === 'update' && !queryParams.has('code')) {
    return { kind: 'open', path: NAVY_APP_PAGE };
  }
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
  const code = typeof r.version_code === 'number' && Number.isInteger(r.version_code) && r.version_code > 0 ? r.version_code : null;
  const sha = typeof r.sha256 === 'string' && /^[0-9a-f]{64}$/i.test(r.sha256) ? r.sha256.toLowerCase() : null;
  const updateUrl = typeof r.apk_url === 'string' && isAllowedUpdateUrl(r.apk_url) ? r.apk_url : null;
  const notes =
    typeof r.notes_fr === 'string' && r.notes_fr.trim()
      ? r.notes_fr
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 3)
          .join('\n')
          .slice(0, 400)
      : null;
  const minimum = typeof r.minimum_version === 'string' && /^\d+\.\d+\.\d+$/.test(r.minimum_version) ? r.minimum_version : '1.0.0';
  const sizeBytes = typeof r.size_bytes === 'number' && r.size_bytes > 0 ? r.size_bytes : size;
  return {
    version: r.version,
    apkUrl,
    apkSizeBytes: sizeBytes,
    publishedAt,
    versionCode: code,
    sha256: sha,
    updateUrl,
    notesFr: notes,
    minimumVersion: minimum,
  };
}

// ------------------------------------------------------------------ phase 3C: update

/** Mirror of NavyRules.isAllowedUpdateUrl (native): a navy-android-vX.Y.Z Release file. */
export const NAVY_UPDATE_URL_PREFIX = 'https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v';
export function isAllowedUpdateUrl(url: string | null | undefined): boolean {
  if (!url || !url.startsWith(NAVY_UPDATE_URL_PREFIX)) return false;
  return /^\d{1,3}\.\d{1,2}\.\d{1,2}\/[A-Za-z0-9._-]{1,80}\.apk$/.test(url.slice(NAVY_UPDATE_URL_PREFIX.length));
}

export interface InstalledApp {
  version: string | null;
  /** Android versionCode (App.getInfo().build), null if unknown. */
  versionCode: number | null;
}

export type AppUpdateStatus = 'unknown' | 'up-to-date' | 'available' | 'required';

/**
 * Compares the installed app with version.json: the Android versionCode when both are
 * known (what Android itself compares), else the version names. "required" when the
 * installed app is older than minimum_version.
 */
export function appUpdateStatus(installed: InstalledApp | null, info: NavyAppVersionInfo | null): AppUpdateStatus {
  if (!installed || !info || !installed.version || !/\d/.test(installed.version)) return 'unknown';
  const newer =
    installed.versionCode != null && info.versionCode != null
      ? info.versionCode > installed.versionCode
      : compareVersions(info.version, installed.version) > 0;
  if (!newer) return 'up-to-date';
  return compareVersions(installed.version, info.minimumVersion) < 0 ? 'required' : 'available';
}

/** At launch and back to the front: at most one automatic check every 6 hours. */
export const UPDATE_CHECK_EVERY_MS = 6 * 60 * 60 * 1000;
export function shouldCheckForUpdate(lastCheckMs: number | null, nowMs: number, manual = false): boolean {
  if (manual || !lastCheckMs) return true;
  return nowMs - lastCheckMs >= UPDATE_CHECK_EVERY_MS || nowMs < lastCheckMs;
}

/** "Masquer": the banner comes back after 24 hours (never hidden for a mandatory update). */
export const UPDATE_DISMISS_MS = 24 * 60 * 60 * 1000;
export function isUpdateBannerDismissed(dismissedAtMs: number | null, nowMs: number): boolean {
  return !!dismissedAtMs && nowMs >= dismissedAtMs && nowMs - dismissedAtMs < UPDATE_DISMISS_MS;
}

export function updateTitle(latest: string, installed: string): string {
  // Non-breaking spaces: the colon and "(vous avez X)" never start a line on a phone.
  return `Mise à jour disponible\u00a0: ${latest} (vous\u00a0avez\u00a0${installed})`;
}

/**
 * How the update is done: inside the app (1.2.0+, native updater, file checked) or,
 * only to leave 1.1.0 / 1.0.0, by opening the Release file in Chrome.
 */
export type UpdatePath = 'in-app' | 'chrome';
export function updatePath(hasUpdater: boolean, info: NavyAppVersionInfo | null): UpdatePath {
  return hasUpdater && !!info?.sha256 && isAllowedUpdateUrl(info.updateUrl) ? 'in-app' : 'chrome';
}

/** Why a downloaded update was refused (native reason) → plain French. */
export function updateFailureMessage(reason: string | null | undefined): string {
  switch (reason) {
    case 'network':
    case 'http':
      return 'Le téléchargement a échoué. Vérifiez votre connexion internet, puis réessayez.';
    case 'cancelled':
      return 'Téléchargement annulé.';
    case 'busy':
      return 'Une mise à jour est déjà en cours de téléchargement.';
    case 'sha256':
    case 'size':
    case 'corrupt':
      return 'Le fichier reçu est abîmé ou incomplet. Il a été effacé. Réessayez dans un moment.';
    case 'url':
    case 'package':
    case 'signature':
      return 'Ce fichier ne vient pas de NAVY ay. Il a été effacé, par sécurité.';
    case 'version':
      return 'Ce fichier n’est pas plus récent que votre appli. Il a été effacé.';
    default:
      return 'La mise à jour n’a pas pu se faire. Réessayez dans un moment.';
  }
}

/** "123/456" (native progress event) → whole percent, 0 when unknown. */
export function progressPercent(value: string | null | undefined): number {
  const m = /^(\d+)\/(\d+)$/.exec(value ?? '');
  if (!m) return 0;
  const received = Number(m[1]);
  const total = Number(m[2]);
  if (!(total > 0)) return 0;
  return Math.max(0, Math.min(100, Math.floor((received * 100) / total)));
}

/** The app was updated to (at least) the version that was being installed. */
export function isUpdateDone(target: string | null | undefined, installed: string | null | undefined): boolean {
  if (!target || !installed || !/\d/.test(installed)) return false;
  return compareVersions(installed, target) >= 0;
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
