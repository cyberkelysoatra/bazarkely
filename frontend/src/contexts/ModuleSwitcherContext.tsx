/**
 * React Context pour la gestion d'état du Module Switcher
 * Gère le mode switcher, le module actif, et la liste des modules disponibles
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Interface pour un module de l'application
 */
export interface Module {
  id: string;
  name: string;
  icon: string;
  path: string;
}

/**
 * Interface du contexte Module Switcher
 */
interface ModuleSwitcherContextType {
  // État
  isSwitcherMode: boolean;
  activeModule: Module | null;
  availableModules: Module[];

  // Actions
  toggleSwitcherMode: () => void;
  setActiveModule: (moduleId: string) => void;
  getAvailableModules: () => Module[];
  setSwitcherMode: (isActive: boolean) => void;
}

/**
 * Clé localStorage pour persister le module actif
 */
const STORAGE_KEY = 'bazarkely_active_module';

/**
 * Modules disponibles par défaut
 */
const DEFAULT_MODULES: Module[] = [
  {
    id: 'bazarkely',
    name: 'BazarKELY',
    icon: '💰',
    path: '/dashboard'
  },
  {
    id: 'construction',
    name: 'Construction POC',
    icon: '🏗️',
    path: '/construction/dashboard'
  }
];

/**
 * Création du contexte
 */
const ModuleSwitcherContext = createContext<ModuleSwitcherContextType | undefined>(undefined);

/**
 * Props du Provider
 */
interface ModuleSwitcherProviderProps {
  children: ReactNode;
}

/**
 * Composant interne qui utilise les hooks React Router
 * Doit être utilisé à l'intérieur d'un Router
 */
const ModuleSwitcherProviderInner: React.FC<ModuleSwitcherProviderProps> = ({ children }) => {
  const [isSwitcherMode, setIsSwitcherMode] = useState(false);
  const [availableModules] = useState<Module[]>(DEFAULT_MODULES);
  const [activeModule, setActiveModuleState] = useState<Module | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const hasCheckedStorage = useRef(false);

  /**
   * Détermine le module actif en fonction de la route actuelle
   */
  const determineActiveModule = useCallback((): Module | null => {
    const currentPath = location.pathname;
    
    // Vérifier si on est dans le module Construction
    if (currentPath.startsWith('/construction')) {
      return availableModules.find(m => m.id === 'construction') || null;
    }
    
    // Sinon, on est dans BazarKELY
    return availableModules.find(m => m.id === 'bazarkely') || null;
  }, [availableModules, location.pathname]);

  /**
   * Charge le module sauvegardé depuis localStorage
   */
  const loadSavedModule = useCallback((): Module | null => {
    try {
      const savedModuleId = localStorage.getItem(STORAGE_KEY);
      if (savedModuleId) {
        const savedModule = availableModules.find(m => m.id === savedModuleId);
        if (savedModule) {
          return savedModule;
        } else {
          // Module sauvegardé n'existe plus ou n'est plus disponible
          // (ex: user n'a plus accès à construction)
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (error) {
      // Gérer les erreurs localStorage (mode navigation privée, etc.)
      console.warn('Erreur lors de la lecture de localStorage:', error);
    }
    return null;
  }, [availableModules]);

  /**
   * Vérifie localStorage au premier chargement pour restaurer le module précédent
   */
  useEffect(() => {
    // Ne vérifier localStorage qu'une seule fois au montage
    if (!hasCheckedStorage.current) {
      hasCheckedStorage.current = true;
      const currentPath = location.pathname;
      const savedModule = loadSavedModule();
      
      if (savedModule) {
        // Vérifier si on est déjà dans le module sauvegardé
        const isInSavedModule = savedModule.id === 'construction' 
          ? currentPath.startsWith('/construction')
          : !currentPath.startsWith('/construction');
        
        // Si on n'est pas dans le module sauvegardé et on est sur une route par défaut, naviguer
        const isDefaultRoute = currentPath === '/dashboard' || currentPath === '/construction/dashboard';
        
        if (!isInSavedModule && isDefaultRoute) {
          // Naviguer vers le module sauvegardé
          navigate(savedModule.path);
          setActiveModuleState(savedModule);
          return;
        }
      }
    }
  }, [loadSavedModule, navigate, location.pathname]);

  /**
   * Met à jour le module actif en fonction de la route
   */
  useEffect(() => {
    const module = determineActiveModule();
    setActiveModuleState(module);
  }, [determineActiveModule]);

  /**
   * Bascule le mode switcher
   */
  const toggleSwitcherMode = useCallback(() => {
    setIsSwitcherMode((prev) => !prev);
  }, []);

  /**
   * Définit le mode switcher explicitement
   */
  const setSwitcherMode = useCallback((isActive: boolean) => {
    setIsSwitcherMode(isActive);
  }, []);

  /**
   * Définit le module actif et navigue vers sa route
   */
  const setActiveModule = useCallback((moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    
    if (module) {
      setActiveModuleState(module);
      // Utiliser navigate de React Router pour la navigation
      navigate(module.path);
      // Sauvegarder le module dans localStorage
      try {
        localStorage.setItem(STORAGE_KEY, moduleId);
      } catch (error) {
        // Gérer les erreurs localStorage (mode navigation privée, etc.)
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
      // Fermer le mode switcher après sélection
      setIsSwitcherMode(false);
    }
  }, [availableModules, navigate]);

  /**
   * Retourne la liste des modules disponibles
   */
  const getAvailableModules = useCallback(() => {
    return availableModules;
  }, [availableModules]);

  const contextValue: ModuleSwitcherContextType = {
    isSwitcherMode,
    activeModule,
    availableModules,
    toggleSwitcherMode,
    setActiveModule,
    getAvailableModules,
    setSwitcherMode
  };

  return (
    <ModuleSwitcherContext.Provider value={contextValue}>
      {children}
    </ModuleSwitcherContext.Provider>
  );
};

/**
 * Provider du contexte Module Switcher
 * Doit être utilisé à l'intérieur d'un Router (BrowserRouter)
 */
export const ModuleSwitcherProvider: React.FC<ModuleSwitcherProviderProps> = ({ children }) => {
  return <ModuleSwitcherProviderInner>{children}</ModuleSwitcherProviderInner>;
};

/**
 * Hook personnalisé pour utiliser le contexte Module Switcher
 * @throws Error si utilisé en dehors du Provider
 */
export const useModuleSwitcher = (): ModuleSwitcherContextType => {
  const context = useContext(ModuleSwitcherContext);
  
  if (context === undefined) {
    throw new Error('useModuleSwitcher doit être utilisé à l\'intérieur d\'un ModuleSwitcherProvider');
  }
  
  return context;
};

