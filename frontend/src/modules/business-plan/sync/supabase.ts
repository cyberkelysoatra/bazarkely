// Supabase for "Mon business plan" (NEC-CC-02), always loaded on demand (dynamic import): a plan
// that never joined the training makes no request at all.
// - participant: anon key, no session kept (participants have no account)
// - trainer: the session shared with 1sakely.org (default storage key), exactly like Validation
import type { SupabaseClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';
/** Default supabase-js storage key for this project (sb-<ref>-auth-token), shared with the host. */
export const SESSION_STORAGE_KEY = 'sb-ofzmwrzatcztoekrpvkj-auth-token';

export const DELAI_RESEAU_MS = 8000;

let participant: Promise<SupabaseClient> | null = null;
let formateur: Promise<SupabaseClient> | null = null;

export function clientParticipant(): Promise<SupabaseClient> {
  if (!participant) {
    participant = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          // Own storage key: never reads nor writes the shared session of the host.
          auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'nec-plan-participant' }
        })
      )
      .catch((e) => {
        participant = null;
        throw e;
      });
  }
  return participant;
}

export function clientFormateur(): Promise<SupabaseClient> {
  if (!formateur) {
    formateur = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
        })
      )
      .catch((e) => {
        formateur = null;
        throw e;
      });
  }
  return formateur;
}

/** Rejects with Error('timeout') after `ms`. */
export function withTimeout<T>(promise: PromiseLike<T>, ms = DELAI_RESEAU_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    Promise.resolve(promise).then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Signed-in account of the shared session, read from localStorage only (no network). */
export function emailSession(): string {
  try {
    const brut = localStorage.getItem(SESSION_STORAGE_KEY);
    const s = brut ? (JSON.parse(brut) as { access_token?: string; user?: { email?: string } }) : null;
    return s?.access_token ? (s.user?.email ?? '') : '';
  } catch {
    return '';
  }
}

/** Shows the discreet trainer link only; the server decides (bp_admin_* raise NON_AUTORISE otherwise). */
export const EMAIL_FORMATEUR = 'joelsoatra@gmail.com';
