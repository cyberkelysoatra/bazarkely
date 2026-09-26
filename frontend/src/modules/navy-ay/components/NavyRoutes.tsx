/**
 * NAVY ay internal routes (mounted under /navy/* in AppLayout, signed-in only).
 * The public QR page /navy/p/:id is declared at the top level of App.tsx (no sign-in).
 */
import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import NavyHomePage from './NavyHomePage';
import NavyProfileSync from './NavyProfileSync';
import NavyParcelSync from './NavyParcelSync';
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
const DriverDirectionPage = lazy(() => import('./partner/DriverDirectionPage'));
const PartnerChangePage = lazy(() => import('./partner/PartnerChangePage'));
const OperatorZonesPage = lazy(() => import('./operator/OperatorZonesPage'));
const OperatorDriversPage = lazy(() => import('./operator/OperatorDriversPage'));
const OperatorChangeDetailPage = lazy(() => import('./operator/OperatorChangeDetailPage'));
// Phase 2A: parcels
const SendParcelPage = lazy(() => import('./parcel/SendParcelPage'));
const MyParcelsPage = lazy(() => import('./parcel/MyParcelsPage'));
const ParcelDetailPage = lazy(() => import('./parcel/ParcelDetailPage'));
const GrocerParcelsPage = lazy(() => import('./parcel/GrocerParcelsPage'));
const DriverOffersPage = lazy(() => import('./parcel/DriverOffersPage'));
const DriverCoursesPage = lazy(() => import('./parcel/DriverCoursesPage'));
const OperatorParcelsPage = lazy(() => import('./operator/OperatorParcelsPage'));
const OperatorPaymentsPage = lazy(() => import('./operator/OperatorPaymentsPage'));

export default function NavyRoutes() {
  return (
    <>
      <NavyProfileSync />
      <NavyParcelSync />
      <Suspense fallback={<NavyLoader />}>
        <Routes>
          <Route index element={<NavyHomePage />} />
          <Route path="devenir" element={<BecomePartnerPage />} />
          <Route path="devenir/:kind" element={<PartnerRequestPage />} />
          <Route path="demande/:kind" element={<RequestStatusPage />} />
          <Route path="epicerie" element={<NavyRoleRoute role="epicier"><GrocerPage /></NavyRoleRoute>} />
          <Route path="vehicule" element={<NavyRoleRoute role="chauffeur"><DriverPage /></NavyRoleRoute>} />
          <Route path="qr" element={<NavyRoleRoute role="partenaire"><MyQrPage /></NavyRoleRoute>} />
          <Route path="direction" element={<NavyRoleRoute role="chauffeur"><DriverDirectionPage /></NavyRoleRoute>} />
          <Route path="modifier/:kind" element={<NavyRoleRoute role="partenaire"><PartnerChangePage /></NavyRoleRoute>} />
          <Route path="operatrice/demandes" element={<NavyRoleRoute role="operatrice"><OperatorRequestsPage /></NavyRoleRoute>} />
          <Route path="operatrice/demandes/:id" element={<NavyRoleRoute role="operatrice"><OperatorRequestDetailPage /></NavyRoleRoute>} />
          <Route path="operatrice/partenaires" element={<NavyRoleRoute role="operatrice"><OperatorPartnersPage /></NavyRoleRoute>} />
          <Route path="operatrice/reglages" element={<NavyRoleRoute role="operatrice"><OperatorSettingsPage /></NavyRoleRoute>} />
          <Route path="operatrice/zones" element={<NavyRoleRoute role="operatrice"><OperatorZonesPage /></NavyRoleRoute>} />
          <Route path="operatrice/chauffeurs" element={<NavyRoleRoute role="operatrice"><OperatorDriversPage /></NavyRoleRoute>} />
          <Route path="operatrice/modifications/:id" element={<NavyRoleRoute role="operatrice"><OperatorChangeDetailPage /></NavyRoleRoute>} />
          <Route path="envoyer" element={<SendParcelPage />} />
          <Route path="colis" element={<MyParcelsPage mode="sent" />} />
          <Route path="colis/:id" element={<ParcelDetailPage />} />
          <Route path="recevoir" element={<MyParcelsPage mode="received" />} />
          <Route path="epicier/colis" element={<NavyRoleRoute role="epicier"><GrocerParcelsPage /></NavyRoleRoute>} />
          <Route path="offres" element={<NavyRoleRoute role="chauffeur"><DriverOffersPage /></NavyRoleRoute>} />
          <Route path="courses" element={<NavyRoleRoute role="chauffeur"><DriverCoursesPage /></NavyRoleRoute>} />
          <Route path="operatrice/colis" element={<NavyRoleRoute role="operatrice"><OperatorParcelsPage /></NavyRoleRoute>} />
          <Route path="operatrice/paiements" element={<NavyRoleRoute role="operatrice"><OperatorPaymentsPage /></NavyRoleRoute>} />
          <Route path="*" element={<Navigate to="/navy" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
