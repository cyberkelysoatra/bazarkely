/**
 * Call to the server function `/api/dictee-depense`. Never throws: every
 * outcome is a status the queue knows how to handle.
 */
import { supabase } from '../../../lib/supabase'
import type { Account, TransactionCategory } from '../../../types'
import type { DicteeResult } from '../types'

export const CATEGORIES_DICTEE: TransactionCategory[] = [
  'alimentation', 'logement', 'transport', 'sante', 'education', 'communication',
  'vetements', 'loisirs', 'famille', 'solidarite', 'autres'
]

/** Client side limit, a little above the server's own (it answers 504 at 25 s). */
const DELAI_CLIENT_MS = 35_000

export type ReponseDictee =
  | { kind: 'ok'; result: DicteeResult }
  | { kind: 'session' } // 401 or no token: wait for the next SIGNED_IN
  | { kind: 'format' } // 415: the AI refuses this audio format
  | { kind: 'erreur'; code: string }

async function versBase64(audio: Blob): Promise<string> {
  const octets = new Uint8Array(await audio.arrayBuffer())
  let binaire = ''
  const TRANCHE = 0x8000
  for (let i = 0; i < octets.length; i += TRANCHE) {
    binaire += String.fromCharCode.apply(null, Array.from(octets.subarray(i, i + TRANCHE)))
  }
  return btoa(binaire)
}

export async function envoyerDictee(params: {
  audio: Blob
  mime: string
  recordedAt: string
  durationMs: number
  comptes: Pick<Account, 'id' | 'name' | 'type'>[]
}): Promise<ReponseDictee> {
  // getSession() reads local storage, no network (offline-safe).
  let jeton: string | undefined
  try {
    const { data } = await supabase.auth.getSession()
    jeton = data?.session?.access_token
  } catch {
    jeton = undefined
  }
  if (!jeton) return { kind: 'session' }

  const controleur = new AbortController()
  const minuterie = setTimeout(() => controleur.abort(), DELAI_CLIENT_MS)
  try {
    const reponse = await fetch('/api/dictee-depense', {
      method: 'POST',
      signal: controleur.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` },
      body: JSON.stringify({
        audio: await versBase64(params.audio),
        mime: params.mime,
        recordedAt: params.recordedAt,
        durationMs: params.durationMs,
        context: {
          accounts: params.comptes.map((c) => ({ id: c.id, name: c.name, type: c.type })),
          categories: CATEGORIES_DICTEE,
          rules: [],
          examples: []
        }
      })
    })
    if (reponse.status === 200) {
      const result = (await reponse.json()) as DicteeResult
      if (!result || !Array.isArray(result.items)) return { kind: 'erreur', code: 'reponse_illisible' }
      return { kind: 'ok', result }
    }
    if (reponse.status === 401) return { kind: 'session' }
    if (reponse.status === 415) return { kind: 'format' }
    let code = `http_${reponse.status}`
    try {
      const corps = await reponse.json()
      if (corps?.error) code = `${reponse.status}_${corps.error}`
    } catch {
      /* not JSON (dev server without functions, edge error page) */
    }
    return { kind: 'erreur', code }
  } catch (erreur: any) {
    return { kind: 'erreur', code: erreur?.name === 'AbortError' ? 'delai_depasse' : 'reseau' }
  } finally {
    clearTimeout(minuterie)
  }
}
