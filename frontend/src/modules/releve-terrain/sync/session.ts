// Session shared with 1sakely.org (F11, H23). Whether the phone is signed in is read from the session
// key in localStorage (no network, works in airplane mode); sign-in and sign-out load the lazy Supabase
// client. Pattern of src/modules/validation/appels/session.ts. The token itself is never read here
// beyond its presence.
import { useSyncExternalStore } from 'react'
import { avecDelai, getSupabase, SESSION_STORAGE_KEY } from './client'

export interface SessionLocale {
  id: string
  email: string
  /** Name given by Google (user_metadata), empty for an e-mail account. */
  nomGoogle: string
}

let cache: SessionLocale | null = null
let brut: string | null | undefined
const abonnes = new Set<() => void>()

function lire(): SessionLocale | null {
  let v: string | null = null
  try {
    v = localStorage.getItem(SESSION_STORAGE_KEY)
  } catch {
    v = null
  }
  if (v === brut) return cache
  brut = v
  try {
    const s = v ? (JSON.parse(v) as { access_token?: string; user?: { id?: string; email?: string; user_metadata?: { full_name?: string; name?: string } } }) : null
    cache = s?.access_token && s.user?.id
      ? { id: s.user.id, email: s.user.email ?? '', nomGoogle: s.user.user_metadata?.full_name ?? s.user.user_metadata?.name ?? '' }
      : null
  } catch {
    cache = null
  }
  return cache
}

export function sessionLocale(): SessionLocale | null {
  return lire()
}

/** Call after a sign-in or sign-out done in this page. */
export function signalerSession(): void {
  abonnes.forEach((f) => f())
}

function abonner(f: () => void): () => void {
  abonnes.add(f)
  const surStockage = (e: StorageEvent) => {
    if (e.key === null || e.key === SESSION_STORAGE_KEY) f()
  }
  window.addEventListener('storage', surStockage)
  return () => {
    abonnes.delete(f)
    window.removeEventListener('storage', surStockage)
  }
}

/** Sign-in or sign-out in this tab or another. Returns the unsubscribe. */
export function ecouterSession(f: () => void): () => void {
  return abonner(f)
}

export function useSession(): SessionLocale | null {
  return useSyncExternalStore(abonner, lire, () => null)
}

/** True while the address carries the answer of a Google or e-mail sign-in. */
export function retourDeConnexion(): boolean {
  if (typeof window === 'undefined') return false
  return /[#&](access_token|error_description)=/.test(window.location.hash) || /[?&]code=/.test(window.location.search)
}

let retourEnCours: Promise<void> | null = null
/** Back from a sign-in: lets supabase-js store the session from the address. Never throws. */
export function lireRetourConnexion(): Promise<void> {
  if (!retourEnCours) {
    retourEnCours = retourDeConnexion()
      ? getSupabase()
          .then((sb) => avecDelai(sb.auth.getSession()))
          .then(() => undefined)
          .catch(() => undefined)
          .finally(signalerSession)
      : Promise.resolve()
  }
  return retourEnCours
}

/** Google sign-in, back to `retour` (a path inside /releve, the page asked before). */
export async function connexionGoogle(retour: string): Promise<void> {
  const sb = await avecDelai(getSupabase())
  const chemin = retour.startsWith('/') && !retour.startsWith('//') ? retour : '/'
  const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/releve${chemin}` } })
  if (error) throw error
}

export async function connexionEmail(email: string, motDePasse: string): Promise<void> {
  const sb = await avecDelai(getSupabase())
  const { error } = await avecDelai(sb.auth.signInWithPassword({ email: email.trim(), password: motDePasse }))
  signalerSession()
  if (error) throw error
}

/** Signs out of the shared session (also signs out of the other 1sakely.org modules). */
export async function deconnexion(): Promise<void> {
  try {
    const sb = await avecDelai(getSupabase())
    await avecDelai(sb.auth.signOut({ scope: 'local' }))
  } catch {
    /* the local copy is removed below anyway */
  } finally {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
    } catch {
      /* no storage */
    }
    signalerSession()
  }
}
