// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Import global styles
import '../../src/index.css'

// Mock Service Worker for offline testing
import { before, after } from 'msw'
import { setupServer } from 'msw/node'
import { handlers } from './mocks/handlers'

// Setup MSW server
const server = setupServer(...handlers)

before(() => {
  server.listen({ onUnhandledRequest: 'error' })
})

after(() => {
  server.close()
})

// Global test configuration
beforeEach(() => {
  // Clear IndexedDB before each test
  cy.window().then((win) => {
    return new Promise((resolve) => {
      const deleteReq = win.indexedDB.deleteDatabase('BazarKELYDB')
      deleteReq.onsuccess = () => resolve(undefined)
      deleteReq.onerror = () => resolve(undefined)
    })
  })

  // Clear localStorage and sessionStorage
  cy.clearLocalStorage()
  cy.clearAllSessionStorage()

  // Mock navigator.onLine
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: true
    })
  })
})

// Custom commands for BazarKELY
declare global {
  namespace Cypress {
    interface Chainable {
      login(username?: string, password?: string): Chainable<void>
      createAccount(name: string, type: string, balance?: number): Chainable<void>
      addTransaction(type: string, amount: number, description: string, category: string): Chainable<void>
      goOffline(): Chainable<void>
      goOnline(): Chainable<void>
      waitForSync(): Chainable<void>
      checkPWAInstallable(): Chainable<void>
      checkOfflineFunctionality(): Chainable<void>
    }
  }
}

Cypress.Commands.add('login', (username = 'testuser', password = 'password123') => {
  cy.visit('/auth')
  cy.get('[data-testid="username-input"]').type(username)
  cy.get('[data-testid="password-input"]').type(password)
  cy.get('[data-testid="login-button"]').click()
  cy.url().should('include', '/dashboard')
})

Cypress.Commands.add('createAccount', (name: string, type: string, balance = 0) => {
  cy.visit('/add-account')
  cy.get('[data-testid="account-name-input"]').type(name)
  cy.get('[data-testid="account-type-select"]').select(type)
  if (balance > 0) {
    cy.get('[data-testid="account-balance-input"]').type(balance.toString())
  }
  cy.get('[data-testid="create-account-button"]').click()
  cy.url().should('include', '/accounts')
})

Cypress.Commands.add('addTransaction', (type: string, amount: number, description: string, category: string) => {
  cy.visit('/add-transaction')
  cy.get('[data-testid="transaction-type-select"]').select(type)
  cy.get('[data-testid="transaction-amount-input"]').type(amount.toString())
  cy.get('[data-testid="transaction-description-input"]').type(description)
  cy.get('[data-testid="transaction-category-select"]').select(category)
  cy.get('[data-testid="add-transaction-button"]').click()
  cy.url().should('include', '/transactions')
})

Cypress.Commands.add('goOffline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: false
    })
    win.dispatchEvent(new Event('offline'))
  })
})

Cypress.Commands.add('goOnline', () => {
  cy.window().then((win) => {
    Object.defineProperty(win.navigator, 'onLine', {
      writable: true,
      value: true
    })
    win.dispatchEvent(new Event('online'))
  })
})

Cypress.Commands.add('waitForSync', () => {
  cy.get('[data-testid="sync-indicator"]').should('not.contain', 'Synchronisation...')
})

Cypress.Commands.add('checkPWAInstallable', () => {
  cy.window().then((win) => {
    // Check if beforeinstallprompt event is fired
    cy.wrap(win).should('have.property', 'beforeinstallprompt')
  })
})

Cypress.Commands.add('checkOfflineFunctionality', () => {
  cy.goOffline()
  cy.get('[data-testid="offline-indicator"]').should('be.visible')
  cy.get('[data-testid="dashboard-stats"]').should('be.visible')
  cy.goOnline()
  cy.get('[data-testid="offline-indicator"]').should('not.be.visible')
})
