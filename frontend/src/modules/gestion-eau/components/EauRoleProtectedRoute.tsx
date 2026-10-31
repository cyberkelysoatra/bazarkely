/**
 * Garde de route basée sur les rôles eau (cumulables). Autorise si l'utilisateur
 * possède AU MOINS UN des rôles requis. Équivalent RoleProtectedRoute construction.
 */
import { type ReactNode, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useGestionEau } from '../context/GestionEauContext';
import type { EauRole } from '../types/gestionEau';
import { accueilElec } from '../utils/domaines';

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
  const { roles, isLoading, hasEauAccess, domaines } = useGestionEau();

  // Accueil par défaut selon le rôle : admin/releveur → tableau de bord ;
  // client (sans rôle interne) → son espace. Évite toute boucle de redirection
  // (un client refusé sur le dashboard atterrit sur /gestion-eau/client, pas sur /gestion-eau).
  // Domaine Électricité seul (ELEC-CC-01) → tableau de bord électricité ; releveur électricité
  // seul → ses relevés (ELEC-CC-02).
  const home =
    roles.admin || roles.releveur || roles.promoteur
      ? '/gestion-eau'
      : roles.client && domaines.eau
      ? '/gestion-eau/client'
      : domaines.elec
      ? accueilElec(roles)
      : '/dashboard';
  const target = redirectTo ?? home;
  const hasRequiredRole = allowedRoles.some((r) => roles[r]);

  // ⚠️ Tous les hooks sont déclarés AVANT tout `return` conditionnel (Rules of Hooks) :
  // sinon le nombre/ordre de hooks varie d'un rendu à l'autre → crash
  // « Rendered more hooks than during the previous render ».
  useEffect(() => {
    if (!isLoading && !hasEauAccess) {
      toast.error('Accès refusé au module Gestion Eau', { duration: 4000, position: 'top-center' });
    }
  }, [hasEauAccess, isLoading]);

  useEffect(() => {
    if (!isLoading && hasEauAccess && !hasRequiredRole) {
      toast.error("Vous n'avez pas les permissions nécessaires pour cette page", {
        duration: 4000,
        position: 'top-center',
      });
    }
  }, [hasRequiredRole, isLoading, hasEauAccess]);

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

  if (!hasRequiredRole) {
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
