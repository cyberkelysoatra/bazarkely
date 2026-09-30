/**
 * NAVY ay phase 3B: pure rules of the screen-off position, the call-like offers, the
 * guided set-up screen and the install banner. No import (used by lib/supabase.ts too).
 * The Android side mirrors some of them (navy-android/.../NavyRules.java) and the server
 * mirrors the idle rule (navy_stop_idle_drivers, navy_duration_label).
 */

export const SEND_MS = 30_000;
export const SEND_LOW_BATTERY_MS = 60_000;
export const IDLE_DEFAULT_MINUTES = 60;
export const IDLE_MIN_MINUTES = 15;
export const IDLE_MAX_MINUTES = 480;
export const IDLE_RADIUS_M = 150;
export const OFFER_RING_MAX_MS = 30_000;
export const INSTALL_BANNER_SNOOZE_MS = 7 * 24 * 3600_000;
export const SETUP_TEST_MS = 2 * 60_000;

/** 30 s, or 60 s when the battery is under 20 % and not charging. */
export function sendIntervalMs(batteryPct: number | null, charging: boolean): number {
  if (charging || batteryPct == null || !Number.isFinite(batteryPct)) return SEND_MS;
  return batteryPct < 20 ? SEND_LOW_BATTERY_MS : SEND_MS;
}

export type TrackingMode = 'off' | 'available' | 'course';

/** Same rule as the server (navy_report_position): approved driver, available or in a course. */
export function trackingMode(input: { approved: boolean; available: boolean; inCourse: boolean }): TrackingMode {
  if (!input.approved) return 'off';
  if (input.inCourse) return 'course';
  return input.available ? 'available' : 'off';
}

/** One sender at a time: the app's native service when it exists, else the web page. */
export function positionEmitter(isNative: boolean, hasNativePlugin: boolean): 'native' | 'web' {
  return isNative && hasNativePlugin ? 'native' : 'web';
}

// ------------------------------------------------------------------ session relay

interface SessionLike {
  expires_at?: number;
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

/**
 * Which copy of the Supabase session to use: the page's (local) or the app's (native).
 * The native copy wins only for the SAME account and a strictly later expiry (the app
 * refreshed it while the screen was off); any doubt keeps the page's copy.
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

/** Supabase auth storage key ("sb-<ref>-auth-token"), not its "-user" or "-code-verifier" companions. */
export function isAuthSessionKey(key: string): boolean {
  return /^sb-[a-z0-9]+-auth-token$/.test(key);
}

// ------------------------------------------------------------------ idle stop

/** Idle for the configured duration (server rule: still point within 150 m). */
export function isIdleFor(stillSince: string | number | null | undefined, now: number, minutes: number): boolean {
  if (stillSince == null) return false;
  const t = typeof stillSince === 'number' ? stillSince : new Date(stillSince).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t >= minutes * 60_000;
}

/**
 * Server rule (navy_report_position, corrective 2026-09-29): a fix restarts the idle clock
 * only when it is farther than 150 m from the still point BEYOND its own uncertainty, so
 * that an imprecise indoor fix (hundreds of metres) never looks like a move.
 */
export function movesStillPoint(distanceM: number, accuracyM: number | null | undefined): boolean {
  const acc = accuracyM != null && Number.isFinite(accuracyM) && accuracyM > 0 ? Math.min(accuracyM, 100_000) : 0;
  return distanceM - acc > IDLE_RADIUS_M;
}

/** "1 h", "1 h 30", "45 min" (same as navy_duration_label). */
export function durationLabel(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  if (m < 60) return `${m} min`;
  if (m % 60 === 0) return `${m / 60} h`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`;
}

/** Operator setting: whole minutes between 15 and 480, null when invalid. */
export function parseIdleMinutes(raw: string | number): number | null {
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(n) || n < IDLE_MIN_MINUTES || n > IDLE_MAX_MINUTES) return null;
  return n;
}

// ------------------------------------------------------------------ offers

/** "?colis=<uuid>&reponse=accepter|refuser" opened by the app's call-like alert. */
export function parseOfferQuery(search: string): { parcelId: string; action: 'accepter' | 'refuser' | null } | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const parcelId = q.get('colis');
  if (!parcelId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parcelId)) return null;
  const r = q.get('reponse');
  return { parcelId, action: r === 'accepter' || r === 'refuser' ? r : null };
}

/** How long an offer rings: until its deadline, 30 s at most. */
export function ringMs(expiresAtMs: number, now: number): number {
  const left = expiresAtMs - now;
  if (!Number.isFinite(left) || left <= 0) return 0;
  return Math.min(left, OFFER_RING_MAX_MS);
}

// ------------------------------------------------------------------ guided set-up

export interface NativePermissions {
  notifications: boolean;
  location: 'none' | 'foreground' | 'always';
  fullScreen: boolean;
  batteryExempt: boolean;
  manufacturer?: string;
  brand?: string;
  sdk?: number;
  appVersion?: string | null;
  firebase?: boolean;
}

export type SetupStepId = 'notifications' | 'location' | 'fullscreen' | 'battery' | 'test';

export const SETUP_STEPS: SetupStepId[] = ['notifications', 'location', 'fullscreen', 'battery', 'test'];

export function stepDone(step: SetupStepId, p: NativePermissions, testPassed: boolean): boolean {
  switch (step) {
    case 'notifications':
      return p.notifications;
    case 'location':
      return p.location === 'always';
    case 'fullscreen':
      return p.fullScreen;
    case 'battery':
      return p.batteryExempt;
    case 'test':
      return testPassed;
  }
}

/** First step still to do (all done: null). */
export function nextSetupStep(p: NativePermissions, testPassed: boolean): SetupStepId | null {
  return SETUP_STEPS.find((s) => !stepDone(s, p, testPassed)) ?? null;
}

/**
 * Phase 3C: just after an update of the app, the first Android setting to put back.
 * An update is a new installation session for Android: outside the Play Store the
 * installer may reset the full-screen alert (seen on Joël's phone, 1.1.0 → 1.2.0).
 */
export function stepAfterUpdate(p: NativePermissions): SetupStepId | null {
  return SETUP_STEPS.filter((s) => s !== 'test').find((s) => !stepDone(s, p, false)) ?? null;
}

/**
 * Phase 3C: the app was updated since the last opening, known from the Android
 * versionCode kept on the phone (does not depend on the journey that made the update,
 * nor on which version of the site ran first after it).
 */
export function wasUpdatedSince(previousCode: number | null, currentCode: number | null): boolean {
  return previousCode != null && currentCode != null && previousCode > 0 && currentCode > previousCode;
}

/**
 * Phase 3C (seen on Joël's phone after 1.2.0 → 1.2.1): the full-screen alert switched off
 * by an update stays off until the driver opens the settings himself. A reminder stays
 * on every NAVY screen of an approved driver while it is off, except on the guided
 * screen itself. Unknown state (bridge busy, Android < 14 always true): no reminder.
 */
export function fullScreenReminderVisible(o: { nativeBridge: boolean; approvedDriver: boolean; fullScreen: boolean | null; path: string }): boolean {
  return o.nativeBridge && o.approvedDriver && o.fullScreen === false && !o.path.startsWith('/navy/reglages-appli');
}

/** The guided screen opens by itself: never completed, or a permission was taken back since. */
export function setupNeeded(p: NativePermissions, completed: boolean): boolean {
  if (!completed) return true;
  return !(p.notifications && p.location === 'always' && p.fullScreen && p.batteryExempt);
}

export type PhoneBrand = 'tecno' | 'infinix' | 'itel' | 'samsung' | 'xiaomi' | 'autre';

export function phoneBrand(p: Pick<NativePermissions, 'manufacturer' | 'brand'>): PhoneBrand {
  const s = `${p.manufacturer ?? ''} ${p.brand ?? ''}`.toLowerCase();
  if (s.includes('tecno')) return 'tecno';
  if (s.includes('infinix')) return 'infinix';
  if (s.includes('itel')) return 'itel';
  if (s.includes('samsung')) return 'samsung';
  if (s.includes('xiaomi') || s.includes('redmi') || s.includes('poco')) return 'xiaomi';
  return 'autre';
}

/** Result of the final test: positions acknowledged by the server during the window. */
export function screenOffTestResult(
  sends: number[],
  startedAt: number,
  endedAt: number,
  intervalMs: number = SEND_MS
): { received: number; expected: number; ok: boolean; tooShort: boolean } {
  const received = sends.filter((t) => t > startedAt && t <= endedAt).length;
  const duration = endedAt - startedAt;
  const expected = Math.max(1, Math.floor(duration / intervalMs));
  const tooShort = duration < SETUP_TEST_MS - 10_000;
  // One missed position is tolerated (GPS fix, network hiccup).
  return { received, expected, ok: !tooShort && received >= expected - 1, tooShort };
}

/** Median interval between consecutive times, in ms (null with fewer than 2 times). */
export function medianInterval(times: number[]): number | null {
  const t = [...times].sort((a, b) => a - b);
  if (t.length < 2) return null;
  const d = t.slice(1).map((x, i) => x - t[i]).sort((a, b) => a - b);
  const mid = Math.floor(d.length / 2);
  return d.length % 2 ? d[mid] : Math.round((d[mid - 1] + d[mid]) / 2);
}

// ------------------------------------------------------------------ web banner

/** "Installez l'appli NAVY ay" on the site: approved drivers not in the app, hidden 7 days when closed. */
export function installBannerVisible(input: { isNative: boolean; approvedDriver: boolean; dismissedAt: number | null; now: number }): boolean {
  if (input.isNative || !input.approvedDriver) return false;
  if (input.dismissedAt != null && input.now - input.dismissedAt < INSTALL_BANNER_SNOOZE_MS) return false;
  return true;
}
