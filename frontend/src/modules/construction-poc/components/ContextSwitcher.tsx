/**
 * Composant ContextSwitcher - Basculer entre contexte Personnel (BazarKELY) et Entreprise (Construction POC)
 * Composant prioritaire requis avant les autres composants UI
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Building2 } from 'lucide-react';
import { useConstruction } from '../context/ConstructionContext';

/**
 * Props du composant ContextSwitcher
 */
interface ContextSwitcherProps {
  className?: string;
}

/**
 * Composant ContextSwitcher
 * Permet de basculer entre le contexte Personnel (BazarKELY) et Entreprise (Construction POC)
 */
export const ContextSwitcher: React.FC<ContextSwitcherProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasConstructionAccess } = useConstruction();

  // Déterminer le contexte actif basé sur la route
  const isPersonalContext = !location.pathname.startsWith('/construction');
  const isBusinessContext = location.pathname.startsWith('/construction');

  /**
   * Gère le clic sur le bouton Personnel
   */
  const handlePersonalClick = () => {
    navigate('/dashboard');
  };

  /**
   * Gère le clic sur le bouton Entreprise
   */
  const handleBusinessClick = () => {
    if (hasConstructionAccess) {
      navigate('/construction/dashboard');
    }
  };

  return (
    <div className={`flex flex-col md:flex-row gap-2 ${className}`}>
      {/* Bouton Personnel */}
      <button
        onClick={handlePersonalClick}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg
          transition-all duration-200 font-medium
          ${isPersonalContext
            ? 'bg-purple-600 text-white shadow-md'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }
        `}
        aria-label="Contexte Personnel - BazarKELY"
      >
        <Home className="w-4 h-4" />
        <span>Personnel</span>
      </button>

      {/* Bouton Entreprise */}
      <button
        onClick={handleBusinessClick}
        disabled={!hasConstructionAccess}
        className={`
          flex items-center justify-center gap-2 px-4 py-2 rounded-lg
          transition-all duration-200 font-medium
          ${isBusinessContext && hasConstructionAccess
            ? 'bg-purple-600 text-white shadow-md'
            : hasConstructionAccess
            ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            : 'bg-gray-200 text-gray-400 opacity-50 cursor-not-allowed'
          }
        `}
        aria-label={hasConstructionAccess ? 'Contexte Entreprise - Construction POC' : 'Rejoindre une entreprise pour accéder'}
        title={!hasConstructionAccess ? 'Rejoindre une entreprise' : undefined}
      >
        <Building2 className="w-4 h-4" />
        <span>Entreprise</span>
      </button>
    </div>
  );
};

export default ContextSwitcher;

