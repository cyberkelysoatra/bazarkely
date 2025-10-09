# 🔔 Guide de Test des Notifications BazarKELY

## Vue d'ensemble

Ce guide détaille comment tester le système de notifications push complet implémenté dans BazarKELY. Le système inclut des alertes de budget, des rappels d'objectifs, des alertes de transactions importantes, et un résumé quotidien.

## 🚀 Fonctionnalités Implémentées

### Phase 1: API de Notifications Réelle ✅
- ✅ Remplacement du mock service par l'API Notification réelle
- ✅ Gestion des permissions (granted, denied, default)
- ✅ Persistance de l'état de permission dans localStorage
- ✅ Support des navigateurs modernes

### Phase 2: Système de Planification ✅
- ✅ Vérification des budgets toutes les heures (80%, 100%, 120%)
- ✅ Vérification des objectifs quotidiennement à 9h (3 jours avant deadline)
- ✅ Surveillance des transactions importantes (>100,000 Ar)
- ✅ Résumé quotidien à 20h
- ✅ Limite de 5 notifications par jour par défaut

### Phase 3: Paramètres Utilisateur ✅
- ✅ Interface de configuration complète
- ✅ Heures silencieuses configurables
- ✅ Types de notifications activables/désactivables
- ✅ Limite quotidienne personnalisable (1-20)
- ✅ Persistance des paramètres dans IndexedDB

## 🧪 Tests à Effectuer

### 1. Test de Permission de Notifications

#### Test 1.1: Demande de Permission
1. **Ouvrir l'application** dans Chrome/Edge
2. **Vérifier** que le banner de notification apparaît
3. **Cliquer sur "Activer les Notifications"**
4. **Vérifier** que la boîte de dialogue du navigateur apparaît
5. **Cliquer sur "Autoriser"**
6. **Vérifier** que le message de succès s'affiche
7. **Vérifier** que le banner disparaît

#### Test 1.2: Refus de Permission
1. **Recharger la page** (ou réinitialiser les permissions)
2. **Cliquer sur "Activer les Notifications"**
3. **Cliquer sur "Bloquer"**
4. **Vérifier** que le message d'erreur s'affiche
5. **Vérifier** que le bouton "Ouvrir les Paramètres" apparaît

#### Test 1.3: Persistance de Permission
1. **Accorder la permission** (Test 1.1)
2. **Recharger la page**
3. **Vérifier** que le banner ne réapparaît pas
4. **Vérifier** que le bouton "Paramètres Notifications" est visible

### 2. Test des Alertes de Budget

#### Test 2.1: Alerte à 80%
1. **Créer un budget** de 100,000 Ar pour "Alimentation"
2. **Ajouter des dépenses** pour atteindre 80,000 Ar (80%)
3. **Attendre jusqu'à 1 heure** ou forcer la vérification
4. **Vérifier** que la notification "⚠️ Alerte Budget" apparaît
5. **Cliquer sur la notification**
6. **Vérifier** que la page Budget s'ouvre

#### Test 2.2: Alerte à 100%
1. **Continuer à ajouter des dépenses** pour atteindre 100,000 Ar (100%)
2. **Vérifier** que la notification "🚨 Budget Dépassé" apparaît
3. **Vérifier** que la priorité est "high"

#### Test 2.3: Alerte Critique à 120%
1. **Continuer à ajouter des dépenses** pour atteindre 120,000 Ar (120%)
2. **Vérifier** que la notification "🔥 Budget Critique" apparaît
3. **Vérifier** que la priorité est "high"

### 3. Test des Rappels d'Objectifs

#### Test 3.1: Rappel 3 Jours Avant
1. **Créer un objectif** avec deadline dans 3 jours
2. **Définir la progression** à moins de 50%
3. **Attendre 9h du matin** ou forcer la vérification
4. **Vérifier** que la notification "🎯 Rappel Objectif" apparaît
5. **Cliquer sur la notification**
6. **Vérifier** que la page Objectifs s'ouvre

#### Test 3.2: Rappel de Deadline
1. **Créer un objectif** avec deadline dans 1 jour
2. **Attendre 9h du matin** ou forcer la vérification
3. **Vérifier** que la notification "⏰ Deadline Approche" apparaît

### 4. Test des Alertes de Transaction

#### Test 4.1: Transaction Importante
1. **Ajouter une transaction** de plus de 100,000 Ar
2. **Vérifier** que la notification "💳 Transaction Importante" apparaît immédiatement
3. **Cliquer sur la notification**
4. **Vérifier** que la page Transactions s'ouvre

### 5. Test du Résumé Quotidien

#### Test 5.1: Résumé à 20h
1. **Ajouter quelques transactions** (revenus et dépenses)
2. **Attendre 20h** ou forcer la vérification
3. **Vérifier** que la notification "📊 Résumé Quotidien" apparaît
4. **Vérifier** que le contenu affiche les montants corrects
5. **Cliquer sur la notification**
6. **Vérifier** que le Dashboard s'ouvre

### 6. Test des Paramètres Utilisateur

#### Test 6.1: Accès aux Paramètres
1. **Accorder la permission** de notifications
2. **Cliquer sur "Paramètres Notifications"**
3. **Vérifier** que la modal s'ouvre
4. **Vérifier** que tous les types de notifications sont visibles

#### Test 6.2: Désactivation d'un Type
1. **Désactiver "Alertes de Budget"**
2. **Sauvegarder** les paramètres
3. **Créer un budget dépassé** (Test 2.1)
4. **Vérifier** qu'aucune notification n'apparaît

#### Test 6.3: Heures Silencieuses
1. **Activer les heures silencieuses** (ex: 22h-07h)
2. **Définir l'heure actuelle** dans cette plage
3. **Déclencher une notification**
4. **Vérifier** qu'elle est différée
5. **Attendre la fin des heures silencieuses**
6. **Vérifier** que la notification apparaît

#### Test 6.4: Limite Quotidienne
1. **Définir la limite** à 2 notifications
2. **Déclencher 3 notifications** rapidement
3. **Vérifier** que seules les 2 premières apparaissent
4. **Vérifier** que la 3ème est bloquée

### 7. Test de Persistance

#### Test 7.1: Persistance des Paramètres
1. **Modifier les paramètres** de notifications
2. **Sauvegarder**
3. **Recharger la page**
4. **Vérifier** que les paramètres sont conservés

#### Test 7.2: Persistance de Permission
1. **Accorder la permission**
2. **Fermer et rouvrir le navigateur**
3. **Vérifier** que la permission est conservée

### 8. Test de Compatibilité

#### Test 8.1: Chrome Desktop
1. **Tester toutes les fonctionnalités** dans Chrome
2. **Vérifier** que les notifications fonctionnent
3. **Vérifier** que les clics ouvrent les bonnes pages

#### Test 8.2: Chrome Mobile
1. **Tester sur mobile** Android
2. **Vérifier** que les notifications apparaissent
3. **Vérifier** que l'application s'ouvre au clic

#### Test 8.3: Navigateurs Non Supportés
1. **Tester dans Firefox** (sans Service Worker)
2. **Vérifier** que les notifications natives fonctionnent
3. **Vérifier** que l'application ne plante pas

## 🔧 Commandes de Test

### Forcer les Vérifications (Développement)

```javascript
// Dans la console du navigateur
// Forcer la vérification des budgets
notificationService.scheduleBudgetCheck('user-id');

// Forcer la vérification des objectifs
notificationService.scheduleGoalCheck('user-id');

// Forcer le résumé quotidien
notificationService.scheduleDailySummary('user-id');

// Tester une notification
notificationService.showNotification({
  type: 'budget_alert',
  title: 'Test Notification',
  body: 'Ceci est un test',
  priority: 'normal',
  userId: 'user-id'
});
```

### Réinitialiser les Paramètres

```javascript
// Dans la console du navigateur
localStorage.removeItem('bazarkely-notification-permission');
localStorage.removeItem('bazarkely-notification-settings');
localStorage.removeItem('bazarkely-notification-banner-dismissed');
location.reload();
```

## 📊 Métriques de Succès

### Fonctionnalités Critiques
- ✅ **Permission accordée** → Notifications fonctionnelles
- ✅ **Permission refusée** → Aucune notification + message d'erreur
- ✅ **Alertes de budget** → Déclenchées aux bons seuils
- ✅ **Rappels d'objectifs** → Déclenchés aux bonnes dates
- ✅ **Transactions importantes** → Déclenchées immédiatement
- ✅ **Résumé quotidien** → Déclenché à 20h
- ✅ **Paramètres** → Sauvegardés et appliqués
- ✅ **Heures silencieuses** → Notifications différées
- ✅ **Limite quotidienne** → Respectée

### Performance
- ✅ **Temps de réponse** < 1 seconde pour les notifications
- ✅ **Mémoire** < 10MB pour le service de notifications
- ✅ **Batterie** Impact minimal sur mobile

### Compatibilité
- ✅ **Chrome** Desktop et Mobile
- ✅ **Edge** Desktop
- ✅ **Firefox** (fallback natif)
- ✅ **Safari** (fallback natif)

## 🐛 Problèmes Connus et Solutions

### Problème 1: Notifications ne s'affichent pas
**Cause:** Permission non accordée ou Service Worker non enregistré
**Solution:** Vérifier la permission et recharger la page

### Problème 2: Clic sur notification ne fonctionne pas
**Cause:** Service Worker non configuré correctement
**Solution:** Vérifier que le service worker est enregistré

### Problème 3: Paramètres non sauvegardés
**Cause:** Erreur dans IndexedDB
**Solution:** Vérifier la console pour les erreurs de base de données

### Problème 4: Notifications en double
**Cause:** Plusieurs instances du service
**Solution:** Vérifier qu'une seule instance est active

## 📝 Rapport de Test

### Checklist de Validation

- [ ] **Permission de notification** accordée et persistante
- [ ] **Banner de permission** s'affiche et se ferme correctement
- [ ] **Alertes de budget** à 80%, 100%, 120%
- [ ] **Rappels d'objectifs** 3 jours avant et à la deadline
- [ ] **Alertes de transaction** pour montants > 100,000 Ar
- [ ] **Résumé quotidien** à 20h
- [ ] **Paramètres utilisateur** sauvegardés et appliqués
- [ ] **Heures silencieuses** fonctionnelles
- [ ] **Limite quotidienne** respectée
- [ ] **Clics sur notifications** ouvrent les bonnes pages
- [ ] **Persistance** après rechargement
- [ ] **Compatibilité** multi-navigateurs

### Résultats Attendus

**✅ SUCCÈS:** Toutes les fonctionnalités de notification fonctionnent correctement
**⚠️ PARTIEL:** Certaines fonctionnalités fonctionnent, d'autres nécessitent des corrections
**❌ ÉCHEC:** Le système de notifications ne fonctionne pas du tout

---

*Guide de test créé le 2025-01-08 pour BazarKELY v2.3*
