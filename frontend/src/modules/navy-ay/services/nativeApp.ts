/**
 * NAVY ay Android app shell (phase 3A). The app is a Capacitor WebView that loads
 * https://1sakely.org/navy: this file is the only bridge between the site and the native
 * shell. On the web every function is a no-op (isNativeApp() is false) and the Capacitor
 * packages are never downloaded: they are imported dynamically, only inside the app.
 *
 * Google sign-in: Google refuses embedded WebViews (disallowed_useragent), so inside the
 * app the Supabase OAuth page opens in a Chrome Custom Tab (@capacitor/browser) with the
 * return address com.cyberkely.navyay://auth-callback. Android hands that deep link back
 * to the app (@capacitor/app appUrlOpen).
 * PKCE: another app could declare the same custom scheme, so the link carries only a
 * one-time code; it is exchanged here with the verifier kept in this WebView (helper
 * client with its own storage key, never used for anything else). The resulting tokens
 * are then replayed on /auth#... so the unchanged web flow takes over: main.tsx
 * captureOAuthTokens → AuthPage setSession → post-login redirect to the starting page.
 *
 * Phase 3B (app 1.1.0+, native bridge "NavyNative"): the screen-off position service,
 * the guided set-up permissions, the Firebase token (push_fcm_register / push_fcm_forget)
 * and the measurement log. Every function is a no-op or rejects when the bridge is absent
 * (web, or app 1.0.0).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseAnonKey, supabaseUrl, withTimeout } from '../../../lib/supabase';
import { NAVY_AUTH_CALLBACK_URL, parseAuthCallbackUrl } from '../utils/nativeAppRules';
import type { NativePermissions } from '../utils/backgroundRules';

/** Storage key of the PKCE helper client (code verifier only, cleared after use). */
const PKCE_STORAGE_KEY = 'navy-app-pkce-auth';

let pkceClient: SupabaseClient | null = null;
function getPkceClient(): SupabaseClient {
  if (!pkceClient) {
    pkceClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        flowType: 'pkce',
        storageKey: PKCE_STORAGE_KEY,
        persistSession: true, // keeps the verifier if Android reloads the page meanwhile
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return pkceClient;
}

/** Removes everything the helper client stored (verifier and its copy of the session). */
function clearPkceStorage(): void {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PKCE_STORAGE_KEY))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // nothing stored
  }
}

/** Remembers, for this WebView tab, which launch link was already consumed. */
const HANDLED_LAUNCH_KEY = 'navy-app-handled-launch-url';

/** True only inside the NAVY ay Android app (the Capacitor bridge is injected there). */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return typeof cap?.isNativePlatform === 'function' && cap.isNativePlatform() === true;
}

let started = false;

/** Called once from main.tsx; listens for the sign-in return link. */
export async function initNativeApp(): Promise<void> {
  if (started || !isNativeApp()) return;
  started = true;
  try {
    const { App } = await import('@capacitor/app');
    await App.addListener('appUrlOpen', ({ url }) => {
      void handleIncomingUrl(url);
    });
    // Cold start through the link (Android closed the app while the Custom Tab was open).
    const launch = await App.getLaunchUrl();
    if (launch?.url && sessionStorage.getItem(HANDLED_LAUNCH_KEY) !== launch.url) {
      sessionStorage.setItem(HANDLED_LAUNCH_KEY, launch.url);
      void handleIncomingUrl(launch.url);
    }
  } catch (error) {
    console.error('❌ NAVY app: native init failed', error);
  }
}

async function handleIncomingUrl(url: string): Promise<void> {
  const result = parseAuthCallbackUrl(url);
  if (!result) return;
  try {
    const { Browser } = await import('@capacitor/browser');
    await Browser.close();
  } catch {
    // Android closes the Custom Tab itself when the app comes back to the front.
  }
  if (result.kind === 'code') {
    try {
      const { data, error } = await getPkceClient().auth.exchangeCodeForSession(result.code);
      clearPkceStorage();
      if (error || !data?.session) throw error || new Error('no session');
      console.log('✅ NAVY app: Google sign-in return received');
      const { access_token, refresh_token, expires_in, token_type } = data.session;
      const fragment = new URLSearchParams({
        access_token,
        refresh_token,
        expires_in: String(expires_in ?? 3600),
        token_type: token_type || 'bearer',
      }).toString();
      // Same capture as the web return (main.tsx), then AuthPage finishes the sign-in.
      window.location.replace(`/auth#${fragment}`);
      return;
    } catch (error) {
      clearPkceStorage();
      console.warn('⚠️ NAVY app: code exchange failed', error);
    }
  } else {
    console.warn('⚠️ NAVY app: Google sign-in not completed:', result.description);
  }
  let back = '/navy';
  try {
    back = sessionStorage.getItem('bazarkely_post_login_redirect') || '/navy';
  } catch {
    // keep /navy
  }
  window.location.replace(back);
}

/** Google sign-in inside the app: Supabase OAuth page in a Chrome Custom Tab. */
export async function signInWithGoogleInApp(): Promise<{ success: boolean; error?: string }> {
  clearPkceStorage();
  const { data, error } = await getPkceClient().auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: NAVY_AUTH_CALLBACK_URL,
      skipBrowserRedirect: true,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });
  if (error || !data?.url) {
    console.error('❌ NAVY app: Google sign-in URL unavailable', error);
    return { success: false, error: error?.message || 'Connexion Google indisponible' };
  }
  const { Browser } = await import('@capacitor/browser');
  await Browser.open({ url: data.url, toolbarColor: '#FFFFFF' });
  return { success: true };
}

/** Version of the installed Android app ("1.0.0"), null on the web or if unknown. */
export async function getNativeAppVersion(): Promise<string | null> {
  if (!isNativeApp()) return null;
  try {
    const { App } = await import('@capacitor/app');
    const info = await App.getInfo();
    return info.version || null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ phase 3B


interface CapacitorBridge {
  PluginHeaders?: { name: string }[];
  nativePromise?: (plugin: string, method: string, options?: Record<string, unknown>) => Promise<any>;
}

/**
 * The native bridge declares its plugins in Capacitor.PluginHeaders (injected by the app
 * before the page runs); calls go through Capacitor.nativePromise. Capacitor.Plugins only
 * holds the plugins the page registered itself, so it is not used to detect the bridge.
 */
function bridge(): CapacitorBridge | null {
  if (!isNativeApp()) return null;
  const cap = (window as unknown as { Capacitor?: CapacitorBridge }).Capacitor;
  if (!cap?.PluginHeaders?.some((h) => h.name === 'NavyNative') || typeof cap.nativePromise !== 'function') return null;
  return cap;
}

/** True inside app 1.1.0+ (native position service, call-like offers, guided set-up). */
export function hasNavyNative(): boolean {
  return !!bridge();
}

async function callNative<T>(method: string, options: Record<string, unknown> = {}, ms = 8000): Promise<T> {
  const cap = bridge();
  if (!cap) throw new Error('NavyNative unavailable');
  const run = cap.nativePromise!('NavyNative', method, options) as Promise<T>;
  return ms > 0 ? withTimeout(run, ms, `navy-native-${method}`) : run;
}

interface ListenerPlugin {
  addListener: (event: string, cb: (data: { value?: string }) => void) => Promise<{ remove: () => Promise<void> }>;
}
let listenerPlugin: Promise<ListenerPlugin> | null = null;
/** Native events need the Capacitor runtime (loaded on demand, inside the app only). */
function nativeListenerPlugin(): Promise<ListenerPlugin> {
  if (!listenerPlugin) {
    listenerPlugin = import('@capacitor/core').then(({ registerPlugin }) => registerPlugin<ListenerPlugin>('NavyNative'));
  }
  return listenerPlugin;
}

export interface NativeTrackingStatus {
  running: boolean;
  partnerId: string | null;
  mode: 'available' | 'course' | null;
  startedAt: number;
  stoppedAt: number;
  stopReason: string | null;
  sentOk: number;
  sentFail: number;
  lastSentAt: number;
  lastFixAt: number;
  lastError: string | null;
  lastLat: string | null;
  lastLng: string | null;
  intervalMs: number;
  sends: number[];
  jsBeats: number[];
  log: string;
  appVersion: string | null;
}

export function startNativeTracking(partnerId: string, mode: 'available' | 'course'): Promise<NativeTrackingStatus> {
  return callNative<NativeTrackingStatus>('startTracking', { partnerId, mode });
}

export function stopNativeTracking(reason = 'page'): Promise<NativeTrackingStatus> {
  return callNative<NativeTrackingStatus>('stopTracking', { reason });
}

export function getNativeTrackingStatus(): Promise<NativeTrackingStatus> {
  return callNative<NativeTrackingStatus>('getStatus');
}

/** Measurement only: the page's JavaScript is alive (compared with the native sends). */
export function nativeJsBeat(): void {
  void callNative('jsBeat', {}, 3000).catch(() => undefined);
}

export function getNativePermissions(): Promise<NativePermissions> {
  return callNative<NativePermissions>('getPermissions');
}

export type NativePermissionAction = 'notifications' | 'location' | 'backgroundLocation' | 'fullScreen' | 'battery' | 'autostart' | 'appSettings';

/** Asks Android (dialog or settings page, the driver decides); resolves with the new state. */
export function requestNativePermission(action: NativePermissionAction): Promise<NativePermissions & { opened?: string }> {
  const method: Record<NativePermissionAction, string> = {
    notifications: 'requestNotifications',
    location: 'requestLocation',
    backgroundLocation: 'requestBackgroundLocation',
    fullScreen: 'openFullScreenSettings',
    battery: 'requestBatteryExemption',
    autostart: 'openAutostartSettings',
    appSettings: 'openAppSettings',
  };
  return callNative(method[action], {}, 0); // no timeout: the driver answers at his pace
}

/** Native events: "trackingStopped", "availabilityOff", "fcmToken". Returns the unsubscribe. */
export function onNativeEvent(event: 'trackingStopped' | 'availabilityOff' | 'fcmToken', cb: (value: string | undefined) => void): () => void {
  if (!hasNavyNative()) return () => undefined;
  let handle: { remove: () => Promise<void> } | null = null;
  let removed = false;
  void nativeListenerPlugin()
    .then((p) => p.addListener(event, (d) => cb(d?.value)))
    .then((h) => {
      handle = h;
      if (removed) void h.remove();
    })
    .catch(() => undefined);
  return () => {
    removed = true;
    if (handle) void handle.remove();
  };
}

const FCM_TOKEN_KEY = 'navy-fcm-token';

/** Registers this phone's Firebase token for the signed-in account (idempotent). */
export async function syncFcmToken(token?: string): Promise<'registered' | 'unavailable' | 'failed'> {
  if (!hasNavyNative()) return 'unavailable';
  try {
    let t = token;
    if (!t) {
      const r = await callNative<{ available: boolean; token?: string | null }>('getFcmToken', {}, 15000);
      if (!r.available || !r.token) return 'unavailable';
      t = r.token;
    }
    const version = await getNativeAppVersion();
    const { error } = (await withTimeout(
      (supabase as any).rpc('push_fcm_register', { p_token: t, p_platform: 'android', p_app_version: version }),
      10000,
      'push-fcm-register'
    )) as any;
    if (error) throw error;
    try {
      localStorage.setItem(FCM_TOKEN_KEY, t);
    } catch {
      // nothing stored
    }
    return 'registered';
  } catch (error) {
    console.warn('⚠️ NAVY app: Firebase token not registered yet', error);
    return 'failed';
  }
}

/**
 * Sign-out in the app: the position sharing stops and this phone's Firebase token is
 * forgotten on the server (then deleted on the phone) BEFORE the session ends, so the
 * next account on this phone never receives the previous one's notifications.
 */
export async function forgetNativeAppBeforeSignOut(): Promise<void> {
  if (!hasNavyNative()) return;
  let token: string | null = null;
  try {
    token = localStorage.getItem(FCM_TOKEN_KEY);
    localStorage.removeItem(FCM_TOKEN_KEY);
  } catch {
    // nothing stored
  }
  await Promise.allSettled([
    stopNativeTracking('signed-out'),
    token ? withTimeout((supabase as any).rpc('push_fcm_forget', { p_token: token }), 3000, 'push-fcm-forget') : Promise.resolve(),
  ]);
  await callNative('deleteFcmToken', {}, 3000).catch(() => undefined);
}
