// Entry of the Validation client light page (/validation). Loads nothing from the host app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './validation.css';
import ValidationApp from './ValidationApp';
import { ecouterInstallation } from './appels/installation';
import { lireRetourConnexion } from './appels/session';

ecouterInstallation();
// Back from a Google or e-mail sign-in: supabase-js stores the session from the address.
void lireRetourConnexion();

createRoot(document.getElementById('validation-root')!).render(
  <StrictMode>
    <ValidationApp />
  </StrictMode>
);

// Own service worker (scope /validation/), production build only, registered after load.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/validation/sw.js', { scope: '/validation/' }).catch(() => undefined);
  });
}
