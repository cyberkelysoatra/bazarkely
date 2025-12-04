import { useState, useEffect, useCallback } from 'react';

/**
 * Storage key for display currency preference in localStorage
 */
const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

/**
 * Event name for currency change notifications
 */
const CURRENCY_CHANGED_EVENT = 'currencyChanged';

/**
 * Type for supported currencies
 */
export type Currency = 'MGA' | 'EUR';

/**
 * Type for currency change event detail
 */
interface CurrencyChangeEventDetail {
  currency: Currency;
}

/**
 * Return type for useCurrency hook
 */
interface UseCurrencyReturn {
  displayCurrency: Currency;
  setDisplayCurrency: (currency: Currency) => void;
}

/**
 * Custom hook for managing currency display preference
 * 
 * This hook centralizes all currency preference logic:
 * - Reads initial value from localStorage (key: 'bazarkely_display_currency')
 * - Defaults to 'MGA' if not set
 * - Listens to 'currencyChanged' CustomEvent and updates state
 * - Cleanup event listener on unmount
 * - setDisplayCurrency saves to localStorage and dispatches the event
 * 
 * @example
 * ```tsx
 * const { displayCurrency, setDisplayCurrency } = useCurrency();
 * 
 * // Use the currency
 * <CurrencyDisplay amount={1000} currency={displayCurrency} />
 * 
 * // Change currency
 * setDisplayCurrency('EUR');
 * ```
 * 
 * @returns Object with displayCurrency and setDisplayCurrency function
 */
export function useCurrency(): UseCurrencyReturn {
  // Initialize state from localStorage
  const [displayCurrency, setDisplayCurrencyState] = useState<Currency>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
      if (saved === 'EUR' || saved === 'MGA') {
        return saved;
      }
      return 'MGA';
    } catch (error) {
      // Handle localStorage errors (e.g., private browsing mode)
      console.warn('Error reading currency from localStorage:', error);
      return 'MGA';
    }
  });

  // Listen for currency changes from other components (e.g., Settings page)
  useEffect(() => {
    const handleCurrencyChange = (event: Event) => {
      try {
        const customEvent = event as CustomEvent<CurrencyChangeEventDetail | Currency>;
        let newCurrency: Currency | undefined;
        
        // Handle both event formats for backward compatibility:
        // 1. New format: { detail: { currency: 'MGA' } }
        // 2. Old format (SettingsPage): { detail: 'MGA' }
        if (customEvent.detail) {
          if (typeof customEvent.detail === 'object' && 'currency' in customEvent.detail) {
            newCurrency = (customEvent.detail as CurrencyChangeEventDetail).currency;
          } else if (typeof customEvent.detail === 'string') {
            newCurrency = customEvent.detail as Currency;
          }
        }
        
        if (newCurrency === 'MGA' || newCurrency === 'EUR') {
          setDisplayCurrencyState(newCurrency);
        } else {
          console.warn('Invalid currency value received:', customEvent.detail);
        }
      } catch (error) {
        console.warn('Error handling currency change event:', error);
      }
    };

    window.addEventListener(CURRENCY_CHANGED_EVENT, handleCurrencyChange);

    return () => {
      window.removeEventListener(CURRENCY_CHANGED_EVENT, handleCurrencyChange);
    };
  }, []);

  // setDisplayCurrency function that saves to localStorage and dispatches event
  const setDisplayCurrency = useCallback((currency: Currency) => {
    try {
      // Validate currency value
      if (currency !== 'MGA' && currency !== 'EUR') {
        console.warn('Invalid currency value:', currency);
        return;
      }

      // Update state
      setDisplayCurrencyState(currency);

      // Save to localStorage
      localStorage.setItem(CURRENCY_STORAGE_KEY, currency);

      // Dispatch event to notify other components
      const event = new CustomEvent<CurrencyChangeEventDetail>(CURRENCY_CHANGED_EVENT, {
        detail: { currency }
      });
      window.dispatchEvent(event);
    } catch (error) {
      console.error('Error setting display currency:', error);
    }
  }, []);

  return {
    displayCurrency,
    setDisplayCurrency
  };
}

// Default export for convenience
export default useCurrency;

