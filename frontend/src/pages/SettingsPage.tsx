import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings } from 'lucide-react';
import { CurrencySwitcher } from '../components/Currency/CurrencySwitcher';

/**
 * Storage key for display currency preference
 */
const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

/**
 * Save display currency preference to localStorage
 */
function saveDisplayCurrency(currency: 'MGA' | 'EUR'): void {
  localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
}

/**
 * Get display currency preference from localStorage
 * Defaults to 'MGA' if not set
 */
function getDisplayCurrency(): 'MGA' | 'EUR' {
  const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
  if (stored === 'MGA' || stored === 'EUR') {
    return stored;
  }
  return 'MGA';
}

/**
 * SettingsPage Component
 * Main settings page with currency preference and placeholders for future settings
 */
const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [displayCurrency, setDisplayCurrency] = useState<'MGA' | 'EUR'>('MGA');
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Load currency preference on component mount
   */
  useEffect(() => {
    const currency = getDisplayCurrency();
    setDisplayCurrency(currency);
    setIsLoading(false);
  }, []);

  /**
   * Handle currency change from CurrencySwitcher
   */
  const handleCurrencyChange = (currency: 'MGA' | 'EUR'): void => {
    setDisplayCurrency(currency);
    saveDisplayCurrency(currency);
    
    // Optionally trigger app-wide update
    // Dispatch custom event for other components to listen
    window.dispatchEvent(new CustomEvent('currencyChanged', { detail: currency }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Retour au tableau de bord"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
              </div>
            </div>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {/* Section 1: Currency Preference */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Préférences d'affichage
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Configurez vos préférences d'affichage pour personnaliser votre expérience.
            </p>
            
            <CurrencySwitcher
              defaultCurrency={displayCurrency}
              onCurrencyChange={handleCurrencyChange}
              showLabel={true}
              showDescription={true}
            />
          </section>

          {/* Section 2: Placeholder for future settings */}
          <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Autres paramètres
            </h2>
            <p className="text-sm text-gray-500 italic">
              D'autres paramètres seront disponibles prochainement (thème, langue, etc.)
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;














