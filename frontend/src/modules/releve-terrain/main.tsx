// Entry of the "Relevé terrain" light page (/releve). Loads nothing from the host app, nothing from
// Supabase: every relevé stays in this phone's IndexedDB (phase 2, D28).
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './releve.css'
import App from './App'
import { appareil } from './db/depot'
import { demarrerPwa } from './etat/pwa'
import { VERSION_RELEVE } from './version'

document.documentElement.dataset.version = VERSION_RELEVE
demarrerPwa()
// Identity of this phone, drawn at the first opening (D25).
void appareil().catch(() => undefined)

createRoot(document.getElementById('releve-root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
