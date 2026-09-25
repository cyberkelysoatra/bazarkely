/**
 * React Context pour la gestion d'état du Module Switcher
 * Gère le mode switcher, le module actif, et la liste des modules disponibles
 */

import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import {
  effectivePreferences,
  queuePreferencesPatch,
  readLocalLastModule,
  useModulePrefsState,
  writeLocalLastModule
} from '../modules/navy-ay/services/modulePrefsSync';
import {
  hasResolvedModules,
  mostRecent,
  pickStartModule,
  resolveAccessibleModules
} from '../modules/navy-ay/utils/moduleAccess';

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
  },
  {
    // NAVY ay (v3.80.0) : icône réelle = symbole du logo (rendu par BottomNav), 'N' = repli.
    id: 'navy-ay',
    name: 'NAVY ay',
    icon: 'N',
    path: '/navy'
  }
];

/**
 * Préfixes de route propres à chaque module (hors bazarkely qui est le défaut).
 * Centralise la détection pour determineActiveModule ET la restauration localStorage.
 */
const MODULE_PREFIXES: { id: string; prefix: string }[] = [
  { id: 'construction', prefix: '/construction' },
  { id: 'gestion-eau', prefix: '/gestion-eau' },
  { id: 'navy-ay', prefix: '/navy' }
];

/** Liens d'ouverture (/ouvrir/budget, /ouvrir/navy) : adresses de passage, jamais un module. */
const OPEN_LINK_PREFIX = '/ouvrir';

/** Attente max de la liste de modules du compte avant la reprise (ms). */
const RESTORE_WAIT_MS = 6000;

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

  // v3.80.0 — dernier module mémorisé sur le compte (preferences.lastModule).
  const user = useAppStore((s) => s.user);
  const prefsSync = useModulePrefsState();
  const userPrefs = effectivePreferences(user as any, prefsSync.pending);
  const userRole = (user as any)?.role as string | undefined;
  const modulesResolved = userRole === 'admin' || hasResolvedModules(userPrefs);
  // Reprise en cours de redirection depuis '/dashboard' : ne pas mémoriser 'bazarkely'
  // pour cette adresse de passage (un seul envoi par vrai changement de module).
  const restoreRedirectingRef = useRef(false);
  // Dernier module connu (local ou compte) → n'envoyer au compte que sur un VRAI changement.
  const lastKnownModuleRef = useRef<string | null>(
    mostRecent(readLocalLastModule(), (user as any)?.preferences?.lastModule ?? null)?.id ?? null
  );
  const [restoreWaitExpired, setRestoreWaitExpired] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setRestoreWaitExpired(true), RESTORE_WAIT_MS);
    return () => window.clearTimeout(t);
  }, []);

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
    const isModuleRoute = MODULE_PREFIXES.some(m => currentPath.startsWith(m.prefix));

    // La racine '/' (start_url de la PWA) est une adresse de LANCEMENT
    // TRANSITOIRE : AppLayout la redirige immédiatement vers '/dashboard' via
    // <Navigate to="/dashboard" replace>. Tenter une reprise directement sur '/'
    // entre en concurrence avec cette redirection (course perdue) ; pire, figer
    // la garde ici empêcherait toute reprise ultérieure. On NE consomme donc PAS
    // la garde sur '/' : l'effet retentera de façon déterministe sur '/dashboard'
    // (adresse stable, sans redirection concurrente) — cf. §5.2.
    if (currentPath === '/') return;

    // Lien d'ouverture (/ouvrir/...) : c'est un lien profond explicite → aucune reprise
    // (sinon l'arrivée sur /dashboard après /ouvrir/budget relancerait la reprise).
    if (currentPath.startsWith(OPEN_LINK_PREFIX)) {
      hasCheckedStorage.current = true;
      return;
    }

    // Toute autre adresse transitoire non éligible et non-module : idem, on
    // attend que l'URL se stabilise (ne pas griller la garde one-shot).
    const isDashboard = currentPath === '/dashboard';
    if (!isDashboard && !isModuleRoute) return;

    // Adresse profonde d'un module (lien, signet, notification, F5) : on respecte
    // l'adresse, aucune reprise (invariant du verrou de navigation).
    if (isModuleRoute) {
      hasCheckedStorage.current = true;
      return;
    }

    // '/dashboard' : la reprise a besoin de la liste de modules du compte (jamais mener
    // vers un module non accessible). Tant qu'elle n'est pas connue (profil pas encore
    // chargé, retour OAuth), on attend SANS figer la garde ; au-delà de RESTORE_WAIT_MS
    // on renonce à la reprise (on reste sur l'adresse courante).
    if (!user || !modulesResolved) {
      if (user && restoreWaitExpired) hasCheckedStorage.current = true;
      return;
    }

    // Adresse STABLE atteinte → figer définitivement la garde (anti-boucle).
    hasCheckedStorage.current = true;

    // Reprise du dernier module : le plus récent entre local et compte, parmi les
    // modules accessibles ; à défaut budget s'il est accessible, sinon NAVY ay.
    const accessible = resolveAccessibleModules({ role: userRole, preferences: userPrefs }, null, null);
    const targetId = pickStartModule(readLocalLastModule(), userPrefs.lastModule ?? null, accessible);
    const target = availableModules.find(m => m.id === targetId) || loadSavedModule();
    if (target) {
      // Inutile de naviguer si le dernier module est déjà BazarKELY (on est
      // déjà sur son tableau de bord '/dashboard') — évite toute boucle.
      const isInSavedModule = moduleIdForPath(currentPath) === target.id;
      if (!isInSavedModule) {
        restoreRedirectingRef.current = true;
        navigate(target.path);
        setActiveModuleState(target);
      }
    }
  }, [loadSavedModule, navigate, location.pathname, user, modulesResolved, restoreWaitExpired, userRole, userPrefs, availableModules]);

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
    // v3.80.0 : idem pour les liens d'ouverture (/ouvrir/...) et pour '/dashboard' tant
    // que la reprise n'a pas tranché ou qu'elle redirige (adresse de passage).
    const path = location.pathname;
    if (path !== '/dashboard') restoreRedirectingRef.current = false;
    const isTransient =
      path.startsWith(OPEN_LINK_PREFIX) ||
      (path === '/dashboard' && (!hasCheckedStorage.current || restoreRedirectingRef.current));
    if (module && path !== '/' && !isTransient) {
      try {
        localStorage.setItem(STORAGE_KEY, module.id);
      } catch (error) {
        // Gérer les erreurs localStorage (mode navigation privée, etc.)
        console.warn('Erreur lors de la sauvegarde dans localStorage:', error);
      }
      // Dernier module sur le COMPTE : un seul envoi par vrai changement de module
      // (jamais à chaque navigation interne). Hors ligne : file locale, envoi au retour.
      if (module.id !== lastKnownModuleRef.current) {
        lastKnownModuleRef.current = module.id;
        const last = { id: module.id, at: new Date().toISOString() };
        writeLocalLastModule(last);
        const currentUser = useAppStore.getState().user;
        if (currentUser?.id) queuePreferencesPatch(currentUser.id, { lastModule: last });
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

