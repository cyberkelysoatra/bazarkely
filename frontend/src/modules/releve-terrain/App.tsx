// Routes of "Relevé terrain" (/releve). Home and work site in the entry; every screen of a relevé loaded
// on demand from the three registries (ecrans/registre.ts). The test page /__essai exists only on the
// development server (D29).
import { lazy, Suspense, useEffect, useRef } from 'react'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AvisGlobal } from './composants/Avis'
import { Icone } from './composants/Icones'
import { mettreAJourMaintenant, signalerChangementDePage, useMiseAJourDisponible } from './etat/pwa'
import Accueil from './ecrans/Accueil'
import { ECRANS } from './ecrans/registre'

const Chantier = lazy(() => import('./ecrans/Chantier'))
const Essai = import.meta.env.DEV ? lazy(() => import('./ecrans/Essai')) : null

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
      <Suspense fallback={<div className="rt-ecran" />}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/c/:chantier" element={<Chantier />} />
          {ECRANS.map((e) => (
            <Route key={e.route} path={e.route} element={<e.composant />} />
          ))}
          {Essai ? <Route path="/__essai" element={<Essai />} /> : null}
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
