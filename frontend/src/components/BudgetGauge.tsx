import React from 'react';
import { CurrencyDisplay } from './Currency';

export interface BudgetGaugeProps {
  budgetAmount: number;
  spentAmount: number;
  projectedSpent: number;
  percentage: number;
  remaining: number;
  status: {
    status: string;
    color: string;
    bgColor: string;
    label: string;
  };
  category: string;
  displayCurrency: 'MGA' | 'EUR';
  loading: boolean;
  error: string | null;
  hasBudget: boolean;
  compact?: boolean;
}

const BudgetGauge: React.FC<BudgetGaugeProps> = ({
  budgetAmount,
  spentAmount,
  projectedSpent,
  percentage,
  remaining,
  status,
  category,
  displayCurrency,
  loading,
  error,
  hasBudget,
  compact = false
}) => {
  // Early return if no budget defined
  if (!hasBudget) {
    return (
      <div className="text-sm text-gray-500">
        Pas de budget défini pour cette catégorie
      </div>
    );
  }

  // Early return if loading
  if (loading) {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2 animate-pulse" />
    );
  }

  // Early return if error
  if (error) {
    return (
      <div className="text-sm text-red-600">
        {error}
      </div>
    );
  }

  // Determine if overspent
  const isOverspent = projectedSpent > budgetAmount;

  return (
    <div className="flex items-center gap-3">
      {/* Progress bar container - takes most space */}
      <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
        {isOverspent ? (
          // Bicolor bar for overspent budgets
          <div className="flex h-full">
            <div
              className="bg-green-500 h-full transition-all duration-300"
              style={{ width: `${(budgetAmount / projectedSpent) * 100}%` }}
            />
            <div
              className="bg-red-500 h-full transition-all duration-300"
              style={{ width: `${((projectedSpent - budgetAmount) / projectedSpent) * 100}%` }}
            />
          </div>
        ) : (
          // Single color bar for normal budgets
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              status.status === 'exceeded' ? 'bg-red-500' :
              status.status === 'warning' ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        )}
      </div>

      {/* Text display inline with bar (only when not compact) */}
      {!compact && (
        <div className="flex-shrink-0 text-sm">
          {isOverspent ? (
            <span className="text-red-600 whitespace-nowrap">
              Dépassé: -<CurrencyDisplay
                amount={projectedSpent - budgetAmount}
                originalCurrency="MGA"
                displayCurrency={displayCurrency}
                showConversion={true}
                size="sm"
              />
            </span>
          ) : (
            <span className="text-gray-600 whitespace-nowrap">
              Restant: <CurrencyDisplay
                amount={Math.max(0, remaining)}
                originalCurrency="MGA"
                displayCurrency={displayCurrency}
                showConversion={true}
                size="sm"
              />
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default BudgetGauge;
