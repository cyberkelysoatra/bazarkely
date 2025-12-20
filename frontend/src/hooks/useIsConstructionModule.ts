import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useModuleSwitcher } from '../contexts/ModuleSwitcherContext';

/**
 * Hook to detect if user is currently in Construction module
 * Uses pathname as primary source (more reliable) + activeModule as fallback
 * @returns boolean - true if in Construction module
 */
export function useIsConstructionModule(): boolean {
  const location = useLocation();
  const { activeModule } = useModuleSwitcher();

  const isConstructionModule = useMemo(() => {
    return (
      location.pathname.includes('/construction') ||
      activeModule?.id === 'construction' ||
      activeModule?.id === 'construction-poc'
    );
  }, [location.pathname, activeModule?.id]);

  return isConstructionModule;
}

export default useIsConstructionModule;

