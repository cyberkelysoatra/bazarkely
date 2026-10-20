// Entry of the PUDi light page (/pudi). Loads nothing from the family-budget app.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './pudi.css';
import PudiApp from './PudiApp';
import { ecouterInstallation } from './appels/installation';
import { capturerCanal } from './appels/provenance';

capturerCanal();
ecouterInstallation();

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
