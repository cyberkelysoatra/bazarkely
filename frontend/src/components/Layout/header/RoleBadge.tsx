import React, { useState, useEffect, useCallback, useContext } from 'react';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';
import { ConstructionContext } from '../../../modules/construction-poc/context/ConstructionContext';
import { MemberRole } from '../../../modules/construction-poc/types/construction';
import { useAppStore } from '../../../stores/appStore';

interface RoleBadgeProps {
  className?: string;
}

// Role display configuration
const ROLE_CONFIG: Record<MemberRole, { name: string; icon: string }> = {
  [MemberRole.ADMIN]: { name: 'Administrateur', icon: '👨‍💼' },
  [MemberRole.DIRECTION]: { name: 'Direction', icon: '🎯' },
  [MemberRole.CHEF_CHANTIER]: { name: 'Chef Chantier', icon: '🏗️' },
  [MemberRole.CHEF_EQUIPE]: { name: 'Chef Équipe', icon: '👷' },
  [MemberRole.MAGASINIER]: { name: 'Magasinier', icon: '📦' },
  [MemberRole.LOGISTIQUE]: { name: 'Logistique', icon: '🚚' },
  [MemberRole.RESP_FINANCE]: { name: 'Finance', icon: '💰' },
};

// Simulatable roles (all except ADMIN)
const SIMULATABLE_ROLES = [
  MemberRole.DIRECTION,
  MemberRole.CHEF_CHANTIER,
  MemberRole.CHEF_EQUIPE,
  MemberRole.MAGASINIER,
  MemberRole.LOGISTIQUE,
  MemberRole.RESP_FINANCE,
];

/**
 * RoleBadge - Displays user role in Construction module
 * Admin users can simulate other roles via dropdown
 */
export function RoleBadge({ className = '' }: RoleBadgeProps) {
  const isConstructionModule = useIsConstructionModule();
  const { user } = useAppStore();
  const constructionContext = useContext(ConstructionContext);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Extract context values safely
  const userRole = constructionContext?.userRole ?? null;
  const activeCompany = constructionContext?.activeCompany ?? null;
  const simulatedRole = constructionContext?.simulatedRole ?? null;
  const isAdmin = activeCompany?.role === MemberRole.ADMIN;

  // Current display role (simulated or actual)
  const displayRole = simulatedRole || userRole;

  // Click outside handler
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.role-badge-container') && !target.closest('.role-simulation-dropdown')) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Don't render if not in Construction or no role
  if (!isConstructionModule || !displayRole) {
    return null;
  }

  const roleConfig = ROLE_CONFIG[displayRole] || { name: displayRole, icon: '👤' };

  // Format user display name
  const getUserDisplayName = (): string => {
    if (user?.detailedProfile?.firstName && user?.detailedProfile?.lastName) {
      return `${user.detailedProfile.firstName} ${user.detailedProfile.lastName.charAt(0)}.`;
    }
    return user?.detailedProfile?.firstName || user?.username || user?.email || '';
  };

  const handleBadgeClick = useCallback(() => {
    if (isAdmin) {
      setIsDropdownOpen(prev => !prev);
      console.log('🎭 [Role Simulation] Toggle dropdown, current simulated:', simulatedRole);
    }
  }, [isAdmin, simulatedRole]);

  const handleRoleSelect = useCallback((role: MemberRole) => {
    if (constructionContext?.setSimulatedRole) {
      constructionContext.setSimulatedRole(role);
      setIsDropdownOpen(false);
      console.log('🎭 [Role Simulation] Selected role:', role, ROLE_CONFIG[role].name);
    }
  }, [constructionContext]);

  const handleClearSimulation = useCallback(() => {
    if (constructionContext?.clearSimulation) {
      constructionContext.clearSimulation();
      setIsDropdownOpen(false);
      console.log('🔄 [Role Simulation] Returned to Administrator');
    }
  }, [constructionContext]);

  return (
    <div className={`relative role-badge-container ${className}`}>
      {/* Role Badge */}
      <div
        onClick={handleBadgeClick}
        className={`
          flex items-center gap-2 
          px-3 py-1.5 
          bg-gradient-to-r from-white/20 to-white/10
          backdrop-blur-sm 
          rounded-lg 
          border border-white/30
          shadow-sm shadow-purple-500/10
          transition-all duration-300
          ${isAdmin ? 'cursor-pointer hover:bg-white/30 hover:border-white/50 hover:shadow-md' : ''}
          ${simulatedRole ? 'ring-2 ring-yellow-400/50' : ''}
        `}
      >
        {/* Role icon */}
        <span className="text-xl">{roleConfig.icon}</span>
        
        {/* Role info */}
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            {roleConfig.name}
          </span>
          <span className="text-xs text-white/80">
            {getUserDisplayName()}
          </span>
        </div>
        
        {/* Admin dropdown indicator */}
        {isAdmin && (
          <span className="text-white/60 text-xs ml-1 transition-transform duration-200" style={{ transform: isDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            ▼
          </span>
        )}
      </div>

      {/* Role Simulation Dropdown (Admin only) */}
      {isDropdownOpen && isAdmin && constructionContext && (
        <div className="
          role-simulation-dropdown
          absolute top-full right-0 mt-2 
          bg-white 
          rounded-xl 
          border border-gray-200 
          shadow-xl shadow-gray-200/50
          z-50 
          min-w-[220px] max-w-[280px]
          overflow-hidden
          animate-fadeIn
        ">
          {/* Header */}
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Simuler un rôle
            </span>
          </div>

          {/* Return to Admin button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleClearSimulation(); }}
            className={`
              w-full flex items-center gap-3 px-4 py-3
              text-left transition-colors duration-200
              ${!simulatedRole ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'}
            `}
          >
            <span className="text-lg">👨‍💼</span>
            <span className="font-medium">Retour à Administrateur</span>
            {!simulatedRole && <span className="ml-auto text-purple-600">✓</span>}
          </button>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Simulatable roles */}
          {SIMULATABLE_ROLES.map((role) => {
            const config = ROLE_CONFIG[role];
            const isActive = simulatedRole === role;
            
            return (
              <button
                key={role}
                onClick={(e) => { e.stopPropagation(); handleRoleSelect(role); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3
                  text-left transition-colors duration-200
                  ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}
                `}
              >
                <span className="text-lg">{config.icon}</span>
                <span className="font-medium">{config.name}</span>
                {isActive && <span className="ml-auto text-blue-600">✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RoleBadge;

