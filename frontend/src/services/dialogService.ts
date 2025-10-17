import { showAlert, showConfirm, showPrompt } from '../utils/dialogUtils'

/**
 * Service to replace native browser dialogs globally
 * This service overrides window.alert, window.confirm, and window.prompt
 * with modern toast notifications and modal dialogs
 */
class DialogService {
  private originalAlert: typeof window.alert
  private originalConfirm: typeof window.confirm
  private originalPrompt: typeof window.prompt
  private isInitialized = false

  constructor() {
    this.originalAlert = window.alert
    this.originalConfirm = window.confirm
    this.originalPrompt = window.prompt
  }

  /**
   * Initialize the dialog service by overriding native browser dialogs
   */
  initialize() {
    if (this.isInitialized) return

    // Override window.alert
    window.alert = (message: string) => {
      showAlert(message, 'info')
    }

    // Override window.confirm
    window.confirm = (message: string): boolean => {
      // Note: This is a synchronous override, but our showConfirm is async
      // We'll show a toast instead and return false
      showAlert(message, 'warning')
      console.warn('window.confirm() called - use showConfirm() from dialogUtils for proper async handling')
      return false
    }

    // Override window.prompt
    window.prompt = (message: string, defaultValue?: string): string | null => {
      // Note: This is a synchronous override, but our showPrompt is async
      // We'll show a toast instead and return null
      showAlert(message, 'info')
      console.warn('window.prompt() called - use showPrompt() from dialogUtils for proper async handling')
      return null
    }

    this.isInitialized = true
    console.log('✅ Dialog service initialized - native dialogs replaced with modern alternatives')
  }

  /**
   * Restore original native browser dialogs
   */
  restore() {
    if (!this.isInitialized) return

    window.alert = this.originalAlert
    window.confirm = this.originalConfirm
    window.prompt = this.originalPrompt

    this.isInitialized = false
    console.log('🔄 Dialog service restored - native dialogs re-enabled')
  }

  /**
   * Check if the service is initialized
   */
  get initialized() {
    return this.isInitialized
  }
}

// Create and export a singleton instance
const dialogService = new DialogService()
export default dialogService

// Export convenience functions
export { showAlert, showConfirm, showPrompt } from '../utils/dialogUtils'









