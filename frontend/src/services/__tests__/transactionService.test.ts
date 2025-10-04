import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import transactionService from '../transactionService'
import { db } from '../../lib/database'

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    transactions: {
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      orderBy: vi.fn().mockReturnThis(),
      reverse: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      first: vi.fn()
    },
    accounts: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      put: vi.fn()
    }
  }
}))

describe('TransactionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createTransaction', () => {
    it('should create a new income transaction', async () => {
      const mockTransaction = {
        id: '1',
        userId: 'user1',
        accountId: 'account1',
        type: 'income' as const,
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation' as const,
        date: new Date('2024-01-01'),
        createdAt: new Date()
      }

      const mockAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 50000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.transactions.add).mockResolvedValue(1)

      const result = await transactionService.createTransaction({
        type: 'income',
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation',
        accountId: 'account1',
        date: new Date('2024-01-01')
      }, 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'income',
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation'
      })
      expect(db.transactions.add).toHaveBeenCalled()
      expect(db.accounts.put).toHaveBeenCalledWith('account1', {
        ...mockAccount,
        balance: 150000
      })
    })

    it('should create a new expense transaction', async () => {
      const mockTransaction = {
        id: '1',
        userId: 'user1',
        accountId: 'account1',
        type: 'expense' as const,
        amount: 50000,
        description: 'Courses',
        category: 'alimentation' as const,
        date: new Date('2024-01-01'),
        createdAt: new Date()
      }

      const mockAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.transactions.add).mockResolvedValue(1)

      const result = await transactionService.createTransaction({
        type: 'expense',
        amount: 50000,
        description: 'Courses',
        category: 'alimentation',
        accountId: 'account1',
        date: new Date('2024-01-01')
      }, 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'expense',
        amount: 50000,
        description: 'Courses',
        category: 'alimentation'
      })
      expect(db.accounts.put).toHaveBeenCalledWith('account1', {
        ...mockAccount,
        balance: 50000
      })
    })

    it('should create a transfer transaction', async () => {
      const mockFromAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      const mockToAccount = {
        id: 'account2',
        userId: 'user1',
        name: 'Épargne',
        type: 'epargne' as const,
        balance: 50000,
        currency: 'MGA' as const,
        isDefault: false,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first)
        .mockResolvedValueOnce(mockFromAccount)
        .mockResolvedValueOnce(mockToAccount)
      vi.mocked(db.transactions.add).mockResolvedValue(1)

      const result = await transactionService.createTransaction({
        type: 'transfer',
        amount: 25000,
        description: 'Transfert vers épargne',
        category: 'alimentation',
        accountId: 'account1',
        targetAccountId: 'account2',
        date: new Date('2024-01-01')
      }, 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        type: 'transfer',
        amount: 25000,
        targetAccountId: 'account2'
      })
      expect(db.accounts.put).toHaveBeenCalledWith('account1', {
        ...mockFromAccount,
        balance: 75000
      })
      expect(db.accounts.put).toHaveBeenCalledWith('account2', {
        ...mockToAccount,
        balance: 75000
      })
    })

    it('should return error if account not found', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(null)

      const result = await transactionService.createTransaction({
        type: 'income',
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation',
        accountId: 'nonexistent',
        date: new Date('2024-01-01')
      }, 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Compte non trouvé')
    })

    it('should return error for insufficient funds', async () => {
      const mockAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 10000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)

      const result = await transactionService.createTransaction({
        type: 'expense',
        amount: 50000,
        description: 'Courses',
        category: 'alimentation',
        accountId: 'account1',
        date: new Date('2024-01-01')
      }, 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Solde insuffisant')
    })
  })

  describe('getTransactions', () => {
    it('should return transactions for a user', async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: 'user1',
          accountId: 'account1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          accountId: 'account1',
          type: 'expense' as const,
          amount: 50000,
          description: 'Courses',
          category: 'alimentation' as const,
          date: new Date('2024-01-02'),
          createdAt: new Date()
        }
      ]

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.orderBy).mockReturnThis()
      vi.mocked(db.transactions.reverse).mockReturnThis()
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockTransactions)

      const result = await transactionService.getTransactions('user1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransactions)
    })

    it('should return transactions with filters', async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: 'user1',
          accountId: 'account1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        }
      ]

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.orderBy).mockReturnThis()
      vi.mocked(db.transactions.reverse).mockReturnThis()
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockTransactions)

      const result = await transactionService.getTransactions('user1', {
        type: 'income',
        category: 'alimentation',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      })

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransactions)
    })
  })

  describe('getTransactionById', () => {
    it('should return transaction by ID', async () => {
      const mockTransaction = {
        id: '1',
        userId: 'user1',
        accountId: 'account1',
        type: 'income' as const,
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation' as const,
        date: new Date('2024-01-01'),
        createdAt: new Date()
      }

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(mockTransaction)

      const result = await transactionService.getTransactionById('1', 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransaction)
    })

    it('should return error if transaction not found', async () => {
      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(null)

      const result = await transactionService.getTransactionById('nonexistent', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction non trouvée')
    })
  })

  describe('updateTransaction', () => {
    it('should update existing transaction', async () => {
      const mockTransaction = {
        id: '1',
        userId: 'user1',
        accountId: 'account1',
        type: 'income' as const,
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation' as const,
        date: new Date('2024-01-01'),
        createdAt: new Date()
      }

      const mockAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(mockTransaction)
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.transactions.put).mockResolvedValue(1)

      const result = await transactionService.updateTransaction('1', {
        description: 'Salaire mis à jour',
        amount: 120000
      }, 'user1')

      expect(result.success).toBe(true)
      expect(db.transactions.put).toHaveBeenCalled()
    })

    it('should return error if transaction not found', async () => {
      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(null)

      const result = await transactionService.updateTransaction('nonexistent', {
        description: 'Updated'
      }, 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction non trouvée')
    })
  })

  describe('deleteTransaction', () => {
    it('should delete existing transaction', async () => {
      const mockTransaction = {
        id: '1',
        userId: 'user1',
        accountId: 'account1',
        type: 'income' as const,
        amount: 100000,
        description: 'Salaire',
        category: 'alimentation' as const,
        date: new Date('2024-01-01'),
        createdAt: new Date()
      }

      const mockAccount = {
        id: 'account1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(mockTransaction)
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.transactions.delete).mockResolvedValue(1)

      const result = await transactionService.deleteTransaction('1', 'user1')

      expect(result.success).toBe(true)
      expect(db.transactions.delete).toHaveBeenCalledWith('1')
    })

    it('should return error if transaction not found', async () => {
      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.first).mockResolvedValue(null)

      const result = await transactionService.deleteTransaction('nonexistent', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Transaction non trouvée')
    })
  })

  describe('getTransactionsByCategory', () => {
    it('should return transactions filtered by category', async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: 'user1',
          accountId: 'account1',
          type: 'expense' as const,
          amount: 50000,
          description: 'Courses',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        }
      ]

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.orderBy).mockReturnThis()
      vi.mocked(db.transactions.reverse).mockReturnThis()
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockTransactions)

      const result = await transactionService.getTransactionsByCategory('user1', 'alimentation')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockTransactions)
    })
  })

  describe('getMonthlyStats', () => {
    it('should return monthly statistics', async () => {
      const mockTransactions = [
        {
          id: '1',
          userId: 'user1',
          accountId: 'account1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date('2024-01-01'),
          createdAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          accountId: 'account1',
          type: 'expense' as const,
          amount: 50000,
          description: 'Courses',
          category: 'alimentation' as const,
          date: new Date('2024-01-02'),
          createdAt: new Date()
        }
      ]

      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.orderBy).mockReturnThis()
      vi.mocked(db.transactions.reverse).mockReturnThis()
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockTransactions)

      const result = await transactionService.getMonthlyStats('user1', 2024, 1)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        totalIncome: 100000,
        totalExpenses: 50000,
        netIncome: 50000,
        transactionCount: 2
      })
    })
  })
})
