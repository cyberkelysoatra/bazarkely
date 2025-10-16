import React, { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closeOnBackdropClick?: boolean
  closeOnEsc?: boolean
  showCloseButton?: boolean
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  size = 'md',
  closeOnBackdropClick = true,
  closeOnEsc = true,
  showCloseButton = true,
  footer,
  children,
  className
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)

  // Size mapping
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }

  // Handle ESC key press
  useEffect(() => {
    const handleEscKey = (event: KeyboardEvent) => {
      if (closeOnEsc && event.key === 'Escape' && isOpen) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, closeOnEsc, onClose])

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      // Store current scroll position
      const scrollY = window.scrollY
      
      // Lock body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      
      return () => {
        // Restore scroll position
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        window.scrollTo(0, scrollY)
      }
    }
  }, [isOpen])

  // Handle focus trap
  useEffect(() => {
    if (isOpen && modalRef.current) {
      // Store the previously focused element
      previousActiveElement.current = document.activeElement as HTMLElement
      
      // Focus the modal
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      
      if (focusableElements.length > 0) {
        const firstElement = focusableElements[0] as HTMLElement
        firstElement.focus()
      }

      // Handle tab navigation
      const handleTabKey = (event: KeyboardEvent) => {
        if (event.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          
          if (focusableElements && focusableElements.length > 0) {
            const firstElement = focusableElements[0] as HTMLElement
            const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement
            
            if (event.shiftKey) {
              // Shift + Tab: go to previous element
              if (document.activeElement === firstElement) {
                event.preventDefault()
                lastElement.focus()
              }
            } else {
              // Tab: go to next element
              if (document.activeElement === lastElement) {
                event.preventDefault()
                firstElement.focus()
              }
            }
          }
        }
      }

      document.addEventListener('keydown', handleTabKey)
      
      return () => {
        document.removeEventListener('keydown', handleTabKey)
        // Restore focus to previous element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus()
        }
      }
    }
  }, [isOpen])

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  // Handle animation states
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center p-4 pt-8',
        'bg-black/50 backdrop-blur-sm',
        'transition-all duration-300 ease-in-out',
        isAnimating ? 'opacity-0' : 'opacity-100'
      )}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        ref={modalRef}
        className={cn(
          'bg-white rounded-lg shadow-xl w-full max-h-[85vh] overflow-y-auto',
          'transform transition-all duration-300 ease-in-out',
          sizeClasses[size],
          isAnimating ? 'scale-95 opacity-0' : 'scale-100 opacity-100',
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            {title && (
              <h2 
                id="modal-title"
                className="text-lg font-semibold text-slate-900"
              >
                {title}
              </h2>
            )}
            
            {showCloseButton && (
              <button
                onClick={onClose}
                className={cn(
                  'p-2 text-gray-400 hover:text-gray-600',
                  'hover:bg-gray-100 rounded-lg transition-colors',
                  'focus:outline-none focus:ring-2 focus:ring-blue-200'
                )}
                aria-label="Fermer la modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for modal state management
export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false)
  
  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)
  const toggle = () => setIsOpen(!isOpen)
  
  return { isOpen, open, close, toggle }
}

// Specialized Modal components for common use cases
export interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger'
  loading?: boolean
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  loading = false
}) => {
  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  const confirmButtonClass = variant === 'danger' 
    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-200'
    : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-200'

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdropClick={!loading}
      closeOnEsc={!loading}
    >
      <div className="space-y-4">
        <p className="text-gray-600">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={cn(
              'px-4 py-2 text-white rounded-lg font-medium transition-colors',
              'focus:outline-none focus:ring-2',
              confirmButtonClass,
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? 'Chargement...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export interface LoadingModalProps {
  isOpen: boolean
  title?: string
  message?: string
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  isOpen,
  title = 'Chargement...',
  message = 'Veuillez patienter'
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {}} // Prevent closing during loading
      title={title}
      size="sm"
      closeOnBackdropClick={false}
      closeOnEsc={false}
      showCloseButton={false}
    >
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
        <p className="text-gray-600">{message}</p>
      </div>
    </Modal>
  )
}

export default Modal