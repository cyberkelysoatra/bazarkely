import React, { useState, useCallback } from 'react';
import { useModuleSwitcher } from '../../../contexts/ModuleSwitcherContext';

interface HeaderLogoProps {
  className?: string;
}

/**
 * HeaderLogo - Clickable logo that triggers module switcher
 * Features modern glassmorphism design with smooth ripple effect
 */
export function HeaderLogo({ className = '' }: HeaderLogoProps) {
  const { toggleSwitcherMode } = useModuleSwitcher();
  const [isRippling, setIsRippling] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Trigger module switcher
    if (typeof toggleSwitcherMode === 'function') {
      toggleSwitcherMode();
    }
    
    // Trigger ripple effect
    setIsRippling(true);
    setTimeout(() => setIsRippling(false), 600);
  }, [toggleSwitcherMode]);

  return (
    <button
      onClick={handleClick}
      className={`
        relative group cursor-pointer
        transition-all duration-300 ease-out
        hover:scale-105 active:scale-95
        focus:outline-none focus:ring-2 focus:ring-purple-400/50 focus:ring-offset-2 focus:ring-offset-transparent
        ${className}
      `}
      aria-label="Basculer entre les modules"
      title="Cliquez pour changer de module"
    >
      {/* Logo container with glassmorphism */}
      <div className="
        w-12 h-12 
        bg-gradient-to-br from-white/30 to-white/10
        backdrop-blur-md
        rounded-xl
        flex items-center justify-center
        border border-white/40
        shadow-lg shadow-purple-500/20
        group-hover:shadow-xl group-hover:shadow-purple-500/30
        group-hover:border-white/60
        transition-all duration-300
        overflow-hidden
      ">
        {/* Ripple effect */}
        {isRippling && (
          <span className="
            absolute inset-0 
            bg-white/40 
            rounded-xl 
            animate-ripple
          " />
        )}
        
        {/* Hover glow effect */}
        <span className="
          absolute inset-0 
          bg-gradient-to-br from-purple-400/0 to-purple-600/0
          group-hover:from-purple-400/20 group-hover:to-purple-600/10
          rounded-xl
          transition-all duration-300
        " />
        
        {/* Logo letter */}
        <span className="
          relative z-10
          text-white font-bold text-xl
          drop-shadow-md
          group-hover:drop-shadow-lg
          transition-all duration-300
        ">
          B
        </span>
      </div>
    </button>
  );
}

export default HeaderLogo;

