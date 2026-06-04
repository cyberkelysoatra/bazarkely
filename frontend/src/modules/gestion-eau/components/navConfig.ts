/**
 * Configuration de la navigation interne + filtrage par rôle (logique PURE,
 * séparée du rendu pour être unitairement testable).
 */
import type { EauRole, EauRoles } from '../types/gestionEau';

export interface EauNavItem {
  to: string;
  label: string;
  icon: string;
  /** Rôles autorisés (au moins un). `undefined` = tout accès au module. */
  roles?: EauRole[];
  end?: boolean;
}

export const EAU_NAV_ITEMS: EauNavItem[] = [
  { to: '/gestion-eau', label: 'Tableau de bord', icon: '📊', end: true },
  { to: '/gestion-eau/client', label: 'Mes factures', icon: '🧾', roles: ['client'] },
  { to: '/gestion-eau/saisie-bassin', label: 'Saisie bassin', icon: '🛢️', roles: ['releveur', 'admin'] },
  { to: '/gestion-eau/saisie-compteur', label: 'Saisie compteur', icon: '🔢', roles: ['releveur', 'admin'] },
  { to: '/gestion-eau/anomalies', label: 'Anomalies', icon: '⚠️', roles: ['releveur', 'admin'] },
  { to: '/gestion-eau/facturation', label: 'Facturation', icon: '💳', roles: ['admin'] },
  { to: '/gestion-eau/compteurs', label: 'Compteurs', icon: '🧰', roles: ['admin'] },
  { to: '/gestion-eau/utilisateurs', label: 'Utilisateurs', icon: '👥', roles: ['admin'] },
  { to: '/gestion-eau/demandes', label: 'Demandes', icon: '📨', roles: ['admin'] },
  { to: '/gestion-eau/config', label: 'Configuration', icon: '⚙️', roles: ['admin'] },
];

/** Items visibles pour un jeu de rôles cumulables. */
export function filterNavByRoles(roles: EauRoles, items: EauNavItem[] = EAU_NAV_ITEMS): EauNavItem[] {
  return items.filter((it) => !it.roles || it.roles.some((r) => roles[r]));
}
