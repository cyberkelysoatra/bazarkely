/**
 * Opening links (v3.80.0), also carried by QR codes:
 * - /ouvrir/budget → adds 'bazarkely' to the account modules, then /dashboard
 * - /ouvrir/navy   → /navy
 * - /ouvrir/pudi?retour=/pudi/... → full page load of that PUDi page (separate build); used by
 *   PUDi inside the NAVY ay app to sign in through the host's in-app Google flow. Only a
 *   `retour` starting with /pudi/ is followed, anything else opens /pudi/.
 * Not signed in: AppLayout shows the sign-in screen at this same address and the
 * existing `bazarkely_post_login_redirect` mechanism brings the user back here.
 */
import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAppStore } from '../../../stores/appStore';
import { queuePreferencesPatch } from '../services/modulePrefsSync';
import { MODULE_IDS } from '../utils/moduleAccess';

/** PUDi page to open after /ouvrir/pudi: same-site /pudi/ paths only. */
export function pudiReturnPath(retour: string | null): string {
  return retour && retour.startsWith('/pudi/') ? retour : '/pudi/';
}

export default function OpenModulePage() {
  const { target } = useParams();
  const userId = useAppStore((s) => s.user?.id);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigate = useNavigate();

  useEffect(() => {
    if (target !== 'budget' || !userId) return;
    queuePreferencesPatch(userId, { addModules: [MODULE_IDS.BAZARKELY] });
    navigate('/dashboard', { replace: true });
  }, [target, userId, navigate]);

  useEffect(() => {
    if (target !== 'pudi' || !(userId || isAuthenticated)) return;
    window.location.replace(pudiReturnPath(new URLSearchParams(window.location.search).get('retour')));
  }, [target, userId, isAuthenticated]);

  if (target === 'navy') return <Navigate to="/navy" replace />;
  if (target !== 'budget' && target !== 'pudi') return <Navigate to="/navy" replace />;

  return (
    <div className="flex items-center justify-center min-h-[400px]" role="status" aria-label="Ouverture">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  );
}
