/**
 * Invisible (phase 2C3, decisions 49, 50): the phone of an approved driver sends its
 * position every 30 seconds, ONLY while
 *   - he is "Disponible" (availability not expired) or has a course in progress
 *     (from the acceptance to the hand-over at the arrival grocer),
 *   - AND NAVY ay is open on screen (a hidden tab or a phone in the pocket stops it:
 *     a web app cannot read the position in the background, that is the Android app of
 *     phase 3).
 * It stops at once on "Pas disponible", at the expiry, when the app goes to the
 * background, or when the server refuses (not available any more). Nothing is queued:
 * an old position is worth nothing. The server keeps ONE row per driver, overwritten.
 * Mounted by NavyRoutes, next to NavyParcelSync. State readable by "Ma direction".
 */
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../services/navyProfileStore';
import { loadDriverStatus, useDriverState } from '../services/driverService';
import { useParcels } from '../services/parcelService';
import { reportPosition } from '../services/liveService';
import { isLocalAvailable } from '../utils/geo';

export const LIVE_SEND_MS = 30_000;

export type LiveShareState = 'off' | 'sharing' | 'denied' | 'no-gps' | 'hidden';

interface ShareStore {
  state: LiveShareState;
  /** Last position sent (shown to the driver, rounded as clients see it). */
  last: { lat: number; lng: number; at: number } | null;
  sent: number;
}

let store: ShareStore = { state: 'off', last: null, sent: 0 };
const listeners = new Set<() => void>();
function set(next: Partial<ShareStore>) {
  store = { ...store, ...next };
  listeners.forEach((l) => l());
}

export function useLiveShare(): ShareStore {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => store,
    () => store
  );
}

function useVisible(): boolean {
  const [visible, setVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
  useEffect(() => {
    const on = () => setVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
  return visible;
}

export default function NavyDriverLiveSync() {
  const userId = useAppStore((s) => s.user?.id);
  const profile = useNavyProfile();
  const driver = useDriverState();
  const parcels = useParcels();
  const isOnline = useOnlineStatus();
  const visible = useVisible();
  const [now, setNow] = useState(() => Date.now());
  const row = profile.partners.find((p) => p.kind === 'chauffeur' && p.status === 'approved');

  // The driver's status must be known on every NAVY screen, not only on "Ma direction".
  useEffect(() => {
    if (userId && row) void loadDriverStatus(userId, row.id);
  }, [userId, row?.id, isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  // Expiry of the availability is a matter of time: re-evaluate every 30 s.
  useEffect(() => {
    if (!row) return;
    const t = window.setInterval(() => setNow(Date.now()), LIVE_SEND_MS);
    return () => window.clearInterval(t);
  }, [row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const status = driver.userId === userId ? driver.status : null;
  const available = isLocalAvailable(status, now);
  const inCourse =
    !!userId && parcels.userId === userId && parcels.rows.some((p) => p.driver_user_id === userId && (p.status === 'chauffeur_trouve' || p.status === 'pris_en_charge'));
  const eligible = !!row && !!userId && (available || inCourse);
  const active = eligible && visible && isOnline && typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    if (!eligible) {
      set({ state: 'off', last: null });
      return;
    }
    if (!visible) set({ state: 'hidden' });
    if (!active || !row) return;
    let stopped = false;
    let refused = false;
    const send = () => {
      if (stopped || refused) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (stopped) return;
          const c = pos.coords;
          void reportPosition(row.id, { lat: c.latitude, lng: c.longitude, heading: c.heading, speed: c.speed, accuracy: c.accuracy }).then((r) => {
            if (stopped) return;
            if (r === 'refused') {
              refused = true;
              set({ state: 'off' });
              return;
            }
            if (r === 'sent') set({ state: 'sharing', last: { lat: c.latitude, lng: c.longitude, at: Date.now() }, sent: store.sent + 1 });
          });
        },
        (err) => {
          if (stopped) return;
          set({ state: err.code === err.PERMISSION_DENIED ? 'denied' : 'no-gps' });
        },
        { enableHighAccuracy: true, timeout: 20_000, maximumAge: 10_000 }
      );
    };
    send();
    const t = window.setInterval(send, LIVE_SEND_MS);
    return () => {
      stopped = true;
      window.clearInterval(t);
    };
  }, [active, eligible, visible, row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
