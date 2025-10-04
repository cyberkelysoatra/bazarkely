import { useState, useEffect, useCallback } from 'react'
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import notificationService, { NotificationData, NotificationPreferences } from '../services/notificationService'

// TEMPORARY: Minimal local interfaces to unblock the app
interface NotificationData {
  id: string
  type: 'budget_alert' | 'goal_reminder' | 'transaction_reminder' | 'sync_notification' | 'security_alert' | 'mobile_money' | 'seasonal' | 'family_event' | 'market_day'
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  timestamp: Date
  userId: string
  read: boolean
  scheduled?: Date
  priority: 'low' | 'normal' | 'high'
}

interface NotificationPreferences {
  budgetAlerts: boolean
  goalReminders: boolean
  transactionReminders: boolean
  syncNotifications: boolean
  securityAlerts: boolean
  mobileMoneyAlerts: boolean
  seasonalReminders: boolean
  familyEventReminders: boolean
  marketDayReminders: boolean
  quietHours: {
    enabled: boolean
    start: string
    end: string
  }
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
}

// TEMPORARY: Mock notification service to unblock the app
const notificationService = {
  requestPermission: async (): Promise<NotificationPermission> => {
    console.log('🔔 Notification service temporarily disabled')
    return 'denied'
  },
  sendNotification: async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<boolean> => {
    console.log('🔔 Notification temporarily disabled:', notification.title)
    return false
  },
  scheduleNotification: async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>, scheduledTime: Date): Promise<boolean> => {
    console.log('🔔 Scheduled notification temporarily disabled:', notification.title)
    return false
  },
  savePreferences: async (preferences: NotificationPreferences): Promise<boolean> => {
    console.log('🔔 Preferences temporarily disabled')
    return false
  },
  getPreferences: (): NotificationPreferences | null => {
    return {
      budgetAlerts: true,
      goalReminders: true,
      transactionReminders: true,
      syncNotifications: false,
      securityAlerts: true,
      mobileMoneyAlerts: true,
      seasonalReminders: true,
      familyEventReminders: true,
      marketDayReminders: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      },
      frequency: 'immediate'
    }
  },
  checkBudgetAlerts: async (userId: string): Promise<void> => {
    console.log('🔔 Budget alerts temporarily disabled')
  },
  checkGoalReminders: async (userId: string): Promise<void> => {
    console.log('🔔 Goal reminders temporarily disabled')
  },
  checkMadagascarSpecificNotifications: async (userId: string): Promise<void> => {
    console.log('🔔 Madagascar notifications temporarily disabled')
  },
  sendSyncNotification: async (userId: string, status: 'success' | 'error', details?: string): Promise<void> => {
    console.log('🔔 Sync notifications temporarily disabled')
  },
  sendSecurityAlert: async (userId: string, type: 'new_device' | 'suspicious_activity', details?: string): Promise<void> => {
    console.log('🔔 Security alerts temporarily disabled')
  },
  sendMobileMoneyNotification: async (userId: string, type: 'transaction' | 'fee' | 'balance', data: any): Promise<void> => {
    console.log('🔔 Mobile money notifications temporarily disabled')
  }
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  useEffect(() => {
    // Vérifier le support des notifications
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      loadPreferences()
    }
  }, [])

  const loadPreferences = async () => {
    const prefs = notificationService.getPreferences()
    setPreferences(prefs)
  }

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications non supportées')
    }

    try {
      const newPermission = await notificationService.requestPermission()
      setPermission(newPermission)
      return newPermission
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
      throw error
    }
  }, [isSupported])

  const sendNotification = useCallback(async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false
    }

    try {
      return await notificationService.sendNotification(notification)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
      return false
    }
  }, [isSupported, permission])

  const scheduleNotification = useCallback(async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>, scheduledTime: Date): Promise<boolean> => {
    if (!isSupported) {
      return false
    }

    try {
      return await notificationService.scheduleNotification(notification, scheduledTime)
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error)
      return false
    }
  }, [isSupported])

  const savePreferences = useCallback(async (newPreferences: NotificationPreferences): Promise<boolean> => {
    try {
      const success = await notificationService.savePreferences(newPreferences)
      if (success) {
        setPreferences(newPreferences)
      }
      return success
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      return false
    }
  }, [])

  const checkBudgetAlerts = useCallback(async (userId: string): Promise<void> => {
    try {
      await notificationService.checkBudgetAlerts(userId)
    } catch (error) {
      console.error('Erreur lors de la vérification des alertes de budget:', error)
    }
  }, [])

  const checkGoalReminders = useCallback(async (userId: string): Promise<void> => {
    try {
      await notificationService.checkGoalReminders(userId)
    } catch (error) {
      console.error('Erreur lors de la vérification des rappels d\'objectifs:', error)
    }
  }, [])

  const checkMadagascarNotifications = useCallback(async (userId: string): Promise<void> => {
    try {
      await notificationService.checkMadagascarSpecificNotifications(userId)
    } catch (error) {
      console.error('Erreur lors de la vérification des notifications Madagascar:', error)
    }
  }, [])

  const sendSyncNotification = useCallback(async (userId: string, status: 'success' | 'error', details?: string): Promise<void> => {
    try {
      await notificationService.sendSyncNotification(userId, status, details)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification de synchronisation:', error)
    }
  }, [])

  const sendSecurityAlert = useCallback(async (userId: string, type: 'new_device' | 'suspicious_activity', details?: string): Promise<void> => {
    try {
      await notificationService.sendSecurityAlert(userId, type, details)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'alerte de sécurité:', error)
    }
  }, [])

  const sendMobileMoneyNotification = useCallback(async (userId: string, type: 'transaction' | 'fee' | 'balance', data: any): Promise<void> => {
    try {
      await notificationService.sendMobileMoneyNotification(userId, type, data)
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification Mobile Money:', error)
    }
  }, [])

  return {
    permission,
    isSupported,
    preferences,
    notifications,
    requestPermission,
    sendNotification,
    scheduleNotification,
    savePreferences,
    checkBudgetAlerts,
    checkGoalReminders,
    checkMadagascarNotifications,
    sendSyncNotification,
    sendSecurityAlert,
    sendMobileMoneyNotification
  }
}

export default useNotifications
