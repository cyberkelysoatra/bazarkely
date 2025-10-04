import { db } from '../lib/database'

export interface NotificationData {
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

export interface NotificationPreferences {
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
    start: string // HH:MM format
    end: string // HH:MM format
  }
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly'
}

class NotificationService {
  private permission: NotificationPermission = 'default'
  private preferences: NotificationPreferences | null = null
  private isSupported: boolean = false

  constructor() {
    this.isSupported = 'Notification' in window && 'serviceWorker' in navigator
    this.permission = Notification.permission
    this.loadPreferences()
  }

  /**
   * Initialise le service de notifications
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('Notifications non supportées par ce navigateur')
      return false
    }

    // Enregistrer le service worker pour les notifications
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready
        console.log('Service Worker prêt pour les notifications')
        return true
      } catch (error) {
        console.error('Erreur lors de l\'initialisation du Service Worker:', error)
        return false
      }
    }

    return false
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
      return this.permission
    } catch (error) {
      console.error('Erreur lors de la demande de permission:', error)
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
   * Envoie une notification immédiate
   */
  async sendNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>): Promise<boolean> {
    if (!this.isPermissionGranted()) {
      console.warn('Permission de notification non accordée')
      return false
    }

    if (!this.shouldSendNotification(notification.type)) {
      console.log('Notification filtrée par les préférences')
      return false
    }

    if (this.isQuietHours()) {
      console.log('Notification différée (heures silencieuses)')
      await this.scheduleNotification(notification, this.getNextAvailableTime())
      return true
    }

    try {
      const notificationData: NotificationData = {
        ...notification,
        id: this.generateId(),
        timestamp: new Date(),
        read: false
      }

      // Sauvegarder en base
      await this.saveNotification(notificationData)

      // Envoyer la notification
      await this.showNotification(notificationData)

      return true
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la notification:', error)
      return false
    }
  }

  /**
   * Programme une notification pour plus tard
   */
  async scheduleNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read'>, scheduledTime: Date): Promise<boolean> {
    try {
      const notificationData: NotificationData = {
        ...notification,
        id: this.generateId(),
        timestamp: new Date(),
        scheduled: scheduledTime,
        read: false
      }

      await this.saveNotification(notificationData)
      return true
    } catch (error) {
      console.error('Erreur lors de la programmation de la notification:', error)
      return false
    }
  }

  /**
   * Affiche une notification via le Service Worker
   */
  private async showNotification(notification: NotificationData): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        notification: {
          title: notification.title,
          body: notification.body,
          icon: notification.icon || '/icon-192.png',
          badge: notification.badge || '/icon-192.png',
          tag: notification.tag || notification.type,
          data: notification.data,
          requireInteraction: notification.priority === 'high'
        }
      })
    } else {
      // Fallback pour les navigateurs sans Service Worker
      new Notification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icon-192.png',
        badge: notification.badge || '/icon-192.png',
        tag: notification.tag || notification.type,
        data: notification.data,
        requireInteraction: notification.priority === 'high'
      })
    }
  }

  /**
   * Vérifie les alertes de budget
   */
  async checkBudgetAlerts(userId: string): Promise<void> {
    try {
      const budgets = await db.budgets.where('userId').equals(userId).toArray()
      const currentMonth = new Date().getMonth()
      const currentYear = new Date().getFullYear()

      for (const budget of budgets) {
        if (budget.month === currentMonth && budget.year === currentYear) {
          const spentPercentage = (budget.spent / budget.amount) * 100

          // Alerte à 80%
          if (spentPercentage >= 80 && spentPercentage < 100) {
            await this.sendNotification({
              type: 'budget_alert',
              title: '⚠️ Alerte Budget',
              body: `Votre budget ${budget.category} atteint ${Math.round(spentPercentage)}% (${this.formatCurrency(budget.spent)}/${this.formatCurrency(budget.amount)})`,
              priority: 'normal',
              userId,
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }

          // Alerte à 100%
          if (spentPercentage >= 100 && spentPercentage < 120) {
            await this.sendNotification({
              type: 'budget_alert',
              title: '🚨 Budget Dépassé',
              body: `Votre budget ${budget.category} est dépassé de ${Math.round(spentPercentage - 100)}% !`,
              priority: 'high',
              userId,
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }

          // Alerte critique à 120%
          if (spentPercentage >= 120) {
            await this.sendNotification({
              type: 'budget_alert',
              title: '🔥 Budget Critique',
              body: `Votre budget ${budget.category} est dépassé de ${Math.round(spentPercentage - 100)}% ! Action requise.`,
              priority: 'high',
              userId,
              data: { budgetId: budget.id, percentage: spentPercentage }
            })
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des alertes de budget:', error)
    }
  }

  /**
   * Vérifie les rappels d'objectifs
   */
  async checkGoalReminders(userId: string): Promise<void> {
    try {
      const goals = await db.goals.where('userId').equals(userId).toArray()
      const now = new Date()

      for (const goal of goals) {
        const daysUntilDeadline = Math.ceil((goal.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        const progressPercentage = (goal.currentAmount / goal.targetAmount) * 100

        // Rappel hebdomadaire
        if (daysUntilDeadline > 7 && daysUntilDeadline % 7 === 0) {
          await this.sendNotification({
            type: 'goal_reminder',
            title: '🎯 Objectif d\'Épargne',
            body: `${goal.name}: ${Math.round(progressPercentage)}% atteint. ${daysUntilDeadline} jours restants.`,
            priority: 'normal',
            userId,
            data: { goalId: goal.id, progress: progressPercentage, daysLeft: daysUntilDeadline }
          })
        }

        // Rappel de deadline
        if (daysUntilDeadline <= 7 && daysUntilDeadline > 0) {
          await this.sendNotification({
            type: 'goal_reminder',
            title: '⏰ Deadline Approche',
            body: `${goal.name}: ${daysUntilDeadline} jour(s) restant(s) ! Progression: ${Math.round(progressPercentage)}%`,
            priority: 'high',
            userId,
            data: { goalId: goal.id, progress: progressPercentage, daysLeft: daysUntilDeadline }
          })
        }

        // Objectif atteint
        if (progressPercentage >= 100) {
          await this.sendNotification({
            type: 'goal_reminder',
            title: '🎉 Objectif Atteint !',
            body: `Félicitations ! Vous avez atteint votre objectif "${goal.name}" !`,
            priority: 'normal',
            userId,
            data: { goalId: goal.id, progress: progressPercentage }
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des rappels d\'objectifs:', error)
    }
  }

  /**
   * Vérifie les rappels de transactions récurrentes
   */
  async checkTransactionReminders(userId: string): Promise<void> {
    try {
      // Vérifier les transactions récurrentes (à implémenter selon la logique métier)
      const recurringTransactions = await this.getRecurringTransactions(userId)
      
      for (const transaction of recurringTransactions) {
        const daysSinceLast = this.getDaysSinceLastTransaction(transaction)
        
        if (daysSinceLast >= transaction.reminderDays) {
          await this.sendNotification({
            type: 'transaction_reminder',
            title: '💳 Rappel Transaction',
            body: `N\'oubliez pas: ${transaction.description} (${this.formatCurrency(transaction.amount)})`,
            priority: 'normal',
            userId,
            data: { transactionId: transaction.id, type: 'recurring' }
          })
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des rappels de transactions:', error)
    }
  }

  /**
   * Notifications spécifiques à Madagascar
   */
  async checkMadagascarSpecificNotifications(userId: string): Promise<void> {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const month = now.getMonth()

    // Rappel du marché du vendredi (Zoma)
    if (dayOfWeek === 5) { // Vendredi
      await this.sendNotification({
        type: 'market_day',
        title: '🛒 Marché du Vendredi',
        body: 'C\'est le jour du Zoma ! N\'oubliez pas vos courses hebdomadaires.',
        priority: 'normal',
        userId,
        data: { type: 'zoma_reminder' }
      })
    }

    // Rappels saisonniers
    if (month === 3 || month === 4) { // Avril-Mai (saison des récoltes)
      await this.sendNotification({
        type: 'seasonal',
        title: '🌾 Saison des Récoltes',
        body: 'Pensez à planifier vos revenus agricoles pour les mois à venir.',
        priority: 'normal',
        userId,
        data: { type: 'harvest_planning' }
      })
    }

    // Rappels d'événements familiaux
    await this.checkFamilyEventReminders(userId)
  }

  /**
   * Vérifie les rappels d'événements familiaux
   */
  private async checkFamilyEventReminders(userId: string): Promise<void> {
    // Logique pour vérifier les événements familiaux (anniversaires, fêtes, etc.)
    // À implémenter selon les besoins spécifiques
  }

  /**
   * Notifications de synchronisation
   */
  async sendSyncNotification(userId: string, status: 'success' | 'error', details?: string): Promise<void> {
    const title = status === 'success' ? '✅ Synchronisation Réussie' : '❌ Erreur de Synchronisation'
    const body = status === 'success' 
      ? 'Vos données ont été synchronisées avec succès.'
      : `Erreur lors de la synchronisation: ${details || 'Erreur inconnue'}`

    await this.sendNotification({
      type: 'sync_notification',
      title,
      body,
      priority: status === 'error' ? 'high' : 'low',
      userId,
      data: { status, details }
    })
  }

  /**
   * Notifications de sécurité
   */
  async sendSecurityAlert(userId: string, type: 'new_device' | 'suspicious_activity', details?: string): Promise<void> {
    const title = type === 'new_device' ? '🔒 Nouvel Appareil' : '⚠️ Activité Suspecte'
    const body = type === 'new_device' 
      ? 'Connexion détectée depuis un nouvel appareil.'
      : `Activité suspecte détectée: ${details || 'Veuillez vérifier votre compte'}`

    await this.sendNotification({
      type: 'security_alert',
      title,
      body,
      priority: 'high',
      userId,
      data: { alertType: type, details }
    })
  }

  /**
   * Notifications Mobile Money
   */
  async sendMobileMoneyNotification(userId: string, type: 'transaction' | 'fee' | 'balance', data: any): Promise<void> {
    let title = ''
    let body = ''

    switch (type) {
      case 'transaction':
        title = '💳 Transaction Mobile Money'
        body = `${data.operator}: ${this.formatCurrency(data.amount)} ${data.direction === 'sent' ? 'envoyé' : 'reçu'}`
        break
      case 'fee':
        title = '💰 Frais Mobile Money'
        body = `Frais ${data.operator}: ${this.formatCurrency(data.fee)} pour ${this.formatCurrency(data.amount)}`
        break
      case 'balance':
        title = '💵 Solde Mobile Money'
        body = `Solde ${data.operator}: ${this.formatCurrency(data.balance)}`
        break
    }

    await this.sendNotification({
      type: 'mobile_money',
      title,
      body,
      priority: 'normal',
      userId,
      data
    })
  }

  /**
   * Charge les préférences de notification
   */
  private async loadPreferences(): Promise<void> {
    try {
      const user = await this.getCurrentUser()
      if (user && user.notificationPreferences) {
        this.preferences = user.notificationPreferences
      } else {
        this.preferences = this.getDefaultPreferences()
      }
    } catch (error) {
      console.error('Erreur lors du chargement des préférences:', error)
      this.preferences = this.getDefaultPreferences()
    }
  }

  /**
   * Sauvegarde les préférences de notification
   */
  async savePreferences(preferences: NotificationPreferences): Promise<boolean> {
    try {
      this.preferences = preferences
      const user = await this.getCurrentUser()
      if (user) {
        await db.users.put(user.id, {
          ...user,
          notificationPreferences: preferences
        })
        return true
      }
      return false
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des préférences:', error)
      return false
    }
  }

  /**
   * Obtient les préférences actuelles
   */
  getPreferences(): NotificationPreferences | null {
    return this.preferences
  }

  /**
   * Vérifie si une notification doit être envoyée selon les préférences
   */
  private shouldSendNotification(type: NotificationData['type']): boolean {
    if (!this.preferences) return true

    switch (type) {
      case 'budget_alert':
        return this.preferences.budgetAlerts
      case 'goal_reminder':
        return this.preferences.goalReminders
      case 'transaction_reminder':
        return this.preferences.transactionReminders
      case 'sync_notification':
        return this.preferences.syncNotifications
      case 'security_alert':
        return this.preferences.securityAlerts
      case 'mobile_money':
        return this.preferences.mobileMoneyAlerts
      case 'seasonal':
        return this.preferences.seasonalReminders
      case 'family_event':
        return this.preferences.familyEventReminders
      case 'market_day':
        return this.preferences.marketDayReminders
      default:
        return true
    }
  }

  /**
   * Vérifie si on est en heures silencieuses
   */
  private isQuietHours(): boolean {
    if (!this.preferences?.quietHours.enabled) return false

    const now = new Date()
    const currentTime = now.getHours() * 60 + now.getMinutes()
    const startTime = this.timeToMinutes(this.preferences.quietHours.start)
    const endTime = this.timeToMinutes(this.preferences.quietHours.end)

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime
    } else {
      // Heures silencieuses qui traversent minuit
      return currentTime >= startTime || currentTime <= endTime
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
   * Obtient la prochaine heure disponible (après les heures silencieuses)
   */
  private getNextAvailableTime(): Date {
    if (!this.preferences?.quietHours.enabled) {
      return new Date(Date.now() + 60000) // 1 minute plus tard
    }

    const now = new Date()
    const endTime = this.timeToMinutes(this.preferences.quietHours.end)
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
   * Sauvegarde une notification en base
   */
  private async saveNotification(notification: NotificationData): Promise<void> {
    // À implémenter selon la structure de base de données
    // Pour l'instant, on utilise localStorage comme fallback
    const notifications = JSON.parse(localStorage.getItem('bazarkely-notifications') || '[]')
    notifications.push(notification)
    localStorage.setItem('bazarkely-notifications', JSON.stringify(notifications))
  }

  /**
   * Obtient l'utilisateur actuel
   */
  private async getCurrentUser(): Promise<any> {
    const userData = localStorage.getItem('bazarkely-user')
    return userData ? JSON.parse(userData) : null
  }

  /**
   * Obtient les préférences par défaut
   */
  private getDefaultPreferences(): NotificationPreferences {
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
  }

  /**
   * Obtient les transactions récurrentes
   */
  private async getRecurringTransactions(userId: string): Promise<any[]> {
    // À implémenter selon la logique métier
    return []
  }

  /**
   * Calcule les jours depuis la dernière transaction
   */
  private getDaysSinceLastTransaction(transaction: any): number {
    // À implémenter selon la logique métier
    return 0
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
}

export const notificationService = new NotificationService()
export default notificationService
