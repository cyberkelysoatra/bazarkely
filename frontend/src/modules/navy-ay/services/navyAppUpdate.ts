/**
 * NAVY ay phase 3C (decision 59 (1)): update of the Android app from the app itself.
 *
 * One shared state (useNavyAppUpdate), read by the banner, the "Mise à jour" entry of the
 * NAVY menu, the /navy/app page and the "Mise à jour" page. Inside the app only: on the
 * web every function does nothing and the state stays "web".
 *  - check: at launch and back to the front (6 h at most between two automatic checks),
 *    plus "Vérifier maintenant"; version.json read without cache, compared with the
 *    installed app (Android versionCode first).
 *  - update, app 1.2.0+: download inside the app (progress, "Annuler"), checks by the
 *    native side (address, SHA-256, package, versionCode, certificate), Android's
 *    permission asked once with an explanation first, then Android's update screen.
 *    After the update: "NAVY ay est à jour (X)" once, the file is deleted.
 *  - update, app 1.1.0 / 1.0.0 (no native updater): an explanation, then the Release file
 *    opens in Chrome (the only way these versions have). Used once, to reach 1.2.0.
 * The word "installer" never appears in these messages.
 */
import { useSyncExternalStore } from 'react';
import { fetchNavyAppVersionInfo } from './navyAppVersion';
import {
  cancelNativeUpdate,
  clearNativeUpdate,
  downloadNativeUpdate,
  getInstalledApp,
  hasNativeUpdater,
  isNativeApp,
  nativeCanInstallUpdates,
  onNativeEvent,
  openNativeInstallPermission,
  openNativeUpdateScreen,
} from './nativeApp';
import {
  appUpdateStatus,
  isUpdateBannerDismissed,
  isUpdateDone,
  progressPercent,
  shouldCheckForUpdate,
  updateFailureMessage,
  updatePath,
  type AppUpdateStatus,
  type InstalledApp,
  type NavyAppVersionInfo,
  type UpdatePath,
} from '../utils/nativeAppRules';

export type UpdateFlowStep =
  /** 1.1.0: explanation before Chrome opens the file. */
  | 'chrome-explain'
  | 'downloading'
  /** First time: explanation before Android's permission page. */
  | 'permission'
  /** Android's update screen is open (or about to be). */
  | 'android'
  | 'error';

export interface UpdateFlow {
  step: UpdateFlowStep;
  percent: number;
  message: string | null;
}

export interface NavyAppUpdateState {
  /** False on the web: nothing is ever shown there. */
  inApp: boolean;
  installed: InstalledApp | null;
  info: NavyAppVersionInfo | null;
  status: AppUpdateStatus;
  checking: boolean;
  lastCheck: number | null;
  /** The last reading of version.json failed (no network): the state shown may be old. */
  checkFailed: boolean;
  path: UpdatePath;
  dismissed: boolean;
  flow: UpdateFlow | null;
  /** "NAVY ay est à jour (X)", shown once after an update. */
  justUpdated: string | null;
}

const LAST_CHECK_KEY = 'navy-app-update-last-check';
const DISMISSED_KEY = 'navy-app-update-dismissed-at';
const TARGET_KEY = 'navy-app-update-target';
const INFO_KEY = 'navy-app-update-info';
/** Set for this opening of the app when it has just been updated (guided screen, 3C). */
export const AFTER_UPDATE_KEY = 'navy-app-after-update';

let afterUpdateResolve: (v: string | null) => void = () => undefined;
const afterUpdatePromise = new Promise<string | null>((r) => {
  afterUpdateResolve = r;
});
/** Resolves with the new version when the app has just been updated, else null. */
export function afterUpdateKnown(): Promise<string | null> {
  return isNativeApp() ? afterUpdatePromise : Promise.resolve(null);
}

function readNumber(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // kept in memory only
  }
}

function readCachedInfo(): NavyAppVersionInfo | null {
  try {
    const v = JSON.parse(localStorage.getItem(INFO_KEY) || 'null');
    return v && typeof v.version === 'string' ? (v as NavyAppVersionInfo) : null;
  } catch {
    return null;
  }
}

let state: NavyAppUpdateState = {
  inApp: false,
  installed: null,
  info: null,
  status: 'unknown',
  checking: false,
  lastCheck: null,
  checkFailed: false,
  path: 'chrome',
  dismissed: false,
  flow: null,
  justUpdated: null,
};
const listeners = new Set<() => void>();
function set(next: Partial<NavyAppUpdateState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

export function useNavyAppUpdate(): NavyAppUpdateState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state
  );
}

export function getNavyAppUpdateState(): NavyAppUpdateState {
  return state;
}

function recompute(info: NavyAppVersionInfo | null, installed: InstalledApp | null) {
  set({
    info,
    installed,
    status: appUpdateStatus(installed, info),
    path: updatePath(hasNativeUpdater(), info),
    dismissed: isUpdateBannerDismissed(readNumber(DISMISSED_KEY), Date.now()),
  });
}

let started = false;
let checkRun: Promise<void> | null = null;

/** Reads the installed version and version.json (automatic: 6 h at most; manual: always). */
export function checkNavyAppUpdate(manual = false): Promise<void> {
  if (!isNativeApp()) return Promise.resolve();
  // "Vérifier maintenant" during an automatic reading: read once more right after it,
  // never answer with the reading that was already under way.
  if (checkRun) return manual ? checkRun.then(() => checkNavyAppUpdate(true)) : checkRun;
  checkRun = (async () => {
    const installed = (await getInstalledApp()) ?? state.installed;
    const now = Date.now();
    if (!shouldCheckForUpdate(state.lastCheck, now, manual) && state.info) {
      recompute(state.info, installed);
      return;
    }
    set({ checking: true, installed });
    const info = await fetchNavyAppVersionInfo();
    if (info) {
      write(LAST_CHECK_KEY, String(now));
      write(INFO_KEY, JSON.stringify(info));
    }
    set({ checking: false, lastCheck: info ? now : state.lastCheck, checkFailed: !info });
    recompute(info ?? state.info, installed);
  })().finally(() => {
    checkRun = null;
  });
  return checkRun;
}

/**
 * Called once inside the app (banner, /navy/app, "Mise à jour" page): first reading,
 * "NAVY ay est à jour" after an update, check again when the app comes back to the front.
 */
export function startNavyAppUpdates(): void {
  if (started || !isNativeApp()) return;
  started = true;
  set({ inApp: true, info: readCachedInfo(), lastCheck: readNumber(LAST_CHECK_KEY) });
  void (async () => {
    const installed = await getInstalledApp();
    set({ installed });
    let target: string | null = null;
    try {
      target = localStorage.getItem(TARGET_KEY);
    } catch {
      target = null;
    }
    if (target && isUpdateDone(target, installed?.version)) {
      write(TARGET_KEY, null);
      set({ justUpdated: installed?.version ?? target });
      try {
        sessionStorage.setItem(AFTER_UPDATE_KEY, installed?.version ?? target);
      } catch {
        // the guided screen still opens by its own rule
      }
      if (hasNativeUpdater()) void clearNativeUpdate().catch(() => undefined);
      afterUpdateResolve(installed?.version ?? target);
    } else {
      afterUpdateResolve(null);
    }
    await checkNavyAppUpdate(false);
  })();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const f = state.flow;
    // Back from Android's permission page: the journey goes on by itself.
    if (f?.step === 'permission' && permissionAsked) {
      permissionAsked = false;
      void resumeAfterPermission();
      return;
    }
    // Back from Android's update screen without updating: the banner comes back.
    if (f?.step === 'android') set({ flow: null });
    void checkNavyAppUpdate(false);
  });
}

export function dismissNavyAppUpdate(): void {
  write(DISMISSED_KEY, String(Date.now()));
  set({ dismissed: true });
}

export function closeJustUpdated(): void {
  set({ justUpdated: null });
}

export function closeUpdateFlow(): void {
  if (state.flow?.step === 'downloading') void cancelNativeUpdate().catch(() => undefined);
  set({ flow: null });
}

let permissionAsked = false;
let offProgress: (() => void) | null = null;

/** "Mettre à jour". */
export function startNavyAppUpdate(): void {
  const info = state.info;
  if (!info) return;
  if (state.path === 'chrome') {
    set({ flow: { step: 'chrome-explain', percent: 0, message: null } });
    return;
  }
  void runDownload();
}

/** 1.1.0 / 1.0.0: after the explanation, the Release file opens in Chrome. */
export function continueInChrome(): void {
  const info = state.info;
  if (!info) return;
  write(TARGET_KEY, info.version);
  set({ flow: null });
  // The app hands any address outside 1sakely.org to the phone's browser (Chrome).
  window.location.href = info.updateUrl ?? info.apkUrl;
}

async function runDownload(): Promise<void> {
  const info = state.info;
  if (!info?.updateUrl || !info.sha256) return;
  set({ flow: { step: 'downloading', percent: 0, message: null } });
  offProgress?.();
  offProgress = onNativeEvent('updateProgress', (v) => {
    if (state.flow?.step === 'downloading') set({ flow: { step: 'downloading', percent: progressPercent(v), message: null } });
  });
  try {
    const r = await downloadNativeUpdate(info.updateUrl, info.sha256, info.apkSizeBytes);
    offProgress?.();
    offProgress = null;
    if (!state.flow) return; // closed meanwhile ("Annuler")
    if (!r.ok) {
      if (r.reason === 'cancelled') {
        set({ flow: null });
        return;
      }
      set({ flow: { step: 'error', percent: 0, message: updateFailureMessage(r.reason) } });
      return;
    }
    write(TARGET_KEY, info.version);
    await openAndroidScreen();
  } catch {
    offProgress?.();
    offProgress = null;
    if (state.flow) set({ flow: { step: 'error', percent: 0, message: updateFailureMessage('network') } });
  }
}

async function openAndroidScreen(): Promise<void> {
  const app = await nativeCanInstallUpdates().catch(() => null);
  if (app && !app.canInstall) {
    set({ flow: { step: 'permission', percent: 100, message: null } });
    return;
  }
  const r = await openNativeUpdateScreen().catch(() => null);
  if (r?.opened) {
    set({ flow: { step: 'android', percent: 100, message: null } });
    return;
  }
  if (r && !r.canInstall) {
    set({ flow: { step: 'permission', percent: 100, message: null } });
    return;
  }
  set({ flow: { step: 'error', percent: 0, message: updateFailureMessage(null) } });
}

/** "Continuer" on the permission explanation: Android's page, then back here. */
export async function askUpdatePermission(): Promise<void> {
  permissionAsked = true;
  const r = await openNativeInstallPermission().catch(() => null);
  if (r?.canInstall) {
    permissionAsked = false;
    await openAndroidScreen();
  } else if (!r?.opened) {
    permissionAsked = false;
    set({ flow: { step: 'error', percent: 0, message: 'Android n’a pas pu ouvrir la page d’autorisation. Réessayez dans un moment.' } });
  }
}

async function resumeAfterPermission(): Promise<void> {
  const app = await nativeCanInstallUpdates().catch(() => null);
  if (app?.canInstall) await openAndroidScreen();
  // Not allowed: the explanation stays, the driver can try again or close.
}
