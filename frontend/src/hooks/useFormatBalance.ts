/**
 * Hook for formatting MGA balances with exchange rate conversion
 *
 * Provides a formatBalance() function that:
 * - When displayCurrency is EUR: converts MGA amount using daily rate and formats as "X,XX €"
 * - When displayCurrency is MGA: formats as "X Ar"
 *
 * Use this for displaying account balances, loan amounts, and other
 * DB-stored amounts that are always in MGA.
 */

import { useState, useEffect, useCallback } from 'react';
import { useCurrency } from './useCurrency';
import { getExchangeRate } from '../services/exchangeRateService';

export function useFormatBalance() {
  const { displayCurrency } = useCurrency();
  const [exchangeRate, setExchangeRate] = useState<number>(4950);

  useEffect(() => {
    if (displayCurrency === 'EUR') {
      getExchangeRate('EUR', 'MGA')
        .then(rate => setExchangeRate(rate.rate))
        .catch(() => setExchangeRate(4950));
    }
  }, [displayCurrency]);

  const formatBalance = useCallback((amount: number): string => {
    if (displayCurrency === 'EUR') {
      const converted = amount / exchangeRate;
      return `${converted.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    }
    return `${amount.toLocaleString('fr-FR')} Ar`;
  }, [displayCurrency, exchangeRate]);

  return { formatBalance, displayCurrency };
}

export default useFormatBalance;
