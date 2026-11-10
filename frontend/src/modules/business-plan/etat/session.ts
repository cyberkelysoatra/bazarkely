// Signed-in account of the shared host session (NEC-CC-07), read from localStorage only (no network).
// Read again when the page comes back (visibilitychange visible, pageshow, focus, storage), so that
// signing in on 1sakely.org in the same browser shows up at once, without a reload.
import { useSyncExternalStore } from 'react';
import { EMAIL_FORMATEUR, emailSession } from '../sync/supabase';

const abonnes = new Set<() => void>();

/** Asks every reader to read the stored session again (React skips them when it did not change). */
export function relireSession(): void {
  abonnes.forEach((f) => f());
}

/** Calls `f` each time the page comes back to the foreground. Returns the unsubscribe. */
export function surRetourPage(f: () => void): () => void {
  const visible = () => {
    if (document.visibilityState === 'visible') f();
  };
  document.addEventListener('visibilitychange', visible);
  window.addEventListener('pageshow', f);
  window.addEventListener('focus', f);
  window.addEventListener('storage', f);
  return () => {
    document.removeEventListener('visibilitychange', visible);
    window.removeEventListener('pageshow', f);
    window.removeEventListener('focus', f);
    window.removeEventListener('storage', f);
  };
}

let arret: (() => void) | null = null;

function abonner(f: () => void): () => void {
  abonnes.add(f);
  if (!arret) arret = surRetourPage(relireSession);
  return () => {
    abonnes.delete(f);
    if (!abonnes.size && arret) {
      arret();
      arret = null;
    }
  };
}

/** E-mail of the stored host session, '' when none. */
export function useEmailSession(): string {
  return useSyncExternalStore(
    abonner,
    emailSession,
    () => ''
  );
}

/** True when the stored host session is the trainer account. */
export function estFormateur(email: string): boolean {
  return email === EMAIL_FORMATEUR;
}
