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
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '../../../lib/supabase';
import { NAVY_AUTH_CALLBACK_URL, parseAuthCallbackUrl } from '../utils/nativeAppRules';

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
