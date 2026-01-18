/**
 * CurrencyToggle Component
 * Simple button to toggle between MGA and EUR currencies
 */

import React from 'react';

export type Currency = 'MGA' | 'EUR';
export type ToggleSize = 'sm' | 'md' | 'lg';

interface CurrencyToggleProps {
  currency: Currency;
  onToggle: (newCurrency: Currency) => void;
  size?: ToggleSize;
  disabled?: boolean;
}

const CurrencyToggle: React.FC<CurrencyToggleProps> = ({
  currency,
  onToggle,
  size = 'md',
  disabled = false
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) {
      console.warn('⚠️ [CurrencyToggle] Button disabled, ignoring click');
      return;
    }
    
    const newCurrency: Currency = currency === 'MGA' ? 'EUR' : 'MGA';
    console.log('🔄 [CurrencyToggle] Button clicked, toggling from', currency, 'to', newCurrency);
    onToggle(newCurrency);
    console.log('✅ [CurrencyToggle] Toggle completed');
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const currencySymbol = currency === 'MGA' ? 'Ar' : '€';

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`
        rounded-full
        bg-purple-100
        hover:bg-purple-200
        text-purple-700
        font-medium
        transition-colors
        duration-200
        ${sizeClasses[size]}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none
        focus:ring-2
        focus:ring-purple-500
        focus:ring-offset-1
      `}
      aria-label={`Toggle currency to ${currency === 'MGA' ? 'EUR' : 'MGA'}`}
      aria-pressed={currency === 'EUR'}
    >
      {currencySymbol}
    </button>
  );
};

export default CurrencyToggle;




