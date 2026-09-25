/**
 * Module access as seen by the UI (switcher, budget / NAVY guards, start module).
 *
 * SECURITY NOTE: UI-only. Eau / Construction data stay protected by their existing
 * server-side rules; this hook never grants access to any data.
 */
import { useContext, useMemo } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { GestionEauContext } from '../../gestion-eau/context';
import { ConstructionContext } from '../../construction-poc/context/ConstructionContext';
import { effectivePreferences, useModulePrefsState, type ResolveStatus } from '../services/modulePrefsSync';
import { hasResolvedModules, resolveAccessibleModules } from '../utils/moduleAccess';

/**
 * Eau access as decided by the EXISTING Eau logic (same rule as GestionEauRoute):
 * true / false only once confirmed, null while unknown.
 */
export function useEauAccessConfirmation(): boolean | null {
  const eau = useContext(GestionEauContext);
  if (!eau) return null;
  if (eau.isLoading || eau.sessionStatus !== 'valid') return null;
  if (eau.hasEauAccess) return true;
  return eau.rolesConfirmed ? false : null;
}

/** Construction access (`hasConstructionAccess`), null while loading or on error. */
export function useConstructionAccessConfirmation(): boolean | null {
  const construction = useContext(ConstructionContext);
  if (!construction) return null;
  if (construction.isLoading || construction.error) return null;
  return construction.hasConstructionAccess;
}

export interface ModuleAccess {
  /** Accessible module ids, canonical order. */
  accessible: string[];
  /** Account module list known (array) — false = not resolved yet. */
  resolved: boolean;
  resolveStatus: ResolveStatus;
  isAdmin: boolean;
  hasBudgetAccess: boolean;
  preferences: Record<string, any>;
}

/**
 * @param live when true, read the live Eau / Construction confirmations (only valid
 *   below their providers); when false, rely on the remembered list only.
 */
export function useModuleAccess(live = true): ModuleAccess {
  const user = useAppStore((s) => s.user);
  const sync = useModulePrefsState();
  const eau = useEauAccessConfirmation();
  const construction = useConstructionAccessConfirmation();
  const eauValue = live ? eau : null;
  const constructionValue = live ? construction : null;

  return useMemo(() => {
    const preferences = effectivePreferences(user as any, sync.pending);
    const accessUser = user ? { role: (user as any).role, preferences } : null;
    const accessible = resolveAccessibleModules(accessUser, eauValue, constructionValue);
    const isAdmin = (user as any)?.role === 'admin';
    return {
      accessible,
      resolved: isAdmin || hasResolvedModules(preferences),
      resolveStatus: sync.resolveUserId === user?.id ? sync.resolveStatus : 'idle',
      isAdmin,
      hasBudgetAccess: accessible.includes('bazarkely'),
      preferences,
    };
  }, [user, sync, eauValue, constructionValue]);
}
