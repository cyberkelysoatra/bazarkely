// Other 1sakely.org modules the account can open from the header logo (VALIDCLIENT-CC-11, VC-45).
// Copy of src/modules/pudi/utils/modulesCompte.ts, adapted: Validation itself is excluded (it is the
// current page) and PUDi is added. Never imported from the host nor from PUDi. Display only, never a
// security boundary.

export type IdModule = 'bazarkely' | 'construction' | 'gestion-eau' | 'navy-ay' | 'pudi';

export interface ModuleHote {
  id: IdModule;
  nom: string;
  /** Full page navigation target. */
  adresse: string;
}

/** Host modules in the host default order (ALL_MODULE_IDS of the host, Validation left out). */
export const MODULES_HOTE: readonly ModuleHote[] = [
  { id: 'bazarkely', nom: 'BazarKELY', adresse: '/dashboard' },
  { id: 'construction', nom: 'Construction POC', adresse: '/construction/dashboard' },
  { id: 'gestion-eau', nom: 'Gestion Eau', adresse: '/gestion-eau' },
  { id: 'navy-ay', nom: 'NAVY ay', adresse: '/navy' },
  { id: 'pudi', nom: 'PUDi', adresse: '/pudi' }
];

/** PUDi is shown to every signed-in account until this date (host PUDI_VISIBLE_UNTIL). */
export const PUDI_VISIBLE_JUSQUA = '2027-01-28T00:00:00+03:00';

/** Columns of the account's own `users` row needed by the rules. */
export interface CompteModules {
  role?: string | null;
  preferences?: { modules?: unknown; moduleOrder?: unknown } | null;
}

/**
 * Modules of the account except Validation, in its order (`preferences.moduleOrder`, new modules
 * at the end). Returns null when the row is unknown (network, timeout): never a refusal.
 * Same rules as the host: admin → BazarKELY, Construction, Gestion Eau, NAVY ay and PUDi; otherwise
 * NAVY ay always, BazarKELY, Gestion Eau and Construction when in `preferences.modules`, PUDi until
 * 28/01/2027; a list that is exactly ['validation'] gives an empty list (no NAVY ay, no PUDi).
 */
export function modulesDuCompte(compte: CompteModules | null | undefined, maintenant: Date = new Date()): ModuleHote[] | null {
  if (!compte) return null;
  const liste = Array.isArray(compte.preferences?.modules) ? (compte.preferences!.modules as unknown[]) : [];
  const pudi = maintenant.getTime() < Date.parse(PUDI_VISIBLE_JUSQUA);
  const ouverts = new Set<IdModule>();
  if (compte.role === 'admin') MODULES_HOTE.forEach((m) => ouverts.add(m.id));
  else if (!(liste.length === 1 && liste[0] === 'validation')) {
    ouverts.add('navy-ay');
    for (const id of ['bazarkely', 'gestion-eau', 'construction'] as const) if (liste.includes(id)) ouverts.add(id);
    ouverts.add('pudi');
  }
  if (!pudi) ouverts.delete('pudi');
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

/** Modules from the ids kept on the phone (unknown ids dropped, PUDi after its date dropped). */
export function modulesDesIds(ids: unknown, maintenant: Date = new Date()): ModuleHote[] | null {
  if (!Array.isArray(ids)) return null;
  const pudi = maintenant.getTime() < Date.parse(PUDI_VISIBLE_JUSQUA);
  const out: ModuleHote[] = [];
  for (const id of ids) {
    const m = MODULES_HOTE.find((x) => x.id === id);
    if (m && !out.includes(m) && (m.id !== 'pudi' || pudi)) out.push(m);
  }
  return out;
}
