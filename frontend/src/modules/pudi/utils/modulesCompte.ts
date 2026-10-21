// Other 1sakely.org modules the account can open from the PUDi logo (switcher mode of the
// bottom bar). Rewrite of the host rules (resolveAccessibleModules, orderModules), never
// imported: PUDi loads nothing from the host. Display only, never a security boundary.

export type IdModule = 'bazarkely' | 'construction' | 'gestion-eau' | 'navy-ay';

export interface ModuleHote {
  id: IdModule;
  nom: string;
  /** Full page navigation target. */
  adresse: string;
}

/** Host modules in the host default order (PUDi itself is excluded: it is the current page). */
export const MODULES_HOTE: readonly ModuleHote[] = [
  { id: 'bazarkely', nom: 'BazarKELY', adresse: '/dashboard' },
  { id: 'construction', nom: 'Construction POC', adresse: '/construction/dashboard' },
  { id: 'gestion-eau', nom: 'Gestion Eau', adresse: '/gestion-eau' },
  { id: 'navy-ay', nom: 'NAVY ay', adresse: '/navy' }
];

/** Columns of the account's own `users` row needed by the rules. */
export interface CompteModules {
  role?: string | null;
  preferences?: { modules?: unknown; moduleOrder?: unknown } | null;
}

/**
 * Modules of the account, in its order (`preferences.moduleOrder`, new modules at the end).
 * Returns null when the row is unknown (signed out, network, timeout): never a refusal.
 * Same rules as the host: admin → all four; NAVY ay always; BazarKELY, Gestion Eau and
 * Construction when present in `preferences.modules` (a missing list counts as empty, like the host).
 */
export function modulesDuCompte(compte: CompteModules | null | undefined): ModuleHote[] | null {
  if (!compte) return null;
  const liste = Array.isArray(compte.preferences?.modules) ? (compte.preferences!.modules as unknown[]) : [];
  const ouverts = new Set<IdModule>(['navy-ay']);
  if (compte.role === 'admin') MODULES_HOTE.forEach((m) => ouverts.add(m.id));
  else for (const id of ['bazarkely', 'gestion-eau', 'construction'] as const) if (liste.includes(id)) ouverts.add(id);
  const accessibles = MODULES_HOTE.filter((m) => ouverts.has(m.id));
  const ordre = Array.isArray(compte.preferences?.moduleOrder) ? (compte.preferences!.moduleOrder as unknown[]) : [];
  if (!ordre.length) return accessibles;
  const ranges: ModuleHote[] = [];
  for (const id of ordre) {
    const m = accessibles.find((x) => x.id === id);
    if (m && !ranges.includes(m)) ranges.push(m);
  }
  return [...ranges, ...accessibles.filter((m) => !ranges.includes(m))];
}
