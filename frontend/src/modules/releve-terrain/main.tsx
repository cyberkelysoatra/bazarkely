// Entry of the "Relevé terrain" light page (/releve). Loads nothing from the host app. Every relevé is
// written in this phone's IndexedDB first; with a 1saKELY account (phase 3, RELEVE-CC-08) the engine of
// sync/ sends it to the server and reads it back. supabase-js is loaded only when a session exists or a
// sign-in starts.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './releve.css'
import App from './App'
import { appareil } from './db/depot'
import { montrerAvis } from './etat/avis'
import { demarrerPwa } from './etat/pwa'
import { demarrerSynchro } from './sync/moteur'
import { demarrerRelectureSession, retenirRetourDepuisApp } from './sync/session'
import { VERSION_RELEVE } from './version'

document.documentElement.dataset.version = VERSION_RELEVE
demarrerPwa()
// D34: the sign-in mark is read before the address is cleaned, and the installed app re-reads the session.
retenirRetourDepuisApp()
demarrerRelectureSession()
// Identity of this phone, drawn at the first opening (D25), then the sending engine.
void appareil()
  .catch(() => undefined)
  .finally(() => demarrerSynchro({ signaler: (m) => montrerAvis(m, 'alerte') }))

createRoot(document.getElementById('releve-root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
