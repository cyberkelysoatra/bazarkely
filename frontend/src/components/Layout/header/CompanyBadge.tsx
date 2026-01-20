import React from 'react';
import { Building2 } from 'lucide-react';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';
import { useConstruction } from '../../../modules/construction-poc/context/ConstructionContext';

interface CompanyBadgeProps {
  className?: string;
}

/**
 * CompanyBadge - Displays active company name in Construction module
 * Only renders when in Construction module AND activeCompany exists
 * Features modern glassmorphism design with subtle animations
 */
export function CompanyBadge({ className = '' }: CompanyBadgeProps) {
  const isConstructionModule = useIsConstructionModule();
  const constructionData = useConstruction();
  
  // Don't render if not in Construction or no active company
  if (!isConstructionModule || !constructionData?.activeCompany) {
    return null;
  }

  const companyName = constructionData.activeCompany.name || 'Entreprise';

  return (
    <div 
      className={`
        group
        flex items-center gap-1.5 
        px-3 py-1.5 
        bg-gradient-to-r from-purple-100/20 to-purple-200/10
        backdrop-blur-sm 
        rounded-full 
        border border-purple-300/30
        shadow-sm shadow-purple-500/10
        hover:shadow-md hover:shadow-purple-500/20
        hover:border-purple-300/50
        hover:from-purple-100/30 hover:to-purple-200/20
        transition-all duration-300 ease-out
        animate-[fadeIn_0.3s_ease-out]
        ${className}
      `}
      title={companyName}
    >
      {/* Building icon with subtle animation */}
      <Building2 className="
        h-3.5 w-3.5 
        text-purple-200 
        flex-shrink-0
        group-hover:text-white
        group-hover:scale-110
        transition-all duration-300
      " />
      
      {/* Company name with truncation */}
      <span className="
        text-xs sm:text-sm 
        font-medium 
        text-white/90
        group-hover:text-white
        max-w-24 sm:max-w-32 
        truncate
        transition-colors duration-300
      ">
        {companyName}
      </span>
    </div>
  );
}

export default CompanyBadge;










