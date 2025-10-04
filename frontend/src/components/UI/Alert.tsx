import React from 'react'
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { cn } from '../../utils/cn'

export interface AlertProps {
  type?: 'success' | 'warning' | 'error' | 'info'
  title?: string
  children: React.ReactNode
  dismissible?: boolean
  onDismiss?: () => void
  className?: string
  icon?: React.ReactNode
}

const Alert: React.FC<AlertProps> = ({
  type = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className,
  icon
}) => {
  const typeConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-800',
      title: 'text-green-900',
      icon: 'text-green-400',
      defaultIcon: CheckCircle
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-800',
      title: 'text-yellow-900',
      icon: 'text-yellow-400',
      defaultIcon: AlertTriangle
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      title: 'text-red-900',
      icon: 'text-red-400',
      defaultIcon: AlertCircle
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      text: 'text-blue-800',
      title: 'text-blue-900',
      icon: 'text-blue-400',
      defaultIcon: Info
    }
  }

  const config = typeConfig[type]
  const IconComponent = config.defaultIcon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        config.bg,
        config.border,
        className
      )}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          {icon ? (
            <div className={config.icon}>
              {icon}
            </div>
          ) : (
            <IconComponent className={cn('h-5 w-5', config.icon)} />
          )}
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={cn('text-sm font-medium mb-1', config.title)}>
              {title}
            </h3>
          )}
          
          <div className={cn('text-sm', config.text)}>
            {children}
          </div>
        </div>
        
        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={cn(
                  'inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2',
                  config.text,
                  'hover:bg-opacity-20'
                )}
              >
                <span className="sr-only">Fermer</span>
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Specialized Alert Components
export interface OfflineAlertProps {
  onRetry?: () => void
  className?: string
}

export const OfflineAlert: React.FC<OfflineAlertProps> = ({
  onRetry,
  className
}) => (
  <Alert
    type="warning"
    title="Mode hors ligne"
    className={className}
  >
    <p className="mb-2">
      Vous êtes actuellement hors ligne. Certaines fonctionnalités peuvent être limitées.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="text-sm font-medium underline hover:no-underline"
      >
        Réessayer la connexion
      </button>
    )}
  </Alert>
)

export interface SyncAlertProps {
  status: 'syncing' | 'success' | 'error'
  onRetry?: () => void
  className?: string
}

export const SyncAlert: React.FC<SyncAlertProps> = ({
  status,
  onRetry,
  className
}) => {
  if (status === 'syncing') {
    return (
      <Alert
        type="info"
        title="Synchronisation en cours"
        className={className}
      >
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2" />
          Synchronisation de vos données...
        </div>
      </Alert>
    )
  }

  if (status === 'success') {
    return (
      <Alert
        type="success"
        title="Synchronisation réussie"
        className={className}
      >
        Vos données ont été synchronisées avec succès.
      </Alert>
    )
  }

  return (
    <Alert
      type="error"
      title="Erreur de synchronisation"
      className={className}
    >
      <p className="mb-2">
        Une erreur s'est produite lors de la synchronisation de vos données.
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium underline hover:no-underline"
        >
          Réessayer
        </button>
      )}
    </Alert>
  )
}

export interface BudgetAlertProps {
  category: string
  spent: number
  budget: number
  percentage: number
  onViewBudget?: () => void
  className?: string
}

export const BudgetAlert: React.FC<BudgetAlertProps> = ({
  category,
  spent,
  budget,
  percentage,
  onViewBudget,
  className
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getAlertType = () => {
    if (percentage >= 120) return 'error'
    if (percentage >= 100) return 'warning'
    if (percentage >= 80) return 'info'
    return 'success'
  }

  const getTitle = () => {
    if (percentage >= 120) return 'Budget critique'
    if (percentage >= 100) return 'Budget dépassé'
    if (percentage >= 80) return 'Alerte budget'
    return 'Budget en cours'
  }

  const getMessage = () => {
    if (percentage >= 120) {
      return `Votre budget ${category} est dépassé de ${Math.round(percentage - 100)}% ! Action requise.`
    }
    if (percentage >= 100) {
      return `Votre budget ${category} est dépassé de ${Math.round(percentage - 100)}% !`
    }
    if (percentage >= 80) {
      return `Votre budget ${category} atteint ${Math.round(percentage)}% (${formatCurrency(spent)}/${formatCurrency(budget)})`
    }
    return `Votre budget ${category} est à ${Math.round(percentage)}% (${formatCurrency(spent)}/${formatCurrency(budget)})`
  }

  return (
    <Alert
      type={getAlertType()}
      title={getTitle()}
      className={className}
    >
      <p className="mb-2">{getMessage()}</p>
      {onViewBudget && (
        <button
          onClick={onViewBudget}
          className="text-sm font-medium underline hover:no-underline"
        >
          Voir le budget
        </button>
      )}
    </Alert>
  )
}

export interface ValidationAlertProps {
  errors: string[]
  className?: string
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  errors,
  className
}) => (
  <Alert
    type="error"
    title="Erreurs de validation"
    className={className}
  >
    <ul className="list-disc list-inside space-y-1">
      {errors.map((error, index) => (
        <li key={index}>{error}</li>
      ))}
    </ul>
  </Alert>
)

export default Alert
