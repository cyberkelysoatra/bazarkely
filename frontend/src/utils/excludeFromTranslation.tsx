import React from 'react';

/**
 * HTML attributes object for translation protection
 * Combines multiple protection layers for maximum compatibility
 */
export interface NoTranslateAttrs {
  translate: 'no';
  className: string;
  lang: string;
  'data-no-translate': string;
}

/**
 * React component wrapper that protects children from browser translation
 * 
 * Uses multiple protection layers:
 * - translate="no" (W3C standard)
 * - className="notranslate" (Google Translate)
 * - lang="fr" (language hint)
 * - data-no-translate="true" (extra layer)
 * 
 * @example
 * ```tsx
 * <NoTranslate>1,234,567 Ar</NoTranslate>
 * ```
 * 
 * @example
 * ```tsx
 * <NoTranslate>
 *   <span>Amount: 50,000 Ar</span>
 * </NoTranslate>
 * ```
 */
export const NoTranslate: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span translate="no" className="notranslate" lang="fr" data-no-translate="true">
    {children}
  </span>
);

/**
 * Protects a financial amount from browser translation
 * 
 * Wraps the amount in a NoTranslate component to prevent translation
 * of numbers, decimal separators, and currency symbols.
 * 
 * @param amount - The amount to protect (number or formatted string)
 * @returns JSX.Element with protected amount
 * 
 * @example
 * ```tsx
 * {protectAmount(50000)}
 * // Renders: <span translate="no" className="notranslate" lang="fr" data-no-translate="true">50000</span>
 * ```
 * 
 * @example
 * ```tsx
 * {protectAmount('1,234,567.89')}
 * // Protects formatted amount string
 * ```
 */
export const protectAmount = (amount: number | string): React.ReactElement => (
  <NoTranslate>{amount}</NoTranslate>
);

/**
 * Protects a currency code from browser translation
 * 
 * Currency codes like "MGA", "EUR", "USD" should not be translated
 * as they are standardized ISO codes.
 * 
 * @param code - The currency code to protect (e.g., "MGA", "EUR")
 * @returns JSX.Element with protected currency code
 * 
 * @example
 * ```tsx
 * {protectCurrency('MGA')}
 * // Renders: <span translate="no" className="notranslate" lang="fr" data-no-translate="true">MGA</span>
 * ```
 * 
 * @example
 * ```tsx
 * <span>Price: {protectCurrency('EUR')}</span>
 * ```
 */
export const protectCurrency = (code: string): React.ReactElement => (
  <NoTranslate>{code}</NoTranslate>
);

/**
 * Protects a user name from browser translation
 * 
 * User names are proper nouns and should never be translated.
 * This function ensures names remain unchanged by translation tools.
 * 
 * @param name - The user name to protect
 * @returns JSX.Element with protected user name
 * 
 * @example
 * ```tsx
 * {protectUserName('Joel Rakoto')}
 * // Renders: <span translate="no" className="notranslate" lang="fr" data-no-translate="true">Joel Rakoto</span>
 * ```
 * 
 * @example
 * ```tsx
 * <div>Welcome, {protectUserName(user.name)}!</div>
 * ```
 */
export const protectUserName = (name: string): React.ReactElement => (
  <NoTranslate>{name}</NoTranslate>
);

/**
 * Returns HTML attributes object for translation protection
 * 
 * Use this function when you need to spread attributes onto an existing element
 * instead of wrapping content in a component. Useful for elements that already
 * have their own structure but need protection.
 * 
 * @returns Object with translate, className, lang, and data-no-translate attributes
 * 
 * @example
 * ```tsx
 * <div {...getNoTranslateAttrs()}>
 *   50,000 Ar
 * </div>
 * ```
 * 
 * @example
 * ```tsx
 * <span className="amount" {...getNoTranslateAttrs()}>
 *   {formatCurrency(amount)}
 * </span>
 * ```
 */
export const getNoTranslateAttrs = (): NoTranslateAttrs => ({
  translate: 'no',
  className: 'notranslate',
  lang: 'fr',
  'data-no-translate': 'true',
});

/**
 * Returns className string for translation protection
 * 
 * Use this when you only need the className and want to combine it
 * with other classes. The className "notranslate" is recognized by
 * Google Translate and other translation tools.
 * 
 * @returns String "notranslate" for use in className prop
 * 
 * @example
 * ```tsx
 * <div className={`amount ${getNoTranslateClass()}`}>
 *   50,000 Ar
 * </div>
 * ```
 * 
 * @example
 * ```tsx
 * <span className={cn('currency-code', getNoTranslateClass())}>
 *   MGA
 * </span>
 * ```
 */
export const getNoTranslateClass = (): string => 'notranslate';

/**
 * Type guard to check if a value is a valid amount
 * 
 * @param value - Value to check
 * @returns True if value is a number or numeric string
 */
export const isAmount = (value: unknown): value is number | string => {
  if (typeof value === 'number') return true;
  if (typeof value === 'string') {
    // Check if string represents a number (allows decimals, commas, spaces)
    return /^-?\d+([.,]\d+)?([\s,]\d+)*$/.test(value.trim());
  }
  return false;
};

/**
 * Type guard to check if a value is a valid currency code
 * 
 * @param value - Value to check
 * @returns True if value is a 3-letter uppercase string
 */
export const isCurrencyCode = (value: unknown): value is string => {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
};

/**
 * Type guard to check if a value is a valid user name
 * 
 * @param value - Value to check
 * @returns True if value is a non-empty string
 */
export const isUserName = (value: unknown): value is string => {
  return typeof value === 'string' && value.trim().length > 0;
};

/**
 * Higher-order component that wraps a component with translation protection
 * 
 * Useful for protecting entire components that display financial data.
 * 
 * @param Component - React component to wrap
 * @returns Wrapped component with translation protection
 * 
 * @example
 * ```tsx
 * const ProtectedCurrencyDisplay = withNoTranslate(CurrencyDisplay);
 * ```
 */
export function withNoTranslate<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  const WrappedComponent: React.FC<P> = (props) => (
    <NoTranslate>
      <Component {...props} />
    </NoTranslate>
  );
  
  WrappedComponent.displayName = `withNoTranslate(${Component.displayName || Component.name || 'Component'})`;
  
  return WrappedComponent;
}

/**
 * Memoized version of NoTranslate component for performance optimization
 * 
 * Use this when wrapping frequently re-rendered content to prevent
 * unnecessary re-renders of the protection wrapper.
 * 
 * @example
 * ```tsx
 * <NoTranslateMemo>{expensiveCalculation()}</NoTranslateMemo>
 * ```
 */
export const NoTranslateMemo = React.memo(NoTranslate);

// Default export for convenience
export default {
  NoTranslate,
  NoTranslateMemo,
  protectAmount,
  protectCurrency,
  protectUserName,
  getNoTranslateAttrs,
  getNoTranslateClass,
  isAmount,
  isCurrencyCode,
  isUserName,
  withNoTranslate,
};
