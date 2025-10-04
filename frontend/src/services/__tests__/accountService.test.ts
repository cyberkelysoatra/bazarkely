import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import accountService from '../accountService'
import { db } from '../../lib/database'

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    accounts: {
      add: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn(),
      first: vi.fn()
    },
    transactions: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }
  }
}))

describe('AccountService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('createAccount', () => {
    it('should create a new account', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 0,
        currency: 'MGA' as const,
        isDefault: false,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.add).mockResolvedValue(1)

      const result = await accountService.createAccount({
        name: 'Compte Principal',
        type: 'courant',
        balance: 0
      }, 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: 'Compte Principal',
        type: 'courant',
        balance: 0,
        currency: 'MGA'
      })
      expect(db.accounts.add).toHaveBeenCalled()
    })

    it('should create a Mobile Money account', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Orange Money',
        type: 'orange_money' as const,
        balance: 0,
        currency: 'MGA' as const,
        isDefault: false,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.add).mockResolvedValue(1)

      const result = await accountService.createAccount({
        name: 'Orange Money',
        type: 'orange_money',
        balance: 0
      }, 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        name: 'Orange Money',
        type: 'orange_money',
        balance: 0
      })
    })

    it('should handle database errors', async () => {
      vi.mocked(db.accounts.add).mockRejectedValue(new Error('Database error'))

      const result = await accountService.createAccount({
        name: 'Compte Principal',
        type: 'courant',
        balance: 0
      }, 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur lors de la création du compte')
    })
  })

  describe('getAccounts', () => {
    it('should return accounts for a user', async () => {
      const mockAccounts = [
        {
          id: '1',
          userId: 'user1',
          name: 'Compte Principal',
          type: 'courant' as const,
          balance: 100000,
          currency: 'MGA' as const,
          isDefault: true,
          createdAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          name: 'Orange Money',
          type: 'orange_money' as const,
          balance: 50000,
          currency: 'MGA' as const,
          isDefault: false,
          createdAt: new Date()
        }
      ]

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.toArray).mockResolvedValue(mockAccounts)

      const result = await accountService.getAccounts('user1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAccounts)
    })

    it('should handle database errors', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.toArray).mockRejectedValue(new Error('Database error'))

      const result = await accountService.getAccounts('user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur lors de la récupération des comptes')
    })
  })

  describe('getAccountById', () => {
    it('should return account by ID', async () => {
      const mockAccount = {
        id: '1',
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

      const result = await accountService.getAccountById('1', 'user1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAccount)
    })

    it('should return error if account not found', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(null)

      const result = await accountService.getAccountById('nonexistent', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Compte non trouvé')
    })
  })

  describe('updateAccount', () => {
    it('should update existing account', async () => {
      const mockAccount = {
        id: '1',
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
      vi.mocked(db.accounts.put).mockResolvedValue(1)

      const result = await accountService.updateAccount('1', {
        name: 'Compte Principal Mis à Jour',
        balance: 150000
      }, 'user1')

      expect(result.success).toBe(true)
      expect(db.accounts.put).toHaveBeenCalledWith('1', {
        ...mockAccount,
        name: 'Compte Principal Mis à Jour',
        balance: 150000
      })
    })

    it('should return error if account not found', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(null)

      const result = await accountService.updateAccount('nonexistent', {
        name: 'Updated'
      }, 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Compte non trouvé')
    })
  })

  describe('deleteAccount', () => {
    it('should delete existing account', async () => {
      const mockAccount = {
        id: '1',
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
      vi.mocked(db.accounts.delete).mockResolvedValue(1)

      const result = await accountService.deleteAccount('1', 'user1')

      expect(result.success).toBe(true)
      expect(db.accounts.delete).toHaveBeenCalledWith('1')
    })

    it('should return error if account not found', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(null)

      const result = await accountService.deleteAccount('nonexistent', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Compte non trouvé')
    })

    it('should return error if account has transactions', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: true,
        createdAt: new Date()
      }

      const mockTransactions = [
        {
          id: '1',
          userId: 'user1',
          accountId: '1',
          type: 'income' as const,
          amount: 100000,
          description: 'Salaire',
          category: 'alimentation' as const,
          date: new Date(),
          createdAt: new Date()
        }
      ]

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.transactions.where).mockReturnThis()
      vi.mocked(db.transactions.equals).mockReturnThis()
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockTransactions)

      const result = await accountService.deleteAccount('1', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Impossible de supprimer un compte avec des transactions')
    })
  })

  describe('getTotalBalance', () => {
    it('should return total balance for all accounts', async () => {
      const mockAccounts = [
        {
          id: '1',
          userId: 'user1',
          name: 'Compte Principal',
          type: 'courant' as const,
          balance: 100000,
          currency: 'MGA' as const,
          isDefault: true,
          createdAt: new Date()
        },
        {
          id: '2',
          userId: 'user1',
          name: 'Orange Money',
          type: 'orange_money' as const,
          balance: 50000,
          currency: 'MGA' as const,
          isDefault: false,
          createdAt: new Date()
        }
      ]

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.toArray).mockResolvedValue(mockAccounts)

      const result = await accountService.getTotalBalance('user1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(150000)
    })

    it('should return 0 if no accounts', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.toArray).mockResolvedValue([])

      const result = await accountService.getTotalBalance('user1')

      expect(result.success).toBe(true)
      expect(result.data).toBe(0)
    })
  })

  describe('getAccountsByType', () => {
    it('should return accounts filtered by type', async () => {
      const mockAccounts = [
        {
          id: '1',
          userId: 'user1',
          name: 'Orange Money',
          type: 'orange_money' as const,
          balance: 50000,
          currency: 'MGA' as const,
          isDefault: false,
          createdAt: new Date()
        }
      ]

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.toArray).mockResolvedValue(mockAccounts)

      const result = await accountService.getAccountsByType('user1', 'orange_money')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockAccounts)
    })
  })

  describe('setDefaultAccount', () => {
    it('should set account as default', async () => {
      const mockAccount = {
        id: '1',
        userId: 'user1',
        name: 'Compte Principal',
        type: 'courant' as const,
        balance: 100000,
        currency: 'MGA' as const,
        isDefault: false,
        createdAt: new Date()
      }

      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(mockAccount)
      vi.mocked(db.accounts.put).mockResolvedValue(1)

      const result = await accountService.setDefaultAccount('1', 'user1')

      expect(result.success).toBe(true)
      expect(db.accounts.put).toHaveBeenCalledWith('1', {
        ...mockAccount,
        isDefault: true
      })
    })

    it('should return error if account not found', async () => {
      vi.mocked(db.accounts.where).mockReturnThis()
      vi.mocked(db.accounts.equals).mockReturnThis()
      vi.mocked(db.accounts.first).mockResolvedValue(null)

      const result = await accountService.setDefaultAccount('nonexistent', 'user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Compte non trouvé')
    })
  })
})
