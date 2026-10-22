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
const Donnees = lazy(() => import('./pages/Donnees'));
// Phase 3: search (index built on the device), proposals, public PUDi documents.
const Recherche = lazy(() => import('./pages/Recherche'));
const Propositions = lazy(() => import('./pages/Propositions'));
const Proposition = lazy(() => import('./pages/Proposition'));
const Documents = lazy(() => import('./pages/Documents'));
// Group managers' member lists (PUDI-CC-07): own chunk, reached from the account menu only.
const Groupe = lazy(() => import('./pages/Groupe'));
// Administration: its own chunk, never downloaded by a public visitor.
const Admin = lazy(() => import('./pages/admin/Admin'));

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
            <Route path="/donnees" element={<Donnees />} />
            <Route path="/recherche" element={<Recherche />} />
            <Route path="/propositions" element={<Propositions />} />
            <Route path="/proposition/:id" element={<Proposition />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/groupe" element={<Groupe />} />
            <Route path="/groupe/:code" element={<Groupe />} />
            <Route path="/admin/*" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <BarreBas />
      </PudiProvider>
    </BrowserRouter>
  );
}
