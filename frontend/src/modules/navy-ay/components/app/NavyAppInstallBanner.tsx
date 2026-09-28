/**
 * On the SITE only (phase 3B, decision 56 (5)): discreet banner for an approved driver
 * who does not use the Android app. The app is advised, never required: on the site he
 * keeps receiving offers while NAVY ay is open. Hidden for 7 days when closed.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, X } from 'lucide-react';
import { useNavyProfile } from '../../services/navyProfileStore';
import { isNativeApp } from '../../services/nativeApp';
import { NAVY_APP_PAGE } from '../../utils/nativeAppRules';
import { installBannerVisible } from '../../utils/backgroundRules';

const DISMISSED_KEY = 'navy-app-install-banner-dismissed-at';

function readDismissedAt(): number | null {
  try {
    const v = Number(localStorage.getItem(DISMISSED_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}

export default function NavyAppInstallBanner() {
  const profile = useNavyProfile();
  const [dismissedAt, setDismissedAt] = useState<number | null>(readDismissedAt);
  const approvedDriver = profile.partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved');
  if (!installBannerVisible({ isNative: isNativeApp(), approvedDriver, dismissedAt, now: Date.now() })) return null;

  const dismiss = () => {
    const at = Date.now();
    try {
      localStorage.setItem(DISMISSED_KEY, String(at));
    } catch {
      // hidden for this visit only
    }
    setDismissedAt(at);
  };

  return (
    <div className="mx-4 mt-2 flex items-center gap-3 rounded-2xl border border-navyay-charcoal/10 bg-navyay-yellow/20 px-4 py-2.5 text-sm text-navyay-charcoal" role="status">
      <Smartphone className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
      <Link to={NAVY_APP_PAGE} className="flex-1 min-w-0 font-medium underline underline-offset-2">
        Installez l’appli NAVY ay pour recevoir les courses écran éteint
      </Link>
      <button
        type="button"
        onClick={dismiss}
        className="-mr-2 p-2 rounded-lg hover:bg-navyay-yellow/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-charcoal"
        aria-label="Masquer pendant 7 jours"
      >
        <X className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}
