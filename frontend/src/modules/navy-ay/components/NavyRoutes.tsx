/**
 * NAVY ay internal routes (mounted under /navy/* in AppLayout, signed-in only).
 * The public QR page /navy/p/:id is declared at the top level of App.tsx (no sign-in).
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NavyHomePage from './NavyHomePage';
import NavyProfileSync from './NavyProfileSync';
import NavyRoleRoute from './NavyRoleRoute';
import { NavyLoader } from './ui/NavyUi';

const BecomePartnerPage = lazy(() => import('./partner/BecomePartnerPage'));
const PartnerRequestPage = lazy(() => import('./partner/PartnerRequestPage'));
const RequestStatusPage = lazy(() => import('./partner/RequestStatusPage'));
const GrocerPage = lazy(() => import('./partner/GrocerPage'));
const DriverPage = lazy(() => import('./partner/DriverPage'));
const MyQrPage = lazy(() => import('./partner/MyQrPage'));
const OperatorRequestsPage = lazy(() => import('./operator/OperatorRequestsPage'));
const OperatorRequestDetailPage = lazy(() => import('./operator/OperatorRequestDetailPage'));
const OperatorPartnersPage = lazy(() => import('./operator/OperatorPartnersPage'));
const OperatorSettingsPage = lazy(() => import('./operator/OperatorSettingsPage'));

export default function NavyRoutes() {
  return (
    <>
      <NavyProfileSync />
      <Suspense fallback={<NavyLoader />}>
        <Routes>
          <Route index element={<NavyHomePage />} />
          <Route path="devenir" element={<BecomePartnerPage />} />
          <Route path="devenir/:kind" element={<PartnerRequestPage />} />
          <Route path="demande/:kind" element={<RequestStatusPage />} />
          <Route path="epicerie" element={<NavyRoleRoute role="epicier"><GrocerPage /></NavyRoleRoute>} />
          <Route path="vehicule" element={<NavyRoleRoute role="chauffeur"><DriverPage /></NavyRoleRoute>} />
          <Route path="qr" element={<NavyRoleRoute role="partenaire"><MyQrPage /></NavyRoleRoute>} />
          <Route path="operatrice/demandes" element={<NavyRoleRoute role="operatrice"><OperatorRequestsPage /></NavyRoleRoute>} />
          <Route path="operatrice/demandes/:id" element={<NavyRoleRoute role="operatrice"><OperatorRequestDetailPage /></NavyRoleRoute>} />
          <Route path="operatrice/partenaires" element={<NavyRoleRoute role="operatrice"><OperatorPartnersPage /></NavyRoleRoute>} />
          <Route path="operatrice/reglages" element={<NavyRoleRoute role="operatrice"><OperatorSettingsPage /></NavyRoleRoute>} />
          <Route path="*" element={<Navigate to="/navy" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
