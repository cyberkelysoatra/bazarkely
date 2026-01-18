/**
 * WalletBalanceDisplay Component
 * 
 * Special component for displaying wallet account balances in dual currency format.
 * Shows "X € + Y Ar" without conversion (both amounts shown separately).
 */

import React from 'react';
import { CurrencyDisplay } from '../Currency';
import type { Transaction } from '../../types';
import { calculateWalletBalance } from '../../utils/currencyConversion';

interface WalletBalanceDisplayProps {
  transactions: Transaction[];
  showBalances?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const WalletBalanceDisplay: React.FC<WalletBalanceDisplayProps> = ({
  transactions,
  showBalances = true,
  size = 'md',
  className = ''
}) => {
  const { eurBalance, mgaBalance } = calculateWalletBalance(transactions);

  if (!showBalances) {
    return (
      <span className={className}>
        <span className="text-gray-400">••••</span>
      </span>
    );
  }

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  const fontClasses = {
    sm: 'font-medium',
    md: 'font-semibold',
    lg: 'font-bold'
  };

  return (
    <div className={`inline-flex items-center gap-2 ${sizeClasses[size]} ${fontClasses[size]} ${className}`}>
      {eurBalance !== 0 && (
        <span className="text-gray-900">
          <CurrencyDisplay
            amount={eurBalance}
            originalCurrency="EUR"
            showConversion={false}
            size={size}
          />
        </span>
      )}
      {eurBalance !== 0 && mgaBalance !== 0 && (
        <span className="text-gray-400">+</span>
      )}
      {mgaBalance !== 0 && (
        <span className="text-gray-900">
          <CurrencyDisplay
            amount={mgaBalance}
            originalCurrency="MGA"
            showConversion={false}
            size={size}
          />
        </span>
      )}
      {eurBalance === 0 && mgaBalance === 0 && (
        <span className="text-gray-400">
          <CurrencyDisplay
            amount={0}
            originalCurrency="MGA"
            showConversion={false}
            size={size}
          />
        </span>
      )}
    </div>
  );
};

export default WalletBalanceDisplay;
