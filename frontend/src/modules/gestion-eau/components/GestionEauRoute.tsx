/**
 * Garde d'accès au module gestion-eau (équivalent ConstructionRoute).
 * Redirige vers /dashboard si l'utilisateur n'a aucun rôle eau.
 */
import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useGestionEau } from '../context/GestionEauContext';
import EauReauthScreen from './EauReauthScreen';

export default function GestionEauRoute({ children }: { children: ReactNode }) {
  const { hasEauAccess, isLoading, sessionStatus } = useGestionEau();

  // Accès refusé : seulement quand la session est fiable ('valid') mais sans rôle eau.
  // (En 'checking' on attend ; en 'needs-reauth'/'mismatch' on affiche l'écran dédié.)
  useEffect(() => {
    if (!isLoading && sessionStatus === 'valid' && !hasEauAccess) {
      toast.error('Accès refusé au module Gestion Eau', { duration: 4000, position: 'top-center' });
    }
  }, [hasEauAccess, isLoading, sessionStatus]);

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
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
