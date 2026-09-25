/**
 * NAVY ay roles as seen by the UI (phase 1A): roles held by the account, the active
 * "Je suis" role (remembered in users.preferences.navyRole through the same idempotent
 * patch queue as lastModule — never overwrites other keys) and the bottom-bar items.
 *
 * SECURITY NOTE: display only. Data access is enforced by RLS and the navy_* RPCs.
 */
import { useCallback, useMemo } from 'react';
import { useAppStore } from '../../../stores/appStore';
import { effectivePreferences, queuePreferencesPatch, useModulePrefsState } from '../services/modulePrefsSync';
import { useNavyProfile } from '../services/navyProfileStore';
import type { NavyRole } from '../types/partner';
import { navItemsForRole, pickActiveRole, resolveNavyRoles, type NavyNavItem } from '../utils/partnerRules';

export interface NavyRoles {
  held: NavyRole[];
  activeRole: NavyRole;
  setActiveRole: (role: NavyRole) => void;
  navItems: NavyNavItem[];
  hasBothRequests: boolean;
  pendingCount: number | null;
}

export function useNavyRoles(): NavyRoles {
  const user = useAppStore((s) => s.user);
  const sync = useModulePrefsState();
  const profile = useNavyProfile();
  const ownProfile = profile.userId === user?.id;

  const prefs = effectivePreferences(user as any, sync.pending);
  const remembered: string | null = prefs?.navyRole?.id ?? null;

  const partners = ownProfile ? profile.partners : [];
  const drafts = ownProfile ? profile.drafts : [];
  const held = useMemo(
    () => resolveNavyRoles(partners, ownProfile && profile.isOperator === true),
    [partners, ownProfile, profile.isOperator]
  );
  const activeRole = pickActiveRole(held, remembered);

  const kindsStarted = new Set<string>([
    ...partners.map((p) => p.kind),
    ...drafts.filter((d) => d.state === 'queued').map((d) => d.kind),
  ]);
  const hasBothRequests = kindsStarted.has('epicier') && kindsStarted.has('chauffeur');

  const userId = user?.id;
  const setActiveRole = useCallback(
    (role: NavyRole) => {
      if (!userId) return;
      queuePreferencesPatch(userId, { navyRole: { id: role, at: new Date().toISOString() } });
    },
    [userId]
  );

  return {
    held,
    activeRole,
    setActiveRole,
    navItems: navItemsForRole(activeRole, hasBothRequests),
    hasBothRequests,
    pendingCount: ownProfile ? profile.pendingCount : null,
  };
}
