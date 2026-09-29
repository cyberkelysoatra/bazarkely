/**
 * NAVY ay phase 3C (decision 59 (3)): the two blocks of the shared "Mise à jour" page
 * (pages/AppVersionPage.tsx), used ONLY from NAVY ay or inside the Android app. The
 * budget, Eau and Construction keep their page unchanged.
 *  - NavyVersionSummary: "Site : 3.92.0" and, inside the app, "Appli Android : 1.2.1",
 *    with one sentence for a non-technician.
 *  - NavyAppUpdateStatus: inside the app, the state of the APP (up to date, or the update
 *    card with "Mettre à jour"), instead of the old "Mode navigateur".
 */
import { useEffect } from 'react';
import { CheckCircle2, Globe, Loader2, RefreshCw, Smartphone } from 'lucide-react';
import { APP_VERSION } from '../../../../constants/appVersion';
import { checkNavyAppUpdate, startNavyAppUpdates, useNavyAppUpdate } from '../../services/navyAppUpdate';
import { isNativeApp } from '../../services/nativeApp';
import { btnSecondary } from '../ui/NavyUi';
import { NavyAppUpdateCard, NavyAppUpdatedToast, NavyAppUpdateFlow } from './NavyAppUpdateUi';

export function NavyVersionSummary() {
  const u = useNavyAppUpdate();
  const inApp = isNativeApp();
  useEffect(() => {
    if (inApp) startNavyAppUpdates();
  }, [inApp]);
  return (
    <div className="space-y-3 text-navyay-charcoal">
      <dl className="space-y-2">
        <div className="flex items-center gap-3">
          <dt className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            Site :
          </dt>
          <dd className="text-xl font-bold tabular-nums">{APP_VERSION}</dd>
        </div>
        {inApp && (
          <div className="flex items-center gap-3">
            <dt className="flex items-center gap-2 text-base">
              <Smartphone className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              Appli Android :
            </dt>
            <dd className="text-xl font-bold tabular-nums">{u.installed?.version ?? '…'}</dd>
          </div>
        )}
      </dl>
      <p className="text-sm leading-relaxed text-navyay-charcoal/80 text-pretty">
        Le site se met à jour tout seul. L’appli Android se met à jour depuis ici quand une nouvelle version sort.
      </p>
    </div>
  );
}

export function NavyAppUpdateStatus() {
  const u = useNavyAppUpdate();
  useEffect(() => {
    startNavyAppUpdates();
  }, []);
  return (
    <div className="space-y-3 text-navyay-charcoal">
      <NavyAppUpdatedToast />
      {u.status === 'available' || u.status === 'required' ? (
        <NavyAppUpdateCard />
      ) : u.status === 'up-to-date' && u.installed?.version ? (
        <div className="flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-navyay-yellow/15 p-4" role="status">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <p className="font-semibold">NAVY ay est à jour ({u.installed.version})</p>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm" role="status">
          <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> Recherche d’une nouvelle version de l’appli…
        </p>
      )}
      <button type="button" className={`${btnSecondary} w-full sm:w-auto`} disabled={u.checking} onClick={() => void checkNavyAppUpdate(true)}>
        {u.checking ? <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <RefreshCw className="h-5 w-5" aria-hidden="true" />}
        Vérifier maintenant
      </button>
      <NavyAppUpdateFlow />
    </div>
  );
}
