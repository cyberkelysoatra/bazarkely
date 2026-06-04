/**
 * Garde d'accès au module gestion-eau (équivalent ConstructionRoute).
 * Redirige vers /dashboard si l'utilisateur n'a aucun rôle eau.
 */
import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useGestionEau } from '../context/GestionEauContext';

export default function GestionEauRoute({ children }: { children: ReactNode }) {
  const { hasEauAccess, isLoading } = useGestionEau();

  useEffect(() => {
    if (!isLoading && !hasEauAccess) {
      toast.error('Accès refusé au module Gestion Eau', { duration: 4000, position: 'top-center' });
    }
  }, [hasEauAccess, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
      </div>
    );
  }

  if (!hasEauAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
