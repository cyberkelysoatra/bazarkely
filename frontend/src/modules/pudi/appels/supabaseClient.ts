// Lazy Supabase client of PUDi. @supabase/supabase-js is loaded by dynamic import only, so the
// home and discovery pages never download it. Same project, same anon key and DEFAULT storage
// key as the host: the Google session is shared with the rest of 1sakely.org.
// Inside the NAVY ay app the storage is the one shared with the app (appels/pontNavy.ts).
import type { SupabaseClient } from '@supabase/supabase-js';
import { stockageNavy } from './pontNavy';

export const SUPABASE_URL = 'https://ofzmwrzatcztoekrpvkj.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mem13cnphdGN6dG9la3JwdmtqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNjAxMTUsImV4cCI6MjA3NDczNjExNX0.hYDpbvzwNZWmDgXPSGEgoKLR-m51TQZmaWw1whQ90Cw';
/** Default supabase-js storage key for this project (sb-<ref>-auth-token). */
export const SESSION_STORAGE_KEY = 'sb-ofzmwrzatcztoekrpvkj-auth-token';

export const DELAI_RESEAU_MS = 8000;

let clientPromise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storage: stockageNavy() }
        })
      )
      .catch((e) => {
        clientPromise = null;
        throw e;
      });
  }
  return clientPromise;
}

/** Rejects with Error('timeout') after `ms`. A timeout is not a failure: the server upsert converges. */
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
