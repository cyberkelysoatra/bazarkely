/**
 * Composant de résumé mensuel pour familles diaspora
 * Affiche un résumé des transactions mensuelles avec support multi-devises
 */

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyDisplay } from '../Currency';

interface MonthlySummaryCardProps {
  className?: string;
  displayCurrency?: 'MGA' | 'EUR';
  monthlyIncome: number;
  monthlyExpenses: number;
}

const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({ 
  className = '', 
  displayCurrency = 'MGA',
  monthlyIncome,
  monthlyExpenses
}) => {
  // Calculer le solde net
  const netBalance = monthlyIncome - monthlyExpenses;
  const isNetPositive = netBalance >= 0;

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Résumé mensuel</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        {/* Section Revenus */}
        <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Revenus</p>
              <p className="text-xs text-gray-500">Ce mois</p>
            </div>
          </div>
          <div className="text-right">
            <CurrencyDisplay
              amount={monthlyIncome}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
              className="text-green-700"
            />
          </div>
        </div>

        {/* Section Dépenses */}
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl border border-red-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Dépenses</p>
              <p className="text-xs text-gray-500">Ce mois</p>
            </div>
          </div>
          <div className="text-right">
            <CurrencyDisplay
              amount={monthlyExpenses}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
              className="text-red-700"
            />
          </div>
        </div>

        {/* Section Solde net */}
        <div className={`flex items-center justify-between p-4 rounded-xl border ${
          isNetPositive 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              isNetPositive ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <Calendar className={`w-5 h-5 ${
                isNetPositive ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Solde net</p>
              <p className="text-xs text-gray-500">Revenus - Dépenses</p>
            </div>
          </div>
          <div className="text-right">
            <CurrencyDisplay
              amount={netBalance}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
              colorBySign={true}
              className={isNetPositive ? 'text-green-700' : 'text-red-700'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryCard;
