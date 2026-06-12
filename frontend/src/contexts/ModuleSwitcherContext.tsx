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
  },
  {
    id: 'gestion-eau',
    name: 'Gestion Eau',
    icon: '💧',
    path: '/gestion-eau'
  }
];

/**
 * Préfixes de route propres à chaque module (hors bazarkely qui est le défaut).
 * Centralise la détection pour determineActiveModule ET la restauration localStorage.
 */
const MODULE_PREFIXES: { id: string; prefix: string }[] = [
  { id: 'construction', prefix: '/construction' },
  { id: 'gestion-eau', prefix: '/gestion-eau' }
];

/** Retourne l'id du module correspondant à un chemin (défaut: 'bazarkely'). */
function moduleIdForPath(path: string): string {
  const match = MODULE_PREFIXES.find(m => path.startsWith(m.prefix));
  return match ? match.id : 'bazarkely';
}

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

    // Détection étendue : construction, gestion-eau, sinon bazarkely (défaut)
    const moduleId = moduleIdForPath(currentPath);
    return availableModules.find(m => m.id === moduleId) || null;
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
   * Vérifie localStorage au premier chargement pour restaurer le module précédent.
   *
   * Reprise auto UNIQUEMENT depuis une adresse NEUTRE : la racine '/' (adresse
   * réelle d'ouverture de la PWA, start_url) OU '/dashboard'. Jamais depuis une
   * adresse profonde de module (/gestion-eau, /construction/...) : un lien, un
   * signet, une notification ou un F5 maintiennent l'utilisateur exactement là
   * où il est (invariant du verrou de navigation).
   */
  useEffect(() => {
    // Une seule décision de reprise par session.
    if (hasCheckedStorage.current) return;

    const currentPath = location.pathname;
    const isNeutralRoute = currentPath === '/' || currentPath === '/dashboard';
    const isModuleRoute = MODULE_PREFIXES.some(m => currentPath.startsWith(m.prefix));

    // Timing one-shot : tant que l'URL n'est ni neutre ni une adresse de module
    // (1er rendu transitoire au boot PWA), NE PAS consommer la garde — on
    // ré-évaluera au rendu suivant quand l'URL se stabilise.
    if (!isNeutralRoute && !isModuleRoute) return;

    // Décision possible → figer définitivement la garde (anti-boucle).
    hasCheckedStorage.current = true;

    // Adresse profonde d'un module : on respecte l'adresse, aucune reprise.
    if (isModuleRoute) return;

    // Adresse neutre ('/' ou '/dashboard') : tenter la reprise du dernier module.
    const savedModule = loadSavedModule();
    if (savedModule) {
      // Inutile de naviguer si on est déjà dans le module sauvegardé
      // (ex: dernier module = BazarKELY et on est déjà sur '/dashboard').
      const isInSavedModule = moduleIdForPath(currentPath) === savedModule.id;
      if (!isInSavedModule) {
        navigate(savedModule.path);
        setActiveModuleState(savedModule);
      }
    }
  }, [loadSavedModule, navigate, location.pathname]);

  /**
   * Met à jour le module actif en fonction de la route ET mémorise le dernier
   * module dès qu'on y entre, par TOUT moyen (sélecteur, lien direct, URL).
   */
  useEffect(() => {
    const module = determineActiveModule();
    setActiveModuleState(module);

    // Persistance du dernier module. EXCEPTION : ne JAMAIS persister depuis la
    // racine '/' — adresse de lancement transitoire qui résout vers 'bazarkely'
    // (défaut) avant la redirection ; persister ici écraserait le vrai dernier
    // module AVANT que l'effet de reprise ci-dessus ait pu le lire. La
    // persistance se fait normalement sur l'adresse de destination réelle.
    if (module && location.pathname !== '/') {
      try {
        localStorage.setItem(STORAGE_KEY, module.id);
      } catch (error) {
        // Gérer les erreurs localStorage (mode navigation privée, etc.)
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
    }
  }, [determineActiveModule, location.pathname]);

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

