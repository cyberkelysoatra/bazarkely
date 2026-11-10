// Entry of the "Mon business plan" light page (/plan). Loads nothing from the host app, nothing from
// Supabase: every plan stays in this phone's IndexedDB.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './plan.css';
import App from './App';
import { demarrerPwa } from './etat/pwa';
import { VERSION_PLAN } from './version';

// ?code= of the invitation link: kept for phase 2 (trainer tracking), then removed from the address.
try {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  if (code !== null) {
    if (code.trim()) localStorage.setItem('nec.code', code.trim().slice(0, 64));
    url.searchParams.delete('code');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
  }
} catch {
  // Private mode without storage: the code is simply not kept.
}

document.documentElement.dataset.version = VERSION_PLAN;
demarrerPwa();

createRoot(document.getElementById('plan-root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
