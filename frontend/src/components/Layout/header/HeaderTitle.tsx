import React from 'react';
import { useIsConstructionModule } from '../../../hooks/useIsConstructionModule';

interface HeaderTitleProps {
  className?: string;
}

/**
 * HeaderTitle - Displays app title and subtitle
 * Adapts content based on current module (Budget vs Construction)
 */
export function HeaderTitle({ className = '' }: HeaderTitleProps) {
  const isConstructionModule = useIsConstructionModule();

  return (
    <div className={`flex flex-col justify-center ${className}`}>
      {/* Main title with modern styling */}
      <h1 className="
        text-2xl sm:text-3xl 
        font-bold 
        text-white
        tracking-tight
        drop-shadow-lg
        transition-all duration-300 ease-out
        hover:drop-shadow-xl
      ">
        <span className="
          bg-gradient-to-r from-white to-white/90
          bg-clip-text
          hover:from-white hover:to-purple-200
          transition-all duration-500
        ">
          {isConstructionModule ? '1saKELY' : 'BazarKELY'}
        </span>
      </h1>
      
      {/* Subtitle with elegant styling */}
      <p className="
        text-xs sm:text-sm 
        text-purple-100/90
        font-medium
        tracking-wide
        drop-shadow-sm
        mt-0.5
        transition-all duration-300
      ">
        {isConstructionModule 
          ? 'BTP Construction'
          : 'Budget familial Madagascar'
        }
      </p>
    </div>
  );
}

export default HeaderTitle;

