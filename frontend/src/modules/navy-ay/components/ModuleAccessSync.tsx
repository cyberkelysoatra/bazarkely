/**
 * Invisible component (mounted once in AppLayout, below the Eau / Construction
 * providers) that keeps `users.preferences.modules` in step with reality:
 * - resolves the account module list in the background when the local copy has none;
 * - adds 'gestion-eau' / 'construction' once their EXISTING access logic confirms it,
 *   removes them only on a CONFIRMED refusal (never on an unresolved state);
 * - replays pending preference changes when the network comes back.
 *
 * SECURITY NOTE: display-only list. Eau / Construction data access stays enforced by
 * their existing server rules.
 */
import { useEffect } from 'react';
import { useAppStore } from '../../../stores/appStore';
import useOnlineStatus from '../../../hooks/useOnlineStatus';
import {
  flushPreferences,
  installModulePrefsSyncListeners,
  queuePreferencesPatch,
  resolveModulesIfNeeded,
} from '../services/modulePrefsSync';
import {
  useConstructionAccessConfirmation,
  useEauAccessConfirmation,
  useModuleAccess,
} from '../context/useModuleAccess';
import { MODULE_IDS } from '../utils/moduleAccess';

export default function ModuleAccessSync() {
  const userId = useAppStore((s) => s.user?.id);
  const isOnline = useOnlineStatus();
  const { resolved, preferences } = useModuleAccess();
  const eau = useEauAccessConfirmation();
  const construction = useConstructionAccessConfirmation();
  const storedModules: string[] | null = Array.isArray(preferences.modules) ? preferences.modules : null;

  useEffect(() => {
    installModulePrefsSyncListeners();
  }, []);

  // Pending changes → account, whenever we are (back) online.
  useEffect(() => {
    if (isOnline) void flushPreferences();
  }, [isOnline, userId]);

  // Local copy without a module list → read the server copy (background, withTimeout).
  useEffect(() => {
    if (userId && !resolved && isOnline) void resolveModulesIfNeeded(userId);
  }, [userId, resolved, isOnline]);

  // Eau: add on confirmed access, remove on confirmed refusal only.
  useEffect(() => {
    if (!userId || eau === null) return;
    const has = !!storedModules?.includes(MODULE_IDS.GESTION_EAU);
    if (eau && !has) queuePreferencesPatch(userId, { addModules: [MODULE_IDS.GESTION_EAU] });
    else if (!eau && has) queuePreferencesPatch(userId, { removeModules: [MODULE_IDS.GESTION_EAU] });
  }, [userId, eau, storedModules]);

  // Construction: same rule, from hasConstructionAccess.
  useEffect(() => {
    if (!userId || construction === null) return;
    const has = !!storedModules?.includes(MODULE_IDS.CONSTRUCTION);
    if (construction && !has) queuePreferencesPatch(userId, { addModules: [MODULE_IDS.CONSTRUCTION] });
    else if (!construction && has) queuePreferencesPatch(userId, { removeModules: [MODULE_IDS.CONSTRUCTION] });
  }, [userId, construction, storedModules]);

  return null;
}
