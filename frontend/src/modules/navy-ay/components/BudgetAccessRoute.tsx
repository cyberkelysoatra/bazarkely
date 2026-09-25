/**
 * UI guard of the budget module (v3.80.0), used as a layout route around every
 * budget route in AppLayout. An account without budget access is sent to /navy.
 *
 * Cold-start rule: reject ONLY on a confirmed state. While the user or the account
 * module list is not known yet → loading indicator, never a redirect. If it cannot be
 * resolved (offline, timeout) → let the user in (fail-open): budget data stays
 * protected server-side by RLS, this guard is UI-only.
 */
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import { useModuleAccess } from '../context/useModuleAccess';

/** Max wait before failing open (ms). */
const MAX_WAIT_MS = 8000;

const Loader = () => (
  <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Chargement">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
  </div>
);

export default function BudgetAccessRoute() {
  const user = useAppStore((s) => s.user);
  const isOnline = useOnlineStatus();
  const { resolved, hasBudgetAccess, resolveStatus } = useModuleAccess();
  const [waitExpired, setWaitExpired] = useState(false);

  const pending = !user || !resolved;
  useEffect(() => {
    if (!pending) return;
    const t = window.setTimeout(() => setWaitExpired(true), MAX_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [pending]);

  if (!user) return waitExpired ? <Outlet /> : <Loader />;

  if (resolved) return hasBudgetAccess ? <Outlet /> : <Navigate to="/navy" replace />;

  // Account module list not known yet: wait while it can still be resolved.
  const canStillResolve = isOnline && resolveStatus !== 'failed' && !waitExpired;
  return canStillResolve ? <Loader /> : <Outlet />;
}
