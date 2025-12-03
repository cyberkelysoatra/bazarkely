/**
 * CurrencySwitcher Component
 * Settings component with visual toggle switch to select default display currency (MGA or EUR)
 * Displays current exchange rate and allows users to switch between currencies
 */

import React, { useState, useEffect } from 'react';
import { getExchangeRate } from '../../services/exchangeRateService';

export interface CurrencySwitcherProps {
  /** Current default currency */
  defaultCurrency: 'MGA' | 'EUR';
  /** Callback when currency changes */
  onCurrencyChange: (currency: 'MGA' | 'EUR') => void;
  /** Show label section (default: true) */
  showLabel?: boolean;
  /** Show description section (default: true) */
  showDescription?: boolean;
}

/**
 * CurrencySwitcher Component
 * Visual toggle switch for currency selection in settings page
 */
export const CurrencySwitcher: React.FC<CurrencySwitcherProps> = ({
  defaultCurrency,
  onCurrencyChange,
  showLabel = true,
  showDescription = true
}) => {
  const [currentRate, setCurrentRate] = useState<number>(4950); // Default rate
  const [rateDate, setRateDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  /**
   * Fetch exchange rate on component mount
   */
  useEffect(() => {
    const fetchRate = async () => {
      try {
        setIsLoading(true);
        const exchangeRate = await getExchangeRate('EUR', 'MGA');
        setCurrentRate(exchangeRate.rate);
        
        // Format date for display
        // exchangeRate.date is in ISO format (YYYY-MM-DD)
        const dateParts = exchangeRate.date.split('-');
        if (dateParts.length === 3) {
          const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
          setRateDate(date.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          }));
        } else {
          // Fallback if date format is unexpected
          setRateDate(exchangeRate.date);
        }
      } catch (error) {
        console.error('Erreur lors de la récupération du taux de change:', error);
        // Keep default rate on error
        setCurrentRate(4950);
        const today = new Date();
        setRateDate(today.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        }));
      } finally {
        setIsLoading(false);
      }
    };

    fetchRate();
  }, []);

  /**
   * Handle toggle switch click
   */
  const handleToggle = () => {
    const newCurrency = defaultCurrency === 'MGA' ? 'EUR' : 'MGA';
    onCurrencyChange(newCurrency);
  };

  /**
   * Format rate for display
   */
  const formatRate = (rate: number): string => {
    return Math.round(rate).toLocaleString('fr-FR');
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Label Section */}
      {showLabel && (
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Devise d'affichage principale
        </h3>
      )}

      {/* Description Section */}
      {showDescription && (
        <p className="text-sm text-gray-500 mb-4">
          Choisissez la devise par défaut pour l'affichage des montants
        </p>
      )}

      {/* Toggle Switch Container */}
      <div className="flex items-center gap-4 justify-center mb-4">
        {/* MGA Label */}
        <span
          className={`text-lg font-medium transition-colors ${
            defaultCurrency === 'MGA'
              ? 'text-purple-600'
              : 'text-gray-400'
          }`}
        >
          Ar
        </span>

        {/* Toggle Switch */}
        <button
          type="button"
          onClick={handleToggle}
          role="switch"
          aria-checked={defaultCurrency === 'EUR'}
          aria-label={`Basculer vers ${defaultCurrency === 'MGA' ? 'EUR' : 'MGA'}`}
          className={`
            w-14 h-8 rounded-full relative cursor-pointer
            transition-colors duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
            ${defaultCurrency === 'EUR' ? 'bg-purple-500' : 'bg-gray-200'}
          `}
        >
          {/* Toggle Knob */}
          <span
            className={`
              absolute top-1 w-6 h-6 bg-white rounded-full shadow-md
              transition-all duration-300 ease-in-out
              ${defaultCurrency === 'EUR' ? 'right-1' : 'left-1'}
            `}
            aria-hidden="true"
          />
        </button>

        {/* EUR Label */}
        <span
          className={`text-lg font-medium transition-colors ${
            defaultCurrency === 'EUR'
              ? 'text-purple-600'
              : 'text-gray-400'
          }`}
        >
          €
        </span>
      </div>

      {/* Current Rate Info */}
      {!isLoading && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Taux du jour : 1€ = {formatRate(currentRate)} Ar
          {rateDate && (
            <span className="block mt-1 text-gray-400">
              (mis à jour : {rateDate})
            </span>
          )}
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <p className="text-xs text-gray-400 mt-4 text-center">
          Chargement du taux de change...
        </p>
      )}
    </div>
  );
};

export default CurrencySwitcher;

