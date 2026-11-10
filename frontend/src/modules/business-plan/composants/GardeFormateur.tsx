// Lock of the trainer screens /plan/formateur and /plan/formateur/* (NEC-CC-07, decision of Joël).
// The stored host session is read from localStorage only: not the trainer account (none, or another
// one) → immediate redirect to /plan/ (replace), nothing of the trainer screen is rendered and its
// code (hence Supabase) is never loaded. The server stays the real lock (bp_admin_* raise NON_AUTORISE).
import { Suspense, useEffect, type ReactNode } from 'react';
import { estFormateur, useEmailSession } from '../etat/session';

/** Back to exactly /plan/ (inside the service worker scope), replacing the history entry. Renders nothing. */
export function RenvoiAccueil() {
  // Passive effect: the router listens to popstate from its own layout effect, attached before this runs.
  useEffect(() => {
    window.history.replaceState(null, '', '/plan/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);
  return null;
}

/** Spinner only: never the trainer screen nor a flash of its data. */
export function Patience() {
  return (
    <div className="bp-ecran items-center justify-center" role="status" aria-label="Chargement">
      <span className="bp-patience w-10 h-10 rounded-full border-4 border-violetClair border-t-violet motion-safe:animate-spin" aria-hidden="true" />
    </div>
  );
}

export function GardeFormateur({ children }: { children: ReactNode }) {
  const email = useEmailSession();
  if (!estFormateur(email)) return <RenvoiAccueil />;
  return <Suspense fallback={<Patience />}>{children}</Suspense>;
}
