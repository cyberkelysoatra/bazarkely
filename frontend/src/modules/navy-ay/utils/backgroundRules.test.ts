import { describe, expect, it } from 'vitest';
import {
  durationLabel,
  installBannerVisible,
  isAuthSessionKey,
  isIdleFor,
  movesStillPoint,
  medianInterval,
  nextSetupStep,
  parseIdleMinutes,
  parseOfferQuery,
  phoneBrand,
  pickNewerSession,
  positionEmitter,
  ringMs,
  screenOffTestResult,
  sendIntervalMs,
  setupNeeded,
  trackingMode,
  type NativePermissions,
} from './backgroundRules';

const all: NativePermissions = { notifications: true, location: 'always', fullScreen: true, batteryExempt: true };
const session = (user: string, exp: number) => JSON.stringify({ access_token: 'a', refresh_token: 'r', expires_at: exp, user: { id: user } });

describe('sending rules', () => {
  it('30 s, 60 s under 20 % when not charging', () => {
    expect(sendIntervalMs(80, false)).toBe(30_000);
    expect(sendIntervalMs(20, false)).toBe(30_000);
    expect(sendIntervalMs(19, false)).toBe(60_000);
    expect(sendIntervalMs(5, true)).toBe(30_000);
    expect(sendIntervalMs(null, false)).toBe(30_000);
  });

  it('only an approved driver, available or in a course (server rule)', () => {
    expect(trackingMode({ approved: false, available: true, inCourse: true })).toBe('off');
    expect(trackingMode({ approved: true, available: false, inCourse: false })).toBe('off');
    expect(trackingMode({ approved: true, available: true, inCourse: false })).toBe('available');
    expect(trackingMode({ approved: true, available: false, inCourse: true })).toBe('course');
    expect(trackingMode({ approved: true, available: true, inCourse: true })).toBe('course');
  });

  it('one sender at a time', () => {
    expect(positionEmitter(true, true)).toBe('native');
    expect(positionEmitter(true, false)).toBe('web'); // app 1.0.0 without the native service
    expect(positionEmitter(false, false)).toBe('web');
  });
});

describe('shared session', () => {
  it('the app copy wins only for the same account with a later expiry', () => {
    expect(pickNewerSession(session('u1', 100), session('u1', 200))).toBe('native');
    expect(pickNewerSession(session('u1', 200), session('u1', 100))).toBe('local');
    expect(pickNewerSession(session('u1', 100), session('u1', 100))).toBe('local');
    expect(pickNewerSession(session('u1', 100), session('u2', 900))).toBe('local');
    expect(pickNewerSession(null, session('u1', 900))).toBe('local');
    expect(pickNewerSession(session('u1', 100), null)).toBe('local');
    expect(pickNewerSession(session('u1', 100), '{bad')).toBe('local');
  });

  it('recognises the Supabase session key only', () => {
    expect(isAuthSessionKey('sb-ofzmwrzatcztoekrpvkj-auth-token')).toBe(true);
    expect(isAuthSessionKey('sb-ofzmwrzatcztoekrpvkj-auth-token-code-verifier')).toBe(false);
    expect(isAuthSessionKey('sb-ofzmwrzatcztoekrpvkj-auth-token-user')).toBe(false);
    expect(isAuthSessionKey('navy-app-pkce-auth')).toBe(false);
  });
});

describe('idle stop', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  it('after the configured minutes, not before', () => {
    expect(isIdleFor(new Date(now - 60 * 60_000).toISOString(), now, 60)).toBe(true);
    expect(isIdleFor(new Date(now - 59 * 60_000).toISOString(), now, 60)).toBe(false);
    expect(isIdleFor(now - 31 * 60_000, now, 30)).toBe(true);
    expect(isIdleFor(null, now, 60)).toBe(false);
  });

  it('an imprecise fix never restarts the idle clock (real phone, 2026-09-28)', () => {
    expect(movesStillPoint(800, 1253)).toBe(false); // indoor network fix
    expect(movesStillPoint(120, 32)).toBe(false);
    expect(movesStillPoint(200, 32)).toBe(true);
    expect(movesStillPoint(400, 20)).toBe(true);
    expect(movesStillPoint(160, null)).toBe(true);
    expect(movesStillPoint(140, null)).toBe(false);
  });

  it('labels and bounds like the server', () => {
    expect(durationLabel(60)).toBe('1 h');
    expect(durationLabel(90)).toBe('1 h 30');
    expect(durationLabel(45)).toBe('45 min');
    expect(parseIdleMinutes('60')).toBe(60);
    expect(parseIdleMinutes(15)).toBe(15);
    expect(parseIdleMinutes('14')).toBeNull();
    expect(parseIdleMinutes('481')).toBeNull();
    expect(parseIdleMinutes('1.5')).toBeNull();
  });
});

describe('offers', () => {
  const id = '5234407d-71be-46f6-a0bf-1a9cbe06cc09';
  it('reads the alert answer', () => {
    expect(parseOfferQuery(`?colis=${id}&reponse=accepter`)).toEqual({ parcelId: id, action: 'accepter' });
    expect(parseOfferQuery(`colis=${id}&reponse=refuser`)).toEqual({ parcelId: id, action: 'refuser' });
    expect(parseOfferQuery(`?colis=${id}`)).toEqual({ parcelId: id, action: null });
    expect(parseOfferQuery(`?colis=${id}&reponse=autre`)).toEqual({ parcelId: id, action: null });
    expect(parseOfferQuery('?colis=../../x')).toBeNull();
    expect(parseOfferQuery('')).toBeNull();
  });

  it('rings until the deadline, 30 s at most', () => {
    expect(ringMs(1_000 + 30_000, 1_000)).toBe(30_000);
    expect(ringMs(1_000 + 300_000, 1_000)).toBe(30_000); // broadcast offer open 5 min
    expect(ringMs(1_000 + 12_000, 1_000)).toBe(12_000);
    expect(ringMs(500, 1_000)).toBe(0);
  });
});

describe('guided set-up', () => {
  it('next step and automatic reopening', () => {
    expect(nextSetupStep({ ...all, notifications: false }, false)).toBe('notifications');
    expect(nextSetupStep({ ...all, location: 'foreground' }, false)).toBe('location');
    expect(nextSetupStep({ ...all, fullScreen: false }, false)).toBe('fullscreen');
    expect(nextSetupStep({ ...all, batteryExempt: false }, false)).toBe('battery');
    expect(nextSetupStep(all, false)).toBe('test');
    expect(nextSetupStep(all, true)).toBeNull();
    expect(setupNeeded(all, false)).toBe(true);
    expect(setupNeeded(all, true)).toBe(false);
    expect(setupNeeded({ ...all, location: 'foreground' }, true)).toBe(true); // permission taken back
  });

  it('phone brands of Nosy Be', () => {
    expect(phoneBrand({ manufacturer: 'TECNO MOBILE LIMITED', brand: 'TECNO' })).toBe('tecno');
    expect(phoneBrand({ manufacturer: 'INFINIX MOBILITY LIMITED', brand: 'Infinix' })).toBe('infinix');
    expect(phoneBrand({ manufacturer: 'itel', brand: 'Itel' })).toBe('itel');
    expect(phoneBrand({ manufacturer: 'samsung', brand: 'samsung' })).toBe('samsung');
    expect(phoneBrand({ manufacturer: 'Xiaomi', brand: 'Redmi' })).toBe('xiaomi');
    expect(phoneBrand({ manufacturer: 'Google', brand: 'google' })).toBe('autre');
  });

  it('final test: X positions received out of Y', () => {
    const start = 1_000_000;
    const sends = [start + 30_000, start + 60_000, start + 90_000, start + 120_000];
    expect(screenOffTestResult(sends, start, start + 120_000)).toEqual({ received: 4, expected: 4, ok: true, tooShort: false });
    expect(screenOffTestResult(sends.slice(0, 3), start, start + 120_000).ok).toBe(true); // one miss tolerated
    expect(screenOffTestResult(sends.slice(0, 1), start, start + 120_000).ok).toBe(false);
    expect(screenOffTestResult(sends, start, start + 60_000).tooShort).toBe(true);
    expect(screenOffTestResult([start - 5], start, start + 120_000).received).toBe(0);
  });

  it('median interval', () => {
    expect(medianInterval([0, 30_000, 60_000, 95_000])).toBe(30_000);
    expect(medianInterval([5])).toBeNull();
  });
});

describe('install banner', () => {
  const now = Date.parse('2026-09-28T12:00:00Z');
  it('approved drivers on the site only, hidden 7 days', () => {
    expect(installBannerVisible({ isNative: false, approvedDriver: true, dismissedAt: null, now })).toBe(true);
    expect(installBannerVisible({ isNative: true, approvedDriver: true, dismissedAt: null, now })).toBe(false);
    expect(installBannerVisible({ isNative: false, approvedDriver: false, dismissedAt: null, now })).toBe(false);
    expect(installBannerVisible({ isNative: false, approvedDriver: true, dismissedAt: now - 6 * 86400_000, now })).toBe(false);
    expect(installBannerVisible({ isNative: false, approvedDriver: true, dismissedAt: now - 8 * 86400_000, now })).toBe(true);
  });
});
