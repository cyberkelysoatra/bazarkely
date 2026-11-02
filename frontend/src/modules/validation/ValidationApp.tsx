// Validation client light app (/validation, VALIDCLIENT-CC-02). Nothing is imported from the host.
import { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { EspaceProvider, useEspace } from './EspaceContexte';
import { estPilote } from './appels/api';
import { quitterMenu } from './appels/menu';
import Accueil from './pages/Accueil';
import Invitation from './pages/Invitation';
import Connexion from './pages/Connexion';
import Formulaire from './pages/Formulaire';
import Bientot from './pages/Bientot';
import { Corps, Squelette } from './composants/Mise';

// Pilotage: own chunk, loaded only once the server said the account is Joël's.
const Pilotage = lazy(() => import('./pages/pilotage/Pilotage'));

function GardePilotage() {
  const { session } = useEspace();
  const [pilote, setPilote] = useState<boolean | null>(null);
  useEffect(() => {
    let vivant = true;
    if (!session) {
      setPilote(false);
      return;
    }
    void estPilote().then((ok) => vivant && setPilote(ok));
    return () => {
      vivant = false;
    };
  }, [session]);
  if (pilote === null)
    return (
      <Corps>
        <Squelette lent={false} />
      </Corps>
    );
  if (!pilote) return <Navigate to="/" replace />;
  return (
    <Suspense
      fallback={
        <Corps>
          <Squelette lent={false} />
        </Corps>
      }
    >
      <Pilotage />
    </Suspense>
  );
}

/** New page: top of the page, menu closed. */
function SuiviNavigation() {
  const { pathname } = useLocation();
  useEffect(() => {
    quitterMenu();
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function ValidationApp() {
  return (
    <BrowserRouter basename="/validation">
      <EspaceProvider>
        <SuiviNavigation />
        <div className="vc-ecran">
          <Routes>
            <Route path="/" element={<Accueil />} />
            <Route path="/i/:jeton" element={<Invitation />} />
            <Route path="/connexion" element={<Connexion />} />
            <Route path="/inscription" element={<Formulaire mode="inscription" />} />
            <Route path="/infos" element={<Formulaire mode="infos" />} />
            <Route path="/q/:questionnaire/:numero" element={<Bientot />} />
            <Route path="/pilotage/*" element={<GardePilotage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </EspaceProvider>
    </BrowserRouter>
  );
}
