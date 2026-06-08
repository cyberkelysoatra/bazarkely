/**
 * Garde de route basée sur les rôles eau (cumulables). Autorise si l'utilisateur
 * possède AU MOINS UN des rôles requis. Équivalent RoleProtectedRoute construction.
 */
import { ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useGestionEau } from '../context/GestionEauContext';
import type { EauRole } from '../types/gestionEau';

interface Props {
  children: ReactNode;
  allowedRoles: EauRole[];
  redirectTo?: string;
}

export default function EauRoleProtectedRoute({
  children,
  allowedRoles,
  redirectTo,
}: Props) {
  const { roles, isLoading, hasEauAccess } = useGestionEau();

  // Accueil par défaut selon le rôle : admin/releveur → tableau de bord ;
  // client (sans rôle interne) → son espace. Évite toute boucle de redirection
  // (un client refusé sur le dashboard atterrit sur /gestion-eau/client, pas sur /gestion-eau).
  const home =
    roles.admin || roles.releveur || roles.promoteur
      ? '/gestion-eau'
      : roles.client
      ? '/gestion-eau/client'
      : '/dashboard';
  const target = redirectTo ?? home;

  useEffect(() => {
    if (!isLoading && !hasEauAccess) {
      toast.error('Accès refusé au module Gestion Eau', { duration: 4000, position: 'top-center' });
    }
  }, [hasEauAccess, isLoading]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest"></div>
      </div>
    );
  }

  if (!hasEauAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  const hasRequiredRole = allowedRoles.some((r) => roles[r]);

  useEffect(() => {
    if (!isLoading && hasEauAccess && !hasRequiredRole) {
      toast.error("Vous n'avez pas les permissions nécessaires pour cette page", {
        duration: 4000,
        position: 'top-center',
      });
    }
  }, [hasRequiredRole, isLoading, hasEauAccess]);

  if (!hasRequiredRole) {
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
