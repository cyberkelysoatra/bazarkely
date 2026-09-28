/**
 * NAVY ay (phase 3B, finishing touches): content of the top-right menu inside NAVY ay.
 * One entry = one line, left-aligned, icon + label, width adapted to the screen. Nothing
 * that only concerns the budget ("Sauvegarde Cloud", PWA install): in the Android app
 * there is nothing to install; on the site "Installer l'appli NAVY ay" leads to /navy/app.
 * Rendered by the shared Header ONLY when the NAVY module is active.
 */
import type { ComponentType } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw, Settings, Shield, Smartphone, SlidersHorizontal, Store, User } from 'lucide-react';
import { APP_VERSION } from '../../../constants/appVersion';
import { hasNavyNative, isNativeApp } from '../services/nativeApp';
import { NAVY_APP_PAGE } from '../utils/nativeAppRules';
import { useNavyProfile } from '../services/navyProfileStore';
import { NAVY_SETUP_PATH } from './app/NavyAppBackground';

interface Props {
  displayName: string;
  isAdmin: boolean;
  updateAvailable: boolean;
  onClose: () => void;
  onLogout: () => void;
}

interface Entry {
  key: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' }>;
  label: string;
  onClick: () => void;
  trailing?: string;
  dot?: boolean;
  danger?: boolean;
}

export default function NavyUserMenu({ displayName, isAdmin, updateAvailable, onClose, onLogout }: Props) {
  const navigate = useNavigate();
  const profile = useNavyProfile();
  const approvedDriver = profile.partners.some((p) => p.kind === 'chauffeur' && p.status === 'approved');
  const go = (path: string) => () => {
    onClose();
    navigate(path);
  };

  const entries: Entry[] = [{ key: 'grocer', icon: Store, label: 'Mon épicerie de retrait', onClick: go('/navy/mon-epicerie') }];
  if (isNativeApp() && hasNavyNative() && approvedDriver) {
    entries.push({ key: 'setup', icon: SlidersHorizontal, label: 'Réglages de l’appli', onClick: go(NAVY_SETUP_PATH) });
  }
  if (!isNativeApp()) {
    entries.push({ key: 'app', icon: Smartphone, label: 'Installer l’appli NAVY ay', onClick: go(NAVY_APP_PAGE) });
  }
  entries.push({ key: 'version', icon: RefreshCw, label: 'Mise à jour', onClick: go('/app-version'), trailing: `v${APP_VERSION}`, dot: updateAvailable });
  entries.push({ key: 'settings', icon: Settings, label: 'Paramètres', onClick: go('/settings') });
  if (isAdmin) entries.push({ key: 'admin', icon: Shield, label: 'Administration', onClick: go('/admin') });
  entries.push({ key: 'logout', icon: LogOut, label: 'Déconnexion', onClick: onLogout, danger: true });

  return (
    <div
      className="dropdown-menu absolute top-full right-0 mt-2 z-50 w-max min-w-[15rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-navyay-charcoal bg-navyay-charcoal p-2 shadow-xl shadow-navyay-charcoal/30"
      role="menu"
      aria-label="Menu du compte"
    >
      <div className="mb-1 flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2.5">
        <User className="w-5 h-5 flex-shrink-0 text-navyay-yellow" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-xs text-white/70">Compte actif</p>
          <p className="truncate text-sm font-semibold text-white">{displayName}</p>
        </div>
      </div>
      <ul className="flex flex-col">
        {entries.map((e) => {
          const Icon = e.icon;
          return (
            <li key={e.key}>
              <button
                type="button"
                role="menuitem"
                onClick={(ev) => {
                  ev.stopPropagation();
                  e.onClick();
                }}
                className={`flex w-full min-h-[44px] items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-navyay-yellow ${
                  e.danger ? 'text-white/90 hover:bg-red-500/25' : 'text-white/90 hover:bg-white/10'
                }`}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0 text-navyay-yellow" aria-hidden="true" />
                <span className="flex-1">{e.label}</span>
                {e.trailing && <span className="text-xs text-white/60 tabular-nums">{e.trailing}</span>}
                {e.dot && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-label="Nouvelle version disponible" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
