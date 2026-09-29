/**
 * Inside the NAVY ay Android app only (phase 3A, redone in phase 3C, decision 59): discreet
 * banner at the top of the NAVY screens when a newer app is published:
 * "Mise à jour disponible : 1.2.1 (vous avez 1.2.0)", "Ce qui change", "Mettre à jour",
 * ⓘ help, hidden for 24 hours by the cross. Also mounts the journey sheet, the message
 * "NAVY ay est à jour (X)" after an update and the blocking screen of a version no longer
 * supported. Renders nothing on the web, nor for an app that is up to date.
 * The site itself updates without any new app (the app loads 1sakely.org); only the
 * native shell needs this banner.
 */
import { useEffect, useState } from 'react';
import { Download, Info, RefreshCw, X } from 'lucide-react';
import { isNativeApp } from '../../services/nativeApp';
import { dismissNavyAppUpdate, startNavyAppUpdate, startNavyAppUpdates, useNavyAppUpdate } from '../../services/navyAppUpdate';
import { updateTitle } from '../../utils/nativeAppRules';
import { NavyAppRequiredScreen, NavyAppUpdatedToast, NavyAppUpdateFlow } from './NavyAppUpdateUi';

export default function NavyAppUpdateBanner() {
  const u = useNavyAppUpdate();
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isNativeApp()) startNavyAppUpdates();
  }, []);

  if (!u.inApp) return null;
  const show = u.status === 'available' && !u.dismissed && !!u.info && !!u.installed?.version;

  return (
    <>
      <NavyAppUpdatedToast />
      {show && u.info && u.installed?.version && (
        <div className="relative z-20 mx-4 mt-2 rounded-2xl border border-navyay-charcoal/10 bg-[#FBF1D3] px-4 py-3 text-navyay-charcoal shadow-sm" role="status">
          <div className="flex items-start gap-3">
            <RefreshCw className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{updateTitle(u.info.version, u.installed.version)}</p>
              {u.info.notesFr && (
                <p className="mt-0.5 line-clamp-2 text-sm text-navyay-charcoal/80">
                  <span className="font-medium">Ce qui change{'\u00a0'}: </span>
                  {u.info.notesFr.replace(/\n/g, ' ')}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={dismissNavyAppUpdate}
              className="-mr-2 -mt-1 rounded-lg p-2 hover:bg-navyay-yellow/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal"
              aria-label="Masquer pendant 24 heures"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2 pl-8">
            <button
              type="button"
              onClick={startNavyAppUpdate}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-navyay-charcoal px-4 text-sm font-semibold text-white hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-yellow"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Mettre à jour
            </button>
            <button
              type="button"
              onClick={() => setHelp((h) => !h)}
              aria-expanded={help}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl px-3 text-sm font-medium hover:bg-navyay-yellow/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal"
            >
              <Info className="h-4 w-4" aria-hidden="true" />
              <span>Aide</span>
            </button>
          </div>
          {help && (
            <div className="mt-2 space-y-1.5 pl-8 text-sm leading-relaxed text-navyay-charcoal/80">
              <p>La nouvelle version se télécharge dans l’appli, puis Android vous demande de confirmer la mise à jour.</p>
              <p>Vous ne perdez rien : votre compte et vos réglages restent.</p>
            </div>
          )}
        </div>
      )}
      <NavyAppUpdateFlow />
      <NavyAppRequiredScreen />
    </>
  );
}
