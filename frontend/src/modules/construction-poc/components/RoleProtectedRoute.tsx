/**
 * Composant RoleProtectedRoute - Protection de route basée sur les rôles
 * Vérifie que l'utilisateur a un rôle autorisé avant d'afficher les enfants
 */

import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useConstruction } from '../context/ConstructionContext';
import type { MemberRole } from '../types/construction';

/**
 * Props du composant RoleProtectedRoute
 */
interface RoleProtectedRouteProps {
  children: ReactNode;
  allowedRoles: MemberRole[];
  redirectTo?: string;
}

/**
 * Composant RoleProtectedRoute
 * Vérifie que le rôle de l'utilisateur est dans la liste des rôles autorisés
 */
export default function RoleProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/construction/dashboard'
}: RoleProtectedRouteProps) {
  const { userRole, isLoading, hasConstructionAccess } = useConstruction();

  // Vérifier si l'utilisateur a accès au module Construction d'abord
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

  // Rediriger si l'utilisateur n'a pas accès au module Construction
  if (!hasConstructionAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  // Vérifier si le rôle de l'utilisateur est autorisé
  const hasRequiredRole = userRole !== null && userRole !== undefined && allowedRoles.includes(userRole);

  // Afficher un message d'erreur si le rôle n'est pas autorisé
  useEffect(() => {
    if (!isLoading && hasConstructionAccess && !hasRequiredRole) {
      toast.error('Vous n\'avez pas les permissions nécessaires pour cette action', {
        duration: 4000,
        position: 'top-center'
      });
    }
  }, [hasRequiredRole, isLoading, hasConstructionAccess]);

  // Rediriger si le rôle n'est pas autorisé
  if (!hasRequiredRole) {
    return <Navigate to={redirectTo} replace />;
  }

  // Afficher les enfants si le rôle est autorisé
  return <>{children}</>;
}

