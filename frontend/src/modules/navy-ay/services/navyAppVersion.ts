/**
 * Reads /navy/app/version.json (latest NAVY ay Android app, updated by the GitHub build
 * .github/workflows/navy-android.yml). Never cached: always the current file.
 */
import { NAVY_APP_VERSION_JSON, readVersionInfo, type NavyAppVersionInfo } from '../utils/nativeAppRules';

export async function fetchNavyAppVersionInfo(timeoutMs = 8000): Promise<NavyAppVersionInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${NAVY_APP_VERSION_JSON}?t=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return readVersionInfo(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
