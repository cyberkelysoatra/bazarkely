import React, { forwardRef } from 'react'
// TEMPORARY FIX: Comment out problematic import to unblock the app
// import { LucideIcon, Eye, EyeOff } from 'lucide-react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '../../utils/cn'

// TEMPORARY: Use proper React component type for icons
type LucideIcon = React.ComponentType<{
  className?: string
  size?: number | string
  strokeWidth?: number | string
}>

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: LucideIcon
  rightIcon?: LucideIcon
  currency?: 'MGA' | 'USD' | 'EUR'
  showPasswordToggle?: boolean
  required?: boolean
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon: LeftIcon,
      rightIcon: RightIcon,
      currency,
      showPasswordToggle = false,
      required = false,
      className,
      type = 'text',
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = React.useState(false)
    const [isFocused, setIsFocused] = React.useState(false)
    
    const inputType = showPasswordToggle && type === 'password' 
      ? (showPassword ? 'text' : 'password')
      : type

    const formatCurrency = (value: string) => {
      if (!currency || currency !== 'MGA') return value
      
      // Remove non-numeric characters
      const numericValue = value.replace(/\D/g, '')
      
      // Format with spaces for thousands
      return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (currency) {
        const formatted = formatCurrency(e.target.value)
        e.target.value = formatted
      }
      props.onChange?.(e)
    }

    const baseClasses = 'block w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0'
    
    const stateClasses = error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : isFocused
      ? 'border-blue-500 text-gray-900 placeholder-gray-500 focus:ring-blue-500'
      : 'border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'

    const paddingClasses = {
      left: LeftIcon ? 'pl-10' : 'pl-3',
      right: (RightIcon || showPasswordToggle) ? 'pr-10' : 'pr-3'
    }

    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {LeftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LeftIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
          
          <input
            ref={ref}
            type={inputType}
            className={cn(
              baseClasses,
              stateClasses,
              paddingClasses.left,
              paddingClasses.right,
              className
            )}
            onFocus={(e) => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={(e) => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            onChange={handleInputChange}
            {...props}
          />
          
          {showPasswordToggle && type === 'password' && (
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              ) : (
                <Eye className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          )}
          
          {RightIcon && !showPasswordToggle && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <RightIcon className="h-4 w-4 text-gray-400" />
            </div>
          )}
          
          {currency && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-sm text-gray-500 font-medium">
                {currency === 'MGA' ? 'Ar' : currency}
              </span>
            </div>
          )}
        </div>
        
        {error && (
          <p className="text-sm text-red-600 flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        
        {helperText && !error && (
          <p className="text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
