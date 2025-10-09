import { showToast } from '../services/toastService'
import ConfirmDialog, { useConfirmDialog } from '../components/UI/ConfirmDialog'
import PromptDialog from '../components/UI/PromptDialog'

/**
 * Utility functions to replace native browser dialogs with modern alternatives
 */

/**
 * Replace window.alert() with toast notifications
 */
export const showAlert = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
  showToast(message, type)
}

/**
 * Replace window.confirm() with a modern modal dialog
 * Returns a Promise<boolean> that resolves to true if confirmed, false if cancelled
 */
export const showConfirm = (
  message: string,
  title: string = 'Confirmation',
  options: {
    confirmText?: string
    cancelText?: string
    variant?: 'default' | 'danger' | 'warning' | 'info' | 'success'
  } = {}
): Promise<boolean> => {
  return new Promise((resolve) => {
    // Create a temporary container for the modal
    const container = document.createElement('div')
    document.body.appendChild(container)
    
    // Import React and createRoot dynamically to avoid SSR issues
    import('react').then((React) => {
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(container)
        
        const ConfirmDialogWrapper = () => {
          const [isOpen, setIsOpen] = React.useState(true)
          
          const handleConfirm = () => {
            setIsOpen(false)
            document.body.removeChild(container)
            resolve(true)
          }
          
          const handleCancel = () => {
            setIsOpen(false)
            document.body.removeChild(container)
            resolve(false)
          }
          
          return React.createElement(ConfirmDialog, {
            isOpen,
            onClose: handleCancel,
            onConfirm: handleConfirm,
            title,
            message,
            confirmText: options.confirmText || 'Confirmer',
            cancelText: options.cancelText || 'Annuler',
            variant: options.variant || 'default'
          })
        }
        
        root.render(React.createElement(ConfirmDialogWrapper))
      })
    })
  })
}

/**
 * Replace window.prompt() with a modern input dialog
 * Returns a Promise<string | null> that resolves to the input value or null if cancelled
 */
export const showPrompt = (
  message: string,
  title: string = 'Saisie',
  defaultValue: string = '',
  options: {
    confirmText?: string
    cancelText?: string
    placeholder?: string
    type?: 'text' | 'password' | 'email' | 'number'
  } = {}
): Promise<string | null> => {
  return new Promise((resolve) => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    
    import('react').then((React) => {
      import('react-dom/client').then(({ createRoot }) => {
        const root = createRoot(container)
        
        const PromptDialogWrapper = () => {
          const [isOpen, setIsOpen] = React.useState(true)
          
          const handleConfirm = (value: string) => {
            setIsOpen(false)
            document.body.removeChild(container)
            resolve(value || null)
          }
          
          const handleCancel = () => {
            setIsOpen(false)
            document.body.removeChild(container)
            resolve(null)
          }
          
          return React.createElement(PromptDialog, {
            isOpen,
            onClose: handleCancel,
            onConfirm: handleConfirm,
            title,
            message,
            defaultValue,
            placeholder: options.placeholder,
            type: options.type || 'text',
            confirmText: options.confirmText || 'Confirmer',
            cancelText: options.cancelText || 'Annuler'
          })
        }
        
        root.render(React.createElement(PromptDialogWrapper))
      })
    })
  })
}


/**
 * Hook for easy dialog management in React components
 */
export const useDialogs = () => {
  const { showConfirm: showConfirmModal, ConfirmDialog } = useConfirmDialog()
  
  return {
    showAlert,
    showConfirm: showConfirmModal,
    showPrompt,
    ConfirmDialog
  }
}

// Export individual functions for convenience
export { showToast } from '../services/toastService'
