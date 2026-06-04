/**
 * HeaderEauActions — menu en haut à droite du module Gestion Eau (AHUVI).
 *
 * Porte les écrans SECONDAIRES / transversaux (filtrés par rôle), comme le
 * UserMenuDropdown de BazarKELY : Configuration, Utilisateurs & rôles, Demandes
 * d'accès (admin) ; Alertes / Annonces / Audit = Phase 3-4 (affichés « bientôt »).
 * Le client n'y voit que sa fiche/QR. Déconnexion + version pour tous.
 *
 * La navigation PRINCIPALE (thèmes) vit dans BottomNav (mobile) + nav desktop du
 * header ; ce menu ne duplique donc aucun bouton-thème.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Settings,
  Users,
  Inbox,
  Bell,
  Megaphone,
  ClipboardList,
  IdCard,
  LogOut,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';
import { useAppStore } from '../../../stores/appStore';
import { useGestionEau } from '../../../modules/gestion-eau/context';
import { APP_VERSION } from '../../../constants/appVersion';

interface MenuLink {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'releveur' | 'client'>;
}

interface SoonLink {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: Array<'admin' | 'releveur' | 'client'>;
}

// Écrans secondaires fonctionnels, filtrés par rôle (cumulable).
const SECONDARY_LINKS: MenuLink[] = [
  { label: 'Configuration', path: '/gestion-eau/config', icon: Settings, roles: ['admin'] },
  { label: 'Utilisateurs & rôles', path: '/gestion-eau/utilisateurs', icon: Users, roles: ['admin'] },
  { label: "Demandes d'accès", path: '/gestion-eau/demandes', icon: Inbox, roles: ['admin'] },
  // Client : sa fiche / son QR (rattaché à l'espace client).
  { label: 'Ma fiche / Mon QR', path: '/gestion-eau/client', icon: IdCard, roles: ['client'] },
];

// Écrans à venir (Phase 3-4) — affichés désactivés pour matérialiser la cible produit.
const SOON_LINKS: SoonLink[] = [
  { label: 'Alertes', icon: Bell, roles: ['admin'] },
  { label: 'Annonces', icon: Megaphone, roles: ['admin'] },
  { label: 'Audit / Journaux', icon: ClipboardList, roles: ['admin'] },
];

export default function HeaderEauActions() {
  const navigate = useNavigate();
  const { logout, user } = useAppStore();
  const { roles } = useGestionEau();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const has = (r: Array<'admin' | 'releveur' | 'client'>) => r.some((x) => roles?.[x]);
  const links = SECONDARY_LINKS.filter((l) => has(l.roles));
  const soon = SOON_LINKS.filter((l) => has(l.roles));

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <div className="relative ml-auto" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-xl px-3 py-2 border border-white/25 shadow-lg hover:bg-white/25 transition-all duration-200"
        aria-label="Menu Gestion Eau"
      >
        <span className="w-9 h-9 bg-white/30 rounded-full flex items-center justify-center border border-white/40">
          <User className="w-5 h-5 text-white" />
        </span>
        <span className="hidden sm:block text-white font-medium text-sm font-ahuvi-body max-w-28 truncate">
          {user?.username || user?.email || 'Compte'}
        </span>
        <span className="text-white/70 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 bg-white rounded-xl border border-ahuvi-100 shadow-2xl z-50 min-w-[230px] overflow-hidden">
          {links.length > 0 && (
            <div className="py-1">
              {links.map((l) => {
                const Icon = l.icon;
                return (
                  <button
                    key={l.path}
                    onClick={() => go(l.path)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-ahuvi-800 hover:bg-ahuvi-50 transition-colors font-ahuvi-body"
                  >
                    <Icon className="w-4 h-4 text-ahuvi-olive" />
                    <span className="flex-1 text-left">{l.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-ahuvi-300" />
                  </button>
                );
              })}
            </div>
          )}

          {soon.length > 0 && (
            <div className="py-1 border-t border-ahuvi-100">
              {soon.map((l) => {
                const Icon = l.icon;
                return (
                  <div
                    key={l.label}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-400 cursor-not-allowed font-ahuvi-body"
                    title="Disponible prochainement"
                  >
                    <Icon className="w-4 h-4 text-gray-300" />
                    <span className="flex-1 text-left">{l.label}</span>
                    <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-400 rounded px-1.5 py-0.5">
                      bientôt
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="py-1 border-t border-ahuvi-100">
            <button
              onClick={() => go('/app-version')}
              className="w-full flex items-center justify-between px-4 py-2.5 text-sm text-ahuvi-800 hover:bg-ahuvi-50 transition-colors font-ahuvi-body"
            >
              <span className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-ahuvi-olive" />
                Mise à jour
              </span>
              <span className="text-xs text-gray-400">v{APP_VERSION}</span>
            </button>
            <button
              onClick={async () => {
                setOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-ahuvi-body"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
