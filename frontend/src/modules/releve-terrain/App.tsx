// Routes of "Relevé terrain" (/releve). Home and work site in the entry; every screen of a relevé loaded
// on demand from the three registries (ecrans/registre.ts). The test page /__essai exists only on the
// development server (D29).
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AvisGlobal } from './composants/Avis'
import { Icone } from './composants/Icones'
import { LimiteErreur } from './composants/LimiteErreur'
import { mettreAJourMaintenant, signalerChangementDePage, useMiseAJourDisponible } from './etat/pwa'
import Accueil from './ecrans/Accueil'
import { ECRANS } from './ecrans/registre'
import { lireRetourConnexion, retourDeConnexion, useSession } from './sync/session'

const Chantier = lazy(() => import('./ecrans/Chantier'))
const Connexion = lazy(() => import('./ecrans/Connexion'))
const Essai = import.meta.env.DEV ? lazy(() => import('./ecrans/Essai')) : null
const CHEMIN_ESSAI = import.meta.env.DEV ? '/__essai' : '/'

function useEnLigne(): boolean {
  return useSyncExternalStore(
    (f) => {
      window.addEventListener('online', f)
      window.addEventListener('offline', f)
      return () => {
        window.removeEventListener('online', f)
        window.removeEventListener('offline', f)
      }
    },
    () => navigator.onLine !== false,
    () => true,
  )
}

/**
 * H23: first opening with network and no session asks to sign in (screen 1). With a session, or
 * without network, the app opens as before: local data never blocks. Back from Google, the session
 * is read from the address first.
 */
export function Porte({ children }: { children: ReactNode }) {
  const { pathname, search } = useLocation()
  const session = useSession()
  const enLigne = useEnLigne()
  const [retour, setRetour] = useState(retourDeConnexion)
  useEffect(() => {
    if (retour) void lireRetourConnexion().finally(() => setRetour(false))
  }, [retour])
  if (retour) return <div className="rt-ecran" />
  // The test page of the development server (D29) never asks; it does not exist in the build.
  const libre = pathname === '/connexion' || (Essai !== null && pathname.startsWith(CHEMIN_ESSAI))
  if (!session && enLigne && !libre) return <Navigate to={`/connexion?retour=${encodeURIComponent(pathname + search)}`} replace />
  return <>{children}</>
}

/** A route change is a safe moment for the automatic update (not the first render). */
function SuiviPages() {
  const { pathname } = useLocation()
  const premier = useRef(true)
  useEffect(() => {
    if (premier.current) {
      premier.current = false
      return
    }
    signalerChangementDePage()
  }, [pathname])
  return null
}

/** The error boundary, reset on every new address. */
function Ecrans({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  return <LimiteErreur cle={pathname}>{children}</LimiteErreur>
}

function BandeauMiseAJour() {
  const dispo = useMiseAJourDisponible()
  if (!dispo) return null
  return (
    <button
      type="button"
      onClick={() => void mettreAJourMaintenant()}
      className="rt-etroite fixed left-1/2 top-0 z-40 flex min-h-[52px] w-full max-w-[520px] -translate-x-1/2 items-center justify-center gap-2 border-b-[3px] border-encre bg-jaune px-4 text-[19px] font-extrabold text-encre"
    >
      <Icone nom="installer" /> Nouvelle version disponible : toucher pour mettre à jour
    </button>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/releve">
      <BandeauMiseAJour />
      <AvisGlobal />
      <SuiviPages />
      <Ecrans>
        <Suspense fallback={<div className="rt-ecran" />}>
          <Porte>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/c/:chantier" element={<Chantier />} />
            {ECRANS.map((e) => (
              <Route key={e.route} path={e.route} element={<e.composant />} />
            ))}
            {Essai ? <Route path="/__essai" element={<Essai />} /> : null}
            <Route path="*" element={<Accueil />} />
          </Routes>
          </Porte>
        </Suspense>
      </Ecrans>
    </BrowserRouter>
  )
}
