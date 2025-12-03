/**
 * CurrencyDisplay Component
 * Display a formatted amount with clickable currency toggle
 */

import React, { useState, useEffect, useRef } from 'react';
import { convertAmount } from '../../services/exchangeRateService';
import type { Currency } from './CurrencyToggle';

interface CurrencyDisplayProps {
  amount: number;
  originalCurrency: Currency;
  showConversion?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  colorBySign?: boolean;
  displayCurrency?: Currency; // Optional prop to control display currency from parent
}

const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  originalCurrency,
  showConversion = true,
  size = 'md',
  className = '',
  colorBySign = false,
  displayCurrency: displayCurrencyProp
}) => {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(displayCurrencyProp || originalCurrency);
  
  // Update internal state when prop changes
  useEffect(() => {
    if (displayCurrencyProp !== undefined) {
      setDisplayCurrency(displayCurrencyProp);
    } else {
      // If prop is removed, reset to originalCurrency
      setDisplayCurrency(originalCurrency);
    }
  }, [displayCurrencyProp, originalCurrency]);
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Cache for converted amounts to avoid repeated API calls
  const conversionCache = useRef<Map<string, number>>(new Map());

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-3xl'
  };

  const fontClasses = {
    sm: 'font-medium',
    md: 'font-medium',
    lg: 'font-bold',
    xl: 'font-bold'
  };

  // Format amount for display
  const formatAmount = (value: number, curr: Currency): string => {
    if (curr === 'MGA') {
      // MGA: no decimals, space separators
      return Math.round(value).toLocaleString('fr-FR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).replace(/\s/g, ' ');
    } else {
      // EUR: 2 decimals, comma for decimal
      return value.toLocaleString('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
  };

  const getCurrencySymbol = (curr: Currency): string => {
    return curr === 'MGA' ? 'Ar' : '€';
  };

  // Fetch conversion when currency is toggled
  useEffect(() => {
    // If showing in original currency, no conversion needed
    if (displayCurrency === originalCurrency) {
      setConvertedAmount(null);
      setError(null);
      return;
    }

    // Check cache first
    const cacheKey = `${amount}-${originalCurrency}-${displayCurrency}`;
    const cached = conversionCache.current.get(cacheKey);
    
    if (cached !== undefined) {
      setConvertedAmount(cached);
      setError(null);
      return;
    }

    // Fetch conversion
    const fetchConversion = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const converted = await convertAmount(
          amount,
          originalCurrency,
          displayCurrency
        );
        
        setConvertedAmount(converted);
        // Cache the result
        conversionCache.current.set(cacheKey, converted);
      } catch (err: any) {
        console.error('Error converting amount:', err);
        setError('Erreur de conversion');
        setConvertedAmount(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConversion();
  }, [amount, originalCurrency, displayCurrency]);

  const handleCurrencyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showConversion || isLoading) return;
    const newCurrency: Currency = displayCurrency === 'MGA' ? 'EUR' : 'MGA';
    setDisplayCurrency(newCurrency);
  };

  const displayAmount = displayCurrency === originalCurrency 
    ? amount 
    : (convertedAmount ?? amount);

  const isPositive = displayAmount >= 0;
  const colorClass = colorBySign
    ? (isPositive ? 'text-green-600' : 'text-red-600')
    : 'text-gray-900';

  return (
    <div className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${fontClasses[size]} ${colorClass} ${className}`}>
      <span>{formatAmount(displayAmount, displayCurrency)}</span>
      {showConversion ? (
        <button
          type="button"
          onClick={handleCurrencyClick}
          disabled={isLoading}
          className={`
            ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:underline'}
            transition-opacity
            duration-200
            focus:outline-none
            focus:ring-2
            focus:ring-purple-500
            focus:ring-offset-1
            rounded
          `}
          aria-label={`Toggle currency to ${displayCurrency === 'MGA' ? 'EUR' : 'MGA'}`}
          title={`Cliquer pour afficher en ${displayCurrency === 'MGA' ? 'EUR' : 'MGA'}`}
        >
          {isLoading ? (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>{getCurrencySymbol(displayCurrency)}</span>
          )}
        </button>
      ) : (
        <span className="text-gray-600">{getCurrencySymbol(displayCurrency)}</span>
      )}
      {error && (
        <span className="text-xs text-red-500 ml-1" title={error}>
          ⚠️
        </span>
      )}
    </div>
  );
};

export default CurrencyDisplay;

