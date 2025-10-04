describe('BazarKELY Notifications', () => {
  beforeEach(() => {
    // Clear all data before each test
    cy.clearLocalStorage()
    cy.clearAllSessionStorage()
  })

  describe('Notification Permission Request', () => {
    it('should show permission request on dashboard', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Should show notification permission request
      cy.get('[data-testid="notification-permission-request"]').should('be.visible')
      cy.get('[data-testid="notification-permission-request"]').should('contain', 'Activer les Notifications')
    })

    it('should request permission when button is clicked', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Mock permission request
      cy.window().then((win) => {
        cy.stub(win.Notification, 'requestPermission').resolves('granted')
      })
      
      cy.get('[data-testid="notification-permission-request"]').within(() => {
        cy.get('button').contains('Activer les Notifications').click()
      })
      
      // Should show loading state
      cy.get('button').should('contain', 'Activation...')
      cy.get('button').should('be.disabled')
    })

    it('should hide permission request after permission is granted', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Mock permission granted
      cy.window().then((win) => {
        cy.stub(win.Notification, 'permission').value('granted')
      })
      
      // Should not show permission request
      cy.get('[data-testid="notification-permission-request"]').should('not.exist')
    })

    it('should show denied state when permission is denied', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Mock permission denied
      cy.window().then((win) => {
        cy.stub(win.Notification, 'permission').value('denied')
      })
      
      cy.get('[data-testid="notification-permission-request"]').should('be.visible')
      cy.get('[data-testid="notification-permission-request"]').should('contain', 'Notifications Désactivées')
      cy.get('[data-testid="notification-permission-request"]').should('contain', 'Ouvrir les Paramètres')
    })
  })

  describe('Notification Preferences Page', () => {
    it('should load notification preferences page', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      cy.get('h1').should('contain', 'Préférences de Notifications')
      cy.get('h2').should('contain', 'Notifications Générales')
      cy.get('h2').should('contain', 'Notifications Madagascar')
      cy.get('h2').should('contain', 'Heures Silencieuses')
    })

    it('should toggle notification preferences', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      // Toggle budget alerts
      cy.get('input[type="checkbox"]').first().uncheck()
      cy.get('input[type="checkbox"]').first().should('not.be.checked')
      
      // Toggle goal reminders
      cy.get('input[type="checkbox"]').eq(1).uncheck()
      cy.get('input[type="checkbox"]').eq(1).should('not.be.checked')
    })

    it('should save preferences', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      // Toggle some preferences
      cy.get('input[type="checkbox"]').first().uncheck()
      
      // Click save button
      cy.get('button').contains('Sauvegarder').click()
      
      // Should show success message
      cy.get('button').should('contain', 'Sauvegardé !')
    })

    it('should reset to defaults', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      // Toggle some preferences
      cy.get('input[type="checkbox"]').first().uncheck()
      
      // Click reset button
      cy.get('button').contains('Réinitialiser').click()
      
      // Should reset to default values
      cy.get('input[type="checkbox"]').first().should('be.checked')
    })

    it('should configure quiet hours', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      // Enable quiet hours
      cy.get('input[type="checkbox"]').contains('Activer les heures silencieuses').check()
      
      // Set start time
      cy.get('input[type="time"]').first().clear().type('22:00')
      
      // Set end time
      cy.get('input[type="time"]').last().clear().type('07:00')
      
      // Save preferences
      cy.get('button').contains('Sauvegarder').click()
    })

    it('should change notification frequency', () => {
      cy.login()
      cy.visit('/notification-preferences')
      
      // Select daily frequency
      cy.get('input[type="radio"][value="daily"]').check()
      cy.get('input[type="radio"][value="daily"]').should('be.checked')
      
      // Select weekly frequency
      cy.get('input[type="radio"][value="weekly"]').check()
      cy.get('input[type="radio"][value="weekly"]').should('be.checked')
    })
  })

  describe('Budget Alerts', () => {
    it('should trigger budget alert when spending exceeds 80%', () => {
      cy.login()
      
      // Create a budget
      cy.visit('/budgets')
      cy.get('[data-testid="add-budget-button"]').click()
      cy.get('[data-testid="budget-category-select"]').select('alimentation')
      cy.get('[data-testid="budget-amount-input"]').type('50000')
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Add transaction that exceeds 80% of budget
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('expense')
      cy.get('[data-testid="transaction-amount-input"]').type('45000')
      cy.get('[data-testid="transaction-description-input"]').type('Courses')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()
      
      // Should trigger budget alert
      cy.window().then((win) => {
        cy.stub(win.Notification, 'permission').value('granted')
        cy.stub(win.Notification, 'requestPermission').resolves('granted')
      })
      
      // Check if notification was triggered
      cy.get('[data-testid="budget-alert"]').should('be.visible')
    })

    it('should trigger budget alert when spending exceeds 100%', () => {
      cy.login()
      
      // Create a budget
      cy.visit('/budgets')
      cy.get('[data-testid="add-budget-button"]').click()
      cy.get('[data-testid="budget-category-select"]').select('alimentation')
      cy.get('[data-testid="budget-amount-input"]').type('50000')
      cy.get('[data-testid="create-budget-button"]').click()
      
      // Add transaction that exceeds 100% of budget
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('expense')
      cy.get('[data-testid="transaction-amount-input"]').type('55000')
      cy.get('[data-testid="transaction-description-input"]').type('Courses')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()
      
      // Should trigger budget exceeded alert
      cy.get('[data-testid="budget-alert"]').should('be.visible')
      cy.get('[data-testid="budget-alert"]').should('contain', 'Budget Dépassé')
    })
  })

  describe('Goal Reminders', () => {
    it('should show goal reminder when deadline approaches', () => {
      cy.login()
      
      // Create a goal with deadline in 7 days
      cy.visit('/goals')
      cy.get('[data-testid="add-goal-button"]').click()
      cy.get('[data-testid="goal-name-input"]').type('Vacances')
      cy.get('[data-testid="goal-target-amount-input"]').type('1000000')
      
      // Set deadline to 7 days from now
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7)
      const dateString = futureDate.toISOString().split('T')[0]
      cy.get('[data-testid="goal-deadline-input"]').type(dateString)
      
      cy.get('[data-testid="create-goal-button"]').click()
      
      // Should show goal reminder
      cy.get('[data-testid="goal-reminder"]').should('be.visible')
      cy.get('[data-testid="goal-reminder"]').should('contain', 'Deadline Approche')
    })

    it('should show goal achieved notification', () => {
      cy.login()
      
      // Create a goal
      cy.visit('/goals')
      cy.get('[data-testid="add-goal-button"]').click()
      cy.get('[data-testid="goal-name-input"]').type('Vacances')
      cy.get('[data-testid="goal-target-amount-input"]').type('1000000')
      cy.get('[data-testid="goal-current-amount-input"]').type('1000000')
      cy.get('[data-testid="create-goal-button"]').click()
      
      // Should show goal achieved notification
      cy.get('[data-testid="goal-reminder"]').should('be.visible')
      cy.get('[data-testid="goal-reminder"]').should('contain', 'Objectif Atteint !')
    })
  })

  describe('Madagascar Specific Notifications', () => {
    it('should show Zoma market reminder on Friday', () => {
      cy.login()
      
      // Mock Friday
      cy.clock(new Date('2024-01-05')) // Friday
      
      cy.visit('/dashboard')
      
      // Should show Zoma reminder
      cy.get('[data-testid="zoma-reminder"]').should('be.visible')
      cy.get('[data-testid="zoma-reminder"]').should('contain', 'Marché du Vendredi')
    })

    it('should show seasonal reminder during harvest season', () => {
      cy.login()
      
      // Mock April (harvest season)
      cy.clock(new Date('2024-04-15'))
      
      cy.visit('/dashboard')
      
      // Should show seasonal reminder
      cy.get('[data-testid="seasonal-reminder"]').should('be.visible')
      cy.get('[data-testid="seasonal-reminder"]').should('contain', 'Saison des Récoltes')
    })
  })

  describe('Mobile Money Notifications', () => {
    it('should show mobile money transaction notification', () => {
      cy.login()
      
      // Create Mobile Money account
      cy.visit('/add-account')
      cy.get('[data-testid="account-name-input"]').type('Orange Money')
      cy.get('[data-testid="account-type-select"]').select('orange_money')
      cy.get('[data-testid="create-account-button"]').click()
      
      // Add Mobile Money transaction
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('transfer')
      cy.get('[data-testid="transaction-amount-input"]').type('25000')
      cy.get('[data-testid="transaction-description-input"]').type('Transfert Orange Money')
      cy.get('[data-testid="source-account-select"]').select('Compte Principal')
      cy.get('[data-testid="target-account-select"]').select('Orange Money')
      cy.get('[data-testid="add-transaction-button"]').click()
      
      // Should show Mobile Money notification
      cy.get('[data-testid="mobile-money-notification"]').should('be.visible')
      cy.get('[data-testid="mobile-money-notification"]').should('contain', 'Transaction Mobile Money')
    })
  })

  describe('Sync Notifications', () => {
    it('should show sync success notification', () => {
      cy.login()
      
      // Mock sync completion
      cy.window().then((win) => {
        cy.stub(win, 'dispatchEvent').callsFake((event) => {
          if (event.type === 'sync-complete') {
            // Trigger sync notification
            cy.get('[data-testid="sync-notification"]').should('be.visible')
            cy.get('[data-testid="sync-notification"]').should('contain', 'Synchronisation Réussie')
          }
        })
      })
      
      // Simulate sync completion
      cy.window().then((win) => {
        win.dispatchEvent(new Event('sync-complete'))
      })
    })

    it('should show sync error notification', () => {
      cy.login()
      
      // Mock sync error
      cy.window().then((win) => {
        cy.stub(win, 'dispatchEvent').callsFake((event) => {
          if (event.type === 'sync-error') {
            // Trigger sync error notification
            cy.get('[data-testid="sync-notification"]').should('be.visible')
            cy.get('[data-testid="sync-notification"]').should('contain', 'Erreur de Synchronisation')
          }
        })
      })
      
      // Simulate sync error
      cy.window().then((win) => {
        win.dispatchEvent(new Event('sync-error'))
      })
    })
  })

  describe('Security Alerts', () => {
    it('should show new device alert', () => {
      cy.login()
      
      // Mock new device login
      cy.window().then((win) => {
        cy.stub(win, 'dispatchEvent').callsFake((event) => {
          if (event.type === 'new-device-login') {
            // Trigger security alert
            cy.get('[data-testid="security-alert"]').should('be.visible')
            cy.get('[data-testid="security-alert"]').should('contain', 'Nouvel Appareil')
          }
        })
      })
      
      // Simulate new device login
      cy.window().then((win) => {
        win.dispatchEvent(new Event('new-device-login'))
      })
    })

    it('should show suspicious activity alert', () => {
      cy.login()
      
      // Mock suspicious activity
      cy.window().then((win) => {
        cy.stub(win, 'dispatchEvent').callsFake((event) => {
          if (event.type === 'suspicious-activity') {
            // Trigger security alert
            cy.get('[data-testid="security-alert"]').should('be.visible')
            cy.get('[data-testid="security-alert"]').should('contain', 'Activité Suspecte')
          }
        })
      })
      
      // Simulate suspicious activity
      cy.window().then((win) => {
        win.dispatchEvent(new Event('suspicious-activity'))
      })
    })
  })

  describe('Offline Notifications', () => {
    it('should queue notifications when offline', () => {
      cy.login()
      
      // Go offline
      cy.goOffline()
      
      // Add transaction while offline
      cy.visit('/add-transaction')
      cy.get('[data-testid="transaction-type-select"]').select('expense')
      cy.get('[data-testid="transaction-amount-input"]').type('50000')
      cy.get('[data-testid="transaction-description-input"]').type('Courses')
      cy.get('[data-testid="transaction-category-select"]').select('alimentation')
      cy.get('[data-testid="add-transaction-button"]').click()
      
      // Should queue notification
      cy.get('[data-testid="notification-queue"]').should('be.visible')
      cy.get('[data-testid="notification-queue"]').should('contain', '1 en attente')
      
      // Go back online
      cy.goOnline()
      
      // Should process queued notifications
      cy.get('[data-testid="notification-queue"]').should('not.contain', 'en attente')
    })
  })

  describe('Notification Settings Integration', () => {
    it('should navigate to notification preferences from header', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Click notification icon in header
      cy.get('[data-testid="notification-icon"]').click()
      
      // Should navigate to notification preferences
      cy.url().should('include', '/notification-preferences')
    })

    it('should show notification preferences in user menu', () => {
      cy.login()
      cy.visit('/dashboard')
      
      // Click user menu
      cy.get('[data-testid="user-menu"]').click()
      
      // Should show notification preferences option
      cy.get('[data-testid="notification-preferences-link"]').should('be.visible')
      cy.get('[data-testid="notification-preferences-link"]').click()
      
      // Should navigate to notification preferences
      cy.url().should('include', '/notification-preferences')
    })
  })
})
