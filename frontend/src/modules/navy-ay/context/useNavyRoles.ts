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
import { useParcels } from '../services/parcelService';
import { parcelAlerts } from '../utils/parcelRules';

export interface NavyRoles {
  held: NavyRole[];
  activeRole: NavyRole;
  setActiveRole: (role: NavyRole) => void;
  navItems: NavyNavItem[];
  hasBothRequests: boolean;
  pendingCount: number | null;
  /** Bottom-bar badges by path (phase 2A: parcels to act on). */
  badges: Record<string, number>;
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

  const parcels = useParcels();
  const badges = useMemo(() => {
    const b: Record<string, number> = {};
    if (ownProfile && profile.pendingCount) b['/navy/operatrice/demandes'] = profile.pendingCount;
    if (parcels.userId !== userId) return b;
    const rows = parcels.rows;
    if (activeRole === 'operatrice') {
      b['/navy/operatrice/paiements'] = rows.filter((p) => p.payment_status === 'a_verifier' && p.status !== 'annule').length;
      b['/navy/operatrice/colis'] = rows.filter((p) => parcelAlerts(p).some((a) => a !== 'Paiement à vérifier')).length;
    } else if (activeRole === 'epicier') {
      const shop = partners.find((p) => p.kind === 'epicier' && p.status === 'approved')?.id;
      b['/navy/epicier/colis'] = shop
        ? rows.filter(
            (p) =>
              (p.depot_partner_id === shop && (p.status === 'commande' || (p.status === 'chauffeur_trouve' && !p.handover_grocer_at))) ||
              (p.arrival_partner_id === shop && (p.status === 'pris_en_charge' || p.status === 'arrive'))
          ).length
        : 0;
    } else if (activeRole === 'chauffeur') {
      b['/navy/offres'] = parcels.liveOffers;
      b['/navy/courses'] = rows.filter((p) => p.driver_user_id === userId && (p.status === 'chauffeur_trouve' || p.status === 'pris_en_charge')).length;
    } else {
      b['/navy/recevoir'] = rows.filter((p) => p.recipient_user_id === userId && !['retire', 'annule'].includes(p.status)).length;
    }
    return b;
  }, [ownProfile, profile.pendingCount, parcels, userId, activeRole, partners]);

  return {
    badges,
    held,
    activeRole,
    setActiveRole,
    navItems: navItemsForRole(activeRole, hasBothRequests),
    hasBothRequests,
    pendingCount: ownProfile ? profile.pendingCount : null,
  };
}
