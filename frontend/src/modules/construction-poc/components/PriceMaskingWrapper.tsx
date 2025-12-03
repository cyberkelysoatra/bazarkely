/**
 * Composant wrapper pour masquer conditionnellement les prix
 * Masque les prix selon le rôle de l'utilisateur (ex: chef_equipe ne voit pas les prix)
 */

import React, { useState } from 'react';
import { Lock, Info } from 'lucide-react';

/**
 * Utils de masquage de prix
 * Ces fonctions seront déplacées dans un fichier utils séparé si nécessaire
 */

/**
 * Détermine si un rôle peut voir les prix complets
 */
export const canViewFullPrice = (userRole: string): boolean => {
  // Rôles qui peuvent voir les prix complets
  const allowedRoles = [
    'admin',
    'direction',
    'resp_finance',
    'magasinier',
    'logistique',
    'chef_chantier'
  ];
  return allowedRoles.includes(userRole);
};

/**
 * Masque un prix (retourne une chaîne masquée)
 */
export const maskPrice = (): string => {
  return 'Prix masqué';
};

/**
 * Obtient le message d'explication pour le masquage
 */
export const getPriceMaskingMessage = (userRole: string): string => {
  const messages: Record<string, string> = {
    chef_equipe: 'Les prix sont masqués pour votre rôle. Contactez votre chef de chantier pour plus d\'informations.',
    default: 'Vous n\'avez pas les permissions pour voir les prix complets.'
  };
  return messages[userRole] || messages.default;
};

/**
 * Props du composant PriceMaskingWrapper
 */
export interface PriceMaskingWrapperProps {
  /** Prix à afficher (optionnel si children fourni) */
  price?: number | null | undefined;
  /** Rôle de l'utilisateur */
  userRole: string;
  /** Afficher le message d'explication sous le prix masqué */
  showExplanation?: boolean;
  /** Formater le prix avec formatPrice (défaut: true) */
  formatPrice?: boolean;
  /** Classes CSS additionnelles */
  className?: string;
  /** Contenu personnalisé à afficher si le prix est visible (alternative à price) */
  children?: React.ReactNode;
}

/**
 * Formate un montant en MGA
 */
const formatPriceValue = (price: number): string => {
  return new Intl.NumberFormat('fr-MG', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

/**
 * Composant PriceMaskingWrapper
 * Affiche le prix si l'utilisateur a les permissions, sinon masque
 */
const PriceMaskingWrapper: React.FC<PriceMaskingWrapperProps> = ({
  price,
  userRole,
  showExplanation = false,
  formatPrice = true,
  className = '',
  children
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const canView = canViewFullPrice(userRole);

  // Si l'utilisateur peut voir les prix
  if (canView) {
    // Si children fourni, utiliser children
    if (children !== undefined) {
      return <span className={className}>{children}</span>;
    }
    
    // Sinon, afficher le prix formaté
    if (price !== null && price !== undefined) {
      return (
        <span className={`font-semibold text-gray-900 ${className}`}>
          {formatPrice ? formatPriceValue(price) : price.toLocaleString('fr-MG')}
        </span>
      );
    }
    
    // Si pas de prix et pas de children, retourner null
    return null;
  }

  // Si l'utilisateur ne peut pas voir les prix, masquer
  return (
    <div 
      className={`relative inline-flex flex-col items-start gap-1 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="tooltip"
      aria-label={getPriceMaskingMessage(userRole)}
    >
      <div className="flex items-center gap-1.5 text-gray-500">
        <Lock className="h-4 w-4" aria-hidden="true" />
        <span className="text-sm font-medium">{maskPrice()}</span>
      </div>
      
      {/* Tooltip au survol */}
      {showTooltip && (
        <div className="absolute z-10 top-full left-0 mt-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg max-w-xs">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>{getPriceMaskingMessage(userRole)}</p>
          </div>
          {/* Flèche du tooltip */}
          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      )}
      
      {/* Message d'explication si demandé */}
      {showExplanation && (
        <div className="text-xs text-gray-500 flex items-start gap-1">
          <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <p className="max-w-xs">{getPriceMaskingMessage(userRole)}</p>
        </div>
      )}
    </div>
  );
};

export default PriceMaskingWrapper;

