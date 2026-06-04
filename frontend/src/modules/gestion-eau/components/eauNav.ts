/**
 * Filtrage par rôle des boutons-THÈMES de la navigation principale du module
 * (BottomNav + nav desktop du header). Logique PURE testable.
 *
 * La SOURCE des items est `GESTION_EAU_NAV_ITEMS` (constants partagés) — la barre interne
 * historique (EauNav/navConfig) a été retirée au profit de cette navigation principale.
 */
import { GESTION_EAU_NAV_ITEMS } from '../../../constants';
import type { EauRoles } from '../types/gestionEau';

export type EauNavItem = (typeof GESTION_EAU_NAV_ITEMS)[number];

/** Items visibles pour un jeu de rôles cumulables (au moins un rôle requis par item). */
export function filterEauNavByRoles(
  roles: EauRoles,
  items: readonly EauNavItem[] = GESTION_EAU_NAV_ITEMS
): EauNavItem[] {
  return items.filter((it) => !it.roles || it.roles.some((r) => roles[r as keyof EauRoles]));
}
