import React from 'react'
import { cn } from '../../utils/cn'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: 'default' | 'outlined' | 'elevated' | 'flat'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  clickable?: boolean
  hover?: boolean
  className?: string
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      variant = 'default',
      padding = 'md',
      clickable = false,
      hover = false,
      className,
      ...props
    },
    ref
  ) => {
    const baseClasses = 'bg-white rounded-lg transition-all duration-200'
    
    const variantClasses = {
      default: 'border border-gray-200',
      outlined: 'border-2 border-gray-300',
      elevated: 'shadow-lg border border-gray-100',
      flat: 'border-0 shadow-none'
    }
    
    const paddingClasses = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8'
    }
    
    const interactiveClasses = clickable
      ? 'cursor-pointer hover:shadow-md active:scale-[0.98]'
      : hover
      ? 'hover:shadow-md'
      : ''

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses[variant],
          paddingClasses[padding],
          interactiveClasses,
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

const CardHeader: React.FC<CardHeaderProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-b border-gray-200', className)}>
    {children}
  </div>
)

const CardBody: React.FC<CardBodyProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4', className)}>
    {children}
  </div>
)

const CardFooter: React.FC<CardFooterProps> = ({ children, className }) => (
  <div className={cn('px-6 py-4 border-t border-gray-200', className)}>
    {children}
  </div>
)

// Specialized Card Components
export interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  onClick?: () => void
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  className,
  onClick
}) => (
  <Card
    clickable={!!onClick}
    hover={!!onClick}
    onClick={onClick}
    className={cn('relative overflow-hidden', className)}
  >
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center mt-2">
            <span
              className={cn(
                'text-sm font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-sm text-gray-500 ml-1">vs mois dernier</span>
          </div>
        )}
      </div>
      {icon && (
        <div className="flex-shrink-0 ml-4">
          {icon}
        </div>
      )}
    </div>
  </Card>
)

export interface TransactionCardProps {
  title: string
  amount: number
  type: 'income' | 'expense' | 'transfer'
  category: string
  date: Date
  description?: string
  onClick?: () => void
  className?: string
}

export const TransactionCard: React.FC<TransactionCardProps> = ({
  title,
  amount,
  type,
  category,
  date,
  description,
  onClick,
  className
}) => {
  const isIncome = type === 'income'
  const isTransfer = type === 'transfer'
  const isDebit = amount < 0

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MG', {
      style: 'currency',
      currency: 'MGA',
      minimumFractionDigits: 0
    }).format(Math.abs(amount))
  }

  return (
    <Card
      clickable={!!onClick}
      hover={!!onClick}
      onClick={onClick}
      className={cn('p-4', className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {isTransfer ? (isDebit ? `Sortie: ${title}` : `Entrée: ${title}`) : title}
            </h3>
            {isTransfer && (
              <span
                className={cn(
                  'text-xs px-2 py-1 rounded-full',
                  isDebit ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                )}
              >
                {isDebit ? 'Débit' : 'Crédit'}
              </span>
            )}
          </div>
          
          <p className="text-xs text-gray-500 mt-1">
            {category} • {date.toLocaleDateString('fr-FR')}
          </p>
          
          {description && (
            <p className="text-sm text-gray-600 mt-1 truncate">{description}</p>
          )}
        </div>
        
        <div className="flex-shrink-0 ml-4 text-right">
          <p
            className={cn(
              'text-sm font-medium',
              isIncome || (isTransfer && !isDebit)
                ? 'text-green-600'
                : 'text-red-600'
            )}
          >
            {isIncome || (isTransfer && !isDebit) ? '+' : ''}{formatCurrency(amount)}
          </p>
        </div>
      </div>
    </Card>
  )
}

export { CardHeader, CardBody, CardFooter }
export default Card
