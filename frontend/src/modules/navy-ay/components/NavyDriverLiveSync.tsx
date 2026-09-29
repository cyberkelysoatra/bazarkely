/**
 * Invisible (phase 2C3, decisions 49, 50; phase 3B, decisions 25, 56): the phone of an
 * approved driver sends its position every 30 seconds, ONLY while he is "Disponible"
 * (availability not expired) or has a course in progress (from the acceptance to the
 * hand-over): the same rule as the server (navy_report_position).
 *
 * ONE sender at a time (positionEmitter):
 *  - app 1.1.0+ (NavyNative bridge): the native foreground service sends, even with the
 *    screen off, straight to navy_report_position (permanent notification, 60 s under 20 %
 *    of battery). This component only starts / stops it and reads its state. It stops by
 *    itself when the server refuses a position; the page stops it when the driver is no
 *    longer eligible (after 5 s, so that a status still loading never stops it).
 *  - web (or app 1.0.0): the page sends while NAVY ay is open on screen (hidden tab or
 *    phone in the pocket: stopped), as in 2C3. Nothing is queued: an old position is
 *    worth nothing. The server keeps ONE row per driver, overwritten.
 * Mounted by NavyRoutes, next to NavyParcelSync. State readable by "Ma direction".
 */
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useNavyProfile } from '../services/navyProfileStore';
import { loadDriverStatus, useDriverState } from '../services/driverService';
import { useParcels } from '../services/parcelService';
import { reportPosition } from '../services/liveService';
import {
  getNativeTrackingStatus,
  hasNavyNative,
  isNativeApp,
  nativeJsBeat,
  onNativeEvent,
  startNativeTracking,
  stopNativeTracking,
  type NativeTrackingStatus,
} from '../services/nativeApp';
import { isLocalAvailable } from '../utils/geo';
import { positionEmitter, trackingMode } from '../utils/backgroundRules';
import { maybeSendAutoAppReport } from '../services/appReportService';

export const LIVE_SEND_MS = 30_000;
const NATIVE_STOP_DELAY_MS = 5_000;
const NATIVE_POLL_MS = 10_000;

export type LiveShareState = 'off' | 'sharing' | 'denied' | 'no-gps' | 'hidden';

interface ShareStore {
  state: LiveShareState;
  /** Last position sent (shown to the driver, rounded as clients see it). */
  last: { lat: number; lng: number; at: number } | null;
  sent: number;
  /** Who sends: the app's native service (screen off too) or the web page. */
  emitter: 'native' | 'web';
}

let store: ShareStore = { state: 'off', last: null, sent: 0, emitter: 'web' };
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

/** Native state → the share store read by "Ma direction". */
function fromNative(s: NativeTrackingStatus) {
  const lat = s.lastLat != null ? Number(s.lastLat) : NaN;
  const lng = s.lastLng != null ? Number(s.lastLng) : NaN;
  const fresh = s.running && s.lastSentAt > 0 && Date.now() - s.lastSentAt < 3 * 60_000;
  set({
    emitter: 'native',
    state: s.running ? (fresh ? 'sharing' : 'off') : s.stopReason === 'permission' ? 'denied' : 'off',
    last: fresh && Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng, at: s.lastSentAt } : null,
    sent: s.sentOk,
  });
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
  const emitter = positionEmitter(isNativeApp(), hasNavyNative());

  // The driver's status must be known on every NAVY screen, not only on "Ma direction".
  // In the app it is read again when the app comes back to the front (the server may have
  // stopped it meanwhile: "Pas disponible" from the notification, idle for an hour, expiry).
  useEffect(() => {
    if (userId && row) void loadDriverStatus(userId, row.id);
  }, [userId, row?.id, isOnline, emitter === 'native' ? visible : null]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const mode = trackingMode({ approved: !!row && !!userId, available, inCourse });
  const eligible = mode !== 'off';

  // ---------------------------------------------------------------- native sender (app 1.1.0+)
  const startedRef = useRef<string | null>(null);
  useEffect(() => {
    if (emitter !== 'native') return;
    if (eligible && row) {
      const key = `${row.id}:${mode}`;
      if (startedRef.current === key) return;
      startedRef.current = key;
      startNativeTracking(row.id, mode === 'course' ? 'course' : 'available')
        .then(fromNative)
        .catch((err) => {
          startedRef.current = null;
          set({ emitter: 'native', state: String(err?.message ?? err).includes('permission') ? 'denied' : 'off' });
        });
      return;
    }
    // Not eligible: stop, but only if it lasts (a status still loading must not stop it).
    const t = window.setTimeout(() => {
      startedRef.current = null;
      void stopNativeTracking('page')
        .then((s) => {
          fromNative(s);
          void maybeSendAutoAppReport(); // phase 3C: summary of the stretch, if 20 min screen off
        })
        .catch(() => undefined);
    }, NATIVE_STOP_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [emitter, eligible, mode, row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Native state for "Ma direction" + heartbeat of the page (measurement of the screen-off
  // behaviour of the JavaScript, kept on the phone only).
  useEffect(() => {
    if (emitter !== 'native') return;
    const read = () => {
      void getNativeTrackingStatus().then(fromNative).catch(() => undefined);
      if (startedRef.current) nativeJsBeat();
    };
    read();
    const t = window.setInterval(read, NATIVE_POLL_MS);
    const offStop = onNativeEvent('trackingStopped', () => {
      startedRef.current = null;
      read();
      void maybeSendAutoAppReport();
      if (userId && row) void loadDriverStatus(userId, row.id);
    });
    const offAvail = onNativeEvent('availabilityOff', () => {
      read();
      void maybeSendAutoAppReport();
      if (userId && row) void loadDriverStatus(userId, row.id);
    });
    return () => {
      window.clearInterval(t);
      offStop();
      offAvail();
    };
  }, [emitter, userId, row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------- web sender (site, app 1.0.0)
  const active = emitter === 'web' && eligible && visible && isOnline && typeof navigator !== 'undefined' && 'geolocation' in navigator;

  useEffect(() => {
    if (emitter !== 'web') return;
    if (!eligible) {
      set({ state: 'off', last: null, emitter: 'web' });
      return;
    }
    if (!visible) set({ state: 'hidden', emitter: 'web' });
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
  }, [emitter, active, eligible, visible, row?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
