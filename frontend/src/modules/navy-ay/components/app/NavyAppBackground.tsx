/**
 * Invisible, inside the NAVY ay Android app 1.1.0+ only (phase 3B):
 *  - registers this phone's Firebase token for the signed-in account (at sign-in and at
 *    each renewal announced by the app);
 *  - opens the guided set-up screen by itself for an approved driver: at the first launch,
 *    and again if a permission is taken back later (checked when the app comes back to the
 *    front), at most once per opening of the app. Never while the driver is answering an
 *    offer or following a course.
 * Renders nothing; does nothing on the web.
 */
import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../../../stores/appStore';
import { useNavyProfile } from '../../services/navyProfileStore';
import { getNativePermissions, hasNavyNative, onNativeEvent, syncFcmToken } from '../../services/nativeApp';
import { setupNeeded } from '../../utils/backgroundRules';

export const NAVY_SETUP_PATH = '/navy/reglages-appli';
const doneKey = (userId: string) => `navy-app-setup-done:${userId}`;
const OPENED_KEY = 'navy-app-setup-opened';

export function isSetupCompleted(userId: string): boolean {
  try {
    return localStorage.getItem(doneKey(userId)) === '1';
  } catch {
    return false;
  }
}

export function markSetupCompleted(userId: string): void {
  try {
    localStorage.setItem(doneKey(userId), '1');
  } catch {
    // asked again next time
  }
}

export default function NavyAppBackground() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const native = hasNavyNative();
  const approvedDriver = profile.partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const pathRef = useRef(location.pathname);
  pathRef.current = location.pathname;

  // Firebase token of this phone → the signed-in account.
  useEffect(() => {
    if (!native || !userId) return;
    void syncFcmToken();
    return onNativeEvent('fcmToken', (t) => {
      if (t) void syncFcmToken(t);
    });
  }, [native, userId]);

  // Guided set-up: first launch of an approved driver, or a permission taken back.
  useEffect(() => {
    if (!native || !userId || !approvedDriver) return;
    let stop = false;
    const check = async () => {
      const path = pathRef.current;
      if (path.startsWith(NAVY_SETUP_PATH) || path.startsWith('/navy/offres') || path.startsWith('/navy/courses')) return;
      try {
        const perms = await getNativePermissions();
        if (stop) return;
        const completed = isSetupCompleted(userId);
        if (!setupNeeded(perms, completed)) return;
        // At most once per opening of the app (never a loop if the driver declines a step).
        if (sessionStorage.getItem(OPENED_KEY) === '1') return;
        sessionStorage.setItem(OPENED_KEY, '1');
        navigate(NAVY_SETUP_PATH);
      } catch {
        // bridge busy: next time
      }
    };
    void check();
    const onVis = () => document.visibilityState === 'visible' && void check();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [native, userId, approvedDriver]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
