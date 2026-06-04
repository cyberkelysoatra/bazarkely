/**
 * Arbre de routes interne du module gestion-eau (monté sous /gestion-eau/* par AppLayout).
 * L'accès global est garanti par <GestionEauRoute> (en amont) ; chaque écran sensible
 * est de plus protégé par <EauRoleProtectedRoute> (rôles cumulables).
 */
import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import EauRoleProtectedRoute from './EauRoleProtectedRoute';

const EauDashboard = React.lazy(() => import('./EauDashboard'));
const EauConfigPage = React.lazy(() => import('./EauConfigPage'));
const EauSaisieBassinPage = React.lazy(() => import('./EauSaisieBassinPage'));
const EauSaisieCompteurPage = React.lazy(() => import('./EauSaisieCompteurPage'));
const EauCompteursPage = React.lazy(() => import('./EauCompteursPage'));
const EauAnomaliesPage = React.lazy(() => import('./EauAnomaliesPage'));
const EauFacturationPage = React.lazy(() => import('./EauFacturationPage'));
const EauUtilisateursPage = React.lazy(() => import('./EauUtilisateursPage'));
const EauDemandesPage = React.lazy(() => import('./EauDemandesPage'));
const EauClientPage = React.lazy(() => import('./EauClientPage'));

const Loader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600"></div>
  </div>
);

export default function GestionEauRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route index element={<EauDashboard />} />
        <Route
          path="config"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauConfigPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="saisie-bassin"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin']}>
              <EauSaisieBassinPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="saisie-compteur"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin']}>
              <EauSaisieCompteurPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="compteurs"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauCompteursPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="anomalies"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin']}>
              <EauAnomaliesPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="facturation"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin']}>
              <EauFacturationPage />
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
        <Route
          path="client"
          element={
            <EauRoleProtectedRoute allowedRoles={['client', 'admin']}>
              <EauClientPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/gestion-eau" replace />} />
      </Routes>
    </Suspense>
  );
}
