import { describe, expect, it } from 'vitest';
import {
  NAVY_APK_URL,
  appUpdateStatus,
  compareVersions,
  isAllowedUpdateUrl,
  isUpdateBannerDismissed,
  isUpdateDone,
  openAppIntentUrl,
  progressPercent,
  shouldCheckForUpdate,
  updateFailureMessage,
  updatePath,
  updateTitle,
  type NavyAppVersionInfo,
  formatFileSize,
  isNewerAppVersion,
  parseAuthCallbackUrl,
  readVersionInfo,
  versionCodeOf,
} from './nativeAppRules';

describe('sign-in return link', () => {
  it('reads the one-time code of a successful Google return (PKCE)', () => {
    const url = 'com.cyberkely.navyay://auth-callback?code=4f1c2a7e-9b1d-4c55-a2d1-0e7a1b2c3d4e';
    expect(parseAuthCallbackUrl(url)).toEqual({ kind: 'code', code: '4f1c2a7e-9b1d-4c55-a2d1-0e7a1b2c3d4e' });
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback/?code=abcdefgh12345678')?.kind).toBe('code');
  });

  it('never accepts tokens from a deep link', () => {
    const r = parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback#access_token=a&refresh_token=r');
    expect(r?.kind).toBe('error');
  });

  it('rejects a malformed code', () => {
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?code=short')?.kind).toBe('error');
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?code=bad%20code%3Cscript%3E')?.kind).toBe('error');
  });

  it('reports an error return (query or fragment)', () => {
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?error=access_denied&error_description=User+denied')).toEqual({
      kind: 'error',
      description: 'User denied',
    });
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback#error=server_error')).toEqual({
      kind: 'error',
      description: 'server_error',
    });
  });

  it('ignores any other link', () => {
    expect(parseAuthCallbackUrl(null)).toBeNull();
    expect(parseAuthCallbackUrl('https://1sakely.org/auth?code=abcdefgh12345678')).toBeNull();
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://other?code=abcdefgh12345678')).toBeNull();
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callbackx?code=abcdefgh12345678')).toBeNull();
    expect(parseAuthCallbackUrl('evil.app://auth-callback?code=abcdefgh12345678')).toBeNull();
  });
});

describe('app versions', () => {
  it('compares number by number', () => {
    expect(compareVersions('1.10.0', '1.9.3')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('v1.0.1', '1.0.0')).toBe(1);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
  });

  it('announces an update only when strictly newer and both are known', () => {
    expect(isNewerAppVersion('1.0.0', '1.0.1')).toBe(true);
    expect(isNewerAppVersion('1.0.1', '1.0.1')).toBe(false);
    expect(isNewerAppVersion('1.1.0', '1.0.9')).toBe(false);
    expect(isNewerAppVersion(null, '1.0.1')).toBe(false);
    expect(isNewerAppVersion('1.0.0', undefined)).toBe(false);
    expect(isNewerAppVersion('0.0.0-dev', '1.0.0')).toBe(true);
  });

  it('derives an increasing Android versionCode', () => {
    expect(versionCodeOf('1.0.0')).toBe(10000);
    expect(versionCodeOf('1.2.3')).toBe(10203);
    expect(versionCodeOf('2.0.0')).toBeGreaterThan(versionCodeOf('1.99.99'));
  });
});

describe('version.json', () => {
  it('reads a valid file', () => {
    expect(
      readVersionInfo({ version: '1.0.0', apkUrl: NAVY_APK_URL, apkSizeBytes: 4_200_000, publishedAt: '2026-09-28T10:00:00Z' })
    ).toEqual({
      version: '1.0.0',
      apkUrl: NAVY_APK_URL,
      apkSizeBytes: 4_200_000,
      publishedAt: '2026-09-28T10:00:00Z',
      versionCode: null,
      sha256: null,
      updateUrl: null,
      notesFr: null,
      minimumVersion: '1.0.0',
    });
  });

  it('falls back to the stable address and tolerates a missing size', () => {
    expect(readVersionInfo({ version: '1.0.0', apkUrl: 'http://insecure', apkSizeBytes: null })).toMatchObject({
      version: '1.0.0',
      apkUrl: NAVY_APK_URL,
      apkSizeBytes: null,
      publishedAt: null,
    });
  });

  it('rejects an unusable file', () => {
    expect(readVersionInfo(null)).toBeNull();
    expect(readVersionInfo('1.0.0')).toBeNull();
    expect(readVersionInfo({ version: 'latest' })).toBeNull();
  });

  it('formats the size the French way', () => {
    expect(formatFileSize(4_234_567)).toBe('4,2 Mo');
    expect(formatFileSize(850_000)).toBe('850 ko');
    expect(formatFileSize(null)).toBeNull();
    expect(formatFileSize(0)).toBeNull();
  });
});

const SHA = 'a'.repeat(64);
const URL_121 = 'https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk';
function info(extra: Partial<NavyAppVersionInfo> = {}): NavyAppVersionInfo {
  return {
    version: '1.2.1',
    apkUrl: NAVY_APK_URL,
    apkSizeBytes: 4_600_000,
    publishedAt: null,
    versionCode: 10201,
    sha256: SHA,
    updateUrl: URL_121,
    notesFr: 'Vérification de la mise à jour automatique.',
    minimumVersion: '1.0.0',
    ...extra,
  };
}

describe('phase 3C: enriched version.json', () => {
  it('reads the new fields and keeps the old ones', () => {
    const r = readVersionInfo({
      version: '1.2.1',
      apkUrl: NAVY_APK_URL,
      apkSizeBytes: 4_600_000,
      publishedAt: '2026-09-29T10:00:00Z',
      version_code: 10201,
      sha256: SHA.toUpperCase(),
      size_bytes: 4_600_000,
      apk_url: URL_121,
      notes_fr: 'Ligne 1\nLigne 2\n\nLigne 3\nLigne 4',
      minimum_version: '1.1.0',
    });
    expect(r).toMatchObject({ versionCode: 10201, sha256: SHA, updateUrl: URL_121, minimumVersion: '1.1.0' });
    expect(r?.notesFr).toBe('Ligne 1\nLigne 2\nLigne 3');
  });

  it('drops an update address outside the Releases of the repository, and a bad hash', () => {
    const r = readVersionInfo({ version: '1.2.1', apk_url: 'https://evil.example/navy-ay.apk', sha256: 'xyz', minimum_version: 'x' });
    expect(r).toMatchObject({ updateUrl: null, sha256: null, minimumVersion: '1.0.0' });
  });

  it('accepts only a navy-android-vX.Y.Z Release file (same rule as the native updater)', () => {
    expect(isAllowedUpdateUrl(URL_121)).toBe(true);
    expect(isAllowedUpdateUrl(NAVY_APK_URL)).toBe(false);
    expect(isAllowedUpdateUrl('https://github.com/other/bazarkely/releases/download/navy-android-v1.2.1/navy-ay.apk')).toBe(false);
    expect(isAllowedUpdateUrl(URL_121 + '?x=1')).toBe(false);
    expect(isAllowedUpdateUrl('https://github.com/cyberkelysoatra/bazarkely/releases/download/navy-android-v1.2.1/../x.apk')).toBe(false);
    expect(isAllowedUpdateUrl(null)).toBe(false);
  });
});

describe('phase 3C: which journey', () => {
  it('compares the Android versionCode first', () => {
    expect(appUpdateStatus({ version: '1.2.0', versionCode: 10200 }, info())).toBe('available');
    expect(appUpdateStatus({ version: '1.2.1', versionCode: 10201 }, info())).toBe('up-to-date');
    expect(appUpdateStatus({ version: '1.2.1', versionCode: 10300 }, info())).toBe('up-to-date');
    // names only (old version.json without version_code)
    expect(appUpdateStatus({ version: '1.1.0', versionCode: null }, info({ versionCode: null, version: '1.2.0' }))).toBe('available');
    expect(appUpdateStatus(null, info())).toBe('unknown');
    expect(appUpdateStatus({ version: '1.2.0', versionCode: 10200 }, null)).toBe('unknown');
  });

  it('blocks only below minimum_version (1.0.0 today: nobody)', () => {
    expect(appUpdateStatus({ version: '1.0.0', versionCode: 10000 }, info())).toBe('available');
    expect(appUpdateStatus({ version: '1.0.0', versionCode: 10000 }, info({ minimumVersion: '1.1.0' }))).toBe('required');
    expect(appUpdateStatus({ version: '1.1.0', versionCode: 10100 }, info({ minimumVersion: '1.1.0' }))).toBe('available');
  });

  it('in the app 1.2.0+ the update stays in the app; 1.1.0 goes through Chrome once', () => {
    expect(updatePath(true, info())).toBe('in-app');
    expect(updatePath(false, info())).toBe('chrome');
    expect(updatePath(true, info({ sha256: null }))).toBe('chrome');
    expect(updatePath(true, info({ updateUrl: null }))).toBe('chrome');
  });

  it('checks at most every 6 hours, always when asked', () => {
    const now = Date.UTC(2026, 8, 29, 12);
    expect(shouldCheckForUpdate(null, now)).toBe(true);
    expect(shouldCheckForUpdate(now - 5 * 3600_000, now)).toBe(false);
    expect(shouldCheckForUpdate(now - 6 * 3600_000, now)).toBe(true);
    expect(shouldCheckForUpdate(now - 60_000, now, true)).toBe(true);
    expect(shouldCheckForUpdate(now + 3600_000, now)).toBe(true); // clock moved back
  });

  it('can be hidden for 24 hours', () => {
    const now = Date.UTC(2026, 8, 29, 12);
    expect(isUpdateBannerDismissed(now - 23 * 3600_000, now)).toBe(true);
    expect(isUpdateBannerDismissed(now - 24 * 3600_000, now)).toBe(false);
    expect(isUpdateBannerDismissed(null, now)).toBe(false);
  });

  it('speaks of an update, never of an installation', () => {
    expect(updateTitle('1.2.1', '1.2.0').replace(/\u00a0/g, ' ')).toBe('Mise à jour disponible : 1.2.1 (vous avez 1.2.0)');
    for (const r of ['network', 'http', 'cancelled', 'busy', 'sha256', 'size', 'corrupt', 'url', 'package', 'signature', 'version', 'x', null]) {
      expect(updateFailureMessage(r)).not.toMatch(/install/i);
    }
    expect(updateFailureMessage('sha256')).toMatch(/effacé/);
    expect(updateFailureMessage('signature')).toMatch(/ne vient pas de NAVY ay/);
  });

  it('reads the progress and the end of the update', () => {
    expect(progressPercent('45/100')).toBe(45);
    expect(progressPercent('2300000/4600000')).toBe(50);
    expect(progressPercent('10/0')).toBe(0);
    expect(progressPercent('bad')).toBe(0);
    expect(isUpdateDone('1.2.1', '1.2.1')).toBe(true);
    expect(isUpdateDone('1.2.1', '1.2.0')).toBe(false);
    expect(isUpdateDone(null, '1.2.1')).toBe(false);
  });
});

describe('phase 3C: open the app from Chrome', () => {
  it('builds an intent link that falls back to the page', () => {
    const u = openAppIntentUrl();
    expect(u.startsWith('intent://auth-callback?navy_open=update#Intent;')).toBe(true);
    expect(u).toContain('scheme=com.cyberkely.navyay;package=com.cyberkely.navyay;');
    expect(u).toContain('S.browser_fallback_url=' + encodeURIComponent('https://1sakely.org/navy/app?appli=absente'));
    expect(u.endsWith(';end')).toBe(true);
  });

  it('the app recognises the link and opens its update page (never a sign-in)', () => {
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?navy_open=update')).toEqual({ kind: 'open', path: '/navy/app' });
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?navy_open=other')?.kind).toBe('error');
    expect(parseAuthCallbackUrl('com.cyberkely.navyay://auth-callback?navy_open=update&code=abcdefgh12345678')?.kind).toBe('code');
  });
});
