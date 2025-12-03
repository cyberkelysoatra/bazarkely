/**
 * Composant ConstructionRoute - Protection de route pour le module Construction POC
 * Vérifie que l'utilisateur a accès au module Construction avant d'afficher les enfants
 */

import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useConstruction } from '../context/ConstructionContext';

/**
 * Props du composant ConstructionRoute
 */
interface ConstructionRouteProps {
  children: ReactNode;
}

/**
 * Composant ConstructionRoute
 * Vérifie l'accès au module Construction et redirige si nécessaire
 */
export default function ConstructionRoute({ children }: ConstructionRouteProps) {
  const { hasConstructionAccess, isLoading } = useConstruction();

  // Afficher un message d'erreur si l'accès est refusé
  useEffect(() => {
    if (!isLoading && !hasConstructionAccess) {
      toast.error('Accès refusé au module Construction', {
        duration: 4000,
        position: 'top-center'
      });
    }
  }, [hasConstructionAccess, isLoading]);

  // Afficher un spinner de chargement pendant la vérification
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Rediriger si l'utilisateur n'a pas accès
  if (!hasConstructionAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Afficher les enfants si l'accès est autorisé
  return <>{children}</>;
}

