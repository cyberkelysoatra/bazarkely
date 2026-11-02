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
import Question from './pages/Question';
import Confirmer from './pages/Confirmer';
import Recu from './pages/Recu';
import { CarteMessage, Corps, PRIMAIRE, Squelette } from './composants/Mise';

// Pilotage: own chunk, loaded only once the server said the account is Joël's.
const Pilotage = lazy(() => import('./pilotage/Pilotage'));
// Document page: own chunk (Markdown renderer and sanitizer), never loaded by a question page.
const Document = lazy(() => import('./pages/Document'));

function GardePilotage() {
  const { session } = useEspace();
  const [pilote, setPilote] = useState<'oui' | 'non' | 'erreur' | null>(null);
  const [essai, setEssai] = useState(0);
  useEffect(() => {
    let vivant = true;
    if (!session) {
      setPilote('non');
      return;
    }
    setPilote(null);
    void estPilote().then((r) => vivant && setPilote(r));
    return () => {
      vivant = false;
    };
  }, [session, essai]);
  // Server still silent: loader, never a bounce (cold start rule).
  if (pilote === null)
    return (
      <Corps>
        <Squelette lent={false} />
      </Corps>
    );
  if (pilote === 'non') return <Navigate to="/" replace />;
  if (pilote === 'erreur')
    return (
      <Corps centre>
        <CarteMessage texte="Le réseau ne répond pas. Vérifiez votre connexion, puis réessayez.">
          <button type="button" className={`${PRIMAIRE} self-stretch`} onClick={() => setEssai((n) => n + 1)}>
            Réessayer
          </button>
        </CarteMessage>
      </Corps>
    );
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
            <Route path="/q/:questionnaire/:numero" element={<Question />} />
            <Route path="/confirmer/:questionnaire" element={<Confirmer />} />
            <Route path="/recu/:questionnaire" element={<Recu />} />
            <Route
              path="/document/:id"
              element={
                <Suspense
                  fallback={
                    <Corps>
                      <Squelette lent={false} />
                    </Corps>
                  }
                >
                  <Document />
                </Suspense>
              }
            />
            <Route path="/pilotage/*" element={<GardePilotage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </EspaceProvider>
    </BrowserRouter>
  );
}
