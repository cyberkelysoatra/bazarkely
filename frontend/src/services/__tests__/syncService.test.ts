import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import syncService from '../syncService'
import { db } from '../../lib/database'

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    syncQueue: {
      add: vi.fn(),
      toArray: vi.fn(),
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      delete: vi.fn(),
      clear: vi.fn()
    },
    users: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      put: vi.fn()
    },
    accounts: {
      toArray: vi.fn(),
      bulkPut: vi.fn()
    },
    transactions: {
      toArray: vi.fn(),
      bulkPut: vi.fn()
    },
    budgets: {
      toArray: vi.fn(),
      bulkPut: vi.fn()
    },
    goals: {
      toArray: vi.fn(),
      bulkPut: vi.fn()
    }
  }
}))

// Mock the API service
vi.mock('../apiService', () => ({
  default: {
    syncData: vi.fn(),
    getServerData: vi.fn()
  }
}))

describe('SyncService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('addToSyncQueue', () => {
    it('should add operation to sync queue', async () => {
      const operation = {
        userId: 'user1',
        operation: 'CREATE' as const,
        table_name: 'transactions' as const,
        data: { id: '1', amount: 100000 },
        timestamp: new Date()
      }

      vi.mocked(db.syncQueue.add).mockResolvedValue(1)

      const result = await syncService.addToSyncQueue(operation)

      expect(result.success).toBe(true)
      expect(db.syncQueue.add).toHaveBeenCalledWith({
        ...operation,
        retryCount: 0,
        status: 'pending'
      })
    })

    it('should handle database errors', async () => {
      const operation = {
        userId: 'user1',
        operation: 'CREATE' as const,
        table_name: 'transactions' as const,
        data: { id: '1', amount: 100000 },
        timestamp: new Date()
      }

      vi.mocked(db.syncQueue.add).mockRejectedValue(new Error('Database error'))

      const result = await syncService.addToSyncQueue(operation)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur lors de l\'ajout à la file de synchronisation')
    })
  })

  describe('processSyncQueue', () => {
    it('should process pending operations', async () => {
      const mockOperations = [
        {
          id: 1,
          userId: 'user1',
          operation: 'CREATE' as const,
          table_name: 'transactions' as const,
          data: { id: '1', amount: 100000 },
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as const
        }
      ]

      vi.mocked(db.syncQueue.toArray).mockResolvedValue(mockOperations)
      
      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.syncData).mockResolvedValue({
        success: true,
        data: { synced: true }
      })

      vi.mocked(db.syncQueue.delete).mockResolvedValue(1)

      const result = await syncService.processSyncQueue('user1')

      expect(result.success).toBe(true)
      expect(mockApiService.default.syncData).toHaveBeenCalledWith(mockOperations)
      expect(db.syncQueue.delete).toHaveBeenCalledWith(1)
    })

    it('should handle API errors and retry', async () => {
      const mockOperations = [
        {
          id: 1,
          userId: 'user1',
          operation: 'CREATE' as const,
          table_name: 'transactions' as const,
          data: { id: '1', amount: 100000 },
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as const
        }
      ]

      vi.mocked(db.syncQueue.toArray).mockResolvedValue(mockOperations)
      
      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.syncData).mockResolvedValue({
        success: false,
        error: 'Network error'
      })

      vi.mocked(db.syncQueue.put).mockResolvedValue(1)

      const result = await syncService.processSyncQueue('user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Erreur lors de la synchronisation')
    })

    it('should return early if offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      })

      const result = await syncService.processSyncQueue('user1')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Hors ligne')
    })
  })

  describe('syncWithServer', () => {
    it('should sync local data with server', async () => {
      const mockLocalData = {
        accounts: [{ id: '1', name: 'Compte Principal' }],
        transactions: [{ id: '1', amount: 100000 }],
        budgets: [{ id: '1', amount: 50000 }],
        goals: [{ id: '1', targetAmount: 1000000 }]
      }

      vi.mocked(db.accounts.toArray).mockResolvedValue(mockLocalData.accounts)
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockLocalData.transactions)
      vi.mocked(db.budgets.toArray).mockResolvedValue(mockLocalData.budgets)
      vi.mocked(db.goals.toArray).mockResolvedValue(mockLocalData.goals)

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.syncData).mockResolvedValue({
        success: true,
        data: { synced: true }
      })

      const result = await syncService.syncWithServer('user1')

      expect(result.success).toBe(true)
      expect(mockApiService.default.syncData).toHaveBeenCalledWith({
        accounts: mockLocalData.accounts,
        transactions: mockLocalData.transactions,
        budgets: mockLocalData.budgets,
        goals: mockLocalData.goals
      })
    })

    it('should handle sync conflicts', async () => {
      const mockLocalData = {
        accounts: [{ id: '1', name: 'Compte Principal', balance: 100000 }],
        transactions: [],
        budgets: [],
        goals: []
      }

      const mockServerData = {
        accounts: [{ id: '1', name: 'Compte Principal', balance: 150000 }],
        transactions: [],
        budgets: [],
        goals: []
      }

      vi.mocked(db.accounts.toArray).mockResolvedValue(mockLocalData.accounts)
      vi.mocked(db.transactions.toArray).mockResolvedValue(mockLocalData.transactions)
      vi.mocked(db.budgets.toArray).mockResolvedValue(mockLocalData.budgets)
      vi.mocked(db.goals.toArray).mockResolvedValue(mockLocalData.goals)

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.syncData).mockResolvedValue({
        success: true,
        data: mockServerData
      })

      vi.mocked(db.accounts.bulkPut).mockResolvedValue(undefined)

      const result = await syncService.syncWithServer('user1')

      expect(result.success).toBe(true)
      expect(db.accounts.bulkPut).toHaveBeenCalledWith(mockServerData.accounts)
    })
  })

  describe('getSyncStatus', () => {
    it('should return sync status', async () => {
      const mockOperations = [
        {
          id: 1,
          userId: 'user1',
          operation: 'CREATE' as const,
          table_name: 'transactions' as const,
          data: { id: '1', amount: 100000 },
          timestamp: new Date(),
          retryCount: 0,
          status: 'pending' as const
        }
      ]

      vi.mocked(db.syncQueue.toArray).mockResolvedValue(mockOperations)

      const result = await syncService.getSyncStatus('user1')

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        isOnline: true,
        pendingOperations: 1,
        lastSync: null
      })
    })
  })

  describe('clearSyncQueue', () => {
    it('should clear sync queue for user', async () => {
      vi.mocked(db.syncQueue.where).mockReturnThis()
      vi.mocked(db.syncQueue.equals).mockReturnThis()
      vi.mocked(db.syncQueue.clear).mockResolvedValue(undefined)

      const result = await syncService.clearSyncQueue('user1')

      expect(result.success).toBe(true)
      expect(db.syncQueue.clear).toHaveBeenCalled()
    })
  })

  describe('retryFailedOperations', () => {
    it('should retry failed operations', async () => {
      const mockFailedOperations = [
        {
          id: 1,
          userId: 'user1',
          operation: 'CREATE' as const,
          table_name: 'transactions' as const,
          data: { id: '1', amount: 100000 },
          timestamp: new Date(),
          retryCount: 2,
          status: 'failed' as const
        }
      ]

      vi.mocked(db.syncQueue.where).mockReturnThis()
      vi.mocked(db.syncQueue.equals).mockReturnThis()
      vi.mocked(db.syncQueue.toArray).mockResolvedValue(mockFailedOperations)

      const mockApiService = await import('../apiService')
      vi.mocked(mockApiService.default.syncData).mockResolvedValue({
        success: true,
        data: { synced: true }
      })

      vi.mocked(db.syncQueue.delete).mockResolvedValue(1)

      const result = await syncService.retryFailedOperations('user1')

      expect(result.success).toBe(true)
      expect(mockApiService.default.syncData).toHaveBeenCalledWith(mockFailedOperations)
    })
  })

  describe('getLastSyncTime', () => {
    it('should return last sync time from user data', async () => {
      const mockUser = {
        id: 'user1',
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
        createdAt: new Date(),
        lastSync: new Date('2024-01-01T10:00:00Z')
      }

      vi.mocked(db.users.where).mockReturnThis()
      vi.mocked(db.users.equals).mockReturnThis()
      vi.mocked(db.users.first).mockResolvedValue(mockUser)

      const result = await syncService.getLastSyncTime('user1')

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockUser.lastSync)
    })

    it('should return null if no last sync time', async () => {
      const mockUser = {
        id: 'user1',
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

      vi.mocked(db.users.where).mockReturnThis()
      vi.mocked(db.users.equals).mockReturnThis()
      vi.mocked(db.users.first).mockResolvedValue(mockUser)

      const result = await syncService.getLastSyncTime('user1')

      expect(result.success).toBe(true)
      expect(result.data).toBeNull()
    })
  })

  describe('updateLastSyncTime', () => {
    it('should update last sync time for user', async () => {
      const mockUser = {
        id: 'user1',
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

      vi.mocked(db.users.where).mockReturnThis()
      vi.mocked(db.users.equals).mockReturnThis()
      vi.mocked(db.users.first).mockResolvedValue(mockUser)
      vi.mocked(db.users.put).mockResolvedValue(1)

      const syncTime = new Date('2024-01-01T10:00:00Z')
      const result = await syncService.updateLastSyncTime('user1', syncTime)

      expect(result.success).toBe(true)
      expect(db.users.put).toHaveBeenCalledWith('user1', {
        ...mockUser,
        lastSync: syncTime
      })
    })
  })
})
