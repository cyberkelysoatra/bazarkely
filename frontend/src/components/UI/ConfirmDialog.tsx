import React, { useState } from 'react'
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react'
import Modal from './Modal'
import { cn } from '../../utils/cn'

export interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'danger' | 'warning' | 'info' | 'success'
  loading?: boolean
  showIcon?: boolean
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  variant = 'default',
  loading = false,
  showIcon = true
}) => {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleConfirm = async () => {
    if (loading || isProcessing) return
    
    setIsProcessing(true)
    try {
      await onConfirm()
      onClose()
    } catch (error) {
      console.error('Error in confirm action:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getIcon = () => {
    if (!showIcon) return null
    
    const iconClass = "w-6 h-6"
    
    switch (variant) {
      case 'danger':
        return <XCircle className={cn(iconClass, "text-red-500")} />
      case 'warning':
        return <AlertTriangle className={cn(iconClass, "text-yellow-500")} />
      case 'success':
        return <CheckCircle className={cn(iconClass, "text-green-500")} />
      case 'info':
        return <Info className={cn(iconClass, "text-blue-500")} />
      default:
        return <Info className={cn(iconClass, "text-gray-500")} />
    }
  }

  const getConfirmButtonClass = () => {
    const baseClass = "px-4 py-2 text-white rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
    
    switch (variant) {
      case 'danger':
        return cn(baseClass, "bg-red-600 hover:bg-red-700 focus:ring-red-200")
      case 'warning':
        return cn(baseClass, "bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-200")
      case 'success':
        return cn(baseClass, "bg-green-600 hover:bg-green-700 focus:ring-green-200")
      case 'info':
        return cn(baseClass, "bg-blue-600 hover:bg-blue-700 focus:ring-blue-200")
      default:
        return cn(baseClass, "bg-blue-600 hover:bg-blue-700 focus:ring-blue-200")
    }
  }

  const isDisabled = loading || isProcessing

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdropClick={!isDisabled}
      closeOnEsc={!isDisabled}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <p className="text-gray-600 flex-1">{message}</p>
        </div>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isDisabled}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDisabled}
            className={getConfirmButtonClass()}
          >
            {isProcessing ? 'Chargement...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Hook for easy confirm dialog management
export const useConfirmDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<Partial<ConfirmDialogProps>>({})

  const showConfirm = (config: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
    setConfig(config)
    setIsOpen(true)
  }

  const close = () => {
    setIsOpen(false)
    setConfig({})
  }

  const ConfirmDialogComponent = () => (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={close}
      {...config}
    />
  )

  return {
    showConfirm,
    close,
    ConfirmDialog: ConfirmDialogComponent
  }
}

export default ConfirmDialog
