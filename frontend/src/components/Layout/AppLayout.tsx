import { Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '../../stores/appStore'

// Pages
import AuthPage from '../../pages/AuthPage'
import DashboardPage from '../../pages/DashboardPage'
import TransactionsPage from '../../pages/TransactionsPage'
import TransactionDetailPage from '../../pages/TransactionDetailPage'
import AddTransactionPage from '../../pages/AddTransactionPage'
import TransferPage from '../../pages/TransferPage'
import AccountsPage from '../../pages/AccountsPage'
import AccountDetailPage from '../../pages/AccountDetailPage'
import AddAccountPage from '../../pages/AddAccountPage'
import BudgetsPage from '../../pages/BudgetsPage'
import AddBudgetPage from '../../pages/AddBudgetPage'
import BudgetReviewPage from '../../pages/BudgetReviewPage'
import PriorityQuestionsPage from '../../pages/PriorityQuestionsPage'
import ProfileCompletionPage from '../../pages/ProfileCompletionPage'
// import QuizPage from '../../pages/QuizPage' // Disabled - converted to popup system
import RecommendationsPage from '../../pages/RecommendationsPage'
import GoalsPage from '../../pages/GoalsPage'
import EducationPage from '../../pages/EducationPage'
// import SettingsPage from '../../pages/SettingsPage'
import NotificationPreferencesPage from '../../pages/NotificationPreferencesPage'
import AdminPage from '../../pages/AdminPage'
import PWAInstructionsPage from '../../pages/PWAInstructionsPage'
import CertificationPage from '../../pages/CertificationPage'
import QuizPage from '../../pages/QuizPage'
import QuizResultsPage from '../../pages/QuizResultsPage'

// Analytics Pages
import AdvancedAnalytics from '../Analytics/AdvancedAnalytics'
import FinancialInsights from '../Analytics/FinancialInsights'
import ReportGenerator from '../Analytics/ReportGenerator'

// Components
import BottomNav from '../Navigation/BottomNav'
import Header from './Header'

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
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/transaction/:transactionId" element={<TransactionDetailPage />} />
          <Route path="/add-transaction" element={<AddTransactionPage />} />
          <Route path="/transfer" element={<TransferPage />} />
          <Route path="/accounts" element={<AccountsPage />} />
          <Route path="/account/:accountId" element={<AccountDetailPage />} />
          <Route path="/add-account" element={<AddAccountPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/add-budget" element={<AddBudgetPage />} />
          <Route path="/budget-review" element={<BudgetReviewPage />} />
            <Route path="/priority-questions" element={<PriorityQuestionsPage />} />
            <Route path="/profile-completion" element={<ProfileCompletionPage />} />
            {/* <Route path="/quiz" element={<QuizPage />} /> */} {/* Disabled - converted to popup system */}
            <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/education" element={<EducationPage />} />
                  {/* <Route path="/settings" element={<SettingsPage />} /> */}
          <Route path="/notification-preferences" element={<NotificationPreferencesPage />} />
          
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
          
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default AppLayout