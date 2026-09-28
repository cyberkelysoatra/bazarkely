/**
 * Inside the NAVY ay Android app only (phase 3A): discreet banner when version.json
 * announces a newer app than the one installed. Renders nothing on the web.
 * The site itself updates without reinstalling (the app loads 1sakely.org); only the
 * native shell needs this banner.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, X } from 'lucide-react';
import { getNativeAppVersion, isNativeApp } from '../../services/nativeApp';
import { isNewerAppVersion, NAVY_APP_PAGE } from '../../utils/nativeAppRules';
import { fetchNavyAppVersionInfo } from '../../services/navyAppVersion';

const DISMISSED_KEY = 'navy-app-update-dismissed';

export default function NavyAppUpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);

  useEffect(() => {
    if (!isNativeApp()) return;
    let cancelled = false;
    (async () => {
      const [installed, info] = await Promise.all([getNativeAppVersion(), fetchNavyAppVersionInfo()]);
      if (cancelled || !info) return;
      if (!isNewerAppVersion(installed, info.version)) return;
      try {
        if (sessionStorage.getItem(DISMISSED_KEY) === info.version) return;
      } catch {
        // show it
      }
      setLatest(info.version);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, latest);
    } catch {
      // nothing to keep
    }
    setLatest(null);
  };

  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-navyay-yellow/20 px-4 py-2.5 text-sm text-navyay-charcoal" role="status">
      <Download className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <Link to={NAVY_APP_PAGE} className="flex-1 min-w-0 font-medium underline underline-offset-2">
        Nouvelle version de l’appli disponible
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="-mr-2 p-2 rounded-lg hover:bg-navyay-yellow/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal"
        aria-label="Masquer"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
