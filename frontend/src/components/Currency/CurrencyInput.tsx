/**
 * CurrencyInput Component
 * Number input field with integrated currency toggle button
 */

import React, { useState, useEffect } from 'react';
import CurrencyToggle from './CurrencyToggle';
import type { Currency } from './CurrencyToggle';

interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number, currency: Currency) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}

const CurrencyInput: React.FC<CurrencyInputProps> = ({
  value,
  onChange,
  currency,
  onCurrencyChange,
  placeholder,
  disabled = false,
  className = '',
  id,
  required = false
}) => {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Format number with thousand separators
  const formatNumber = (num: number | string): string => {
    if (num === '' || num === null || num === undefined) return '';
    
    const numValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numValue)) return '';

    if (currency === 'MGA') {
      // MGA: no decimals, space separators
      return Math.round(numValue).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).replace(/\s/g, ' ');
    } else {
      // EUR: 2 decimals max, comma for decimal
      return numValue.toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      });
    }
  };

  // Parse formatted string to number
  const parseNumber = (str: string): number => {
    if (!str || str.trim() === '') return 0;
    // Remove spaces and replace comma with dot for parsing
    const cleaned = str.replace(/\s/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Update display value when value prop changes (external update)
  useEffect(() => {
    if (!isFocused && value !== undefined && value !== null && value !== '') {
      setDisplayValue(formatNumber(value));
    }
  }, [value, currency, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Show raw number when focused
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    setDisplayValue(isNaN(numValue) ? '' : numValue.toString());
  };

  const handleBlur = () => {
    setIsFocused(false);
    const numValue = parseNumber(displayValue);
    setDisplayValue(formatNumber(numValue));
    onChange(numValue, currency);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Allow empty input, numbers, and decimal separator
    if (inputValue === '' || /^[\d\s,.-]*$/.test(inputValue)) {
      setDisplayValue(inputValue);
    }
  };

  const handleCurrencyToggle = (newCurrency: Currency) => {
    // Convert current value to new currency if needed
    const currentNumValue = parseNumber(displayValue);
    onCurrencyChange(newCurrency);
    // Keep the same numeric value, just change currency
    // The parent component can handle conversion if needed
    onChange(currentNumValue, newCurrency);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        id={id}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        className={`
          w-full
          pl-3
          pr-16
          py-2
          border
          border-gray-300
          rounded-lg
          focus:ring-2
          focus:ring-purple-500
          focus:border-transparent
          disabled:bg-gray-100
          disabled:cursor-not-allowed
          ${disabled ? 'opacity-50' : ''}
        `}
        aria-label={`Amount in ${currency}`}
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <CurrencyToggle
          currency={currency}
          onToggle={handleCurrencyToggle}
          size="sm"
          disabled={disabled}
        />
      </div>
    </div>
  );
};

export default CurrencyInput;

