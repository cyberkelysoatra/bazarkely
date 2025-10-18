import React, { useState } from 'react'
import { Info } from 'lucide-react'
import Modal from './Modal'
import { cn } from '../../utils/cn'

export interface PromptDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (value: string) => void
  title: string
  message: string
  defaultValue?: string
  placeholder?: string
  type?: 'text' | 'password' | 'email' | 'number'
  confirmText?: string
  cancelText?: string
  loading?: boolean
}

const PromptDialog: React.FC<PromptDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  defaultValue = '',
  placeholder,
  type = 'text',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  loading = false
}) => {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState('')

  const handleConfirm = () => {
    if (type === 'email' && value && !isValidEmail(value)) {
      setError('Veuillez saisir une adresse email valide')
      return
    }
    
    if (type === 'number' && value && isNaN(Number(value))) {
      setError('Veuillez saisir un nombre valide')
      return
    }
    
    onConfirm(value)
    onClose()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    }
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const isDisabled = loading

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
          <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-gray-600 mb-3">{message}</p>
            <div>
              <input
                type={type}
                value={value}
                onChange={(e) => {
                  setValue(e.target.value)
                  setError('')
                }}
                onKeyPress={handleKeyPress}
                placeholder={placeholder}
                className={cn(
                  "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                  error ? "border-red-300" : "border-gray-300"
                )}
                autoFocus
                disabled={isDisabled}
              />
              {error && (
                <p className="text-red-500 text-sm mt-1">{error}</p>
              )}
            </div>
          </div>
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
            className={cn(
              "px-4 py-2 text-white rounded-lg font-medium transition-colors",
              "bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-200",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading ? 'Chargement...' : confirmText}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export default PromptDialog











