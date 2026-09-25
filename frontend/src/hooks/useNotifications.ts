import { useState, useEffect, useCallback } from 'react'
import notificationService, { type NotificationData as ServiceNotificationData } from '../services/notificationService'

// Web Push phase 1 (2026-09-26): the hook is wired to the real notificationService again,
// ONE capability at a time. Re-enabled: permission (+ remote push subscription),
// preferences (read / save), immediate notification (goes through the service filters:
// preferences, quiet hours, daily cap). Still disabled on purpose, see each function.

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

function toServiceType(type: NotificationData['type']): ServiceNotificationData['type'] {
  return type === 'transaction_reminder' ? 'transaction_alert' : type
}

function readPreferences(): NotificationPreferences | null {
  const s = notificationService.getSettings()
  if (!s) return null
  return {
    budgetAlerts: s.budgetAlerts,
    goalReminders: s.goalReminders,
    transactionReminders: s.transactionAlerts,
    syncNotifications: s.syncNotifications,
    securityAlerts: s.securityAlerts,
    mobileMoneyAlerts: s.mobileMoneyAlerts,
    seasonalReminders: s.seasonalReminders,
    familyEventReminders: s.familyEventReminders,
    marketDayReminders: s.marketDayReminders,
    quietHours: { ...s.quietHours },
    frequency: s.frequency
  }
}

export const useNotifications = () => {
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSupported, setIsSupported] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)
  const [notifications] = useState<NotificationData[]>([])

  useEffect(() => {
    // Vérifier le support des notifications
    const supported = 'Notification' in window && 'serviceWorker' in navigator
    setIsSupported(supported)

    if (supported) {
      setPermission(Notification.permission)
      setPreferences(readPreferences())
    }
  }, [])

  // RE-ENABLED: asks only when called (user action), subscribes to remote push if granted.
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

  // RE-ENABLED: filtered by preferences, quiet hours and the daily cap of the service.
  const sendNotification = useCallback(async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      return false
    }

    try {
      return await notificationService.showNotification({
        type: toServiceType(notification.type),
        title: notification.title,
        body: notification.body,
        icon: notification.icon,
        badge: notification.badge,
        tag: notification.tag,
        data: notification.data,
        userId: notification.userId,
        priority: notification.priority
      })
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
      return false
    }
  }, [isSupported, permission])

  // STILL DISABLED: a scheduled notification is only stored locally; nothing ever
  // delivers it later, so enabling it would silently lose messages.
  const scheduleNotification = useCallback(async (notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>, _scheduledTime: Date): Promise<boolean> => {
    console.log('🔔 Scheduled notification disabled (no delivery scheduler):', notification.title)
    return false
  }, [])

  // RE-ENABLED: local notification settings (Dexie + localStorage).
  const savePreferences = useCallback(async (newPreferences: NotificationPreferences): Promise<boolean> => {
    try {
      const { transactionReminders, ...rest } = newPreferences
      const success = await notificationService.saveSettings({ ...rest, transactionAlerts: transactionReminders })
      if (success) {
        setPreferences(newPreferences)
      }
      return success
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      return false
    }
  }, [])

  // STILL DISABLED: called on EVERY dashboard load with no per-day de-duplication
  // (same alerts again at each visit), and the month comparison relies on a 0-based
  // month that is not guaranteed for stored budgets.
  const checkBudgetAlerts = useCallback(async (_userId: string): Promise<void> => {}, [])

  // STILL DISABLED: same repeat-on-every-dashboard-load issue as budget alerts.
  const checkGoalReminders = useCallback(async (_userId: string): Promise<void> => {}, [])

  // STILL DISABLED: the capabilities below have no implementation in the service.
  const checkMadagascarNotifications = useCallback(async (_userId: string): Promise<void> => {}, [])
  const sendSyncNotification = useCallback(async (_userId: string, _status: 'success' | 'error', _details?: string): Promise<void> => {}, [])
  const sendSecurityAlert = useCallback(async (_userId: string, _type: 'new_device' | 'suspicious_activity', _details?: string): Promise<void> => {}, [])
  const sendMobileMoneyNotification = useCallback(async (_userId: string, _type: 'transaction' | 'fee' | 'balance', _data: any): Promise<void> => {}, [])

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
