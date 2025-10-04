import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import DashboardPage from '../DashboardPage'
import { useAppStore } from '../../stores/appStore'
import transactionService from '../../services/transactionService'

// Mock the app store
vi.mock('../../stores/appStore', () => ({
  useAppStore: vi.fn()
}))

// Mock the transaction service
vi.mock('../../services/transactionService', () => ({
  default: {
    getMonthlyStats: vi.fn(),
    getRecentTransactions: vi.fn()
  }
}))

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    accounts: {
      toArray: vi.fn()
    },
    budgets: {
      toArray: vi.fn()
    },
    goals: {
      toArray: vi.fn()
    }
  }
}))

// Mock React Router
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => children
}))

const MockedDashboardPage = () => (
  <BrowserRouter>
    <DashboardPage />
  </BrowserRouter>
)

describe('DashboardPage', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    phone: '123456789',
    role: 'user' as const,
    passwordHash: 'hashed',
    preferences: {
      theme: 'light' as const,
      language: 'fr' as const,
      currency: 'MGA'
    },
    createdAt: new Date()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Mock store state
    vi.mocked(useAppStore).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      setUser: vi.fn(),
      setAuthenticated: vi.fn(),
      isOnline: true,
      lastSync: new Date(),
      theme: 'light',
      language: 'fr'
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading spinner initially', () => {
      render(<MockedDashboardPage />)
      
      expect(screen.getByText('Chargement...')).toBeInTheDocument()
    })
  })

  describe('Dashboard Stats', () => {
    it('should display dashboard statistics', async () => {
      const mockAccounts = [
        {
          id: '1',
          userId: '1',
          name: 'Compte Principal',
          type: 'courant' as const,
          balance: 100000,
          currency: 'MGA' as const,
          isDefault: true,
          createdAt: new Date()
        },
        {
          id: '2',
          userId: '1',
          name: 'Orange Money',
          type: 'orange_money' as const,
          balance: 50000,
          currency: 'MGA' as const,
          isDefault: false,
          createdAt: new Date()
        }
      ]

      const mockBudgets = [
        {
          id: '1',
          userId: '1',
          category: 'alimentation' as const,
          amount: 50000,
          spent: 30000,
          period: 'monthly' as const,
          year: 2024,
          month: 1,
          alertThreshold: 80
        }
      ]

      const mockGoals = [
        {
          id: '1',
          userId: '1',
          name: 'Vacances',
          targetAmount: 1000000,
          currentAmount: 300000,
          deadline: new Date('2024-12-31'),
          priority: 'high' as const
        }
      ]

      const mockStats = {
        totalIncome: 150000,
        totalExpenses: 80000,
        netIncome: 70000,
        transactionCount: 5
      }

      const mockRecentTransactions = [
        {
          id: '1',
          userId: '1',
          accountId: '1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        },
        {
          id: '2',
          userId: '1',
          accountId: '1',
          type: 'expense' as const,
          amount: 50000,
          description: 'Courses',
          category: 'alimentation' as const,
          date: new Date('2024-01-02'),
          createdAt: new Date()
        }
      ]

      // Mock database calls
      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue(mockAccounts)
      vi.mocked(db.budgets.toArray).mockResolvedValue(mockBudgets)
      vi.mocked(db.goals.toArray).mockResolvedValue(mockGoals)

      // Mock service calls
      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: mockStats
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: mockRecentTransactions
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('150 000 MGA')).toBeInTheDocument() // Total balance
        expect(screen.getByText('150 000 MGA')).toBeInTheDocument() // Monthly income
        expect(screen.getByText('80 000 MGA')).toBeInTheDocument() // Monthly expenses
        expect(screen.getByText('70 000 MGA')).toBeInTheDocument() // Net income
      })
    })

    it('should handle service errors gracefully', async () => {
      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: false,
        error: 'Service error'
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: false,
        error: 'Service error'
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('0 MGA')).toBeInTheDocument() // Default values
      })
    })
  })

  describe('Quick Actions', () => {
    it('should display quick action buttons', async () => {
      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Ajouter une transaction')).toBeInTheDocument()
        expect(screen.getByText('Voir les comptes')).toBeInTheDocument()
        expect(screen.getByText('Gérer les budgets')).toBeInTheDocument()
        expect(screen.getByText('Mes objectifs')).toBeInTheDocument()
      })
    })
  })

  describe('Recent Transactions', () => {
    it('should display recent transactions', async () => {
      const mockRecentTransactions = [
        {
          id: '1',
          userId: '1',
          accountId: '1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        },
        {
          id: '2',
          userId: '1',
          accountId: '1',
          type: 'expense' as const,
          amount: 50000,
          description: 'Courses',
          category: 'alimentation' as const,
          date: new Date('2024-01-02'),
          createdAt: new Date()
        }
      ]

      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: mockRecentTransactions
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Salaire')).toBeInTheDocument()
        expect(screen.getByText('Courses')).toBeInTheDocument()
        expect(screen.getByText('+100 000 MGA')).toBeInTheDocument()
        expect(screen.getByText('-50 000 MGA')).toBeInTheDocument()
      })
    })

    it('should show empty state when no recent transactions', async () => {
      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Aucune transaction récente')).toBeInTheDocument()
      })
    })
  })

  describe('Budget Alerts', () => {
    it('should display budget alerts', async () => {
      const mockBudgets = [
        {
          id: '1',
          userId: '1',
          category: 'alimentation' as const,
          amount: 50000,
          spent: 45000,
          period: 'monthly' as const,
          year: 2024,
          month: 1,
          alertThreshold: 80
        }
      ]

      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue(mockBudgets)
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Alerte Budget')).toBeInTheDocument()
        expect(screen.getByText('Alimentation')).toBeInTheDocument()
        expect(screen.getByText('90% utilisé')).toBeInTheDocument()
      })
    })
  })

  describe('Goals Progress', () => {
    it('should display goals progress', async () => {
      const mockGoals = [
        {
          id: '1',
          userId: '1',
          name: 'Vacances',
          targetAmount: 1000000,
          currentAmount: 300000,
          deadline: new Date('2024-12-31'),
          priority: 'high' as const
        }
      ]

      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue(mockGoals)

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Objectifs')).toBeInTheDocument()
        expect(screen.getByText('Vacances')).toBeInTheDocument()
        expect(screen.getByText('30%')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate to different pages when buttons are clicked', async () => {
      const mockNavigate = vi.fn()
      vi.mocked(require('react-router-dom').useNavigate).mockReturnValue(mockNavigate)

      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        const addTransactionBtn = screen.getByText('Ajouter une transaction')
        fireEvent.click(addTransactionBtn)
        expect(mockNavigate).toHaveBeenCalledWith('/add-transaction')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockRejectedValue(new Error('Database error'))

      render(<MockedDashboardPage />)

      await waitFor(() => {
        expect(screen.getByText('Erreur lors du chargement des données')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should be responsive on mobile', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })

      const { db } = await import('../../lib/database')
      vi.mocked(db.accounts.toArray).mockResolvedValue([])
      vi.mocked(db.budgets.toArray).mockResolvedValue([])
      vi.mocked(db.goals.toArray).mockResolvedValue([])

      vi.mocked(transactionService.getMonthlyStats).mockResolvedValue({
        success: true,
        data: { totalIncome: 0, totalExpenses: 0, netIncome: 0, transactionCount: 0 }
      })
      vi.mocked(transactionService.getRecentTransactions).mockResolvedValue({
        success: true,
        data: []
      })

      render(<MockedDashboardPage />)

      await waitFor(() => {
        const container = screen.getByTestId('dashboard-container')
        expect(container).toHaveClass('mobile-first')
      })
    })
  })
})
