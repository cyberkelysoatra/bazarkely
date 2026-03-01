# 🔔 Système de Notifications Push - BazarKELY

## 📋 Vue d'ensemble

BazarKELY PWA intègre un système de notifications push complet pour améliorer l'expérience utilisateur avec des alertes intelligentes et des rappels personnalisés adaptés au contexte malgache.

## 🏗️ Architecture

### Composants Principaux
- **NotificationService** - Service principal de gestion des notifications
- **Service Worker** - Gestion des notifications en arrière-plan
- **NotificationPermissionRequest** - Composant de demande de permission
- **NotificationPreferencesPage** - Page de configuration des préférences
- **useNotifications** - Hook React pour l'intégration

### Types de Notifications
1. **Alertes de Budget** - Dépassements et seuils
2. **Rappels d'Objectifs** - Progression et deadlines
3. **Rappels de Transactions** - Transactions récurrentes
4. **Notifications de Synchronisation** - Statut de sync
5. **Alertes de Sécurité** - Connexions suspectes
6. **Mobile Money** - Transactions et frais
7. **Saisonnières** - Rappels agricoles
8. **Événements Familiaux** - Anniversaires, fêtes
9. **Marché du Vendredi** - Rappels Zoma

## 🚀 Fonctionnalités

### Alertes de Budget
- **80%** - Alerte préventive
- **100%** - Budget dépassé
- **120%** - Alerte critique

### Rappels d'Objectifs
- Progression hebdomadaire
- Alertes de deadline (7 jours)
- Notifications de réussite

### Notifications Madagascar
- **Mobile Money** - Orange Money, Mvola, Airtel Money
- **Saisonnières** - Planification des récoltes
- **Zoma** - Marché du vendredi
- **Événements** - Fêtes familiales

### Heures Silencieuses
- Configuration personnalisée
- Diffusion différée
- Respect du sommeil

## 🔧 Configuration

### Préférences Utilisateur
```typescript
interface NotificationPreferences {
  budgetAlerts: boolean;
  goalReminders: boolean;
  transactionReminders: boolean;
  syncNotifications: boolean;
  securityAlerts: boolean;
  mobileMoneyAlerts: boolean;
  seasonalReminders: boolean;
  familyEventReminders: boolean;
  marketDayReminders: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string; // HH:MM
  };
  frequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
}
```

### Permissions
- Demande automatique au premier usage
- Gestion des refus
- Instructions de réactivation

## 📱 Utilisation

### Demande de Permission
```tsx
import NotificationPermissionRequest from '../components/NotificationPermissionRequest'

<NotificationPermissionRequest 
  onPermissionGranted={() => console.log('Permission accordée')}
  onPermissionDenied={() => console.log('Permission refusée')}
  onDismiss={() => console.log('Demande fermée')}
/>
```

### Envoi de Notification
```typescript
import notificationService from '../services/notificationService'

await notificationService.sendNotification({
  type: 'budget_alert',
  title: 'Alerte Budget',
  body: 'Votre budget alimentation atteint 80%',
  priority: 'normal',
  userId: 'user1'
})
```

### Vérification des Alertes
```typescript
// Alertes de budget
await notificationService.checkBudgetAlerts('user1')

// Rappels d'objectifs
await notificationService.checkGoalReminders('user1')

// Notifications Madagascar
await notificationService.checkMadagascarSpecificNotifications('user1')
```

## 🧪 Tests

### Tests Unitaires
```bash
npm run test:unit -- notificationService
```

### Tests de Composants
```bash
npm run test:component -- NotificationPermissionRequest
```

### Tests E2E
```bash
npm run test:e2e -- notifications
```

## 🔒 Sécurité et Confidentialité

### Données Locales
- Aucune donnée envoyée à des services externes
- Stockage local uniquement
- Chiffrement des préférences

### Permissions
- Demande explicite de l'utilisateur
- Gestion des refus
- Pas de tracking

## 📊 Performance

### Optimisations
- Notifications différées en heures silencieuses
- Mise en cache des préférences
- Gestion intelligente des conflits

### Métriques
- Temps de réponse < 100ms
- Taux de livraison > 95%
- Impact batterie minimal

## 🌍 Contexte Madagascar

### Mobile Money
- Tarifs réels Orange Money, Mvola, Airtel Money
- Calculs de frais automatiques
- Confirmations de transaction

### Saisonnalité
- Rappels de récoltes (avril-mai)
- Planification des revenus agricoles
- Gestion des cycles économiques

### Culture Locale
- Marché du vendredi (Zoma)
- Événements familiaux
- Traditions malgaches

## 🛠️ Développement

### Ajout de Nouveau Type
1. Ajouter le type dans `NotificationData`
2. Implémenter la logique dans `NotificationService`
3. Ajouter les préférences dans `NotificationPreferences`
4. Créer les tests correspondants

### Débogage
```typescript
// Activer les logs
localStorage.setItem('bazarkely-debug-notifications', 'true')

// Vérifier les permissions
console.log('Permission:', Notification.permission)

// Tester les notifications
notificationService.sendNotification({
  type: 'test',
  title: 'Test',
  body: 'Notification de test',
  priority: 'normal',
  userId: 'test'
})
```

## 📈 Monitoring

### Métriques Surveillées
- Taux d'acceptation des permissions
- Fréquence des notifications
- Taux de clic
- Erreurs de livraison

### Alertes Système
- Échecs de permission
- Erreurs de Service Worker
- Problèmes de synchronisation

## 🔄 Maintenance

### Mise à Jour
- Vérification des permissions
- Migration des préférences
- Nettoyage des anciennes notifications

### Support
- Documentation utilisateur
- FAQ notifications
- Support technique

## 📚 Ressources

### Documentation
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)
- [Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [PWA Notifications](https://web.dev/notifications/)

### Exemples
- Tests dans `src/services/__tests__/`
- Composants dans `src/components/`
- Pages dans `src/pages/`

---

**BazarKELY Notifications** - Alertes intelligentes pour une gestion financière optimale ! 🔔
