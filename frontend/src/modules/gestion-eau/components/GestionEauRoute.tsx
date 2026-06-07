/**
 * Garde d'accès au module gestion-eau (équivalent ConstructionRoute).
 * Redirige vers /dashboard UNIQUEMENT sur un refus d'accès CONFIRMÉ.
 */
import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Droplet, RefreshCw } from 'lucide-react';
import { useGestionEau } from '../context/GestionEauContext';
import EauReauthScreen from './EauReauthScreen';

/**
 * Écran d'attente affiché quand l'accès n'est pas (encore) résolu de façon fiable :
 * démarrage à froid où le pull serveur des rôles a été lent/raté/timeout. On NE rebondit
 * JAMAIS silencieusement vers /dashboard dans ce cas (c'était le bug du deep-link sur
 * /gestion-eau) : on patiente et on propose un « Réessayer » manuel.
 */
function EauAccessPendingScreen() {
  const { retryAccess } = useGestionEau();
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-ahuvi-100 bg-white p-6 shadow-soft text-center space-y-4">
        <div className="flex justify-center">
          <span className="w-16 h-16 rounded-2xl flex items-center justify-center bg-ahuvi-100 text-ahuvi-forest">
            <Droplet className="w-8 h-8" aria-hidden="true" />
          </span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Vérification de votre accès…</h1>
        <p className="text-sm text-gray-600">
          La connexion au service eau est momentanément indisponible. Vos droits n’ont pas
          encore pu être confirmés. Patientez un instant ou réessayez.
        </p>
        <button
          onClick={retryAccess}
          className="w-full inline-flex items-center justify-center gap-2 bg-ahuvi-forest hover:bg-ahuvi-800 text-white font-semibold py-2.5 rounded-lg"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          Réessayer
        </button>
      </div>
    </div>
  );
}

export default function GestionEauRoute({ children }: { children: ReactNode }) {
  const { hasEauAccess, isLoading, sessionStatus, rolesConfirmed } = useGestionEau();

  // Accès refusé : seulement quand la session est fiable ('valid'), les rôles CONFIRMÉS,
  // mais sans rôle eau. (En 'checking' on attend ; 'needs-reauth'/'mismatch' → écran dédié ;
  // rôles non confirmés → écran d'attente, jamais de toast « refusé » prématuré.)
  useEffect(() => {
    if (!isLoading && sessionStatus === 'valid' && rolesConfirmed && !hasEauAccess) {
      toast.error('Accès refusé au module Gestion Eau', { duration: 4000, position: 'top-center' });
    }
  }, [hasEauAccess, isLoading, sessionStatus, rolesConfirmed]);

  // Vérification de session/rôles en cours → spinner (jamais de redirect prématuré :
  // c'est ce qui éjectait l'admin vers /dashboard lors de la course au boot sur réseau lent).
  if (isLoading || sessionStatus === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest"></div>
      </div>
    );
  }

  // Session non fiable → écran de reconnexion (ne casse PAS le shell : on est déjà
  // sous la route /gestion-eau/*, pas dans le provider global).
  if (sessionStatus === 'needs-reauth' || sessionStatus === 'mismatch') {
    return <EauReauthScreen />;
  }

  if (!hasEauAccess) {
    // Rôles NON confirmés (démarrage à froid : pull serveur lent/échoué/timeout) :
    // ne JAMAIS rebondir silencieusement vers /dashboard → écran d'attente + Réessayer.
    if (!rolesConfirmed) {
      return <EauAccessPendingScreen />;
    }
    // Refus CONFIRMÉ : le serveur a répondu et l'utilisateur n'a réellement aucun rôle eau.
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
