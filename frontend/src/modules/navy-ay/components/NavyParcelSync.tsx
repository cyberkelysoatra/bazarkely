/**
 * Invisible (phase 2A): loads the parcels kept on the phone, refreshes them from the
 * server in the background, replays the gestures queued offline when the network comes
 * back (same ids, no duplicate), and keeps the driver's "Offres" badge fresh.
 * Phase 2B2: at start (online), the phone copy of the grocers list is reconciled with
 * the server (a removed grocer is no longer proposed), and an operator's app deletes the
 * private photos that reached their deadline (content photos 30 days after the end of a
 * parcel, identity documents of 1B) through the Storage API.
 * Mounted by NavyRoutes, next to NavyProfileSync.
 */
import { useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useNavyRoles } from '../context/useNavyRoles';
import { flushParcelQueue, loadOpenGrocers, loadParcels, myOffers, refreshParcels } from '../services/parcelService';
import { purgeDueDocuments } from '../services/operatorService';

const REFRESH_MS = 60000;
const OFFERS_MS = 15000;

export default function NavyParcelSync() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const { held } = useNavyRoles();
  const isDriver = held.includes('chauffeur');
  const isOperator = held.includes('operatrice');

  useEffect(() => {
    if (!userId) return;
    void loadParcels(userId).then(() => {
      if (navigator.onLine) void refreshParcels(userId);
    });
  }, [userId]);

  useEffect(() => {
    if (!userId || !isOnline) return;
    void flushParcelQueue(userId).then(() => refreshParcels(userId));
    // Grocers list: the server answer replaces the phone copy.
    void loadOpenGrocers().catch(() => undefined);
    const t = window.setInterval(() => void refreshParcels(userId), REFRESH_MS);
    return () => window.clearInterval(t);
  }, [userId, isOnline]);

  useEffect(() => {
    if (!isOperator || !isOnline) return;
    void purgeDueDocuments()
      .then((done) => done.length && console.info(`🧹 [navy] ${done.length} private photo(s) past their deadline deleted`))
      .catch(() => undefined);
  }, [isOperator, isOnline]);

  useEffect(() => {
    if (!isDriver || !isOnline) return;
    const tick = () => void myOffers().catch(() => {});
    tick();
    const t = window.setInterval(tick, OFFERS_MS);
    return () => window.clearInterval(t);
  }, [isDriver, isOnline]);

  return null;
}
