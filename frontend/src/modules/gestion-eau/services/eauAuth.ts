/**
 * Récupération de l'utilisateur courant en mode offline-first.
 * Ordre (cf. CLAUDE.md — JAMAIS getUser() qui fait du réseau) :
 *   1. store Zustand (sync, instantané)
 *   2. supabase.auth.getSession() (lecture localStorage, pas de réseau)
 *   3. null
 */
import { useAppStore } from '../../../stores/appStore';
import { supabase } from '../../../lib/supabase';

export async function getCurrentUserIdSafe(): Promise<string | null> {
  const storeUser = useAppStore.getState().user;
  if (storeUser?.id) return storeUser.id;
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user?.id) return data.session.user.id;
  } catch {
    /* ignore */
  }
  return null;
}

/** Version synchrone (store uniquement) — suffisante dans la plupart des chemins UI. */
export function getCurrentUserIdSync(): string | null {
  return useAppStore.getState().user?.id ?? null;
}
