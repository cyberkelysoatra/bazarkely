/**
 * Currency Conversion Utilities
 * 
 * Functions for converting amounts using stored exchange rates.
 * NEVER recalculates rates - always uses the stored exchangeRateUsed from transactions.
 */

export type Currency = 'MGA' | 'EUR';

/**
 * Convert amount using stored exchange rate
 * 
 * This function uses the exchange rate that was stored when the transaction was created.
 * It NEVER fetches a new rate or uses the current rate.
 * 
 * @param originalAmount - The original transaction amount
 * @param originalCurrency - The currency of the original amount ('MGA' or 'EUR')
 * @param targetCurrency - The currency to convert to ('MGA' or 'EUR')
 * @param exchangeRateUsed - The exchange rate that was used when the transaction was created
 * @returns The converted amount
 * 
 * @example
 * // Convert 100 EUR to MGA using stored rate 4950
 * convertAmountWithStoredRate(100, 'EUR', 'MGA', 4950) // Returns 495000
 * 
 * // Convert 495000 MGA to EUR using stored rate 4950
 * convertAmountWithStoredRate(495000, 'MGA', 'EUR', 4950) // Returns 100
 * 
 * // No conversion needed
 * convertAmountWithStoredRate(100, 'EUR', 'EUR', 4950) // Returns 100
 */
export function convertAmountWithStoredRate(
  originalAmount: number,
  originalCurrency: Currency,
  targetCurrency: Currency,
  exchangeRateUsed: number
): number {
  // No conversion needed if currencies match
  if (originalCurrency === targetCurrency) {
    return originalAmount;
  }

  // Validate exchange rate
  if (!exchangeRateUsed || exchangeRateUsed <= 0) {
    console.warn('Invalid exchange rate provided, returning original amount:', exchangeRateUsed);
    return originalAmount;
  }

  // Convert EUR to MGA: multiply by rate
  if (originalCurrency === 'EUR' && targetCurrency === 'MGA') {
    return originalAmount * exchangeRateUsed;
  }

  // Convert MGA to EUR: divide by rate
  if (originalCurrency === 'MGA' && targetCurrency === 'EUR') {
    return originalAmount / exchangeRateUsed;
  }

  // Should not reach here, but return original amount as fallback
  console.warn('Unexpected currency conversion:', { originalCurrency, targetCurrency });
  return originalAmount;
}

/**
 * Get display amount for a transaction based on displayCurrency preference
 * 
 * Uses the transaction's stored exchangeRateUsed to convert if needed.
 * Falls back to transaction.amount if originalCurrency/exchangeRateUsed are missing.
 * 
 * @param transaction - The transaction object
 * @param displayCurrency - The preferred display currency from settings
 * @returns The amount to display in the target currency
 */
export function getTransactionDisplayAmount(
  transaction: {
    amount: number;
    originalAmount?: number;
    originalCurrency?: Currency;
    exchangeRateUsed?: number;
  },
  displayCurrency: Currency
): number {
  // If transaction has multi-currency data, use it
  if (transaction.originalAmount !== undefined && 
      transaction.originalCurrency && 
      transaction.exchangeRateUsed !== undefined) {
    return convertAmountWithStoredRate(
      transaction.originalAmount,
      transaction.originalCurrency,
      displayCurrency,
      transaction.exchangeRateUsed
    );
  }

  // Fallback: assume transaction.amount is already in displayCurrency
  // This handles backward compatibility with old transactions
  return transaction.amount;
}

/**
 * Calculate bank account balance by summing transactions converted to displayCurrency
 * 
 * Uses each transaction's stored exchangeRateUsed for accurate historical conversion.
 * 
 * @param transactions - Array of transactions for the account
 * @param displayCurrency - The preferred display currency from settings
 * @returns The account balance in displayCurrency
 */
export function calculateBankAccountBalance(
  transactions: Array<{
    amount: number;
    originalAmount?: number;
    originalCurrency?: Currency;
    exchangeRateUsed?: number;
  }>,
  displayCurrency: Currency
): number {
  return transactions.reduce((sum, tx) => {
    const convertedAmount = getTransactionDisplayAmount(tx, displayCurrency);
    return sum + convertedAmount;
  }, 0);
}

/**
 * Calculate wallet account balance (dual currency - no conversion)
 * 
 * For wallet accounts (especes), calculate TWO separate balances:
 * - EUR balance: Sum of all EUR transactions
 * - MGA balance: Sum of all MGA transactions
 * 
 * @param transactions - Array of transactions for the wallet account
 * @returns Object with eurBalance and mgaBalance
 */
export function calculateWalletBalance(
  transactions: Array<{
    amount: number;
    originalAmount?: number;
    originalCurrency?: Currency;
  }>
): { eurBalance: number; mgaBalance: number } {
  let eurBalance = 0;
  let mgaBalance = 0;

  transactions.forEach(tx => {
    // Determine the currency of this transaction
    const currency = tx.originalCurrency || 'MGA';
    const amount = tx.originalAmount !== undefined ? tx.originalAmount : tx.amount;

    if (currency === 'EUR') {
      eurBalance += amount;
    } else {
      mgaBalance += amount;
    }
  });

  return { eurBalance, mgaBalance };
}
