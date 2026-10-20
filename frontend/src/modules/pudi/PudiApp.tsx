import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { BandeSecteurs, BarreBas, Chargement, EnTete } from './composants/Mise';
import { PudiProvider } from './PudiContexte';
import Accueil from './pages/Accueil';
import Secteurs from './pages/Secteurs';
import Secteur from './pages/Secteur';
import Programme from './pages/Programme';
import { capturerCanal } from './appels/provenance';

// Pages that need more code (choice, sending, results) are split off the home bundle.
const Choix = lazy(() => import('./pages/Choix'));
const Envoyer = lazy(() => import('./pages/Envoyer'));
const Merci = lazy(() => import('./pages/Merci'));
const Resultats = lazy(() => import('./pages/Resultats'));

function SuiviNavigation() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    capturerCanal(search);
  }, [search]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function PudiApp() {
  return (
    <BrowserRouter basename="/pudi">
      <PudiProvider>
        <SuiviNavigation />
        <BandeSecteurs />
        <EnTete />
        <Suspense fallback={<Chargement />}>
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/secteurs" element={<Secteurs />} />
            <Route path="/secteur/:id" element={<Secteur />} />
            <Route path="/programme/:id" element={<Programme />} />
            <Route path="/choix" element={<Choix />} />
            <Route path="/envoyer" element={<Envoyer />} />
            <Route path="/merci" element={<Merci />} />
            <Route path="/resultats" element={<Resultats />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <BarreBas />
      </PudiProvider>
    </BrowserRouter>
  );
}
