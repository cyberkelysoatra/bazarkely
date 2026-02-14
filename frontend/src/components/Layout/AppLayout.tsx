import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'

// Critical pages - keep static imports (critical path)
import AuthPage from '../../pages/AuthPage'
import DashboardPage from '../../pages/DashboardPage'

// Lazy-loaded pages - Code splitting for bundle optimization
const TransactionsPage = lazy(() => import('../../pages/TransactionsPage'))
const TransactionDetailPage = lazy(() => import('../../pages/TransactionDetailPage'))
const AddTransactionPage = lazy(() => import('../../pages/AddTransactionPage'))
const TransferPage = lazy(() => import('../../pages/TransferPage'))
const AccountsPage = lazy(() => import('../../pages/AccountsPage'))
const AccountDetailPage = lazy(() => import('../../pages/AccountDetailPage'))
const AddAccountPage = lazy(() => import('../../pages/AddAccountPage'))
const BudgetsPage = lazy(() => import('../../pages/BudgetsPage'))
const AddBudgetPage = lazy(() => import('../../pages/AddBudgetPage'))
const BudgetReviewPage = lazy(() => import('../../pages/BudgetReviewPage'))
const BudgetStatisticsPage = lazy(() => import('../../pages/BudgetStatisticsPage'))
const PriorityQuestionsPage = lazy(() => import('../../pages/PriorityQuestionsPage'))
const ProfileCompletionPage = lazy(() => import('../../pages/ProfileCompletionPage'))
const RecommendationsPage = lazy(() => import('../../pages/RecommendationsPage'))
const GoalsPage = lazy(() => import('../../pages/GoalsPage'))
const EducationPage = lazy(() => import('../../pages/EducationPage'))
const SettingsPage = lazy(() => import('../../pages/SettingsPage'))
const NotificationPreferencesPage = lazy(() => import('../../pages/NotificationPreferencesPage'))
const AppVersionPage = lazy(() => import('../../pages/AppVersionPage'))
const AdminPage = lazy(() => import('../../pages/AdminPage'))
const PWAInstructionsPage = lazy(() => import('../../pages/PWAInstructionsPage'))
const CertificationPage = lazy(() => import('../../pages/CertificationPage'))
const QuizPage = lazy(() => import('../../pages/QuizPage'))
const QuizResultsPage = lazy(() => import('../../pages/QuizResultsPage'))
const RecurringTransactionsPage = lazy(() => import('../../pages/RecurringTransactionsPage'))
const RecurringTransactionDetailPage = lazy(() => import('../../pages/RecurringTransactionDetailPage'))
const FamilyDashboardPage = lazy(() => import('../../pages/FamilyDashboardPage'))
const FamilySettingsPage = lazy(() => import('../../pages/FamilySettingsPage'))
const FamilyBalancePage = lazy(() => import('../../pages/FamilyBalancePage'))
const FamilyMembersPage = lazy(() => import('../../pages/FamilyMembersPage'))
const FamilyTransactionsPage = lazy(() => import('../../pages/FamilyTransactionsPage'))
const FamilyReimbursementsPage = lazy(() => import('../../pages/FamilyReimbursementsPage'))
const LoansPage = lazy(() => import('../../pages/LoansPage'))

// Analytics Pages - Lazy loaded
const AdvancedAnalytics = lazy(() => import('../Analytics/AdvancedAnalytics'))
const FinancialInsights = lazy(() => import('../Analytics/FinancialInsights'))
const ReportGenerator = lazy(() => import('../Analytics/ReportGenerator'))

// Construction POC Context
import { ConstructionProvider, useConstruction } from '../../modules/construction-poc/context/ConstructionContext'
import ConstructionRoute from '../../modules/construction-poc/components/ConstructionRoute'
import { canAccessBCI } from '../../modules/construction-poc/utils/rolePermissions'

// Family Context
import { FamilyProvider } from '../../contexts/FamilyContext'

// Construction POC Components - Lazy Loading for Code Splitting
const POCDashboard = React.lazy(() => import('../../modules/construction-poc/components/POCDashboard'))
const ProductCatalog = React.lazy(() => import('../../modules/construction-poc/components/ProductCatalog'))
const PurchaseOrderForm = React.lazy(() => import('../../modules/construction-poc/components/PurchaseOrderForm'))
const POCOrdersList = React.lazy(() => import('../../modules/construction-poc/components/POCOrdersList'))
const OrderDetailPage = React.lazy(() => import('../../modules/construction-poc/components/OrderDetailPage'))
const StockManager = React.lazy(() => import('../../modules/construction-poc/components/StockManager'))
const StockTransactions = React.lazy(() => import('../../modules/construction-poc/components/StockTransactions'))
const ConsumptionPlansPage = React.lazy(() => import('../../modules/construction-poc/components/ConsumptionPlansPage'))

// Components
import BottomNav from '../Navigation/BottomNav'
import Header from './Header'

// Loading component for Suspense fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
  </div>
)

// Keep existing LoadingFallback for Construction routes compatibility
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
  </div>
)

// BCIRouteGuard component - Protects BCI routes from unauthorized roles (AGENT 11)
// Must be inside ConstructionProvider to use useConstruction hook
const BCIRouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userRole } = useConstruction();
  
  if (!canAccessBCI(userRole)) {
    return <Navigate to="/construction/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Construction Routes component - Separated to use BCIRouteGuard inside ConstructionProvider
const ConstructionRoutes: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/construction/dashboard" replace />} />
        <Route path="dashboard" element={<POCDashboard />} />
        <Route path="catalog" element={<ProductCatalog />} />
        
        {/* BCI Routes - Protected by AGENT 11 */}
        <Route path="new-order" element={<BCIRouteGuard><PurchaseOrderForm /></BCIRouteGuard>} />
        <Route path="orders" element={<BCIRouteGuard><POCOrdersList /></BCIRouteGuard>} />
        <Route path="orders/:id" element={<BCIRouteGuard><OrderDetailPage /></BCIRouteGuard>} />
        
        <Route path="stock" element={<StockManager />} />
        <Route path="stock/transactions" element={<StockTransactions />} />
        <Route path="consumption-plans" element={<ConsumptionPlansPage />} />
        <Route path="*" element={<Navigate to="/construction/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
};

// Family Routes component - Wrapped with FamilyProvider
const FamilyRoutes: React.FC = () => {
  return (
    <FamilyProvider>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<FamilyDashboardPage />} />
          <Route path="settings" element={<FamilySettingsPage />} />
          <Route path="balance" element={<FamilyBalancePage />} />
          <Route path="members" element={<FamilyMembersPage />} />
          <Route path="transactions" element={<FamilyTransactionsPage />} />
          <Route path="reimbursements" element={<FamilyReimbursementsPage />} />
          <Route path="loans" element={<LoansPage />} />
          <Route path="*" element={<Navigate to="/family" replace />} />
        </Routes>
      </Suspense>
    </FamilyProvider>
  );
};

const AppLayout = () => {
  const { isAuthenticated } = useAppStore()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col overscroll-none">
      <Header />
      <main className="flex-1 pb-20 overscroll-y-auto touch-pan-y">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Critical route - no Suspense needed (static import) */}
            <Route path="/dashboard" element={<DashboardPage />} />
            
            {/* Lazy-loaded routes - wrapped in Suspense */}
            <Route path="/transactions" element={<TransactionsPage />} />
            {/* Route kept for editing only - direct navigation from transaction click disabled */}
            <Route path="/transaction/:transactionId" element={<TransactionDetailPage />} />
            <Route path="/add-transaction" element={<AddTransactionPage />} />
            <Route path="/transfer" element={<TransferPage />} />
            <Route path="/recurring" element={<RecurringTransactionsPage />} />
            <Route path="/recurring/:id" element={<RecurringTransactionDetailPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/account/:accountId" element={<AccountDetailPage />} />
            <Route path="/add-account" element={<AddAccountPage />} />
            <Route path="/budgets/statistics" element={<BudgetStatisticsPage />} />
            <Route path="/budgets" element={<BudgetsPage />} />
            <Route path="/add-budget" element={<AddBudgetPage />} />
            <Route path="/budget-review" element={<BudgetReviewPage />} />
            <Route path="/priority-questions" element={<PriorityQuestionsPage />} />
            <Route path="/profile-completion" element={<ProfileCompletionPage />} />
            <Route path="/recommendations" element={<RecommendationsPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/education" element={<EducationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/notification-preferences" element={<NotificationPreferencesPage />} />
            <Route path="/app-version" element={<AppVersionPage />} />
            
            {/* Admin Route - Protected */}
            <Route path="/admin" element={<AdminPage />} />
            
            {/* PWA Instructions Route */}
            <Route path="/pwa-instructions" element={<PWAInstructionsPage />} />
            
            {/* Certification Route */}
            <Route path="/certification" element={<CertificationPage />} />
            
            {/* Quiz Routes */}
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/quiz-results" element={<QuizResultsPage />} />
            
            {/* Analytics Routes */}
            <Route path="/analytics" element={<AdvancedAnalytics />} />
            <Route path="/insights" element={<FinancialInsights userId={useAppStore.getState().user?.id || ''} />} />
            <Route path="/reports" element={<ReportGenerator />} />
            
            {/* Construction POC Routes - ConstructionProvider now mounted globally in App.tsx */}
            <Route
              path="/construction/*"
              element={
                <ConstructionRoute>
                  <ConstructionRoutes />
                </ConstructionRoute>
              }
            />
            
            {/* Family Routes - Wrapped with FamilyProvider */}
            <Route path="/family/*" element={<FamilyRoutes />} />
            
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </main>
      <BottomNav />
    </div>
  )
}

export default AppLayout