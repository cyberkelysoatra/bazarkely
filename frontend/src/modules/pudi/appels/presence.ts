// PUDI-CC-14.3: anonymous presence (« En ligne en ce moment »). Same random visitor id as the
// funnel, sent every 60 s while the page is visible and online, only when the funnel is active
// (consultation published, no « Voir comme » preview). Fire-and-forget, errors ignored.
import { useEffect } from 'react';
import { SUPABASE_ANON_KEY, SUPABASE_URL, withTimeout } from './supabaseClient';
import { visiteurPret } from './parcours';

export const INTERVALLE_PRESENCE_MS = 60000;
let dernier = 0;

function noter(): void {
  if (document.visibilityState !== 'visible' || navigator.onLine === false) return;
  if (Date.now() - dernier < INTERVALLE_PRESENCE_MS - 1000) return;
  dernier = Date.now();
  void visiteurPret()
    .then((id) =>
      withTimeout(
        fetch(`${SUPABASE_URL}/rest/v1/rpc/pudi_noter_presence`, {
          method: 'POST',
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ p_visiteur: id }),
          keepalive: true
        })
      )
    )
    .catch(() => undefined);
}

/** `actif`: published consultation and no preview (same switch as the funnel). */
export function usePresence(actif: boolean): void {
  useEffect(() => {
    if (!actif) return;
    noter();
    const id = window.setInterval(noter, INTERVALLE_PRESENCE_MS);
    const visible = () => noter();
    document.addEventListener('visibilitychange', visible);
    window.addEventListener('online', visible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', visible);
      window.removeEventListener('online', visible);
    };
  }, [actif]);
}
