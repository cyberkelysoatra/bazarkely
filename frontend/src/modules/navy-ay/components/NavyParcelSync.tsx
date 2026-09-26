/**
 * Invisible (phase 2A): loads the parcels kept on the phone, refreshes them from the
 * server in the background, replays the gestures queued offline when the network comes
 * back (same ids, no duplicate), and keeps the driver's "Offres" badge fresh.
 * Mounted by NavyRoutes, next to NavyProfileSync.
 */
import { useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useNavyRoles } from '../context/useNavyRoles';
import { flushParcelQueue, loadParcels, myOffers, refreshParcels } from '../services/parcelService';

const REFRESH_MS = 60000;
const OFFERS_MS = 15000;

export default function NavyParcelSync() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const { held } = useNavyRoles();
  const isDriver = held.includes('chauffeur');

  useEffect(() => {
    if (!userId) return;
    void loadParcels(userId).then(() => {
      if (navigator.onLine) void refreshParcels(userId);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || !isOnline) return;
    void flushParcelQueue(userId).then(() => refreshParcels(userId));
    const t = window.setInterval(() => void refreshParcels(userId), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [userId, isOnline]);

  useEffect(() => {
    if (!isDriver || !isOnline) return;
    const tick = () => void myOffers().catch(() => {});
    tick();
    const t = window.setInterval(tick, OFFERS_MS);
    return () => window.clearInterval(t);
  }, [isDriver, isOnline]);

  return null;
}
