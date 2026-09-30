/**
 * NAVY ay phase 3C (seen on Joël's phone): an update of the app outside the Play Store
 * may switch off the full-screen alert (Android resets it at each installation session).
 * A driver who does not reopen "Réglages de l'appli" would then miss the call-like
 * offers without knowing it. While the alert is off, this reminder stays at the top of
 * every NAVY screen of an approved driver (Offres, Direction, map…), with one button to
 * Android's setting; it disappears by itself once the setting is back on.
 * Inside the app 1.1.0+ only; renders nothing on the web.
 */
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { PhoneIncoming } from 'lucide-react';
import { useNavyProfile } from '../../services/navyProfileStore';
import { getNativePermissions, hasNavyNative, requestNativePermission } from '../../services/nativeApp';
import { fullScreenReminderVisible } from '../../utils/backgroundRules';

export default function NavyFullScreenReminder() {
  const profile = useNavyProfile();
  const { pathname } = useLocation();
  const native = hasNavyNative();
  const approvedDriver = profile.partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const [fullScreen, setFullScreen] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    try {
      setFullScreen((await getNativePermissions()).fullScreen);
    } catch {
      // bridge busy: unknown, no reminder
    }
  }, []);

  useEffect(() => {
    if (!native || !approvedDriver) return;
    void read();
    const onVis = () => document.visibilityState === 'visible' && void read();
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [native, approvedDriver, read, pathname]);

  if (!fullScreenReminderVisible({ nativeBridge: native, approvedDriver, fullScreen, path: pathname })) return null;

  return (
    <div className="relative z-20 mx-4 mt-2 rounded-2xl border-2 border-navyay-yellow bg-[#FBF1D3] px-4 py-3 text-navyay-charcoal shadow-sm" role="alert">
      <div className="flex items-start gap-3">
        <PhoneIncoming className="mt-0.5 h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">L’alerte plein écran est désactivée</p>
          <p className="mt-0.5 text-sm text-navyay-charcoal/80">
            Une course ne sonnera pas quand le téléphone est verrouillé. Android la désactive parfois après une mise à jour de NAVY ay.
          </p>
        </div>
      </div>
      <div className="mt-2 pl-8">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await requestNativePermission('fullScreen');
            } catch {
              // the driver can try again
            } finally {
              setBusy(false);
              void read();
            }
          }}
          className="inline-flex min-h-[40px] items-center gap-2 rounded-xl bg-navyay-charcoal px-4 text-sm font-semibold text-white hover:bg-navyay-charcoal/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-navyay-yellow disabled:opacity-60"
        >
          <PhoneIncoming className="h-4 w-4" aria-hidden="true" />
          Réactiver l’alerte
        </button>
      </div>
    </div>
  );
}
