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
import AppVersionPage from '../../../pages/AppVersionPage';

const EauDashboard = React.lazy(() => import('./EauDashboard'));
const EauConfigPage = React.lazy(() => import('./EauConfigPage'));
const EauRelevesPage = React.lazy(() => import('./EauRelevesPage'));
const EauSuiviPage = React.lazy(() => import('./EauSuiviPage'));
const EauCompteursPage = React.lazy(() => import('./EauCompteursPage'));
const EauFacturationPage = React.lazy(() => import('./EauFacturationPage'));
const EauUtilisateursPage = React.lazy(() => import('./EauUtilisateursPage'));
const EauDemandesPage = React.lazy(() => import('./EauDemandesPage'));
const EauClientPage = React.lazy(() => import('./EauClientPage'));
// Phase 4 — écrans de pilotage (secondaires, accessibles via le menu HeaderEauActions).
const EauTendancesPage = React.lazy(() => import('./EauTendancesPage'));
const EauAlertesPage = React.lazy(() => import('./EauAlertesPage'));
const EauRapportsPage = React.lazy(() => import('./EauRapportsPage'));
const EauAnnoncesPage = React.lazy(() => import('./EauAnnoncesPage'));
const EauAuditPage = React.lazy(() => import('./EauAuditPage'));

const Loader = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ahuvi-forest"></div>
  </div>
);

export default function GestionEauRoutes() {
  return (
    <Suspense fallback={<Loader />}>
      {/* Marge basse scopée au module : la BottomNav du module (libellés sur 2 lignes
          « Tableau de bord » / « Facturation » + zone sûre Android) dépasse les 80px
          du <main>, recouvrant la dernière carte. Ce padding additif laisse un espace
          net au-dessus de la barre, sans impacter les autres modules. */}
      <div className="pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <Routes>
        {/* Tableau de bord opérationnel — admin/releveur (le client est redirigé vers son espace). */}
        <Route
          index
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'releveur', 'promoteur']}>
              <EauDashboard />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Relevés (Bassin · Compteur · Tournée · Scan) */}
        <Route
          path="releves"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin', 'promoteur']}>
              <EauRelevesPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Suivi (Anomalies/Bilans · Tendances) */}
        <Route
          path="suivi"
          element={
            <EauRoleProtectedRoute allowedRoles={['releveur', 'admin', 'promoteur']}>
              <EauSuiviPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Compteurs (Liste CRUD + QR · Carte) — admin */}
        <Route
          path="compteurs"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauCompteursPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Thème Facturation (Factures · Rapports) — admin */}
        <Route
          path="facturation"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauFacturationPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Phase 4 — Tendances (lecture) : admin + releveur. */}
        <Route
          path="tendances"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'releveur', 'promoteur']}>
              <EauTendancesPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Phase 4 — Alertes / Rapports / Annonces / Audit : admin uniquement. */}
        <Route
          path="alertes"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauAlertesPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="rapports"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauRapportsPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="annonces"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauAnnoncesPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauAuditPage />
            </EauRoleProtectedRoute>
          }
        />

        {/* Écrans secondaires (menu en haut à droite) — admin */}
        <Route
          path="config"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauConfigPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="utilisateurs"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
              <EauUtilisateursPage />
            </EauRoleProtectedRoute>
          }
        />
        <Route
          path="demandes"
          element={
            <EauRoleProtectedRoute allowedRoles={['admin', 'promoteur']}>
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

        {/* Page version/mise à jour, montée sous le préfixe du module pour ne pas sortir
            du module Eau (sinon le switcher rebascule sur BazarKELY). Accessible à tous
            les rôles du module — pas de garde de rôle. */}
        <Route path="version" element={<AppVersionPage />} />

        <Route path="*" element={<Navigate to="/gestion-eau" replace />} />
      </Routes>
      </div>
    </Suspense>
  );
}
