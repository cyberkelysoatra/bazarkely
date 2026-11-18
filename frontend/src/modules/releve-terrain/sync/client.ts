// Lazy Supabase client of "Relevé terrain" (phase 3, RELEVE-CC-08), same pattern as
// src/modules/validation/appels/supabaseClient.ts: @supabase/supabase-js is loaded by dynamic import,
// same project, same anon key and DEFAULT storage key as the host, so the session is shared with the
// rest of 1sakely.org. Nothing is imported from the host app.
import type { SupabaseClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://ofzmwrzatcztoekrpvkj.supabase.co'
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw'
/** Default supabase-js storage key for this project (sb-<ref>-auth-token). */
export const SESSION_STORAGE_KEY = 'sb-ofzmwrzatcztoekrpvkj-auth-token'

/** Every server call is cut after 10 s (a request can hang without failing). */
export const DELAI_APPEL_MS = 10000

/** Network failure or timeout: the call may be replayed later. */
export class ErreurReseau extends Error {
  constructor(message = 'reseau') {
    super(message)
    this.name = 'ErreurReseau'
  }
}

let clientPromise: Promise<SupabaseClient> | null = null

export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
        }),
      )
      .catch((e) => {
        clientPromise = null
        throw e
      })
  }
  return clientPromise
}

/** Rejects with ErreurReseau('timeout') after `ms`. */
export function avecDelai<T>(promise: PromiseLike<T>, ms = DELAI_APPEL_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new ErreurReseau('timeout')), ms)
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer)
        resolve(v)
      },
      (e) => {
        clearTimeout(timer)
        reject(e)
      },
    )
  })
}
