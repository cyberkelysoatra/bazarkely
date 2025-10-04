import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the database
vi.mock('../../lib/database', () => ({
  db: {
    users: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      first: vi.fn(),
      put: vi.fn()
    },
    budgets: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    },
    goals: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      toArray: vi.fn()
    }
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn()
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock Notification API
const mockNotification = {
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
}

const mockNotificationConstructor = vi.fn().mockImplementation(() => mockNotification)
mockNotificationConstructor.permission = 'granted'
mockNotificationConstructor.requestPermission = vi.fn().mockResolvedValue('granted')

Object.defineProperty(window, 'Notification', {
  value: mockNotificationConstructor,
  writable: true
})

// Mock Service Worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    ready: Promise.resolve({
      installing: null,
      waiting: null,
      active: { state: 'activated' },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }),
    controller: {
      postMessage: vi.fn()
    }
  },
  writable: true
})

describe('NotificationService - Basic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic functionality', () => {
    it('should be importable', async () => {
      const { default: notificationService } = await import('../notificationService')
      expect(notificationService).toBeDefined()
    })

    it('should have required methods', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      expect(typeof notificationService.initialize).toBe('function')
      expect(typeof notificationService.requestPermission).toBe('function')
      expect(typeof notificationService.isPermissionGranted).toBe('function')
      expect(typeof notificationService.sendNotification).toBe('function')
      expect(typeof notificationService.scheduleNotification).toBe('function')
      expect(typeof notificationService.checkBudgetAlerts).toBe('function')
      expect(typeof notificationService.checkGoalReminders).toBe('function')
      expect(typeof notificationService.checkMadagascarSpecificNotifications).toBe('function')
      expect(typeof notificationService.sendSyncNotification).toBe('function')
      expect(typeof notificationService.sendSecurityAlert).toBe('function')
      expect(typeof notificationService.sendMobileMoneyNotification).toBe('function')
      expect(typeof notificationService.getPreferences).toBe('function')
      expect(typeof notificationService.savePreferences).toBe('function')
    })

    it('should initialize successfully', async () => {
      const { default: notificationService } = await import('../notificationService')
      const result = await notificationService.initialize()
      expect(result).toBe(true)
    })

    it('should request permission successfully', async () => {
      const { default: notificationService } = await import('../notificationService')
      const result = await notificationService.requestPermission()
      expect(result).toBe('granted')
    })

    it('should check permission correctly', async () => {
      const { default: notificationService } = await import('../notificationService')
      const result = notificationService.isPermissionGranted()
      expect(typeof result).toBe('boolean')
    })

    it('should get default preferences', async () => {
      const { default: notificationService } = await import('../notificationService')
      const preferences = notificationService.getPreferences()
      expect(preferences).toBeDefined()
      expect(preferences?.budgetAlerts).toBe(true)
      expect(preferences?.goalReminders).toBe(true)
      expect(preferences?.mobileMoneyAlerts).toBe(true)
    })

    it('should handle budget alerts', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      // Mock budget data
      const mockBudgets = [
        {
          id: '1',
          userId: 'user1',
          category: 'alimentation' as const,
          amount: 50000,
          spent: 45000,
          month: new Date().getMonth(),
          year: new Date().getFullYear()
        }
      ]

      const { db } = await import('../../lib/database')
      vi.mocked(db.budgets.where).mockReturnThis()
      vi.mocked(db.budgets.equals).mockReturnThis()
      vi.mocked(db.budgets.toArray).mockResolvedValue(mockBudgets)

      // Should not throw error
      await expect(notificationService.checkBudgetAlerts('user1')).resolves.toBeUndefined()
    })

    it('should handle goal reminders', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      // Mock goal data
      const mockGoals = [
        {
          id: '1',
          userId: 'user1',
          name: 'Vacances',
          targetAmount: 1000000,
          currentAmount: 300000,
          deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
        }
      ]

      const { db } = await import('../../lib/database')
      vi.mocked(db.goals.where).mockReturnThis()
      vi.mocked(db.goals.equals).mockReturnThis()
      vi.mocked(db.goals.toArray).mockResolvedValue(mockGoals)

      // Should not throw error
      await expect(notificationService.checkGoalReminders('user1')).resolves.toBeUndefined()
    })

    it('should handle Madagascar notifications', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      // Mock Friday (day 5)
      const mockDate = new Date('2024-01-05') // Friday
      vi.setSystemTime(mockDate)

      // Should not throw error
      await expect(notificationService.checkMadagascarSpecificNotifications('user1')).resolves.toBeUndefined()
    })

    it('should send sync notifications', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      // Should not throw error
      await expect(notificationService.sendSyncNotification('user1', 'success')).resolves.toBeUndefined()
      await expect(notificationService.sendSyncNotification('user1', 'error', 'Test error')).resolves.toBeUndefined()
    })

    it('should send security alerts', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      // Should not throw error
      await expect(notificationService.sendSecurityAlert('user1', 'new_device')).resolves.toBeUndefined()
      await expect(notificationService.sendSecurityAlert('user1', 'suspicious_activity', 'Test activity')).resolves.toBeUndefined()
    })

    it('should send mobile money notifications', async () => {
      const { default: notificationService } = await import('../notificationService')
      
      const data = {
        operator: 'orange_money',
        amount: 25000,
        direction: 'sent'
      }

      // Should not throw error
      await expect(notificationService.sendMobileMoneyNotification('user1', 'transaction', data)).resolves.toBeUndefined()
    })

    it('should save preferences', async () => {
      const { default: notificationService } = await import('../notificationService')
      
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

      const { db } = await import('../../lib/database')
      vi.mocked(db.users.put).mockResolvedValue(1)
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))

      const newPreferences = {
        budgetAlerts: false,
        goalReminders: true,
        transactionReminders: true,
        syncNotifications: false,
        securityAlerts: true,
        mobileMoneyAlerts: false,
        seasonalReminders: true,
        familyEventReminders: true,
        marketDayReminders: true,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '07:00'
        },
        frequency: 'immediate' as const
      }

      const result = await notificationService.savePreferences(newPreferences)
      expect(result).toBe(true)
    })
  })
})
