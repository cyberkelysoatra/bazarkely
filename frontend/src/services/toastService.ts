import toast from 'react-hot-toast'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastOptions {
  duration?: number
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

/**
 * Service for displaying toast notifications using react-hot-toast
 * Replaces native browser alert(), confirm(), and prompt() dialogs
 */
class ToastService {
  /**
   * Display a success toast notification
   */
  success(message: string, options?: ToastOptions) {
    return toast.success(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
    })
  }

  /**
   * Display an error toast notification
   */
  error(message: string, options?: ToastOptions) {
    return toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-right',
    })
  }

  /**
   * Display a warning toast notification
   */
  warning(message: string, options?: ToastOptions) {
    return toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    })
  }

  /**
   * Display an info toast notification
   */
  info(message: string, options?: ToastOptions) {
    return toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#fff',
      },
    })
  }

  /**
   * Display a loading toast notification
   */
  loading(message: string, options?: ToastOptions) {
    return toast.loading(message, {
      position: options?.position || 'top-right',
    })
  }

  /**
   * Dismiss a specific toast
   */
  dismiss(toastId: string) {
    toast.dismiss(toastId)
  }

  /**
   * Dismiss all toasts
   */
  dismissAll() {
    toast.dismiss()
  }

  /**
   * Update an existing toast
   */
  update(toastId: string, message: string, type: ToastType = 'info', options?: ToastOptions) {
    const toastOptions = {
      duration: options?.duration || 4000,
      position: options?.position || 'top-right',
    }

    switch (type) {
      case 'success':
        return toast.success(message, { id: toastId, ...toastOptions })
      case 'error':
        return toast.error(message, { id: toastId, ...toastOptions })
      case 'warning':
        return toast(message, { 
          id: toastId, 
          ...toastOptions,
          icon: '⚠️',
          style: {
            background: '#F59E0B',
            color: '#fff',
          },
        })
      case 'info':
      default:
        return toast(message, { 
          id: toastId, 
          ...toastOptions,
          icon: 'ℹ️',
          style: {
            background: '#3B82F6',
            color: '#fff',
          },
        })
    }
  }

  /**
   * Promise-based toast for async operations
   */
  promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: any) => string)
    },
    options?: ToastOptions
  ) {
    return toast.promise(promise, messages, {
      position: options?.position || 'top-right',
      duration: options?.duration || 4000,
    })
  }
}

// Create and export a singleton instance
const toastService = new ToastService()
export default toastService

// Export individual functions for convenience
export const { success, error, warning, info, loading, dismiss, dismissAll, update, promise } = toastService

// Legacy showToast function for backward compatibility
export const showToast = (message: string, type: ToastType, options?: ToastOptions) => {
  switch (type) {
    case 'success':
      return toastService.success(message, options)
    case 'error':
      return toastService.error(message, options)
    case 'warning':
      return toastService.warning(message, options)
    case 'info':
    default:
      return toastService.info(message, options)
  }
}








