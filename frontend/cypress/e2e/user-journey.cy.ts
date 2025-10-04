describe('BazarKELY User Journey', () => {
  beforeEach(() => {
    // Clear all data before each test
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  describe('Complete User Registration and First Transaction', () => {
    it('should complete full user registration and first transaction', () => {
      // 1. Visit the app
      cy.visit('/')
      cy.url().should('include', '/auth')

      // 2. Register new user
      cy.get('[data-testid="register-tab"]').click()
      cy.get('[data-testid="username-input"]').type('newuser')
      cy.get('[data-testid="email-input"]').type('newuser@example.com')
      cy.get('[data-testid="phone-input"]').type('123456789')
      cy.get('[data-testid="password-input"]').type('password123')
      cy.get('[data-testid="confirm-password-input"]').type('password123')
      cy.get('[data-testid="register-button"]').click()

      // 3. Should redirect to dashboard
      cy.url().should('include', '/dashboard')
      cy.get('[data-testid="welcome-message"]').should('contain', 'Bienvenue, newuser')

      // 4. Create first account
      cy.get('[data-testid="add-account-button"]').click()
      cy.get('[data-testid="account-name-input"]').type('Compte Principal')
      cy.get('[data-testid="account-type-select"]').select('courant')
      cy.get('[data-testid="create-account-button"]').click()

      // 5. Should redirect to accounts page
      cy.url().should('include', '/accounts')
      cy.get('[data-testid="account-list"]').should('contain', 'Compte Principal')

      // 6. Add first transaction
      cy.get('[data-testid="add-transaction-button"]').click()
      cy.get('[data-testid="transaction-type-select"]').select('income')
      cy.get('[data-testid="transaction-amount-input"]').type('100000')
      cy.get('[data-testid="transaction-description-input"]').type('Salaire')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()

      // 7. Should redirect to transactions page
      cy.url().should('include', '/transactions')
      cy.get('[data-testid="transaction-list"]').should('contain', 'Salaire')
      cy.get('[data-testid="transaction-list"]').should('contain', '100 000 MGA')

      // 8. Verify dashboard shows updated balance
      cy.visit('/dashboard')
      cy.get('[data-testid="total-balance"]').should('contain', '100 000 MGA')
      cy.get('[data-testid="monthly-income"]').should('contain', '100 000 MGA')
    })
  })

  describe('Mobile Money Transaction Flow', () => {
    it('should handle Mobile Money transaction with fees', () => {
      // Login first
      cy.login()

      // Create Mobile Money account
      cy.createAccount('Orange Money', 'orange_money', 50000)

      // Create transfer transaction
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('transfer')
      cy.get('[data-testid="transaction-amount-input"]').type('25000')
      cy.get('[data-testid="transaction-description-input"]').type('Transfert Orange Money')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="source-account-select"]').select('Compte Principal')
      cy.get('[data-testid="target-account-select"]').select('Orange Money')
      
      // Check fee calculation
      cy.get('[data-testid="fee-display"]').should('contain', '100 MGA')
      cy.get('[data-testid="total-amount"]').should('contain', '25 100 MGA')

      cy.get('[data-testid="add-transaction-button"]').click()

      // Verify transaction was created
      cy.url().should('include', '/transactions')
      cy.get('[data-testid="transaction-list"]').should('contain', 'Transfert Orange Money')
    })
  })

  describe('Budget Management Flow', () => {
    it('should create and manage budgets', () => {
      cy.login()

      // Go to budgets page
      cy.visit('/budgets')
      cy.get('[data-testid="add-budget-button"]').click()

      // Create budget
      cy.get('[data-testid="budget-category-select"]').select('alimentation')
      cy.get('[data-testid="budget-amount-input"]').type('50000')
      cy.get('[data-testid="budget-alert-threshold-input"]').type('80')
      cy.get('[data-testid="create-budget-button"]').click()

      // Verify budget was created
      cy.get('[data-testid="budget-list"]').should('contain', 'Alimentation')
      cy.get('[data-testid="budget-list"]').should('contain', '50 000 MGA')

      // Add expense that exceeds budget
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('expense')
      cy.get('[data-testid="transaction-amount-input"]').type('45000')
      cy.get('[data-testid="transaction-description-input"]').type('Courses')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()

      // Check budget alert
      cy.visit('/dashboard')
      cy.get('[data-testid="budget-alert"]').should('contain', '90% utilisé')
    })
  })

  describe('Goal Setting and Tracking', () => {
    it('should create and track savings goals', () => {
      cy.login()

      // Go to goals page
      cy.visit('/goals')
      cy.get('[data-testid="add-goal-button"]').click()

      // Create goal
      cy.get('[data-testid="goal-name-input"]').type('Vacances')
      cy.get('[data-testid="goal-target-amount-input"]').type('1000000')
      cy.get('[data-testid="goal-deadline-input"]').type('2024-12-31')
      cy.get('[data-testid="goal-priority-select"]').select('high')
      cy.get('[data-testid="create-goal-button"]').click()

      // Verify goal was created
      cy.get('[data-testid="goal-list"]').should('contain', 'Vacances')
      cy.get('[data-testid="goal-list"]').should('contain', '0%')

      // Add contribution to goal
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('expense')
      cy.get('[data-testid="transaction-amount-input"]').type('100000')
      cy.get('[data-testid="transaction-description-input"]').type('Épargne vacances')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="goal-contribution-checkbox"]').check()
      cy.get('[data-testid="goal-select"]').select('Vacances')
      cy.get('[data-testid="add-transaction-button"]').click()

      // Check goal progress
      cy.visit('/goals')
      cy.get('[data-testid="goal-progress"]').should('contain', '10%')
    })
  })

  describe('Offline Functionality', () => {
    it('should work offline and sync when back online', () => {
      cy.login()

      // Go offline
      cy.goOffline()
      cy.get('[data-testid="offline-indicator"]').should('be.visible')

      // Add transaction while offline
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('income')
      cy.get('[data-testid="transaction-amount-input"]').type('50000')
      cy.get('[data-testid="transaction-description-input"]').type('Vente offline')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()

      // Verify transaction is queued
      cy.get('[data-testid="sync-queue-indicator"]').should('contain', '1 en attente')

      // Go back online
      cy.goOnline()
      cy.get('[data-testid="offline-indicator"]').should('not.be.visible')

      // Wait for sync
      cy.waitForSync()
      cy.get('[data-testid="sync-queue-indicator"]').should('not.contain', 'en attente')
    })
  })

  describe('PWA Installation', () => {
    it('should be installable as PWA', () => {
      cy.visit('/')
      cy.checkPWAInstallable()
      
      // Check manifest
      cy.get('link[rel="manifest"]').should('have.attr', 'href', '/manifest.webmanifest')
      
      // Check service worker
      cy.window().then((win) => {
        expect(win.navigator.serviceWorker).to.exist
      })
    })
  })

  describe('Multi-browser Synchronization', () => {
    it('should sync data between different browser sessions', () => {
      // First browser session
      cy.login('user1', 'password123')
      cy.createAccount('Compte Principal', 'courant', 100000)
      cy.addTransaction('income', 50000, 'Salaire', 'alimentation')

      // Simulate second browser session
      cy.window().then((win) => {
        // Clear current session
        win.localStorage.clear()
        win.sessionStorage.clear()
      })

      // Login in second session
      cy.login('user1', 'password123')

      // Verify data is synced
      cy.visit('/dashboard')
      cy.get('[data-testid="total-balance"]').should('contain', '150 000 MGA')
      cy.get('[data-testid="monthly-income"]').should('contain', '50 000 MGA')
    })
  })

  describe('Education and Gamification', () => {
    it('should complete quiz and earn points', () => {
      cy.login()

      // Go to education page
      cy.visit('/education')
      cy.get('[data-testid="quiz-list"]').should('be.visible')

      // Start a quiz
      cy.get('[data-testid="quiz-item-0"]').click()
      cy.get('[data-testid="quiz-question"]').should('be.visible')

      // Answer questions
      cy.get('[data-testid="quiz-option-0"]').click()
      cy.get('[data-testid="next-question-button"]').click()
      cy.get('[data-testid="quiz-option-1"]').click()
      cy.get('[data-testid="next-question-button"]').click()

      // Complete quiz
      cy.get('[data-testid="complete-quiz-button"]').click()

      // Check points earned
      cy.get('[data-testid="points-earned"]').should('contain', '3')
      cy.get('[data-testid="user-level"]').should('contain', 'Bronze')
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      // Mock network error
      cy.intercept('GET', '**/api/**', { forceNetworkError: true }).as('networkError')

      cy.login()
      cy.visit('/dashboard')

      // Should show error message
      cy.get('[data-testid="error-message"]').should('contain', 'Erreur de connexion')
      
      // Should still show cached data
      cy.get('[data-testid="dashboard-stats"]').should('be.visible')
    })

    it('should handle form validation errors', () => {
      cy.visit('/auth')
      
      // Try to submit empty form
      cy.get('[data-testid="login-button"]').click()
      
      // Should show validation errors
      cy.get('[data-testid="username-error"]').should('contain', 'Le nom d\'utilisateur est requis')
      cy.get('[data-testid="password-error"]').should('contain', 'Le mot de passe est requis')
    })
  })

  describe('Performance', () => {
    it('should load quickly on mobile', () => {
      cy.visit('/')
      
      // Check page load time
      cy.window().then((win) => {
        const loadTime = win.performance.timing.loadEventEnd - win.performance.timing.navigationStart
        expect(loadTime).to.be.lessThan(3000) // 3 seconds
      })

      // Check bundle size
      cy.window().then((win) => {
        const resources = win.performance.getEntriesByType('resource')
        const jsResources = resources.filter(r => r.name.includes('.js'))
        const totalSize = jsResources.reduce((sum, r) => sum + (r as any).transferSize, 0)
        expect(totalSize).to.be.lessThan(1000000) // 1MB
      })
    })
  })
})
