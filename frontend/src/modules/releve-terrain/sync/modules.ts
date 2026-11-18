// Other 1sakely.org modules of the signed-in account, for the header logo (RELEVE-CC-09, H23), on the model
// of Validation (appels/modules.ts, utils/modulesCompte.ts). Read from the account's own `users` row (role,
// preferences), read only, with the module's Supabase client: the one exception to « rt_* only », as in
// Validation and PUDi. The last known list is kept on the phone (localStorage), so an offline start uses
// it; refreshed quietly at each online start. Display only, never a security boundary.
import { useSyncExternalStore } from 'react'
import { avecDelai, getSupabase } from './client'

export type IdModule = 'bazarkely' | 'construction' | 'gestion-eau' | 'navy-ay' | 'pudi' | 'validation'

export interface ModuleHote {
  id: IdModule
  nom: string
  /** Full page navigation target. */
  adresse: string
}

/** Host modules in the host default order (ALL_MODULE_IDS), Relevé terrain and Business plan left out. */
export const MODULES_HOTE: readonly ModuleHote[] = [
  { id: 'bazarkely', nom: 'BazarKELY', adresse: '/dashboard' },
  { id: 'construction', nom: 'Construction POC', adresse: '/construction/dashboard' },
  { id: 'gestion-eau', nom: 'Gestion Eau', adresse: '/gestion-eau' },
  { id: 'navy-ay', nom: 'NAVY ay', adresse: '/navy' },
  { id: 'pudi', nom: 'PUDi', adresse: '/pudi/' },
  { id: 'validation', nom: 'Validation', adresse: '/validation/' },
]

/** PUDi is shown to every signed-in account until this date (host PUDI_VISIBLE_UNTIL). */
export const PUDI_VISIBLE_JUSQUA = '2027-01-28T00:00:00+03:00'

/** Light-entry modules (host LIGHT_ENTRY_MODULE_IDS, D27). */
const LEGERS = ['validation', 'releve']

export interface CompteModules {
  role?: string | null
  preferences?: { modules?: unknown; moduleOrder?: unknown } | null
}

/**
 * Modules of the account except Relevé terrain, in its order (`preferences.moduleOrder`, new ones at the
 * end); null when the row is unknown. Same rules as the host: admin → every module; a list made only of
 * light-entry modules → only those (D27: neither NAVY ay nor PUDi); otherwise NAVY ay always, BazarKELY,
 * Gestion Eau, Construction and Validation when in `preferences.modules`, PUDi until 28/01/2027.
 */
export function modulesDuCompte(compte: CompteModules | null | undefined, maintenant: Date = new Date()): ModuleHote[] | null {
  if (!compte) return null
  const liste = Array.isArray(compte.preferences?.modules) ? (compte.preferences!.modules as unknown[]) : []
  const pudi = maintenant.getTime() < Date.parse(PUDI_VISIBLE_JUSQUA)
  const ouverts = new Set<IdModule>()
  if (compte.role === 'admin') MODULES_HOTE.forEach((m) => ouverts.add(m.id))
  else if (liste.length > 0 && liste.every((id) => LEGERS.includes(id as string))) {
    if (liste.includes('validation')) ouverts.add('validation')
  } else {
    ouverts.add('navy-ay')
    for (const id of ['bazarkely', 'gestion-eau', 'construction', 'validation'] as const) if (liste.includes(id)) ouverts.add(id)
    ouverts.add('pudi')
  }
  if (!pudi) ouverts.delete('pudi')
  const accessibles = MODULES_HOTE.filter((m) => ouverts.has(m.id))
  const ordre = Array.isArray(compte.preferences?.moduleOrder) ? (compte.preferences!.moduleOrder as unknown[]) : []
  const ranges: ModuleHote[] = []
  for (const id of ordre) {
    const m = accessibles.find((x) => x.id === id)
    if (m && !ranges.includes(m)) ranges.push(m)
  }
  return [...ranges, ...accessibles.filter((m) => !ranges.includes(m))]
}

/** Modules from the ids kept on the phone (unknown ids dropped, PUDi after its date dropped). */
export function modulesDesIds(ids: unknown, maintenant: Date = new Date()): ModuleHote[] | null {
  if (!Array.isArray(ids)) return null
  const pudi = maintenant.getTime() < Date.parse(PUDI_VISIBLE_JUSQUA)
  const out: ModuleHote[] = []
  for (const id of ids) {
    const m = MODULES_HOTE.find((x) => x.id === id)
    if (m && !out.includes(m) && (m.id !== 'pudi' || pudi)) out.push(m)
  }
  return out
}

const CLE = 'releve_modules_compte'
let courant: { uid: string; modules: ModuleHote[] | null } = { uid: '', modules: null }
const abonnes = new Set<() => void>()

function poser(uid: string, modules: ModuleHote[] | null): void {
  courant = { uid, modules }
  abonnes.forEach((f) => f())
}

function lireGarde(): { uid: string; ids: string[] } | null {
  try {
    const v = JSON.parse(localStorage.getItem(CLE) ?? 'null') as { uid?: unknown; ids?: unknown } | null
    return v && typeof v.uid === 'string' && Array.isArray(v.ids) ? { uid: v.uid, ids: v.ids as string[] } : null
  } catch {
    return null
  }
}

/** Quiet refresh from the server; keeps the known list when the server does not answer. */
export async function rafraichirModules(uid: string = courant.uid): Promise<void> {
  if (!uid || (typeof navigator !== 'undefined' && navigator.onLine === false)) return
  try {
    const sb = await avecDelai(getSupabase(), 5000)
    const { data, error } = await avecDelai(sb.from('users').select('role, preferences').eq('id', uid).maybeSingle(), 5000)
    if (error || !data || courant.uid !== uid) return
    const modules = modulesDuCompte(data as CompteModules)
    if (!modules) return
    poser(uid, modules)
    try {
      localStorage.setItem(CLE, JSON.stringify({ uid, ids: modules.map((m) => m.id) }))
    } catch {
      // Private window: the list is read again at the next start.
    }
  } catch {
    // No answer: the known list stays.
  }
}

/** Start or sign-in: the list kept on the phone first, then the server. */
export async function demarrerModules(uid: string): Promise<void> {
  if (uid === courant.uid) return
  poser(uid, null)
  if (!uid) return
  const garde = lireGarde()
  if (garde?.uid === uid) poser(uid, modulesDesIds(garde.ids))
  await rafraichirModules(uid)
}

/** Known list of the signed-in account (null while unknown). */
export function useModulesCompte(uid: string | null | undefined): ModuleHote[] | null {
  const etat = useSyncExternalStore(
    (f) => {
      abonnes.add(f)
      return () => abonnes.delete(f)
    },
    () => courant,
    () => courant,
  )
  return uid && etat.uid === uid ? etat.modules : null
}
