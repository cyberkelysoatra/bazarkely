// Role-based permission constants for Construction POC module
// Centralizes BCI access control and price visibility rules

export const BCI_ACCESS_ROLES = [
  'admin',
  'direction',
  'chef_chantier',
  'chef_equipe',
  'magasinier',
  'logistique'
] as const;

export const PRICE_VISIBLE_ROLES = [
  'admin',
  'direction',
  'chef_chantier',
  'logistique'
] as const;

// Type definitions for better type safety
export type BCIAccessRole = typeof BCI_ACCESS_ROLES[number];
export type PriceVisibleRole = typeof PRICE_VISIBLE_ROLES[number];

/**
 * Check if user role can access BCI module
 * @param role - User role from ConstructionContext
 * @returns true if role can access BCI, false otherwise
 */
export function canAccessBCI(role: string | null | undefined): boolean {
  if (!role) return false;
  return BCI_ACCESS_ROLES.includes(role as any);
}

/**
 * Check if user role can view BCI prices
 * @param role - User role from ConstructionContext
 * @returns true if role can see prices, false otherwise
 */
export function canViewBCIPrices(role: string | null | undefined): boolean {
  if (!role) return false;
  return PRICE_VISIBLE_ROLES.includes(role as any);
}

/**
 * Get list of roles that cannot see prices (for masking)
 * @returns Array of roles with masked prices
 */
export function getMaskedPriceRoles(): string[] {
  return BCI_ACCESS_ROLES.filter(
    role => !PRICE_VISIBLE_ROLES.includes(role as any)
  ) as string[];
}






