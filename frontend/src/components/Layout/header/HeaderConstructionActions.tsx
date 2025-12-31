import React from 'react';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';
import { CompanyBadge } from './CompanyBadge';
import { RoleBadge } from './RoleBadge';

interface HeaderConstructionActionsProps {
  className?: string;
}

/**
 * HeaderConstructionActions - Assembly of Construction-specific header elements
 * Contains CompanyBadge and RoleBadge, only visible in Construction module
 */
export function HeaderConstructionActions({ className = '' }: HeaderConstructionActionsProps) {
  const isConstructionModule = useIsConstructionModule();

  // Don't render anything in Budget module
  if (!isConstructionModule) {
    return null;
  }

  return (
    <div className={`
      flex items-center gap-2 sm:gap-3
      ml-auto
      ${className}
    `}>
      {/* Company Badge - shows active company */}
      <CompanyBadge />
      
      {/* Role Badge - shows user role with admin dropdown */}
      <RoleBadge />
    </div>
  );
}

export default HeaderConstructionActions;







