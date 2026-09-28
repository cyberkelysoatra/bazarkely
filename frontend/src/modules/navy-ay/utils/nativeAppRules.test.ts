import { describe, expect, it } from 'vitest';
import {
  NAVY_APK_URL,
  compareVersions,
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
    ).toEqual({ version: '1.0.0', apkUrl: NAVY_APK_URL, apkSizeBytes: 4_200_000, publishedAt: '2026-09-28T10:00:00Z' });
  });

  it('falls back to the stable address and tolerates a missing size', () => {
    expect(readVersionInfo({ version: '1.0.0', apkUrl: 'http://insecure', apkSizeBytes: null })).toEqual({
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
