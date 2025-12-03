/**
 * MonthlySummaryCard Component
 * Displays monthly financial summary for diaspora users
 */

import React from 'react';
import { Calendar, TrendingUp, TrendingDown } from 'lucide-react';
import { CurrencyDisplay } from '../Currency';
import type { Currency } from '../Currency/CurrencyToggle';

interface MonthlySummaryCardProps {
  className?: string;
  displayCurrency?: Currency;
}

const MonthlySummaryCard: React.FC<MonthlySummaryCardProps> = ({ className = '', displayCurrency = 'MGA' }) => {
  // Debug: Log displayCurrency prop
  console.log('💱 MonthlySummaryCard displayCurrency:', displayCurrency);
  
  // Placeholder data - will be replaced with actual data fetching
  const monthlyIncome = 0;
  const monthlyExpenses = 0;
  const netAmount = monthlyIncome - monthlyExpenses;

  return (
    <div className={`card ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-semibold text-gray-900">Résumé mensuel</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">Revenus</span>
          </div>
          <CurrencyDisplay
            amount={monthlyIncome}
            originalCurrency="MGA"
            displayCurrency={displayCurrency}
            showConversion={true}
            size="md"
            className="font-semibold text-green-700"
          />
        </div>
        
        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-sm text-gray-600">Dépenses</span>
          </div>
          <CurrencyDisplay
            amount={monthlyExpenses}
            originalCurrency="MGA"
            displayCurrency={displayCurrency}
            showConversion={true}
            size="md"
            className="font-semibold text-red-700"
          />
        </div>
        
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Solde net</span>
            <CurrencyDisplay
              amount={netAmount}
              originalCurrency="MGA"
              displayCurrency={displayCurrency}
              showConversion={true}
              size="lg"
              className={`font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummaryCard;
