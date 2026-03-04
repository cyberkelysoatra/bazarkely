import { db } from '../lib/database'

export interface NotificationData {
  id: string
  type: 'budget_alert' | 'goal_reminder' | 'transaction_alert' | 'daily_summary' | 'sync_notification' | 'security_alert' | 'mobile_money' | 'seasonal' | 'family_event' | 'market_day' | 'recurring_reminder' | 'recurring_created' | 'loan_due_reminder' | 'loan_overdue_alert'
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
  sent: boolean
  clickAction?: string
}

export interface NotificationSettings {
  id: string
  userId: string
  budgetAlerts: boolean
  goalReminders: boolean
  transactionAlerts: boolean
  dailySummary: boolean
  syncNotifications: boolean
  securityAlerts: boolean
  mobileMoneyAlerts: boolean
  seasonalReminders: boolean
  familyEventReminders: boolean
  marketDayReminders: boolean
  loanReminders: boolean
  loanOverdueAlerts: boolean
  loanReminderDaysBefore: number
  quietHours: {
    enabled: boolean
    start: string // HH:MM format
    end: string // HH:MM format
  }
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
  maxDailyNotifications: number
  createdAt: Date
  updatedAt: Date
}

export interface NotificationHistory {
  id: string
  userId: string
  notificationId: string
  sentAt: Date
  clickedAt?: Date
  dismissedAt?: Date
  action?: string
  data?: any
}

class NotificationService {
  private permission: NotificationPermission = 'default'
  private settings: NotificationSettings | null = null
  private isSupported: boolean = false
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null
  private dailyNotificationCount: Map<string, number> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  constructor() {
    this.isSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator
    this.permission = this.isSupported ? Notification.permission : 'denied'
    this.initializeService()
  }

  /**
   * Initialise le service de notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('🔔 Notifications non supportées par ce navigateur')
      return false
    }

    try {
      // Enregistrer le service worker pour les notifications
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.ready
        console.log('🔔 Service Worker prêt pour les notifications')
        
        // Écouter les messages du service worker
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))
      }

      // Charger les paramètres de l'utilisateur
      await this.loadSettings()

      // Démarrer les vérifications périodiques
      this.startPeriodicChecks()

      return true
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du service de notifications:', error)
      return false
    }
  }

  /**
   * Vérifie le support des notifications
   */
  checkSupport(): boolean {
    return this.isSupported
  }

  /**
   * Demande la permission de notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) {
      throw new Error('Notifications non supportées')
    }

    try {
      this.permission = await Notification.requestPermission()
      
      // Sauvegarder l'état de permission
      localStorage.setItem('bazarkely-notification-permission', this.permission)
      
      console.log(`🔔 Permission de notification: ${this.permission}`)
      return this.permission
    } catch (error) {
      console.error('❌ Erreur lors de la demande de permission:', error)
      throw error
    }
  }

  /**
   * Vérifie si les notifications sont autorisées
   */
  isPermissionGranted(): boolean {
    return this.permission === 'granted'
  }

  /**
   * Affiche une notification immédiate
   */
  async showNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'sent'>): Promise<boolean> {
    if (!this.isPermissionGranted()) {
      console.warn('🔔 Permission de notification non accordée')
      return false
    }

    if (!this.shouldSendNotification(notification.type)) {
      console.log('🔔 Notification filtrée par les préférences')
      return false
    }

    if (this.isQuietHours()) {
      console.log('🔔 Notification différée (heures silencieuses)')
      await this.scheduleNotification(notification, this.getNextAvailableTime())
      return true
    }

    if (this.hasReachedDailyLimit(notification.userId)) {
      console.log('🔔 Limite quotidienne de notifications atteinte')
      return false
    }

    try {
      const notificationData: NotificationData = {
        ...notification,
        id: this.generateId(),
        timestamp: new Date(),
        read: false,
        sent: false
      }

      // Sauvegarder en base
      await this.saveNotification(notificationData)

      // Envoyer la notification
      await this.displayNotification(notificationData)

      // Mettre à jour le compteur quotidien
      this.incrementDailyCount(notification.userId)

      return true
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification:', error)
      return false
    }
  }

  /**
   * Programme une notification pour plus tard
   */
  async scheduleNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'sent'>, scheduledTime: Date): Promise<boolean> {
    try {
      const notificationData: NotificationData = {
        ...notification,
        id: this.generateId(),
        timestamp: new Date(),
        scheduled: scheduledTime,
        read: false,
        sent: false
      }

      await this.saveNotification(notificationData)
      console.log(`🔔 Notification programmée pour ${scheduledTime.toLocaleString()}`)
      return true
    } catch (error) {
      console.error('❌ Erreur lors de la programmation de la notification:', error)
      return false
    }
  }

  /**
   * Vérifie les alertes de budget (appelée toutes les heures)
   */
  async scheduleBudgetCheck(userId: string): Promise<void> {
    try {
      const budgets = await db.budgets.where('userId').equals(userId).toArray()
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      for (const budget of budgets) {
        if (budget.month === currentMonth && budget.year === currentYear) {
          const spentPercentage = (budget.spent / budget.amount) * 100

          // Alerte à 80%
          if (spentPercentage >= 80 && spentPercentage < 100) {
            await this.showNotification({
              type: 'budget_alert',
              title: '⚠️ Alerte Budget',
              body: `Votre budget ${budget.category} atteint ${Math.round(spentPercentage)}% (${this.formatCurrency(budget.spent)}/${this.formatCurrency(budget.amount)})`,
              priority: 'normal',
              userId,
              clickAction: '/budgets',
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }

          // Alerte à 100%
          if (spentPercentage >= 100 && spentPercentage < 120) {
            await this.showNotification({
              type: 'budget_alert',
              title: '🚨 Budget Dépassé',
              body: `Votre budget ${budget.category} est dépassé de ${Math.round(spentPercentage - 100)}% !`,
              priority: 'high',
              userId,
              clickAction: '/budgets',
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }

          // Alerte critique à 120%
          if (spentPercentage >= 120) {
            await this.showNotification({
              type: 'budget_alert',
              title: '🔥 Budget Critique',
              body: `Votre budget ${budget.category} est dépassé de ${Math.round(spentPercentage - 100)}% ! Action requise.`,
              priority: 'high',
              userId,
              clickAction: '/budgets',
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des alertes de budget:', error)
    }
  }

  /**
   * Vérifie les rappels d'objectifs (appelée quotidiennement à 9h)
   */
  async scheduleGoalCheck(userId: string): Promise<void> {
    try {
      const goals = await db.goals.where('userId').equals(userId).toArray()
      const now = new Date()

      for (const goal of goals) {
        if (goal.isCompleted) continue

        const daysUntilDeadline = Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100

        // Rappel 3 jours avant la deadline si progression < 50%
        if (daysUntilDeadline === 3 && progressPercentage < 50) {
          await this.showNotification({
            type: 'goal_reminder',
            title: '🎯 Rappel Objectif',
            body: `${goal.name}: ${Math.round(progressPercentage)}% atteint. ${daysUntilDeadline} jours restants.`,
            priority: 'normal',
            userId,
            clickAction: '/goals',
            data: { goalId: goal.id, progress: progressPercentage, daysLeft: daysUntilDeadline }
          })
        }

        // Rappel de deadline
        if (daysUntilDeadline <= 1 && daysUntilDeadline > 0) {
          await this.showNotification({
            type: 'goal_reminder',
            title: '⏰ Deadline Approche',
            body: `${goal.name}: ${daysUntilDeadline} jour(s) restant(s) ! Progression: ${Math.round(progressPercentage)}%`,
            priority: 'high',
            userId,
            clickAction: '/goals',
            data: { goalId: goal.id, progress: progressPercentage, daysLeft: daysUntilDeadline }
          })
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des rappels d\'objectifs:', error)
    }
  }

  /**
   * Vérifie les rappels de prêts (appelée quotidiennement à 9h)
   */
  async scheduleLoanCheck(userId: string): Promise<void> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { getMyLoans } = await import('./loanService')
      const loans = await getMyLoans()
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

      // Récupérer les notifications envoyées dans les dernières 24h pour déduplication
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recentNotifications = await db.notifications
        .where('userId')
        .equals(userId)
        .and(n => n.timestamp >= yesterday)
        .and(n => n.type === 'loan_due_reminder' || n.type === 'loan_overdue_alert')
        .toArray()

      const recentLoanIds = new Set(recentNotifications.map(n => n.data?.loanId).filter(Boolean))

      for (const loan of loans) {
        // Ignorer les prêts fermés
        if (loan.status === 'closed') continue

        // Vérifier si notification déjà envoyée dans les 24h
        if (recentLoanIds.has(loan.id)) continue

        const dueDate = loan.dueDate ? new Date(loan.dueDate) : null

        if (!dueDate) continue

        const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate())
        const daysUntilDue = Math.ceil((dueDateOnly.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        const daysOverdue = Math.ceil((today.getTime() - dueDateOnly.getTime()) / (1000 * 60 * 60 * 24))

        // Rappel de remboursement à venir
        if (daysUntilDue > 0 && daysUntilDue <= (this.settings?.loanReminderDaysBefore || 3)) {
          await this.showNotification({
            type: 'loan_due_reminder',
            title: 'Remboursement à venir',
            body: `Remboursement pour ${loan.borrowerName} dans ${daysUntilDue} jour(s)`,
            priority: 'normal',
            userId,
            clickAction: '/loans',
            data: { loanId: loan.id, borrowerName: loan.borrowerName, daysUntilDue }
          })
        }

        // Alerte de prêt en retard
        if (loan.isOverdue && daysOverdue > 0) {
          await this.showNotification({
            type: 'loan_overdue_alert',
            title: 'Prêt en retard',
            body: `Remboursement pour ${loan.borrowerName} en retard de ${daysOverdue} jour(s)`,
            priority: 'high',
            userId,
            clickAction: '/loans',
            data: { loanId: loan.id, borrowerName: loan.borrowerName, daysOverdue }
          })
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des rappels de prêts:', error)
    }
  }

  /**
   * Surveille les transactions importantes (immédiat)
   */
  async scheduleTransactionWatch(userId: string, transaction: any): Promise<void> {
    try {
      // Alerte pour les transactions importantes (> 100,000 MGA)
      if (transaction.amount > 100000) {
        await this.showNotification({
          type: 'transaction_alert',
          title: '💳 Transaction Importante',
          body: `Transaction de ${this.formatCurrency(transaction.amount)} enregistrée (${transaction.category})`,
          priority: 'normal',
          userId,
          clickAction: '/transactions',
          data: { transactionId: transaction.id, amount: transaction.amount, category: transaction.category }
        })
      }
    } catch (error) {
      console.error('❌ Erreur lors de la surveillance des transactions:', error)
    }
  }

  /**
   * Résumé quotidien (appelé à 20h)
   */
  async scheduleDailySummary(userId: string): Promise<void> {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      // Récupérer les transactions du jour
      const todayTransactions = await db.transactions
        .where('userId')
        .equals(userId)
        .and(t => t.date >= today && t.date < tomorrow)
        .toArray()

      const totalIncome = todayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0)

      const totalExpense = todayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0)

      const netAmount = totalIncome - totalExpense

      await this.showNotification({
        type: 'daily_summary',
        title: '📊 Résumé Quotidien',
        body: `Aujourd'hui: +${this.formatCurrency(totalIncome)} -${this.formatCurrency(totalExpense)} = ${this.formatCurrency(netAmount)}`,
        priority: 'low',
        userId,
        clickAction: '/dashboard',
        data: { 
          totalIncome, 
          totalExpense, 
          netAmount, 
          transactionCount: todayTransactions.length 
        }
      })
    } catch (error) {
      console.error('❌ Erreur lors de la génération du résumé quotidien:', error)
    }
  }

  /**
   * Affiche une notification via le Service Worker ou l'API native
   */
  private async displayNotification(notification: NotificationData): Promise<void> {
    const notificationOptions: NotificationOptions = {
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/icon-192x192.png',
      tag: notification.tag || notification.type,
      data: {
        ...notification.data,
        clickAction: notification.clickAction,
        notificationId: notification.id
      },
      requireInteraction: notification.priority === 'high',
      silent: notification.priority === 'low'
    }

    if (this.serviceWorkerRegistration) {
      // Utiliser le Service Worker pour les notifications en arrière-plan
      await this.serviceWorkerRegistration.showNotification(notification.title, notificationOptions)
    } else {
      // Fallback pour les navigateurs sans Service Worker
      const nativeNotification = new Notification(notification.title, notificationOptions)
      
      // Gérer le clic sur la notification
      nativeNotification.onclick = () => {
        this.handleNotificationClick(notification)
        nativeNotification.close()
      }
    }

    // Marquer comme envoyée
    await db.notifications.update(notification.id, { sent: true })

    // Enregistrer dans l'historique
    await this.recordNotificationHistory(notification)
  }

  /**
   * Gère le clic sur une notification
   */
  private handleNotificationClick(notification: NotificationData): void {
    console.log(`🔔 Notification cliquée: ${notification.title}`)
    
    // Enregistrer le clic
    this.recordNotificationClick(notification.id)

    // Naviguer vers la page appropriée
    if (notification.clickAction) {
      window.focus()
      window.location.href = notification.clickAction
    }
  }

  /**
   * Gère les messages du Service Worker
   */
  private handleServiceWorkerMessage(event: MessageEvent): void {
    if (event.data.type === 'NOTIFICATION_CLICK') {
      const notificationId = event.data.notificationId
      this.recordNotificationClick(notificationId)
    }
  }

  /**
   * Charge les paramètres de notification
   */
  private async loadSettings(): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      if (user) {
        const settings = await db.notificationSettings.where('userId').equals(user.id).first()
        this.settings = settings || this.getDefaultSettings(user.id)
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des paramètres:', error)
      this.settings = this.getDefaultSettings('')
    }
  }

  /**
   * Sauvegarde les paramètres de notification
   */
  async saveSettings(settings: Partial<NotificationSettings>): Promise<boolean> {
    try {
      const user = await this.getCurrentUser()
      if (!user) return false

      const existingSettings = await db.notificationSettings.where('userId').equals(user.id).first()
      
      if (existingSettings) {
        await db.notificationSettings.update(existingSettings.id, {
          ...settings,
          updatedAt: new Date()
        })
      } else {
        const newSettings: NotificationSettings = {
          id: this.generateId(),
          userId: user.id,
          ...this.getDefaultSettings(user.id),
          ...settings,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        await db.notificationSettings.add(newSettings)
      }

      // Sauvegarder aussi dans localStorage
      try {
        localStorage.setItem('bazarkely-notification-settings', JSON.stringify(settings))
      } catch (storageError) {
        console.error('❌ Erreur localStorage lors de la sauvegarde des paramètres:', storageError)
      }
      
      await this.loadSettings()
      return true
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde des paramètres:', error)
      return false
    }
  }

  /**
   * Obtient les paramètres actuels
   */
  getSettings(): NotificationSettings | null {
    try {
      if (this.settings) {
        return this.settings
      }

      const userData = localStorage.getItem('bazarkely-user')
      const userId = userData ? (JSON.parse(userData)?.id || '') : ''
      const fallback = this.getDefaultSettings(userId)
      this.settings = fallback
      return fallback
    } catch (error) {
      console.error('❌ Erreur lors de la récupération des paramètres:', error)
      const fallback = this.getDefaultSettings('')
      this.settings = fallback
      return fallback
    }
  }

  /**
   * Démarre les vérifications périodiques
   */
  private startPeriodicChecks(): void {
    // Vérification des budgets toutes les heures
    this.intervals.set('budget', setInterval(async () => {
      const user = await this.getCurrentUser()
      if (user) {
        await this.scheduleBudgetCheck(user.id)
      }
    }, 60 * 60 * 1000)) // 1 heure

    // Vérification des objectifs quotidiennement à 9h
    this.intervals.set('goals', setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 9) {
        const user = await this.getCurrentUser()
        if (user) {
          await this.scheduleGoalCheck(user.id)
        }
      }
    }, 60 * 60 * 1000)) // 1 heure

    // Vérification des prêts quotidiennement à 9h
    this.intervals.set('loans', setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 9) {
        const user = await this.getCurrentUser()
        if (user) {
          await this.scheduleLoanCheck(user.id)
        }
      }
    }, 60 * 60 * 1000)) // 1 heure

    // Résumé quotidien à 20h
    this.intervals.set('daily', setInterval(async () => {
      const now = new Date()
      if (now.getHours() === 20) {
        const user = await this.getCurrentUser()
        if (user) {
          await this.scheduleDailySummary(user.id)
          // Vérifier les transactions récurrentes à venir
          await this.checkRecurringTransactions(user.id)
        }
      }
    }, 60 * 60 * 1000)) // 1 heure

    // Réinitialiser le compteur quotidien à minuit
    this.intervals.set('reset', setInterval(() => {
      const now = new Date()
      if (now.getHours() === 0) {
        this.dailyNotificationCount.clear()
      }
    }, 60 * 60 * 1000)) // 1 heure
  }

  /**
   * Arrête les vérifications périodiques
   */
  stopPeriodicChecks(): void {
    this.intervals.forEach(interval => clearInterval(interval))
    this.intervals.clear()
  }

  /**
   * Vérifie si une notification doit être envoyée selon les préférences
   */
  private shouldSendNotification(type: NotificationData['type']): boolean {
    if (!this.settings) return true

    switch (type) {
      case 'budget_alert':
        return this.settings.budgetAlerts
      case 'goal_reminder':
        return this.settings.goalReminders
      case 'transaction_alert':
        return this.settings.transactionAlerts
      case 'daily_summary':
        return this.settings.dailySummary
      case 'sync_notification':
        return this.settings.syncNotifications
      case 'security_alert':
        return this.settings.securityAlerts
      case 'mobile_money':
        return this.settings.mobileMoneyAlerts
      case 'seasonal':
        return this.settings.seasonalReminders
      case 'family_event':
        return this.settings.familyEventReminders
      case 'market_day':
        return this.settings.marketDayReminders
      case 'recurring_reminder':
        return this.settings.transactionAlerts // Utiliser le même paramètre
      case 'recurring_created':
        return this.settings.transactionAlerts // Utiliser le même paramètre
      case 'loan_due_reminder':
        return this.settings.loanReminders
      case 'loan_overdue_alert':
        return this.settings.loanOverdueAlerts
      default:
        return true
    }
  }

  /**
   * Vérifie si on est en heures silencieuses
   */
  private isQuietHours(): boolean {
    if (!this.settings?.quietHours.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const startTime = this.timeToMinutes(this.settings.quietHours.start)
    const endTime = this.timeToMinutes(this.settings.quietHours.end)

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Heures silencieuses qui traversent minuit
      return currentTime >= startTime || currentTime <= endTime
    }
  }

  /**
   * Vérifie si la limite quotidienne est atteinte
   */
  private hasReachedDailyLimit(userId: string): boolean {
    const count = this.dailyNotificationCount.get(userId) || 0
    const maxDaily = this.settings?.maxDailyNotifications || 5
    return count >= maxDaily
  }

  /**
   * Incrémente le compteur quotidien
   */
  private incrementDailyCount(userId: string): void {
    const count = this.dailyNotificationCount.get(userId) || 0
    this.dailyNotificationCount.set(userId, count + 1)
  }

  /**
   * Obtient la prochaine heure disponible (après les heures silencieuses)
   */
  private getNextAvailableTime(): Date {
    if (!this.settings?.quietHours.enabled) {
      return new Date(Date.now() + 60000) // 1 minute plus tard
    }

    const now = new Date()
    const endTime = this.timeToMinutes(this.settings.quietHours.end)
    const currentTime = now.getHours() * 60 + now.getMinutes()

    if (currentTime < endTime) {
      // Aujourd'hui après la fin des heures silencieuses
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0)
      return tomorrow
    } else {
      // Demain après la fin des heures silencieuses
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(Math.floor(endTime / 60), endTime % 60, 0, 0)
      return tomorrow
    }
  }

  /**
   * Convertit une heure HH:MM en minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  /**
   * Sauvegarde une notification en base
   */
  private async saveNotification(notification: NotificationData): Promise<void> {
    await db.notifications.add(notification)
  }

  /**
   * Enregistre l'historique d'une notification
   */
  private async recordNotificationHistory(notification: NotificationData): Promise<void> {
    const history: NotificationHistory = {
      id: this.generateId(),
      userId: notification.userId,
      notificationId: notification.id,
      sentAt: new Date(),
      data: notification.data
    }

    await db.notificationHistory.add(history)
  }

  /**
   * Enregistre un clic sur une notification
   */
  private async recordNotificationClick(notificationId: string): Promise<void> {
    try {
      const history = await db.notificationHistory
        .where('notificationId')
        .equals(notificationId)
        .first()

      if (history) {
        await db.notificationHistory.update(history.id, {
          clickedAt: new Date()
        })
      }
    } catch (error) {
      console.error('❌ Erreur lors de l\'enregistrement du clic:', error)
    }
  }

  /**
   * Obtient l'utilisateur actuel
   */
  private async getCurrentUser(): Promise<any> {
    const userData = localStorage.getItem('bazarkely-user')
    return userData ? JSON.parse(userData) : null
  }

  /**
   * Obtient les paramètres par défaut
   */
  getDefaultSettings(userId: string): NotificationSettings {
    return {
      id: this.generateId(),
      userId,
      budgetAlerts: true,
      goalReminders: true,
      transactionAlerts: true,
      dailySummary: true,
      syncNotifications: false,
      securityAlerts: true,
      mobileMoneyAlerts: true,
      seasonalReminders: true,
      familyEventReminders: true,
      marketDayReminders: true,
      loanReminders: true,
      loanOverdueAlerts: true,
      loanReminderDaysBefore: 3,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00'
      },
      frequency: 'immediate',
      maxDailyNotifications: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  }

  /**
   * Vérifie les transactions récurrentes à venir et envoie des notifications
   * 
   * @param userId ID de l'utilisateur
   * @param daysBefore Nombre de jours avant la date d'échéance (par défaut 1)
   */
  async checkRecurringTransactions(userId: string, daysBefore: number = 1): Promise<void> {
    try {
      // Import dynamique pour éviter les dépendances circulaires
      const { default: recurringTransactionService } = await import('./recurringTransactionService');
      
      // Récupérer les transactions récurrentes à venir dans les prochains jours
      const upcomingRecurring = await recurringTransactionService.getUpcomingInDays(userId, daysBefore);
      
      for (const recurring of upcomingRecurring) {
        // Vérifier si on doit notifier (selon notifyBeforeDays)
        const daysUntil = Math.ceil(
          (recurring.nextGenerationDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntil <= recurring.notifyBeforeDays && daysUntil >= 0) {
          await this.showNotification({
            type: 'recurring_reminder',
            title: '🔄 Transaction Récurrente à Venir',
            body: `${recurring.description}: ${this.formatCurrency(recurring.amount)} ${recurring.type === 'income' ? 'revenu' : 'dépense'} prévu ${daysUntil === 0 ? 'aujourd\'hui' : `dans ${daysUntil} jour(s)`}`,
            priority: daysUntil === 0 ? 'high' : 'normal',
            userId,
            clickAction: `/recurring/${recurring.id}/confirm`,
            data: {
              recurringId: recurring.id,
              amount: recurring.amount,
              description: recurring.description,
              nextDate: recurring.nextGenerationDate.toISOString(),
              daysUntil
            }
          });
        }
      }
    } catch (error) {
      console.error('❌ Erreur lors de la vérification des transactions récurrentes:', error)
    }
  }

  /**
   * Envoie une notification après la création automatique d'une transaction récurrente
   * 
   * @param userId ID de l'utilisateur
   * @param transaction Transaction générée
   * @param recurringId ID de la transaction récurrente source
   */
  async sendRecurringCreatedNotification(
    userId: string,
    transaction: any,
    recurringId: string
  ): Promise<void> {
    try {
      const { default: recurringTransactionService } = await import('./recurringTransactionService');
      const recurring = await recurringTransactionService.getById(recurringId);
      
      if (!recurring) {
        return;
      }

      await this.showNotification({
        type: 'recurring_created',
        title: '✅ Transaction Récurrente Générée',
        body: `${recurring.description}: ${this.formatCurrency(transaction.amount)} ${transaction.type === 'income' ? 'revenu' : 'dépense'} créé automatiquement`,
        priority: 'normal',
        userId,
        clickAction: `/transactions/${transaction.id}`,
        data: {
          transactionId: transaction.id,
          recurringId: recurring.id,
          amount: transaction.amount,
          description: transaction.description
        }
      });
    } catch (error) {
      console.error('❌ Erreur lors de l\'envoi de la notification de création:', error)
    }
  }

  /**
   * Formate une somme en devise MGA
   */
  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  /**
   * Génère un ID unique
   */
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  /**
   * Initialise le service
   */
  private async initializeService(): Promise<void> {
    // Charger l'état de permission depuis localStorage
    const savedPermission = localStorage.getItem('bazarkely-notification-permission')
    if (savedPermission && this.isSupported) {
      this.permission = savedPermission as NotificationPermission
    }

    // Charger les paramètres depuis localStorage
    const savedSettings = localStorage.getItem('bazarkely-notification-settings')
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        this.settings = { ...this.getDefaultSettings(''), ...settings }
      } catch (error) {
        console.error('❌ Erreur lors du chargement des paramètres depuis localStorage:', error)
      }
    }
  }
}

export const notificationService = new NotificationService()
export default notificationService