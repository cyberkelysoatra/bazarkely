/**
 * Navigation interne du module gestion-eau, filtrée par rôle (cumulable).
 * La liste et le filtrage vivent dans navConfig.ts (logique pure testable).
 */
import { NavLink } from 'react-router-dom';
import { useGestionEau } from '../context/GestionEauContext';
import { filterNavByRoles } from './navConfig';

export default function EauNav() {
  const { roles } = useGestionEau();
  const visible = filterNavByRoles(roles);

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2 px-3 -mx-1" aria-label="Navigation Gestion Eau">
      {visible.map((it) => (
        <NavLink
          key={it.to}
          to={it.to}
          end={it.end}
          className={({ isActive }) =>
            `flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-sky-600 text-white shadow-soft'
                : 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
            }`
          }
        >
          <span aria-hidden>{it.icon}</span>
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
