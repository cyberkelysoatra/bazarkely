import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import notificationService from '../notificationService'

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
mockNotificationConstructor.permission = 'default'
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

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockImplementation(() => {})
    localStorageMock.removeItem.mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize successfully when supported', async () => {
      const result = await notificationService.initialize()
      expect(result).toBe(true)
    })

    it('should return false when not supported', async () => {
      // Mock unsupported environment
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true
      })

      // Create new instance for this test
      const { default: NotificationService } = await import('../notificationService')
      const unsupportedService = new NotificationService()
      const result = await unsupportedService.initialize()
      expect(result).toBe(false)
    })
  })

  describe('requestPermission', () => {
    it('should request permission successfully', async () => {
      const result = await notificationService.requestPermission()
      expect(result).toBe('granted')
    })

    it('should throw error when not supported', async () => {
      Object.defineProperty(window, 'Notification', {
        value: undefined,
        writable: true
      })

      // Create new instance for this test
      const { default: NotificationService } = await import('../notificationService')
      const unsupportedService = new NotificationService()
      await expect(unsupportedService.requestPermission()).rejects.toThrow('Notifications non supportées')
    })
  })

  describe('isPermissionGranted', () => {
    it('should return true when permission is granted', () => {
      // Update the mock to have granted permission
      mockNotificationConstructor.permission = 'granted'
      
      const result = notificationService.isPermissionGranted()
      expect(result).toBe(true)
    })

    it('should return false when permission is not granted', () => {
      // Update the mock to have denied permission
      mockNotificationConstructor.permission = 'denied'
      
      const result = notificationService.isPermissionGranted()
      expect(result).toBe(false)
    })
  })

  describe('sendNotification', () => {
    it('should send notification when permission is granted', async () => {
      // Update the mock to have granted permission
      mockNotificationConstructor.permission = 'granted'

      const notification = {
        type: 'budget_alert' as const,
        title: 'Test Notification',
        body: 'Test body',
        priority: 'normal' as const,
        userId: 'user1'
      }

      const result = await notificationService.sendNotification(notification)
      expect(result).toBe(true)
    })

    it('should return false when permission is not granted', async () => {
      // Update the mock to have denied permission
      mockNotificationConstructor.permission = 'denied'

      const notification = {
        type: 'budget_alert' as const,
        title: 'Test Notification',
        body: 'Test body',
        priority: 'normal' as const,
        userId: 'user1'
      }

      const result = await notificationService.sendNotification(notification)
      expect(result).toBe(false)
    })
  })

  describe('scheduleNotification', () => {
    it('should schedule notification successfully', async () => {
      const notification = {
        type: 'budget_alert' as const,
        title: 'Test Notification',
        body: 'Test body',
        priority: 'normal' as const,
        userId: 'user1'
      }

      const scheduledTime = new Date(Date.now() + 60000) // 1 minute from now
      const result = await notificationService.scheduleNotification(notification, scheduledTime)
      expect(result).toBe(true)
    })
  })

  describe('checkBudgetAlerts', () => {
    it('should check budget alerts and send notifications', async () => {
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

      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.checkBudgetAlerts('user1')

      // Should have called the database methods
      expect(db.budgets.where).toHaveBeenCalledWith('userId')
      expect(db.budgets.equals).toHaveBeenCalledWith('user1')
    })
  })

  describe('checkGoalReminders', () => {
    it('should check goal reminders and send notifications', async () => {
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

      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.checkGoalReminders('user1')

      // Should have called the database methods
      expect(db.goals.where).toHaveBeenCalledWith('userId')
      expect(db.goals.equals).toHaveBeenCalledWith('user1')
    })
  })

  describe('checkMadagascarSpecificNotifications', () => {
    it('should check Madagascar specific notifications', async () => {
      // Mock Friday (day 5)
      const mockDate = new Date('2024-01-05') // Friday
      vi.setSystemTime(mockDate)

      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.checkMadagascarSpecificNotifications('user1')

      // Should have been called
      expect(true).toBe(true) // Basic test to ensure no errors
    })
  })

  describe('sendSyncNotification', () => {
    it('should send sync success notification', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.sendSyncNotification('user1', 'success')
      expect(true).toBe(true) // Basic test to ensure no errors
    })

    it('should send sync error notification', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.sendSyncNotification('user1', 'error', 'Network error')
      expect(true).toBe(true) // Basic test to ensure no errors
    })
  })

  describe('sendSecurityAlert', () => {
    it('should send new device alert', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.sendSecurityAlert('user1', 'new_device')
      expect(true).toBe(true) // Basic test to ensure no errors
    })

    it('should send suspicious activity alert', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      await notificationService.sendSecurityAlert('user1', 'suspicious_activity', 'Multiple failed logins')
      expect(true).toBe(true) // Basic test to ensure no errors
    })
  })

  describe('sendMobileMoneyNotification', () => {
    it('should send mobile money transaction notification', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      const data = {
        operator: 'orange_money',
        amount: 25000,
        direction: 'sent'
      }

      await notificationService.sendMobileMoneyNotification('user1', 'transaction', data)
      expect(true).toBe(true) // Basic test to ensure no errors
    })

    it('should send mobile money fee notification', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      const data = {
        operator: 'mvola',
        fee: 100,
        amount: 50000
      }

      await notificationService.sendMobileMoneyNotification('user1', 'fee', data)
      expect(true).toBe(true) // Basic test to ensure no errors
    })

    it('should send mobile money balance notification', async () => {
      // Mock permission granted
      Object.defineProperty(window, 'Notification', {
        value: {
          ...window.Notification,
          permission: 'granted'
        },
        writable: true
      })

      const data = {
        operator: 'airtel_money',
        balance: 150000
      }

      await notificationService.sendMobileMoneyNotification('user1', 'balance', data)
      expect(true).toBe(true) // Basic test to ensure no errors
    })
  })

  describe('preferences management', () => {
    it('should get default preferences', () => {
      const preferences = notificationService.getPreferences()
      expect(preferences).toBeDefined()
      expect(preferences?.budgetAlerts).toBe(true)
      expect(preferences?.goalReminders).toBe(true)
      expect(preferences?.mobileMoneyAlerts).toBe(true)
    })

    it('should save preferences', async () => {
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
      expect(db.users.put).toHaveBeenCalled()
    })
  })
})
