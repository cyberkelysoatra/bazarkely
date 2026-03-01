# 🧪 Guide de Test - BazarKELY

## 📋 Vue d'ensemble

BazarKELY utilise une suite de tests complète pour garantir la qualité et la fiabilité de l'application PWA. Cette documentation couvre tous les types de tests implémentés et comment les exécuter.

## 🏗️ Architecture de Test

### Types de Tests
- **Tests Unitaires** - Services et utilitaires individuels
- **Tests de Composants** - Composants React isolés
- **Tests d'Intégration** - Interactions entre services
- **Tests E2E** - Parcours utilisateur complets
- **Tests de Performance** - Optimisation et budgets
- **Tests de Sécurité** - Audit et vulnérabilités

### Outils Utilisés
- **Vitest** - Tests unitaires et composants
- **React Testing Library** - Tests de composants React
- **Cypress** - Tests E2E et composants
- **Lighthouse CI** - Tests de performance
- **MSW** - Mocking des APIs

## 🚀 Démarrage Rapide

### Installation
```bash
cd frontend
npm install
```

### Exécution des Tests
```bash
# Tous les tests
npm run test:all

# Tests unitaires uniquement
npm run test:unit

# Tests de composants
npm run test:component

# Tests E2E
npm run test:e2e

# Tests de performance
npm run test:lighthouse

# Tests mobiles
npm run test:mobile
```

## 🔧 Configuration

### Vitest
Configuration dans `vitest.config.ts` :
- Environnement jsdom pour les tests DOM
- Couverture de code avec seuils de 80%
- Alias de chemins pour les imports
- Mocking automatique des dépendances

### Cypress
Configuration dans `cypress.config.ts` :
- Viewport mobile par défaut (375x667)
- Base URL localhost:3000
- Timeouts optimisés pour PWA
- Variables d'environnement de test

### Lighthouse CI
Configuration dans `lighthouserc.js` :
- Seuils de performance stricts
- Tests PWA complets
- Accessibilité et SEO
- Rapports détaillés

## 📊 Tests Unitaires

### Services Testés
- `authService` - Authentification et gestion des utilisateurs
- `transactionService` - Gestion des transactions
- `accountService` - Gestion des comptes
- `syncService` - Synchronisation multi-navigateur
- `feeService` - Calcul des frais Mobile Money
- `apiService` - Communication API
- `serverAuthService` - Authentification serveur
- `serverSyncService` - Synchronisation serveur

### Exemple de Test
```typescript
describe('AuthService', () => {
  it('should login user with valid credentials', async () => {
    const result = await authService.login('user', 'password')
    expect(result.success).toBe(true)
    expect(result.user).toBeDefined()
  })
})
```

### Couverture de Code
- **Branches** : 80% minimum
- **Fonctions** : 80% minimum
- **Lignes** : 80% minimum
- **Statements** : 80% minimum

## 🧩 Tests de Composants

### Pages Testées
- `AuthPage` - Authentification complète
- `DashboardPage` - Tableau de bord principal
- `TransactionsPage` - Gestion des transactions
- `AccountsPage` - Gestion des comptes
- `BudgetsPage` - Gestion des budgets
- `GoalsPage` - Objectifs d'épargne

### Exemple de Test
```typescript
describe('AuthPage', () => {
  it('should render login form by default', () => {
    render(<AuthPage />)
    expect(screen.getByText('Connexion')).toBeInTheDocument()
  })
})
```

### Bonnes Pratiques
- Utiliser `data-testid` pour les sélecteurs
- Tester les interactions utilisateur
- Vérifier les états de chargement
- Tester la gestion des erreurs

## 🔗 Tests d'Intégration

### PWA et Offline
- Fonctionnement hors ligne
- Synchronisation des données
- Gestion des conflits
- Cache et Service Worker

### Synchronisation Multi-Navigateur
- CORS et cross-origin
- File de synchronisation
- Résolution des conflits
- Retry automatique

### Exemple de Test
```typescript
describe('PWA Integration', () => {
  it('should work offline with cached data', async () => {
    // Simulate offline mode
    Object.defineProperty(navigator, 'onLine', { value: false })
    
    // Test offline functionality
    const data = await db.accounts.toArray()
    expect(data).toBeDefined()
  })
})
```

## 🎭 Tests E2E

### Parcours Utilisateur
- **Inscription** → Première transaction
- **Mobile Money** → Calcul des frais
- **Budgets** → Alertes de dépassement
- **Objectifs** → Suivi de progression
- **Offline** → Synchronisation
- **PWA** → Installation

### Exemple de Test
```typescript
describe('User Journey', () => {
  it('should complete full registration and first transaction', () => {
    cy.visit('/')
    cy.get('[data-testid="register-tab"]').click()
    // ... complete registration flow
  })
})
```

### Commandes Personnalisées
- `cy.login()` - Connexion automatique
- `cy.createAccount()` - Création de compte
- `cy.addTransaction()` - Ajout de transaction
- `cy.goOffline()` - Simulation hors ligne
- `cy.checkPWAInstallable()` - Vérification PWA

## 📈 Tests de Performance

### Métriques Surveillées
- **First Contentful Paint** : < 2s
- **Largest Contentful Paint** : < 3s
- **Cumulative Layout Shift** : < 0.1
- **Total Blocking Time** : < 300ms
- **Speed Index** : < 3s
- **Time to Interactive** : < 4s

### Budget de Performance
- **Bundle Size** : < 1MB
- **Images** : Optimisées WebP
- **Fonts** : Préchargées
- **CSS** : Minifié et compressé

### Exemple de Test
```javascript
// lighthouserc.js
assertions: {
  'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 3000 }],
  'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
}
```

## 🔒 Tests de Sécurité

### Audit Automatique
- `npm audit` - Vulnérabilités npm
- `audit-ci` - Intégration CI
- Headers de sécurité
- Validation des données

### Bonnes Pratiques
- Mots de passe hachés
- Tokens JWT sécurisés
- Validation côté client et serveur
- CORS configuré

## 📱 Tests Mobiles

### Viewports Testés
- **Mobile** : 375x667 (iPhone SE)
- **Tablet** : 768x1024 (iPad)
- **Desktop** : 1920x1080

### Fonctionnalités Mobiles
- Touch events
- Orientation
- PWA installation
- Offline functionality

## 🌍 Tests Contexte Madagascar

### Mobile Money
- Orange Money, Mvola, Airtel Money
- Calcul des frais réels
- Devise MGA (Ariary)
- Catégories locales

### Exemple de Test
```typescript
it('should calculate Orange Money fees correctly', async () => {
  const fee = await feeService.calculateMobileMoneyFee('orange_money', 25000)
  expect(fee.data).toBe(100) // 100 MGA
})
```

## 🚀 CI/CD

### Pipeline GitHub Actions
- Tests unitaires et composants
- Tests E2E automatisés
- Tests de performance
- Audit de sécurité
- Tests mobiles

### Déclencheurs
- Push sur main/develop
- Pull requests
- Tags de release
- Planification quotidienne

## 📊 Rapports et Métriques

### Couverture de Code
- Rapport HTML dans `coverage/`
- Intégration Codecov
- Seuils de qualité
- Tendances temporelles

### Performance
- Rapports Lighthouse
- Métriques Core Web Vitals
- Comparaisons historiques
- Alertes automatiques

### E2E
- Vidéos des tests échoués
- Screenshots des erreurs
- Rapports détaillés
- Intégration Slack/Teams

## 🛠️ Débogage

### Tests Unitaires
```bash
# Mode watch
npm run test

# Interface graphique
npm run test:ui

# Debug spécifique
npm run test -- --reporter=verbose
```

### Tests E2E
```bash
# Interface graphique
npm run test:e2e:ui

# Debug avec console
npm run test:e2e -- --headed --browser chrome
```

### Performance
```bash
# Rapport détaillé
npm run test:lighthouse -- --view

# Test spécifique
npm run test:lighthouse -- --url=http://localhost:3000/dashboard
```

## 📝 Bonnes Pratiques

### Écriture de Tests
- Tests déterministes
- Mocks appropriés
- Assertions claires
- Documentation des cas

### Maintenance
- Mise à jour régulière
- Refactoring des tests
- Optimisation des performances
- Surveillance continue

### Intégration
- Tests dans le pipeline
- Feedback rapide
- Qualité avant vitesse
- Documentation à jour

## 🎯 Objectifs de Qualité

### Couverture
- **Services** : 100%
- **Composants** : 90%
- **E2E** : 80%
- **Performance** : 95%

### Performance
- **Lighthouse Score** : 90+
- **Bundle Size** : < 1MB
- **Load Time** : < 3s
- **Mobile Score** : 90+

### Fiabilité
- **Tests Flaky** : 0%
- **False Positives** : < 1%
- **Coverage Drop** : < 5%
- **Performance Regression** : 0%

## 📚 Ressources

### Documentation
- [Vitest](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Cypress](https://docs.cypress.io/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

### Exemples
- Tests dans `src/**/*.test.ts`
- E2E dans `cypress/e2e/`
- Configuration dans `*.config.*`

### Support
- Issues GitHub
- Documentation équipe
- Code reviews
- Pair programming

---

**BazarKELY Testing Suite** - Qualité garantie pour une PWA de classe mondiale ! 🚀
