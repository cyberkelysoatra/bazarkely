// Routes of "Mon business plan" (/plan). Pages loaded on demand except the home.
import { lazy, Suspense, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { annonceAvisPlanPlusRecent, suivreAvisPlanPlusRecent } from './etat/avisPlan';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import Accueil from './pages/Accueil';
import { mettreAJourMaintenant, signalerChangementDePage, useMiseAJourDisponible } from './etat/pwa';
import { Icone } from './composants/Icones';
import { GardeFormateur } from './composants/GardeFormateur';

const Sommaire = lazy(() => import('./pages/Sommaire'));
const PageRubrique = lazy(() => import('./pages/PageRubrique'));
const Inviter = lazy(() => import('./pages/Inviter'));
const APropos = lazy(() => import('./pages/APropos'));
const Formation = lazy(() => import('./pages/Formation'));
const Formateur = lazy(() => import('./pages/Formateur'));
const FormateurPlan = lazy(() => import('./pages/FormateurPlan'));
const Exporter = lazy(() => import('./pages/Exporter'));
const Pretest = lazy(() => import('./pages/Pretest'));
const Posttest = lazy(() => import('./pages/Posttest'));
const Evaluation = lazy(() => import('./pages/Evaluation'));

/** NEC-CC-21: a route change is a safe moment for the automatic update (not the first render). */
function SuiviPages() {
  const { pathname } = useLocation();
  const premier = useRef(true);
  useEffect(() => {
    if (premier.current) {
      premier.current = false;
      return;
    }
    signalerChangementDePage();
  }, [pathname]);
  return null;
}

function BandeauMiseAJour() {
  const dispo = useMiseAJourDisponible();
  if (!dispo) return null;
  return (
    <button
      type="button"
      onClick={() => void mettreAJourMaintenant()}
      className="bp-maj fixed top-0 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] min-h-[52px] bg-turquoiseTexte text-white text-[16px] font-bold flex items-center justify-center gap-2 px-4"
    >
      <Icone nom="installer" /> Nouvelle version : toucher pour mettre à jour
    </button>
  );
}

/** NEC-CC-25: said once when this page's change was refused because another page saved a newer plan. */
function AvisPlanPlusRecent() {
  const n = useSyncExternalStore(suivreAvisPlanPlusRecent, annonceAvisPlanPlusRecent);
  const [vu, setVu] = useState(n);
  useEffect(() => {
    if (n === vu) return;
    const t = window.setTimeout(() => setVu(n), 6000);
    return () => window.clearTimeout(t);
  }, [n, vu]);
  if (n === vu) return null;
  return (
    <button
      type="button"
      role="status"
      data-avis-plan-recent
      onClick={() => setVu(n)}
      className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-[448px] rounded-xl border-2 border-turquoise bg-white px-3 py-2 text-left text-[14px] leading-snug text-encre shadow-md"
    >
      Ce projet a été modifié dans une autre page : la version la plus récente est affichée.
    </button>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/plan">
      <BandeauMiseAJour />
      <AvisPlanPlusRecent />
      <SuiviPages />
      <Suspense fallback={<div className="bp-ecran" />}>
        <Routes>
          <Route path="/" element={<Accueil />} />
          <Route path="/inviter" element={<Inviter />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/formateur" element={<GardeFormateur><Formateur /></GardeFormateur>} />
          <Route path="/formateur/evaluation" element={<GardeFormateur><Evaluation /></GardeFormateur>} />
          <Route path="/formateur/:planId" element={<GardeFormateur><FormateurPlan /></GardeFormateur>} />
          <Route path="/formateur/:planId/:rubrique" element={<GardeFormateur><FormateurPlan /></GardeFormateur>} />
          <Route path="/formateur/*" element={<GardeFormateur><Formateur /></GardeFormateur>} />
          <Route path="/p/:id" element={<Sommaire />} />
          <Route path="/p/:id/formation" element={<Formation />} />
          <Route path="/p/:id/exporter" element={<Exporter />} />
          <Route path="/p/:id/pretest" element={<Pretest />} />
          <Route path="/p/:id/posttest" element={<Posttest />} />
          <Route path="/p/:id/:rubrique" element={<PageRubrique />} />
          <Route path="*" element={<Accueil />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
