/**
 * Cache localStorage des groupes familiaux (v3.13.1 S69 + v3.14.1 S70).
 *
 * Source unique partagée entre FamilyContext (qui le lit/écrit au mount + après chaque fetch online)
 * et familyGroupService.getUserFamilyGroups() (qui le lit en SWR + le rafraîchit après chaque fetch online).
 *
 * Permet l'accès au groupe familial actif en offline pour TransactionsPage,
 * TransactionDetailPage et FamilyDashboardPage qui appellent getUserFamilyGroups()
 * directement (sans passer par FamilyContext).
 */

import type { FamilyGroup } from '../types/family';

/**
 * Format des entrées en cache.
 * memberCount et inviteCode sont optionnels car le cache peut être écrit
 * depuis FamilyContext (qui les rend optionnels dans FamilyGroupWithMetadata)
 * ou depuis le service (qui les rend requis).
 */
export type CachedFamilyGroup = FamilyGroup & {
  memberCount?: number;
  inviteCode?: string;
};

export const FAMILY_GROUPS_CACHE_KEY = 'bazarkely_family_groups_cache';

/**
 * Lit le cache des groupes familiaux depuis localStorage.
 * Reconvertit les dates ISO en objets Date.
 * Retourne [] si le cache est absent, vide, ou corrompu.
 */
export function readFamilyGroupsCache(): CachedFamilyGroup[] {
  try {
    const raw = localStorage.getItem(FAMILY_GROUPS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<
      Omit<CachedFamilyGroup, 'createdAt' | 'updatedAt'> & {
        createdAt: string;
        updatedAt: string;
      }
    >;
    return parsed.map((g) => ({
      ...g,
      createdAt: new Date(g.createdAt),
      updatedAt: new Date(g.updatedAt),
    }));
  } catch {
    return [];
  }
}

/**
 * Écrit le cache des groupes familiaux dans localStorage.
 * Sérialise les dates en ISO strings.
 * Tolère les échecs (localStorage plein/indisponible).
 */
export function writeFamilyGroupsCache(groups: CachedFamilyGroup[]): void {
  try {
    const serializable = groups.map((g) => ({
      ...g,
      createdAt: g.createdAt instanceof Date ? g.createdAt.toISOString() : g.createdAt,
      updatedAt: g.updatedAt instanceof Date ? g.updatedAt.toISOString() : g.updatedAt,
    }));
    localStorage.setItem(FAMILY_GROUPS_CACHE_KEY, JSON.stringify(serializable));
  } catch {
    /* localStorage plein ou indisponible — on tolère */
  }
}

/**
 * Supprime le cache. À n'utiliser qu'en cas de déconnexion (SIGNED_OUT).
 * En cas d'échec réseau, on PRÉSERVE le cache (ne pas appeler cette fonction).
 */
export function clearFamilyGroupsCache(): void {
  try {
    localStorage.removeItem(FAMILY_GROUPS_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
