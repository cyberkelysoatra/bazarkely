// Entry of the PUDi light page (/pudi). Loads nothing from the family-budget app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './pudi.css';
import PudiApp from './PudiApp';
import { ecouterInstallation } from './appels/installation';
import { capturerCanal } from './appels/provenance';
import { signalerSession, synchroniserSessionNative } from './appels/session';
import { getSupabase } from './appels/supabaseClient';
import { ping } from './appels/api';

capturerCanal();
ecouterInstallation();
// NAVY ay app only: the header reads the session the app holds (no-op on the web).
synchroniserSessionNative();

// Back from the Google sign-in on any PUDi page: let supabase-js store the session from the
// address (loaded only in that case), then refresh the header.
if (/[#&](access_token|error_description)=/.test(window.location.hash) || /[?&]code=/.test(window.location.search)) {
  getSupabase()
    .then((sb) => sb.auth.getSession())
    .then(async ({ data }) => {
      signalerSession();
      // Records the account in the PUDi sign-ins (list of the administrators screen), once per session.
      const uid = data.session?.user?.id;
      if (!uid) return;
      const cle = `pudi_ping:${uid}`;
      try {
        if (sessionStorage.getItem(cle) === '1') return;
      } catch {
        /* no storage */
      }
      await ping();
      try {
        sessionStorage.setItem(cle, '1');
      } catch {
        /* no storage */
      }
    })
    .catch(signalerSession);
}

createRoot(document.getElementById('pudi-root')!).render(
  <StrictMode>
    <PudiApp />
  </StrictMode>
);

// PUDi service worker (scope /pudi/), production build only. Registered after load so it
// does not compete with the first paint.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/pudi/sw.js', { scope: '/pudi/' }).catch(() => undefined);
  });
}
