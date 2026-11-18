// Calls of the server functions rt_* (SUPABASE-SQL.md section 3). One shape for the app and the tests:
// `rpc(fonction, arguments nommés)`. A business refusal raised by the server (exception RT_...) becomes
// ErreurServeur(code); a network failure or a timeout becomes ErreurReseau (replayed later). Tables are
// never read directly (RLS forced, no grant).
import { avecDelai, DELAI_APPEL_MS, ErreurReseau, getSupabase } from './client'

export type Rpc = (fonction: string, args: Record<string, unknown>) => Promise<unknown>

/** Refusal raised by the server (RT_INCONNU, RT_ID_PRIS...): replaying the same call gives the same answer. */
export class ErreurServeur extends Error {
  readonly code: string
  constructor(code: string) {
    super(code)
    this.name = 'ErreurServeur'
    this.code = code
  }
}

/** Business code of an error message ('RT_ID_PRIS'...), or null. */
export function codeRt(message: string | undefined | null): string | null {
  const m = /\bRT_[A-Z_]+\b/.exec(message ?? '')
  return m ? m[0] : null
}

/** Turns any error of a call into ErreurServeur (RT_ code) or ErreurReseau (everything else). */
export function classerErreur(e: unknown): ErreurServeur | ErreurReseau {
  if (e instanceof ErreurServeur || e instanceof ErreurReseau) return e
  const message = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  const code = codeRt(message)
  if (code && code !== 'RT_NON_CONNECTE') return new ErreurServeur(code)
  return new ErreurReseau(message || 'reseau')
}

/** The app's adapter: supabase-js `rpc`, every call under a 10 s timeout. */
export function rpcSupabase(delai = DELAI_APPEL_MS): Rpc {
  return async (fonction, args) => {
    try {
      const sb = await avecDelai(getSupabase(), delai)
      const { data, error } = await avecDelai(sb.rpc(fonction, args), delai)
      if (error) throw classerErreur(error)
      return data
    } catch (e) {
      throw classerErreur(e)
    }
  }
}
