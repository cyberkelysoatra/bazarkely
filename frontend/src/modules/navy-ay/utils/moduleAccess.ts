/**
 * Module access rules (v3.80.0) — pure functions, no side effects, no imports
 * of React contexts (avoids circular-import TDZ issues: this file is imported by
 * ModuleSwitcherContext).
 *
 * SECURITY NOTE: `preferences.modules` only drives what the module switcher shows
 * and the UI guards of the budget module and NAVY ay. It is NOT a security
 * boundary. Real access to Eau and Construction data stays enforced by their
 * existing server-side rules (RLS policies / role tables), which are unchanged.
 */

export const MODULE_IDS = {
  BAZARKELY: 'bazarkely',
  CONSTRUCTION: 'construction',
  GESTION_EAU: 'gestion-eau',
  NAVY_AY: 'navy-ay',
} as const;

/** Canonical module order (same order as DEFAULT_MODULES). */
export const ALL_MODULE_IDS: string[] = [
  MODULE_IDS.BAZARKELY,
  MODULE_IDS.CONSTRUCTION,
  MODULE_IDS.GESTION_EAU,
  MODULE_IDS.NAVY_AY,
];

/** Last used module, stored locally and on the account (`preferences.lastModule`). */
export interface LastModule {
  id: string;
  /** ISO timestamp */
  at: string;
}

/** Minimal user shape needed by the access rules. */
export interface AccessUser {
  role?: string | null;
  preferences?: Record<string, any> | null;
}

/** True when the account's module list is known (an array), false when unresolved. */
export function hasResolvedModules(prefs: Record<string, any> | null | undefined): boolean {
  return Array.isArray(prefs?.modules);
}

/**
 * Modules the account can see in the switcher and enter.
 *
 * @param eauConfirmed        true = Eau access confirmed by the existing Eau logic,
 *                            false = refusal confirmed, null = unknown (use stored value)
 * @param constructionAccess  same semantics for Construction (`hasConstructionAccess`)
 */
export function resolveAccessibleModules(
  user: AccessUser | null | undefined,
  eauConfirmed: boolean | null,
  constructionAccess: boolean | null
): string[] {
  if (!user) return [];
  if (user.role === 'admin') return [...ALL_MODULE_IDS];

  const stored: string[] = Array.isArray(user.preferences?.modules) ? user.preferences!.modules : [];
  const out = new Set<string>([MODULE_IDS.NAVY_AY]);

  if (stored.includes(MODULE_IDS.BAZARKELY)) out.add(MODULE_IDS.BAZARKELY);

  const eau = eauConfirmed === null ? stored.includes(MODULE_IDS.GESTION_EAU) : eauConfirmed;
  if (eau) out.add(MODULE_IDS.GESTION_EAU);

  const construction =
    constructionAccess === null ? stored.includes(MODULE_IDS.CONSTRUCTION) : constructionAccess;
  if (construction) out.add(MODULE_IDS.CONSTRUCTION);

  return ALL_MODULE_IDS.filter((id) => out.has(id));
}

function timeOf(m: LastModule | null | undefined): number {
  if (!m?.at) return -Infinity;
  const t = Date.parse(m.at);
  return Number.isFinite(t) ? t : -Infinity;
}

/** Most recent of two LastModule values (ties → `a`). */
export function mostRecent(
  a: LastModule | null | undefined,
  b: LastModule | null | undefined
): LastModule | null {
  if (!a?.id) return b?.id ? b : null;
  if (!b?.id) return a;
  return timeOf(b) > timeOf(a) ? b : a;
}

/**
 * Start module when the app opens on a neutral address ('/' or '/dashboard'):
 * the most recent of local / account among ACCESSIBLE modules, else 'bazarkely'
 * when accessible, else 'navy-ay'.
 */
export function pickStartModule(
  local: LastModule | null | undefined,
  account: LastModule | null | undefined,
  accessible: string[]
): string {
  const candidates = [local, account].filter(
    (m): m is LastModule => !!m?.id && accessible.includes(m.id)
  );
  const best = candidates.reduce<LastModule | null>((acc, m) => mostRecent(acc, m), null);
  if (best) return best.id;
  if (accessible.includes(MODULE_IDS.BAZARKELY)) return MODULE_IDS.BAZARKELY;
  return MODULE_IDS.NAVY_AY;
}

/** Pending change to `users.preferences` (idempotent operations only). */
export interface PreferencesPatch {
  /** Initial module list for an account confirmed by the server to have none. */
  initModules?: string[];
  addModules?: string[];
  removeModules?: string[];
  lastModule?: LastModule;
  /** NAVY ay "Je suis" role (phase 1A), same most-recent-wins semantics as lastModule. */
  navyRole?: LastModule;
}

/** Combine two patches (b is newer). Adding then removing the same id → removed, and vice versa. */
export function combinePatches(
  a: PreferencesPatch | null | undefined,
  b: PreferencesPatch | null | undefined
): PreferencesPatch {
  const add = new Set(a?.addModules ?? []);
  const remove = new Set(a?.removeModules ?? []);
  for (const id of b?.addModules ?? []) {
    add.add(id);
    remove.delete(id);
  }
  for (const id of b?.removeModules ?? []) {
    remove.add(id);
    add.delete(id);
  }
  const out: PreferencesPatch = {};
  const init = b?.initModules ?? a?.initModules;
  if (init) out.initModules = [...init];
  if (add.size) out.addModules = [...add];
  if (remove.size) out.removeModules = [...remove];
  const last = mostRecent(a?.lastModule, b?.lastModule);
  if (last) out.lastModule = last;
  const role = mostRecent(a?.navyRole, b?.navyRole);
  if (role) out.navyRole = role;
  return out;
}

export function isEmptyPatch(p: PreferencesPatch | null | undefined): boolean {
  return (
    !p ||
    (!p.initModules?.length &&
      !p.addModules?.length &&
      !p.removeModules?.length &&
      !p.lastModule &&
      !p.navyRole)
  );
}

/**
 * Merge a patch into a preferences object. NEVER drops an existing key
 * (moduleOrder, theme, unknown keys…): only `modules`, `lastModule` and `navyRole` may change.
 *
 * @param authoritative true when `base` is the server copy. On a NON-authoritative
 *   (local) base whose `modules` is unresolved, add/remove are NOT applied: the list
 *   stays unresolved until the server answers (prevents a local cache predating the
 *   access rules from looking like "no budget access").
 */
export function mergePreferences(
  base: Record<string, any> | null | undefined,
  patch: PreferencesPatch | null | undefined,
  authoritative: boolean
): Record<string, any> {
  const out: Record<string, any> = { ...(base ?? {}) };
  if (!patch) return out;

  let modules: string[] | undefined = Array.isArray(out.modules) ? [...out.modules] : undefined;
  if (!modules && patch.initModules && authoritative) modules = [...patch.initModules];
  if (!modules && authoritative && (patch.addModules?.length || patch.removeModules?.length)) {
    modules = [];
  }
  if (modules) {
    for (const id of patch.addModules ?? []) if (!modules.includes(id)) modules.push(id);
    if (patch.removeModules?.length) {
      modules = modules.filter((id) => !patch.removeModules!.includes(id));
    }
    out.modules = modules;
  }

  if (patch.lastModule) {
    const current: LastModule | null =
      out.lastModule && typeof out.lastModule === 'object' ? out.lastModule : null;
    const last = mostRecent(current, patch.lastModule);
    if (last) out.lastModule = { id: last.id, at: last.at };
  }

  if (patch.navyRole) {
    const current: LastModule | null =
      out.navyRole && typeof out.navyRole === 'object' ? out.navyRole : null;
    const role = mostRecent(current, patch.navyRole);
    if (role) out.navyRole = { id: role.id, at: role.at };
  }
  return out;
}
