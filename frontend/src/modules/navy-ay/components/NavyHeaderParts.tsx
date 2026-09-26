/**
 * NAVY ay pieces rendered inside the shared Header (phase 1A), so that the Header
 * change stays a one-line swap:
 * - NavyHeaderSubtitle: "Je suis" switcher when the account holds several roles,
 *   else the usual subtitle (same line → the 89 px header height is unchanged);
 * - NavyDesktopNav: role-based navigation line (desktop only).
 */
import { NavLink } from 'react-router-dom';
import {
  Banknote, BellRing, Home, Inbox, Map as MapIcon, Navigation, Package, PackageOpen, QrCode, Route, Send, Settings, Store, Truck, UserPlus, Users,
} from 'lucide-react';
import { useNavyRoles } from '../context/useNavyRoles';
import NavyRoleSwitcher from './NavyRoleSwitcher';

const ICONS = {
  Banknote, BellRing, Home, Inbox, Map: MapIcon, Navigation, Package, PackageOpen, QrCode, Route, Send, Settings, Store, Truck, UserPlus, Users,
} as const;

export function NavyHeaderSubtitle() {
  const { held } = useNavyRoles();
  return held.length > 1 ? <NavyRoleSwitcher /> : <>Petits colis — Nosy Be</>;
}

export function NavyDesktopNav() {
  const { navItems, badges } = useNavyRoles();
  return (
    <nav className="hidden lg:flex items-center justify-around mt-4">
      {navItems.map((item) => {
        const Icon = ICONS[item.icon as keyof typeof ICONS] ?? Home;
        const badge = badges[item.path] ?? 0;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              `relative flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                isActive ? 'bg-navyay-charcoal text-navyay-yellow' : 'text-navyay-charcoal hover:bg-navyay-yellow/20'
              }`
            }
          >
            <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
            <span className="text-xs">{item.label}</span>
            {badge > 0 && (
              <span
                className="absolute -top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-navyay-yellow text-navyay-charcoal text-[11px] font-bold leading-[18px] text-center tabular-nums"
                aria-label={`${badge} en attente`}
              >
                {badge > 99 ? '99+' : badge}
              </span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
