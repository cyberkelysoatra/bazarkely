/**
 * Arbre de routes interne du module gestion-eau (monté sous /gestion-eau/* par AppLayout).
 * L'accès global est garanti par <GestionEauRoute> (en amont) ; chaque écran est de plus
 * protégé par <EauRoleProtectedRoute> (rôles cumulables) → matrice d'accès appliquée à 3
 * niveaux (gardes de route + filtrage de nav + scoping des données côté service).
 *
 * Navigation : les BOUTONS-THÈMES vivent dans BottomNav + nav desktop du header.
 *  - Relevés (/releves) regroupe Bassin/Compteur via onglets internes (EauRelevesPage).
 *  - Suivi (/suivi) regroupe Anomalies/Bilans (EauSuiviPage).
 * Les anciennes routes (saisie-bassin, saisie-compteur, anomalies) redirigent vers ces thèmes.
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EauRoleProtectedRoute from './EauRoleProtectedRoute';

const EauDashboard = React.lazy(() => import('./EauDashboard'));
const EauConfigPage = React.lazy(() => import('./EauConfigPage'));
const EauRelevesPage = React.lazy(() => import('./EauRelevesPage'));
const EauSuiviPage = React.lazy(() => import('./EauSuiviPage'));
const EauCompteursPage = React.lazy(() => import('./EauCompteursPage'));
const EauFacturationPage = React.lazy(() => import('./EauFacturationPage'));
const EauUtilisateursPage = React.lazy(() => import('./EauUtilisateursPage'));
const EauDemandesPage = React.lazy(() => import('./EauDemandesPage'));
const EauClientPage = React.lazy(() => import('./EauClientPage'));

const Loader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest"></div>
  </div>
);

export default function GestionEauRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        {/* Tableau de bord opérationnel — admin/releveur (le client est redirigé vers son espace). */}
        <Route
          index
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'releveur']}>
              <EauDashboard />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Relevés (Bassin · Compteur · Tournée · Scan) */}
        <Route
          path="releves"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin']}>
              <EauRelevesPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Suivi (Anomalies/Bilans · Tendances) */}
        <Route
          path="suivi"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin']}>
              <EauSuiviPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Compteurs (Liste CRUD + QR · Carte) — admin */}
        <Route
          path="compteurs"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauCompteursPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Facturation (Factures · Rapports) — admin */}
        <Route
          path="facturation"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauFacturationPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Écrans secondaires (menu en haut à droite) — admin */}
        <Route
          path="config"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauConfigPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="utilisateurs"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauUtilisateursPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="demandes"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauDemandesPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Espace client (Ma conso / Mes factures via :tab) — client/admin (supervision) */}
        <Route
          path="client"
          element={
            <EauRoleProtectedRoute allowedRoles={['client', 'admin']}>
              <EauClientPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="client/:tab"
          element={
            <EauRoleProtectedRoute allowedRoles={['client', 'admin']}>
              <EauClientPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Compatibilité : anciennes routes Phase 1-2 → thèmes correspondants */}
        <Route path="saisie-bassin" element={<Navigate to="/gestion-eau/releves" replace />} />
        <Route path="saisie-compteur" element={<Navigate to="/gestion-eau/releves" replace />} />
        <Route path="anomalies" element={<Navigate to="/gestion-eau/suivi" replace />} />

        <Route path="*" element={<Navigate to="/gestion-eau" replace />} />
      </Routes>
    </Suspense>
  );
}
