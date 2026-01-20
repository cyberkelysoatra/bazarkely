/**
 * RoleBadge Component
 * Displays the current construction role and allows role simulation via dropdown
 * Used in Construction module header
 */

import React, { useState, useEffect, useMemo } from 'react';
import { MemberRole } from '../../modules/construction-poc/types/construction';
import type { UserCompany } from '../../modules/construction-poc/context/ConstructionContext';
import type { User } from '../../types';

interface RoleBadgeProps {
  currentRole: MemberRole | null;
  activeCompany: UserCompany | null;
  simulatedRole: MemberRole | null;
  user: User | null;
  onRoleChange: (role: MemberRole | null) => void;
}

// Helper function to get role display name
const getRoleDisplayName = (role: MemberRole | null): string => {
  if (!role) return '';
  
  const roleNames: Record<string, string> = {
    [MemberRole.ADMIN]: 'Administrateur',
    [MemberRole.DIRECTION]: 'Direction',
    [MemberRole.CHEF_CHANTIER]: 'Chef Chantier',
    [MemberRole.CHEF_EQUIPE]: 'Chef Équipe',
    [MemberRole.MAGASINIER]: 'Magasinier',
    [MemberRole.LOGISTIQUE]: 'Logistique',
    [MemberRole.RESP_FINANCE]: 'Finance',
  };
  
  return roleNames[role] || role;
};

// Helper function to get role icon
const getRoleIcon = (role: MemberRole | null): string => {
  if (!role) return '👤';
  
  const roleIcons: Record<string, string> = {
    [MemberRole.ADMIN]: '👨‍💼',
    [MemberRole.DIRECTION]: '🎯',
    [MemberRole.CHEF_CHANTIER]: '🏗️',
    [MemberRole.CHEF_EQUIPE]: '👷',
    [MemberRole.MAGASINIER]: '📦',
    [MemberRole.LOGISTIQUE]: '🚚',
    [MemberRole.RESP_FINANCE]: '💰',
  };
  
  return roleIcons[role] || '👤';
};

const RoleBadge: React.FC<RoleBadgeProps> = React.memo(({
  currentRole,
  activeCompany,
  simulatedRole,
  user,
  onRoleChange
}) => {
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Memoize role simulation options
  const roleSimulationOptions = useMemo(() => [
    { role: MemberRole.DIRECTION, name: 'Direction', icon: '🎯' },
    { role: MemberRole.CHEF_CHANTIER, name: 'Chef Chantier', icon: '🏗️' },
    { role: MemberRole.CHEF_EQUIPE, name: 'Chef Équipe', icon: '👷' },
    { role: MemberRole.MAGASINIER, name: 'Magasinier', icon: '📦' },
    { role: MemberRole.LOGISTIQUE, name: 'Logistique', icon: '🚚' },
    { role: MemberRole.RESP_FINANCE, name: 'Finance', icon: '💰' },
  ], []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleRoleDropdownClickOutside = (event: MouseEvent) => {
      if (isRoleDropdownOpen) {
        const target = event.target as HTMLElement;
        // Vérifier si le clic est à l'extérieur du badge et du dropdown
        if (!target.closest('.role-badge-container') && !target.closest('.role-simulation-dropdown')) {
          setIsRoleDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleRoleDropdownClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleRoleDropdownClickOutside);
    };
  }, [isRoleDropdownOpen]);

  // Only render if we have a role
  if (!currentRole) return null;

  const isAdmin = activeCompany?.role === MemberRole.ADMIN;

  return (
    <div className="ml-auto relative role-badge-container">
      {/* Badge cliquable seulement si ADMIN (vérifier activeCompany.role, pas currentRole) */}
      <div 
        className={`flex items-center gap-2 px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 ${
          isAdmin ? 'cursor-pointer hover:bg-white/30 transition-colors' : ''
        }`}
        onClick={() => {
          // Only allow dropdown if real role is ADMIN
          if (isAdmin) {
            setIsRoleDropdownOpen(!isRoleDropdownOpen);
            console.log('🎭 [Role Simulation] Toggle dropdown, current simulated:', simulatedRole);
          }
        }}
      >
        <span className="text-xl">{getRoleIcon(currentRole)}</span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white">
            {getRoleDisplayName(currentRole)}
          </span>
          {user && (
            <span className="text-xs text-white/80">
              {user?.detailedProfile?.firstName && user?.detailedProfile?.lastName
                ? `${user.detailedProfile.firstName} ${user.detailedProfile.lastName.charAt(0)}.`
                : user?.detailedProfile?.firstName || user?.username || user?.email || ''}
            </span>
          )}
        </div>
        {/* Dropdown indicator for Admin users */}
        {isAdmin && (
          <span className="text-white/60 text-xs ml-1">
            {isRoleDropdownOpen ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Role Simulation Dropdown - Only visible for ADMIN users */}
      {isRoleDropdownOpen && isAdmin && (
        <div className="role-simulation-dropdown absolute top-full right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-50 min-w-[200px] max-w-[250px]">
          {/* Return to Administrator option - Always visible at top */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRoleChange(null); // null means clear simulation
              setIsRoleDropdownOpen(false);
              console.log('🔄 [Role Simulation] Returned to Administrator');
            }}
            className="w-full text-left px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 border-b border-gray-200 flex items-center gap-2"
          >
            <span className="text-lg">👨‍💼</span>
            <span>Retour à Administrateur</span>
          </button>

          {/* Available roles for simulation (exclude ADMIN) */}
          {roleSimulationOptions.map(({ role, name, icon }) => (
            <button
              key={role}
              onClick={(e) => {
                e.stopPropagation();
                onRoleChange(role);
                setIsRoleDropdownOpen(false);
                console.log('🎭 [Role Simulation] Selected role:', role, name);
              }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex items-center gap-2 ${
                simulatedRole === role 
                  ? 'bg-blue-50 text-blue-700 font-semibold' 
                  : 'text-gray-700'
              }`}
            >
              <span className="text-lg">{icon}</span>
              <span>{name}</span>
              {simulatedRole === role && (
                <span className="ml-auto text-xs text-blue-600">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
});

RoleBadge.displayName = 'RoleBadge';

export default RoleBadge;










