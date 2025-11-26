/**
 * Utilitaires de masquage de prix pour le module Construction POC
 * Fonctions pures pour déterminer si un utilisateur peut voir les prix
 * et formater/masquer les prix selon le rôle
 */

import { PRICE_VISIBLE_ROLES } from './rolePermissions';

/**
 * Vérifie si un utilisateur peut voir les prix complets
 * @param userRole - Rôle de l'utilisateur (chef_equipe, chef_chantier, direction, admin, etc.)
 * @returns true si l'utilisateur peut voir les prix, false sinon
 * 
 * @example
 * ```typescript
 * canViewFullPrice('chef_equipe') // false
 * canViewFullPrice('magasinier') // false
 * canViewFullPrice('chef_chantier') // true
 * canViewFullPrice('direction') // true
 * canViewFullPrice('admin') // true
 * canViewFullPrice('logistique') // true
 * canViewFullPrice(undefined) // false
 * ```
 */
export function canViewFullPrice(userRole: string | null | undefined): boolean {
  if (!userRole) return false;
  return PRICE_VISIBLE_ROLES.includes(userRole as any);
}

/**
 * Alias de canViewFullPrice pour plus de clarté dans le code
 * Vérifie si un utilisateur peut voir les prix des items
 * @param userRole - Rôle de l'utilisateur
 * @returns true si l'utilisateur peut voir les prix, false sinon
 * 
 * @example
 * ```typescript
 * canViewItemPrices('chef_equipe') // false
 * canViewItemPrices('magasinier') // true
 * ```
 */
export function canViewItemPrices(userRole: string | null | undefined): boolean {
  return canViewFullPrice(userRole);
}

/**
 * Formate un prix avec séparateur de milliers et devise MGA
 * @param price - Prix à formater (peut être null ou undefined)
 * @returns Prix formaté avec séparateur de milliers et "MGA" (ex: "5 000 000 MGA")
 * 
 * @example
 * ```typescript
 * formatPrice(5000000) // "5 000 000 MGA"
 * formatPrice(1234.56) // "1 235 MGA" (arrondi)
 * formatPrice(null) // "0 MGA"
 * formatPrice(undefined) // "0 MGA"
 * ```
 */
export function formatPrice(price: number | null | undefined): string {
  // Gérer les valeurs null/undefined
  const safePrice = price ?? 0;
  
  // Arrondir à l'entier le plus proche
  const roundedPrice = Math.round(safePrice);
  
  // Formater avec séparateur de milliers (espace)
  const formatted = roundedPrice.toLocaleString('fr-MG', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  });
  
  return `${formatted} MGA`;
}

/**
 * Masque un prix ou le formate selon le rôle de l'utilisateur
 * @param price - Prix à afficher (peut être null ou undefined)
 * @param userRole - Rôle de l'utilisateur
 * @returns "Prix masqué" si l'utilisateur ne peut pas voir les prix, sinon prix formaté
 * 
 * @example
 * ```typescript
 * maskPrice(5000000, 'chef_equipe') // "Prix masqué"
 * maskPrice(5000000, 'chef_chantier') // "5 000 000 MGA"
 * maskPrice(null, 'direction') // "0 MGA"
 * maskPrice(undefined, 'chef_equipe') // "Prix masqué"
 * ```
 */
export function maskPrice(
  price: number | null | undefined,
  userRole: string | null | undefined
): string {
  // Si l'utilisateur ne peut pas voir les prix, retourner message masqué
  if (!canViewFullPrice(userRole)) {
    return 'Prix masqué';
  }
  
  // Sinon, formater le prix normalement
  return formatPrice(price);
}

/**
 * Retourne un message explicatif pour l'utilisateur expliquant pourquoi les prix sont masqués
 * @param userRole - Rôle de l'utilisateur
 * @returns Message en français expliquant le masquage des prix
 * 
 * @example
 * ```typescript
 * getPriceMaskingMessage('chef_equipe')
 * // "En tant que Chef Équipe, les prix sont masqués. Contactez la Direction pour plus d'informations."
 * 
 * getPriceMaskingMessage('chef_chantier')
 * // "" (chaîne vide car les prix ne sont pas masqués)
 * ```
 */
export function getPriceMaskingMessage(userRole: string | null | undefined): string {
  // Si l'utilisateur peut voir les prix, retourner chaîne vide
  if (canViewFullPrice(userRole)) {
    return '';
  }
  
  // Message pour chef_equipe
  return 'En tant que Chef Équipe, les prix sont masqués. Contactez la Direction pour plus d\'informations.';
}


