// Routes of "Mon business plan" (/plan). Pages loaded on demand except the home.
import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Accueil from './pages/Accueil';
import { appliquerMiseAJour, useMiseAJourDisponible } from './etat/pwa';
import { Icone } from './composants/Icones';

const Sommaire = lazy(() => import('./pages/Sommaire'));
const PageRubrique = lazy(() => import('./pages/PageRubrique'));
const Inviter = lazy(() => import('./pages/Inviter'));
const APropos = lazy(() => import('./pages/APropos'));

function BandeauMiseAJour() {
  const dispo = useMiseAJourDisponible();
  if (!dispo) return null;
  return (
    <button
      type="button"
      onClick={appliquerMiseAJour}
      className="bp-maj fixed top-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] min-h-[52px] bg-turquoiseTexte text-white text-[16px] font-bold flex items-center justify-center gap-2 px-4"
    >
      <Icone nom="installer" /> Nouvelle version : toucher pour mettre à jour
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/plan">
      <BandeauMiseAJour />
      <Suspense fallback={<div className="bp-ecran" />}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/inviter" element={<Inviter />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/p/:id" element={<Sommaire />} />
          <Route path="/p/:id/:rubrique" element={<PageRubrique />} />
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
