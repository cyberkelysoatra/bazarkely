/**
 * Récupération de l'utilisateur courant en mode offline-first.
 * Ordre (cf. CLAUDE.md — JAMAIS getUser() qui fait du réseau) :
 *   1. store Zustand (sync, instantané)
 *   2. supabase.auth.getSession() (lecture localStorage, pas de réseau)
 *   3. null
 */
import { useAppStore } from '../../../stores/appStore';
import { supabase } from '../../../lib/supabase';
import type { Session } from '@supabase/supabase-js';

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

/**
 * Lecture de la session Supabase (localStorage, JAMAIS de réseau — cf. CLAUDE.md :
 * getSession() = lecture locale fiable ; getUser() = fetch HTTP interdit offline-first).
 * Renvoie null si aucune session n'est stockée.
 */
export async function getEauSession(): Promise<Session | null> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Attend qu'une session Supabase soit lisible — absorbe la COURSE AU BOOT (au tout
 * premier chargement, le client Supabase et le store Zustand persisté ne sont pas
 * encore réhydratés ; getSession() peut transitoirement renvoyer null bien qu'un
 * jeton valide existe en localStorage). Réessaie quelques fois (lecture locale, donc
 * quasi-instantanée) avant de conclure « pas de session ».
 *
 * NE force JAMAIS de réseau et ne rafraîchit rien : autoRefreshToken (lib/supabase)
 * s'en charge silencieusement. Sert uniquement à ne pas refuser l'accès au module à
 * un utilisateur réellement connecté pendant la fenêtre de boot.
 */
export async function waitForEauSession(maxAttempts = 6, delayMs = 350): Promise<Session | null> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const session = await getEauSession();
    if (session?.user?.id) return session;
    if (attempt < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return null;
}
