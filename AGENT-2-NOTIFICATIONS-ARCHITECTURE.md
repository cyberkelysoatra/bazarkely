# 🔔 RAPPORT AGENT-2: ARCHITECTURE SYSTÈME DE NOTIFICATIONS
## BazarKELY - Analyse Complète des Notifications et Dépendances

**Date:** 2025-01-12  
**Agent:** Agent 2 (Notifications & Dependencies)  
**Type:** Analyse Diagnostic (READ-ONLY)

---

## 📋 TABLE DES MATIÈRES

1. [Types de Notifications](#1-types-de-notifications)
2. [Service Worker Architecture](#2-service-worker-architecture)
3. [Intervalles de Monitoring](#3-intervalles-de-monitoring)
4. [Paramètres de Notification](#4-paramètres-de-notification)
5. [Schémas IndexedDB](#5-schémas-indexeddb)
6. [Dépendances Transactionnelles](#6-dépendances-transactionnelles)
7. [Mécanismes de Planification](#7-mécanismes-de-planification)
8. [Points d'Intégration Transactions Récurrentes](#8-points-dintégration-transactions-récurrentes)

---

## 1. TYPES DE NOTIFICATIONS

### 1.1 Liste Complète des 9 Types de Notifications

Le système supporte **9 types de notifications** documentés dans `notificationService.ts`:

| Type | Code | Description | Priorité | Déclencheur |
|------|------|-------------|----------|-------------|
| **Budget Alert** | `budget_alert` | Alertes quand budget atteint 80%, 100%, 120% | `normal`/`high` | Vérification horaire |
| **Goal Reminder** | `goal_reminder` | Rappels 3 jours avant deadline si <50% progression | `normal`/`high` | Vérification quotidienne 9h |
| **Transaction Alert** | `transaction_alert` | Transactions importantes (>100,000 MGA) | `normal` | Immédiat après transaction |
| **Daily Summary** | `daily_summary` | Résumé quotidien revenus/dépenses | `low` | Quotidien 20h |
| **Sync Notification** | `sync_notification` | Notifications de synchronisation | `normal` | Événement sync |
| **Security Alert** | `security_alert` | Alertes de sécurité et connexions | `high` | Immédiat |
| **Mobile Money** | `mobile_money` | Transactions Orange Money/Mvola/Airtel | `normal` | Immédiat |
| **Seasonal** | `seasonal` | Rappels saisonniers malgaches | `normal` | Calendrier |
| **Family Event** | `family_event` | Anniversaires et fêtes familiales | `normal` | Calendrier |
| **Market Day** | `market_day` | Rappel du Zoma (marché vendredi) | `normal` | Hebdomadaire |

**Note:** Il y a en fait **10 types** dans le code (incluant `market_day`), mais 9 sont documentés dans les paramètres.

### 1.2 Interface TypeScript

```typescript
// Source: frontend/src/services/notificationService.ts:3-19
export interface NotificationData {
  id: string
  type: 'budget_alert' | 'goal_reminder' | 'transaction_alert' | 
        'daily_summary' | 'sync_notification' | 'security_alert' | 
        'mobile_money' | 'seasonal' | 'family_event' | 'market_day'
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
```

---

## 2. SERVICE WORKER ARCHITECTURE

### 2.1 Fichier Service Worker

**Localisation:** `frontend/public/sw-notifications.js`  
**Rôle:** Service Worker dédié aux notifications en arrière-plan

### 2.2 Fonctionnalités Principales

#### 2.2.1 Écoute des Messages du Thread Principal

```javascript
// Lignes 5-31: Écoute des messages SHOW_NOTIFICATION
self.addEventListener('message', (event) => {
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { notification } = event.data
    self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: notification.icon || '/icon-192x192.png',
      badge: notification.badge || '/icon-192x192.png',
      tag: notification.tag,
      data: notification.data,
      requireInteraction: notification.requireInteraction,
      silent: notification.silent,
      actions: [
        { action: 'view', title: 'Voir', icon: '/icon-192x192.png' },
        { action: 'dismiss', title: 'Ignorer', icon: '/icon-192x192.png' }
      ]
    })
  }
})
```

#### 2.2.2 Gestion des Clics sur Notifications

```javascript
// Lignes 34-85: Gestion des clics
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const { action, data } = event
  
  if (action === 'dismiss') {
    // Envoyer message au thread principal pour enregistrer le dismiss
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_DISMISSED',
          notificationId: data.notificationId
        })
      })
    })
    return
  }
  
  // Action par défaut ou 'view'
  const clickAction = data.clickAction || '/dashboard'
  
  // Ouvrir ou focuser la fenêtre de l'application
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clientList => {
      // Chercher une fenêtre existante
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(clickAction)
          return
        }
      }
      
      // Ouvrir une nouvelle fenêtre si aucune n'existe
      if (self.clients.openWindow) {
        return self.clients.openWindow(clickAction)
      }
    })
  )
  
  // Envoyer message au thread principal pour enregistrer le clic
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'NOTIFICATION_CLICK',
        notificationId: data.notificationId,
        action: action || 'view',
        clickAction: clickAction
      })
    })
  })
})
```

#### 2.2.3 Support Push Notifications (Futur)

```javascript
// Lignes 116-150: Gestion des notifications push
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json()
      // Afficher notification push
      event.waitUntil(
        self.registration.showNotification(data.title, options)
      )
    } catch (error) {
      console.error('Erreur lors du traitement de la notification push:', error)
    }
  }
})
```

#### 2.2.4 Synchronisation en Arrière-Plan

```javascript
// Lignes 153-157: Gestion des événements de synchronisation
self.addEventListener('sync', (event) => {
  if (event.tag === 'notification-sync') {
    event.waitUntil(syncNotifications())
  }
})
```

### 2.3 Intégration avec NotificationService

Le service worker est enregistré dans `notificationService.ts`:

```typescript
// Lignes 81-87: Enregistrement du Service Worker
if ('serviceWorker' in navigator) {
  this.serviceWorkerRegistration = await navigator.serviceWorker.ready
  console.log('🔔 Service Worker prêt pour les notifications')
  
  // Écouter les messages du service worker
  navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))
}
```

### 2.4 Événements Gérés

| Événement | Type | Description |
|------------|------|-------------|
| `message` | `MessageEvent` | Messages du thread principal (SHOW_NOTIFICATION) |
| `notificationclick` | `NotificationEvent` | Clic sur notification (view/dismiss) |
| `notificationclose` | `NotificationEvent` | Fermeture de notification |
| `notificationerror` | `ErrorEvent` | Erreur d'affichage |
| `push` | `PushEvent` | Notification push (futur) |
| `sync` | `SyncEvent` | Synchronisation en arrière-plan |

---

## 3. INTERVALLES DE MONITORING

### 3.1 Patterns setInterval Identifiés

Le système utilise **4 intervalles de monitoring** principaux:

#### 3.1.1 Vérification Budgets (Horaire)

```typescript
// Source: frontend/src/services/notificationService.ts:513-518
this.intervals.set('budget', setInterval(async () => {
  const user = await this.getCurrentUser()
  if (user) {
    await this.scheduleBudgetCheck(user.id)
  }
}, 60 * 60 * 1000)) // 1 heure
```

- **Fréquence:** Toutes les heures (3,600,000 ms)
- **Méthode:** `scheduleBudgetCheck(userId)`
- **Seuils:** 80%, 100%, 120%
- **Priorité:** Normal → High selon seuil

#### 3.1.2 Vérification Objectifs (Quotidien 9h)

```typescript
// Source: frontend/src/services/notificationService.ts:521-529
this.intervals.set('goals', setInterval(async () => {
  const now = new Date()
  if (now.getHours() === 9) {
    const user = await this.getCurrentUser()
    if (user) {
      await this.scheduleGoalCheck(user.id)
    }
  }
}, 60 * 60 * 1000)) // 1 heure
```

- **Fréquence:** Vérification horaire, déclenchement à 9h
- **Méthode:** `scheduleGoalCheck(userId)`
- **Conditions:** 3 jours avant deadline + progression <50%
- **Priorité:** Normal → High selon urgence

#### 3.1.3 Résumé Quotidien (Quotidien 20h)

```typescript
// Source: frontend/src/services/notificationService.ts:532-540
this.intervals.set('daily', setInterval(async () => {
  const now = new Date()
  if (now.getHours() === 20) {
    const user = await this.getCurrentUser()
    if (user) {
      await this.scheduleDailySummary(user.id)
    }
  }
}, 60 * 60 * 1000)) // 1 heure
```

- **Fréquence:** Vérification horaire, déclenchement à 20h
- **Méthode:** `scheduleDailySummary(userId)`
- **Contenu:** Revenus/dépenses du jour
- **Priorité:** Low

#### 3.1.4 Réinitialisation Compteur Quotidien (Minuit)

```typescript
// Source: frontend/src/services/notificationService.ts:543-548
this.intervals.set('reset', setInterval(() => {
  const now = new Date()
  if (now.getHours() === 0) {
    this.dailyNotificationCount.clear()
  }
}, 60 * 60 * 1000)) // 1 heure
```

- **Fréquence:** Vérification horaire, déclenchement à minuit
- **Action:** Réinitialise `dailyNotificationCount` Map
- **Objectif:** Limite quotidienne de notifications

### 3.2 Double Initialisation (Problème Identifié)

⚠️ **PROBLÈME DÉTECTÉ:** Les intervalles sont créés **2 fois**:
1. Dans `notificationService.startPeriodicChecks()` (ligne 511)
2. Dans `DashboardPage.tsx` (lignes 116-136)

**Impact:** Risque de notifications dupliquées et consommation mémoire excessive.

**Recommandation:** Supprimer les intervalles dupliqués dans `DashboardPage.tsx` et utiliser uniquement ceux du service.

### 3.3 Monitoring Transactions (Immédiat)

```typescript
// Source: frontend/src/pages/DashboardPage.tsx:193-199
// Surveiller les transactions importantes pour les notifications
if (user?.id) {
  for (const transaction of sortedTransactions) {
    if (transaction.amount > 100000) {
      await notificationService.scheduleTransactionWatch(user.id, transaction);
    }
  }
}
```

- **Déclencheur:** Immédiat lors du chargement du dashboard
- **Méthode:** `scheduleTransactionWatch(userId, transaction)`
- **Seuil:** >100,000 MGA
- **Priorité:** Normal

---

## 4. PARAMÈTRES DE NOTIFICATION

### 4.1 Interface NotificationSettings

```typescript
// Source: frontend/src/services/notificationService.ts:21-43
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
```

### 4.2 Valeurs par Défaut

```typescript
// Source: frontend/src/services/notificationService.ts:715-739
private getDefaultSettings(userId: string): NotificationSettings {
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
```

### 4.3 Filtrage par Préférences

```typescript
// Source: frontend/src/services/notificationService.ts:562-589
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
    default:
      return true
  }
}
```

### 4.4 Heures Silencieuses

```typescript
// Source: frontend/src/services/notificationService.ts:594-608
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
```

**Comportement:** Si heures silencieuses actives, notification différée via `scheduleNotification()`.

### 4.5 Limite Quotidienne

```typescript
// Source: frontend/src/services/notificationService.ts:613-617
private hasReachedDailyLimit(userId: string): boolean {
  const count = this.dailyNotificationCount.get(userId) || 0
  const maxDaily = this.settings?.maxDailyNotifications || 5
  return count >= maxDaily
}
```

**Comportement:** Si limite atteinte, notification non envoyée.

### 4.6 Interface Utilisateur

**Composant:** `NotificationSettings.tsx`  
**Localisation:** `frontend/src/components/NotificationSettings.tsx`

- 9 toggles pour chaque type de notification
- Configuration heures silencieuses (début/fin)
- Ajustement limite quotidienne (1-20)
- Sauvegarde dans IndexedDB + localStorage

---

## 5. SCHÉMAS INDEXEDDB

### 5.1 Version 6 - Support Notifications

**Migration:** Version 6 de la base IndexedDB ajoute les tables de notifications.

```typescript
// Source: frontend/src/lib/database.ts:235-250
this.version(6).stores({
  users: 'id, username, email, phone, passwordHash, lastSync, createdAt, updatedAt',
  accounts: 'id, userId, name, type, balance, currency, createdAt, updatedAt',
  transactions: 'id, userId, accountId, type, amount, category, date, createdAt, updatedAt, [userId+date], [accountId+date]',
  budgets: 'id, userId, category, amount, period, year, month, spent, createdAt, updatedAt, [userId+year+month]',
  goals: 'id, userId, name, targetAmount, currentAmount, deadline, createdAt, updatedAt, [userId+deadline]',
  mobileMoneyRates: 'id, service, minAmount, maxAmount, fee, lastUpdated, updatedBy, [service+minAmount]',
  syncQueue: '++id, userId, operation, table_name, data, timestamp, status, retryCount, [userId+status], [status+timestamp]',
  feeConfigurations: '++id, operator, feeType, targetOperator, amountRanges, isActive, createdAt, updatedAt',
  connectionPool: '++id, isActive, lastUsed, transactionCount',
  databaseLocks: '++id, table, recordId, userId, acquiredAt, expiresAt, [table+recordId], [userId+acquiredAt]',
  performanceMetrics: '++id, operationCount, averageResponseTime, concurrentUsers, memoryUsage, lastUpdated',
  // NOUVELLES TABLES NOTIFICATIONS
  notifications: 'id, type, userId, timestamp, read, sent, scheduled, [userId+type], [userId+timestamp], [type+timestamp]',
  notificationSettings: 'id, userId, [userId]',
  notificationHistory: 'id, userId, notificationId, sentAt, [userId+sentAt], [notificationId]'
})
```

### 5.2 Table: notifications

**Index Dexie:**
```
id (primary)
type
userId
timestamp
read
sent
scheduled
[userId+type] (composite)
[userId+timestamp] (composite)
[type+timestamp] (composite)
```

**Schéma TypeScript:**
```typescript
interface NotificationData {
  id: string
  type: 'budget_alert' | 'goal_reminder' | 'transaction_alert' | 
        'daily_summary' | 'sync_notification' | 'security_alert' | 
        'mobile_money' | 'seasonal' | 'family_event' | 'market_day'
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
```

**Opérations:**
- `db.notifications.add(notification)` - Créer notification
- `db.notifications.update(id, { sent: true })` - Marquer comme envoyée
- `db.notifications.where('userId').equals(userId).toArray()` - Récupérer par utilisateur

### 5.3 Table: notificationSettings

**Index Dexie:**
```
id (primary)
userId (unique)
[userId] (composite)
```

**Schéma TypeScript:** Voir section 4.1

**Opérations:**
- `db.notificationSettings.where('userId').equals(userId).first()` - Récupérer paramètres
- `db.notificationSettings.update(id, settings)` - Mettre à jour
- `db.notificationSettings.add(settings)` - Créer paramètres par défaut

**Migration Automatique:** Version 6 crée automatiquement les paramètres par défaut pour tous les utilisateurs existants.

### 5.4 Table: notificationHistory

**Index Dexie:**
```
id (primary)
userId
notificationId
sentAt
[userId+sentAt] (composite)
[notificationId] (index)
```

**Schéma TypeScript:**
```typescript
interface NotificationHistory {
  id: string
  userId: string
  notificationId: string
  sentAt: Date
  clickedAt?: Date
  dismissedAt?: Date
  action?: string
  data?: any
}
```

**Opérations:**
- `db.notificationHistory.add(history)` - Enregistrer historique
- `db.notificationHistory.where('notificationId').equals(id).first()` - Récupérer par notification
- `db.notificationHistory.update(id, { clickedAt: new Date() })` - Enregistrer clic

### 5.5 Persistance localStorage

**Clés Utilisées:**
- `bazarkely-notification-permission` - État permission (granted/denied/default)
- `bazarkely-notification-settings` - Paramètres JSON (cache)
- `bazarkely-notification-banner-dismissed` - Banner fermé (timestamp)

---

## 6. DÉPENDANCES TRANSACTIONNELLES

### 6.1 Fichiers Important transactionService

#### 6.1.1 DashboardPage.tsx

**Ligne 6:** `import transactionService from '../services/transactionService'`

**Utilisations:**
- Ligne 179: `await transactionService.getTransactions()` - Charger toutes les transactions
- Ligne 196: `notificationService.scheduleTransactionWatch(user.id, transaction)` - Surveillance transactions importantes

**Dépendances Notifications:**
- Ligne 7: `import notificationService from '../services/notificationService'`
- Ligne 194-199: Surveillance transactions >100,000 MGA

#### 6.1.2 TransactionService.ts

**Localisation:** `frontend/src/services/transactionService.ts`

**Fonctionnalités:**
- `getTransactions()` - Récupérer toutes les transactions
- `getTransaction(id, userId?)` - Récupérer par ID
- `createTransaction(userId, data)` - Créer transaction
- `updateTransaction(id, data)` - Mettre à jour
- `deleteTransaction(id)` - Supprimer
- `createTransfer(userId, data)` - Créer transfert

**Note:** Import notificationService commenté (ligne 5) - TODO pour intégration future.

#### 6.1.3 TransactionsPage.tsx

**Ligne 5:** `import transactionService from '../services/transactionService'`

**Utilisations:**
- Chargement et affichage de la liste des transactions
- Filtrage par type, catégorie, compte
- Pas d'intégration notifications directe

#### 6.1.4 TransactionDetailPage.tsx

**Ligne 5:** `import transactionService from '../services/transactionService'`

**Utilisations:**
- Affichage détail transaction
- Édition/Suppression transaction
- Pas d'intégration notifications directe

#### 6.1.5 AddTransactionPage.tsx

**Utilisations:**
- Création nouvelles transactions
- Pas d'intégration notifications directe

#### 6.1.6 TransferPage.tsx

**Utilisations:**
- Création transferts entre comptes
- Pas d'intégration notifications directe

### 6.2 Points d'Intégration Notifications ↔ Transactions

#### 6.2.1 DashboardPage.tsx (Lignes 193-199)

```typescript
// Surveiller les transactions importantes pour les notifications
if (user?.id) {
  for (const transaction of sortedTransactions) {
    if (transaction.amount > 100000) {
      await notificationService.scheduleTransactionWatch(user.id, transaction);
    }
  }
}
```

**Déclencheur:** Chargement dashboard  
**Condition:** Transaction >100,000 MGA  
**Action:** Notification `transaction_alert`

#### 6.2.2 TransactionService.ts (Lignes 140-144 - Commenté)

```typescript
// Vérifier les alertes de budget après création
// TODO: Implement budget alerts when notificationService is fully implemented
// setTimeout(() => {
//   notificationService.checkBudgetAlerts(userId);
// }, 1000);
```

**État:** Commenté - TODO  
**Objectif:** Vérifier alertes budget après création transaction

### 6.3 Flux Données Transactions → Notifications

```
transactionService.createTransaction()
  ↓
Transaction créée (Supabase)
  ↓
DashboardPage charge transactions
  ↓
Filtre transactions >100,000 MGA
  ↓
notificationService.scheduleTransactionWatch()
  ↓
Vérification préférences utilisateur
  ↓
Vérification heures silencieuses
  ↓
Vérification limite quotidienne
  ↓
displayNotification() → Service Worker
  ↓
Notification affichée
```

### 6.4 Dépendances Futures Identifiées

1. **Budget Alerts:** Notification après création transaction si budget dépassé
2. **Transaction Recurring:** Génération automatique + notification avant échéance
3. **Daily Summary:** Intégration transactions dans résumé quotidien (déjà fait)

---

## 7. MÉCANISMES DE PLANIFICATION

### 7.1 Planification Immédiate

**Méthode:** `showNotification()`  
**Source:** `notificationService.ts:141-186`

```typescript
async showNotification(notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'sent'>): Promise<boolean>
```

**Flux:**
1. Vérifier permission
2. Vérifier préférences utilisateur (`shouldSendNotification()`)
3. Vérifier heures silencieuses (`isQuietHours()`)
   - Si actives → `scheduleNotification()` avec `getNextAvailableTime()`
4. Vérifier limite quotidienne (`hasReachedDailyLimit()`)
5. Sauvegarder en IndexedDB (`saveNotification()`)
6. Afficher notification (`displayNotification()`)
7. Incrémenter compteur quotidien (`incrementDailyCount()`)

### 7.2 Planification Différée

**Méthode:** `scheduleNotification()`  
**Source:** `notificationService.ts:191-209`

```typescript
async scheduleNotification(
  notification: Omit<NotificationData, 'id' | 'timestamp' | 'read' | 'sent'>, 
  scheduledTime: Date
): Promise<boolean>
```

**Flux:**
1. Créer `NotificationData` avec `scheduled: scheduledTime`
2. Sauvegarder en IndexedDB
3. Notification programmée pour traitement ultérieur

**Note:** Le système actuel ne vérifie pas automatiquement les notifications programmées. Il faudrait ajouter un intervalle pour vérifier `notifications.where('scheduled').below(now)`.

### 7.3 Calcul Heure Disponible

**Méthode:** `getNextAvailableTime()`  
**Source:** `notificationService.ts:630-652`

```typescript
private getNextAvailableTime(): Date
```

**Logique:**
- Si heures silencieuses désactivées → 1 minute plus tard
- Si heures silencieuses actives:
  - Calculer fin des heures silencieuses
  - Retourner demain après fin si actuellement en heures silencieuses
  - Sinon retourner aujourd'hui après fin

### 7.4 Planification Basée sur Événements

#### 7.4.1 Budget Check

**Méthode:** `scheduleBudgetCheck(userId)`  
**Source:** `notificationService.ts:214-267`

**Déclencheur:** Intervalle horaire  
**Logique:**
- Récupérer budgets du mois courant
- Calculer pourcentage dépensé
- Notifier si:
  - ≥80% et <100% → Alerte normale
  - ≥100% et <120% → Budget dépassé (high)
  - ≥120% → Budget critique (high)

#### 7.4.2 Goal Check

**Méthode:** `scheduleGoalCheck(userId)`  
**Source:** `notificationService.ts:272-312`

**Déclencheur:** Intervalle horaire, déclenchement à 9h  
**Logique:**
- Récupérer objectifs non complétés
- Calculer jours jusqu'à deadline
- Calculer pourcentage progression
- Notifier si:
  - 3 jours restants + progression <50% → Rappel (normal)
  - ≤1 jour restant → Deadline approche (high)

#### 7.4.3 Daily Summary

**Méthode:** `scheduleDailySummary(userId)`  
**Source:** `notificationService.ts:339-380`

**Déclencheur:** Intervalle horaire, déclenchement à 20h  
**Logique:**
- Récupérer transactions du jour
- Calculer revenus totaux
- Calculer dépenses totales
- Calculer montant net
- Notification avec résumé (low)

#### 7.4.4 Transaction Watch

**Méthode:** `scheduleTransactionWatch(userId, transaction)`  
**Source:** `notificationService.ts:317-334`

**Déclencheur:** Immédiat après détection transaction importante  
**Logique:**
- Vérifier si montant >100,000 MGA
- Notification transaction importante (normal)

### 7.5 Limitations Actuelles

⚠️ **PROBLÈMES IDENTIFIÉS:**

1. **Notifications Programmées Non Vérifiées:** Le système sauvegarde les notifications avec `scheduled` mais ne les vérifie pas automatiquement. Il faudrait un intervalle pour vérifier `notifications.where('scheduled').below(new Date())`.

2. **Intervalles Dupliqués:** Double initialisation dans `notificationService` et `DashboardPage`.

3. **Pas de Planification Avancée:** Pas de support pour:
   - Récurrence (quotidien, hebdomadaire, mensuel)
   - Dates spécifiques
   - Conditions complexes
   - Notifications avant échéance

4. **Service Worker Sync Non Implémenté:** La fonction `syncNotifications()` dans le SW retourne un tableau vide (ligne 185).

---

## 8. POINTS D'INTÉGRATION TRANSACTIONS RÉCURRENTES

### 8.1 Architecture Actuelle

Le système de notifications est **prêt** pour intégrer les transactions récurrentes, mais nécessite des extensions.

### 8.2 Points d'Intégration Identifiés

#### 8.2.1 Notification Avant Échéance

**Localisation:** `notificationService.ts`  
**Nouvelle Méthode Requise:**

```typescript
async scheduleRecurringTransactionReminder(
  userId: string, 
  recurringTransaction: RecurringTransaction,
  daysBefore: number = 1
): Promise<boolean>
```

**Intégration:**
- Ajouter type `recurring_transaction_reminder` dans `NotificationData.type`
- Ajouter préférence `recurringTransactionReminders: boolean` dans `NotificationSettings`
- Créer intervalle pour vérifier transactions récurrentes à venir

**Exemple:**
```typescript
// Nouveau type
type: 'recurring_transaction_reminder'

// Nouvelle vérification
this.intervals.set('recurring', setInterval(async () => {
  const user = await this.getCurrentUser()
  if (user) {
    await this.checkRecurringTransactions(user.id)
  }
}, 60 * 60 * 1000)) // Vérification horaire
```

#### 8.2.2 Notification Génération Automatique

**Localisation:** `transactionService.ts` ou nouveau service  
**Intégration:**

```typescript
// Dans transactionService.createRecurringTransaction()
async createRecurringTransaction(userId: string, data: RecurringTransactionData): Promise<RecurringTransaction | null> {
  // ... création transaction récurrente ...
  
  // Notifier création
  await notificationService.showNotification({
    type: 'recurring_transaction_reminder',
    title: '✅ Transaction Récurrente Créée',
    body: `Transaction "${data.description}" programmée ${data.frequency}`,
    priority: 'normal',
    userId,
    clickAction: '/recurring-transactions',
    data: { recurringTransactionId: recurring.id }
  })
  
  return recurring
}
```

#### 8.2.3 Notification Après Génération

**Localisation:** Service de génération automatique  
**Intégration:**

```typescript
// Après génération automatique d'une transaction
await notificationService.showNotification({
  type: 'transaction_alert',
  title: '💰 Transaction Récurrente Générée',
  body: `Transaction "${transaction.description}" de ${formatCurrency(transaction.amount)} générée automatiquement`,
  priority: 'normal',
  userId,
  clickAction: `/transactions/${transaction.id}`,
  data: { 
    transactionId: transaction.id,
    recurringTransactionId: recurring.id,
    isAutoGenerated: true
  }
})
```

#### 8.2.4 Vérification Transactions Récurrentes

**Nouveau Service:** `recurringTransactionService.ts`

**Méthode Requise:**
```typescript
async checkUpcomingRecurringTransactions(userId: string, daysAhead: number = 7): Promise<RecurringTransaction[]>
```

**Intégration NotificationService:**
```typescript
async checkRecurringTransactions(userId: string): Promise<void> {
  const recurringService = new RecurringTransactionService()
  const upcoming = await recurringService.checkUpcomingRecurringTransactions(userId, 1)
  
  for (const recurring of upcoming) {
    const nextDate = calculateNextOccurrence(recurring)
    const daysUntil = Math.ceil((nextDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    
    if (daysUntil === 1) {
      await this.showNotification({
        type: 'recurring_transaction_reminder',
        title: '⏰ Transaction Récurrente Demain',
        body: `"${recurring.description}" sera générée automatiquement demain`,
        priority: 'normal',
        userId,
        clickAction: '/recurring-transactions',
        data: { recurringTransactionId: recurring.id }
      })
    }
  }
}
```

### 8.3 Modifications IndexedDB Requises

#### 8.3.1 Nouvelle Table: recurringTransactions

**Schéma Proposé:**
```typescript
interface RecurringTransaction {
  id: string
  userId: string
  accountId: string
  type: 'income' | 'expense'
  amount: number
  description: string
  category: string
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: Date
  endDate?: Date
  nextOccurrence: Date
  lastGenerated?: Date
  isActive: boolean
  notificationDaysBefore: number[]
  createdAt: Date
  updatedAt: Date
}
```

**Index Dexie:**
```
recurringTransactions: 'id, userId, accountId, type, frequency, nextOccurrence, isActive, [userId+nextOccurrence], [userId+isActive]'
```

#### 8.3.2 Extension NotificationSettings

**Ajout:**
```typescript
recurringTransactionReminders: boolean
recurringTransactionNotificationDays: number[] // [1, 3, 7] jours avant
```

### 8.4 Modifications Service Worker

**Pas de modifications nécessaires** - Le SW actuel supporte déjà tous les types de notifications.

### 8.5 Modifications NotificationService

**Nouvelles Méthodes Requises:**

1. `checkRecurringTransactions(userId)` - Vérifier transactions à venir
2. `scheduleRecurringTransactionReminder(userId, recurring, daysBefore)` - Programmer rappel
3. Extension `shouldSendNotification()` pour type `recurring_transaction_reminder`

**Nouveau Type:**
```typescript
type NotificationType = 
  | 'budget_alert' 
  | 'goal_reminder' 
  | 'transaction_alert' 
  | 'daily_summary' 
  | 'sync_notification' 
  | 'security_alert' 
  | 'mobile_money' 
  | 'seasonal' 
  | 'family_event' 
  | 'market_day'
  | 'recurring_transaction_reminder' // NOUVEAU
```

### 8.6 Plan d'Intégration Recommandé

#### Phase 1: Infrastructure
1. Créer table `recurringTransactions` dans IndexedDB
2. Créer service `recurringTransactionService.ts`
3. Ajouter type `recurring_transaction_reminder` dans notifications

#### Phase 2: Génération Automatique
1. Créer service de génération automatique (cron job ou intervalle)
2. Vérifier `nextOccurrence <= now` toutes les heures
3. Générer transaction et mettre à jour `nextOccurrence`
4. Envoyer notification après génération

#### Phase 3: Rappels
1. Ajouter méthode `checkRecurringTransactions()` dans NotificationService
2. Créer intervalle pour vérifier transactions à venir
3. Envoyer rappel X jours avant échéance
4. Intégrer dans paramètres utilisateur

#### Phase 4: Interface Utilisateur
1. Page gestion transactions récurrentes
2. Formulaire création/édition
3. Liste transactions récurrentes
4. Configuration rappels par transaction

---

## 9. RÉSUMÉ ET RECOMMANDATIONS

### 9.1 Architecture Complète Identifiée

✅ **Système de notifications fonctionnel** avec:
- 9 types de notifications supportés
- Service Worker pour notifications arrière-plan
- IndexedDB pour persistance
- Paramètres utilisateur configurables
- Monitoring horaire et quotidien
- Heures silencieuses et limite quotidienne

### 9.2 Dépendances Transactionnelles

✅ **Intégration partielle** transactions ↔ notifications:
- Surveillance transactions importantes (>100,000 MGA) dans DashboardPage
- TODO: Alertes budget après création transaction
- TODO: Intégration transactions récurrentes

### 9.3 Points d'Amélioration Identifiés

⚠️ **Problèmes:**
1. Intervalles dupliqués (notificationService + DashboardPage)
2. Notifications programmées non vérifiées automatiquement
3. Service Worker sync non implémenté
4. Pas de support récurrence dans planification

### 9.4 Prêt pour Transactions Récurrentes

✅ **Architecture prête** mais nécessite:
- Extension types notifications
- Nouveau service recurringTransactions
- Nouvelle table IndexedDB
- Méthodes de vérification et rappels
- Interface utilisateur

### 9.5 Recommandations

1. **Nettoyer duplications:** Supprimer intervalles dans DashboardPage
2. **Implémenter vérification programmée:** Intervalle pour notifications `scheduled`
3. **Créer service récurrent:** `recurringTransactionService.ts`
4. **Extension IndexedDB:** Table `recurringTransactions`
5. **Ajouter type notification:** `recurring_transaction_reminder`
6. **Implémenter rappels:** Vérification transactions à venir

---

## 🔚 SIGNATURE AGENT-2

**AGENT-2-NOTIFICATIONS-COMPLETE**

✅ Architecture système de notifications mappée  
✅ 9 types de notifications documentés  
✅ Service Worker analysé  
✅ Intervalles de monitoring identifiés  
✅ Paramètres utilisateur documentés  
✅ Schémas IndexedDB mappés  
✅ Dépendances transactionnelles tracées  
✅ Mécanismes de planification documentés  
✅ Points d'intégration transactions récurrentes identifiés  

**Rapport généré le:** 2025-01-12  
**Statut:** COMPLET

