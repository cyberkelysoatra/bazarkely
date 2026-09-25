/**
 * Invisible (phase 1A): loads the NAVY profile of the account from the device, then
 * refreshes it from Supabase in the background; replays queued requests / settings
 * when the network comes back; keeps the operator badge fresh. Mounted by NavyRoutes.
 */
import { useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { loadNavyProfile, refreshNavyProfile, refreshPendingCount } from '../services/partnerService';
import { useNavyProfile } from '../services/navyProfileStore';

const BADGE_REFRESH_MS = 60000;

export default function NavyProfileSync() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const { isOperator } = useNavyProfile();

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void loadNavyProfile(userId).then(() => {
      if (!cancelled && navigator.onLine) void refreshNavyProfile(userId);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (userId && isOnline) void refreshNavyProfile(userId);
  }, [userId, isOnline]);

  useEffect(() => {
    if (!isOperator || !isOnline) return;
    const t = window.setInterval(() => void refreshPendingCount(), BADGE_REFRESH_MS);
    return () => window.clearInterval(t);
  }, [isOperator, isOnline]);

  return null;
}
