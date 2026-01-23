# AGENT 1 - TRANSFER FLOW IDENTIFICATION REPORT
## Bug: EUR to EUR Transfer Amount Conversion Issue

**Date:** 2026-01-07  
**Version:** BazarKELY v2.4.4  
**Bug:** Transfers between EUR accounts show incorrect amount after validation - amount appears converted as if entered in MGA then divided by EUR rate

---

## 1. TRANSFER UI COMPONENT

**File Path:** `frontend/src/pages/TransferPage.tsx`  
**Component Name:** `TransferPage`  
**Amount Input Location:** Lines 517-539

### Amount Input Implementation:

```517:539:frontend/src/pages/TransferPage.tsx
          {/* Montant */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
              Montant à transférer *
            </label>
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  amount: value.toString()
                }));
              }}
              currency={displayCurrency}
              onCurrencyChange={() => {
                // Currency change is handled by the hook, no need to update formData
              }}
              placeholder="0"
              required
              className="text-lg font-semibold"
            />
          </div>
```

**Key Observations:**
- Uses `CurrencyInput` component with `displayCurrency` from `useCurrency()` hook (line 34)
- `formData.amount` stored as string in state (line 40)
- `onChange` callback stores value as string: `value.toString()` (line 528)
- `currency` prop uses `displayCurrency` (line 531) - may differ from actual account currency

---

## 2. FORM SUBMISSION HANDLER

**File Path:** `frontend/src/pages/TransferPage.tsx`  
**Function Name:** `handleSubmit`  
**Location:** Lines 203-403

### Form Submission Flow:

```203:229:frontend/src/pages/TransferPage.tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      console.error('❌ Utilisateur non connecté');
      return;
    }

    // Validation
    if (!formData.amount || !formData.description || !formData.fromAccountId || !formData.toAccountId) {
      console.error('❌ Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (formData.fromAccountId === formData.toAccountId) {
      const errorMessage = 'Le compte source et le compte destination doivent être différents';
      console.error('❌', errorMessage);
      setError(errorMessage);
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      setError('❌ Le montant doit être un nombre positif');
      return;
    }
```

**Critical Step - Amount Parsing:**
- Line 224: `const amount = parseFloat(formData.amount);`
- Amount is parsed directly from form string without currency conversion
- No conversion applied here - raw numeric value extracted

### Transfer Creation Call:

```332:343:frontend/src/pages/TransferPage.tsx
        console.log('📅 Transfer form date:', formData.date);
        
        // Créer le transfert avec la méthode dédiée
        await transactionService.createTransfer(user.id, {
          amount: amount,
          description: formData.description,
          fromAccountId: formData.fromAccountId,
          toAccountId: formData.toAccountId,
          notes: formData.notes,
          date: new Date(formData.date)
        });
```

**Key Observations:**
- Line 337: `amount: amount` - parsed numeric value passed directly
- No currency information passed to `createTransfer`
- Amount is raw numeric value from form input

---

## 3. TRANSFER SERVICE FUNCTION

**File Path:** `frontend/src/services/transactionService.ts`  
**Function Name:** `createTransfer`  
**Location:** Lines 652-774

### Function Signature:

```652:662:frontend/src/services/transactionService.ts
  async createTransfer(
    userId: string,
    transferData: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      description: string;
      notes?: string;
      date?: Date;
    }
  ): Promise<{ success: boolean; transactions?: Transaction[]; error?: string }> {
```

### Currency Conversion Logic:

```667:699:frontend/src/services/transactionService.ts
      // Get both accounts to check currencies
      const sourceAccount = await accountService.getAccount(transferData.fromAccountId, userId);
      const targetAccount = await accountService.getAccount(transferData.toAccountId, userId);

      if (!sourceAccount || !targetAccount) {
        console.error('❌ Compte source ou destination introuvable');
        return { success: false, error: 'Compte source ou destination introuvable' };
      }

      let targetAmount = transferData.amount;

      // Convert if currencies differ
      if (sourceAccount.currency !== targetAccount.currency) {
        try {
          const transferDate = transferData.date?.toISOString().split('T')[0];
          const rateInfo = await getExchangeRate(
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          targetAmount = await convertAmount(
            transferData.amount,
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          console.log(`💱 Transfer currency conversion: ${transferData.amount} ${sourceAccount.currency} = ${targetAmount} ${targetAccount.currency} (rate: ${rateInfo.rate})`);
        } catch (conversionError) {
          console.error('❌ Erreur lors de la conversion de devise pour le transfert:', conversionError);
          // En cas d'erreur, utiliser le montant original (dégradation gracieuse)
          // Note: Cela peut causer des problèmes si les devises sont différentes
        }
      }
```

**Key Observations:**
- Line 676: `targetAmount = transferData.amount` - initialized with original amount
- Line 679: Conversion ONLY if `sourceAccount.currency !== targetAccount.currency`
- **CRITICAL:** For EUR to EUR transfers, this condition is FALSE, so NO conversion should occur
- `targetAmount` remains equal to `transferData.amount` for same-currency transfers

### API Service Call:

```701:710:frontend/src/services/transactionService.ts
      // Appeler l'API de transfert avec les paramètres directs
      // Note: L'API backend doit gérer la conversion, mais on envoie aussi le montant converti
      const response = await apiService.createTransfer({
        fromAccountId: transferData.fromAccountId,
        toAccountId: transferData.toAccountId,
        amount: transferData.amount, // Montant original dans la devise source
        description: transferData.description,
        transferFee: 0,
        date: transferData.date
      });
```

**Key Observations:**
- Line 706: `amount: transferData.amount` - **ORIGINAL amount sent to API, NOT targetAmount**
- Comment says "Montant original dans la devise source"
- For EUR to EUR transfers, this should be correct (no conversion needed)

---

## 4. CURRENCY CONVERSION LOGIC

### 4.1 Exchange Rate Service

**File Path:** `frontend/src/services/exchangeRateService.ts`  
**Function:** `convertAmount`  
**Location:** Lines 246-291

```246:291:frontend/src/services/exchangeRateService.ts
export async function convertAmount(
  amount: number,
  fromCurrency: string = FROM_CURRENCY,
  toCurrency: string = TO_CURRENCY,
  date?: string
): Promise<number> {
  try {
    // Si les devises sont identiques, retourner le montant tel quel
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Récupérer le taux de change
    const exchangeRate = await getExchangeRate(fromCurrency, toCurrency, date);
    const rate = exchangeRate.rate;

    // Convertir le montant
    let convertedAmount: number;
    if (fromCurrency === 'EUR' && toCurrency === 'MGA') {
      // EUR vers MGA: multiplier
      convertedAmount = amount * rate;
    } else if (fromCurrency === 'MGA' && toCurrency === 'EUR') {
      // MGA vers EUR: diviser
      convertedAmount = amount / rate;
    } else {
      // Pour d'autres paires de devises, on pourrait implémenter une conversion via MGA
      // Pour l'instant, on retourne le montant tel quel
      console.warn(`Conversion ${fromCurrency} -> ${toCurrency} non supportée, retour du montant original`);
      return amount;
    }

    // Arrondir selon la devise cible
    if (toCurrency === 'MGA') {
      // MGA: pas de décimales
      return Math.round(convertedAmount);
    } else if (toCurrency === 'EUR') {
      // EUR: 2 décimales
      return Math.round(convertedAmount * 100) / 100;
    }

    return convertedAmount;
  } catch (error) {
    console.warn('Erreur lors de la conversion:', error);
    return amount;
  }
}
```

**Key Observations:**
- Line 254-256: If currencies are identical, returns amount unchanged
- Line 264-266: EUR → MGA: multiply by rate
- Line 267-269: MGA → EUR: divide by rate
- **For EUR → EUR:** Should return amount unchanged (line 255)

### 4.2 Currency Input Component

**File Path:** `frontend/src/components/Currency/CurrencyInput.tsx`  
**Function:** `handleCurrencyToggle`  
**Location:** Lines 96-103

```96:103:frontend/src/components/Currency/CurrencyInput.tsx
  const handleCurrencyToggle = (newCurrency: Currency) => {
    // Convert current value to new currency if needed
    const currentNumValue = parseNumber(displayValue);
    onCurrencyChange(newCurrency);
    // Keep the same numeric value, just change currency
    // The parent component can handle conversion if needed
    onChange(currentNumValue, newCurrency);
  };
```

**Key Observations:**
- Line 100: Comment says "Keep the same numeric value, just change currency"
- **NO CONVERSION** happens in CurrencyInput when currency toggle changes
- Parent component (TransferPage) should handle conversion, but doesn't (line 532-534)

### 4.3 Display Currency Hook

**File Path:** `frontend/src/hooks/useCurrency.ts`  
**Hook:** `useCurrency`  
**Location:** Lines 56-136

```56:70:frontend/src/hooks/useCurrency.ts
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
```

**Key Observations:**
- `displayCurrency` is a UI preference stored in localStorage
- Defaults to 'MGA' if not set
- **NOT necessarily aligned with actual account currencies**

---

## 5. AMOUNT FLOW: Step-by-Step from User Input to Database Persistence

### Step 1: User Input (TransferPage.tsx)
- **Location:** Lines 522-538
- User enters amount in `CurrencyInput` component
- `displayCurrency` from `useCurrency()` hook determines display format (EUR or MGA)
- Amount stored as string in `formData.amount` (line 528)

### Step 2: Form Submission (TransferPage.tsx)
- **Location:** Line 224
- `const amount = parseFloat(formData.amount);`
- Raw numeric value extracted from string
- **NO currency conversion applied here**

### Step 3: Transfer Service Call (TransferPage.tsx)
- **Location:** Lines 336-343
- `transactionService.createTransfer()` called with `amount: amount`
- **NO currency information passed** - only numeric value

### Step 4: Account Currency Check (transactionService.ts)
- **Location:** Lines 668-674
- Fetches `sourceAccount` and `targetAccount` from database
- Retrieves actual account currencies (`sourceAccount.currency`, `targetAccount.currency`)

### Step 5: Currency Conversion Decision (transactionService.ts)
- **Location:** Lines 676-699
- `targetAmount = transferData.amount` (initialized)
- **IF** `sourceAccount.currency !== targetAccount.currency`:
  - Calls `convertAmount()` to convert
  - Updates `targetAmount` with converted value
- **ELSE** (EUR to EUR case):
  - `targetAmount` remains equal to `transferData.amount`
  - **NO conversion should occur**

### Step 6: API Service Call (transactionService.ts)
- **Location:** Lines 703-710
- `apiService.createTransfer()` called with `amount: transferData.amount`
- **CRITICAL:** Uses ORIGINAL amount, NOT `targetAmount`
- Comment says "Montant original dans la devise source"

### Step 7: Supabase Transaction Creation (apiService.ts)
- **Location:** Lines 357-390
- Creates debit transaction: `amount: -amount` (line 362)
- Creates credit transaction: `amount: amount` (line 379)
- **Both use the same amount value** - no conversion applied here

### Step 8: Account Balance Update (transactionService.ts)
- **Location:** Lines 757-761
- Source account: `-Math.abs(transferData.amount)` (original amount)
- Destination account: `Math.abs(targetAmount)` (converted amount if currencies differ)
- **For EUR to EUR:** Both should use same amount

---

## 6. RELEVANT CODE SNIPPETS

### 6.1 Currency Input Usage in TransferPage

```522:538:frontend/src/pages/TransferPage.tsx
            <CurrencyInput
              id="amount"
              value={formData.amount}
              onChange={(value) => {
                setFormData(prev => ({
                  ...prev,
                  amount: value.toString()
                }));
              }}
              currency={displayCurrency}
              onCurrencyChange={() => {
                // Currency change is handled by the hook, no need to update formData
              }}
              placeholder="0"
              required
              className="text-lg font-semibold"
            />
```

**Issue Identified:**
- `currency={displayCurrency}` - uses UI preference, not account currency
- `onCurrencyChange` callback is empty - no conversion when currency toggle changes
- Amount stored as string without currency context

### 6.2 Amount Parsing in handleSubmit

```224:229:frontend/src/pages/TransferPage.tsx
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      console.error('❌ Le montant doit être un nombre positif');
      setError('❌ Le montant doit être un nombre positif');
      return;
    }
```

**Issue Identified:**
- Direct parsing without currency validation
- No check if `displayCurrency` matches account currencies

### 6.3 Currency Conversion Logic in createTransfer

```676:699:frontend/src/services/transactionService.ts
      let targetAmount = transferData.amount;

      // Convert if currencies differ
      if (sourceAccount.currency !== targetAccount.currency) {
        try {
          const transferDate = transferData.date?.toISOString().split('T')[0];
          const rateInfo = await getExchangeRate(
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          targetAmount = await convertAmount(
            transferData.amount,
            sourceAccount.currency || 'MGA',
            targetAccount.currency || 'MGA',
            transferDate
          );
          console.log(`💱 Transfer currency conversion: ${transferData.amount} ${sourceAccount.currency} = ${targetAmount} ${targetAccount.currency} (rate: ${rateInfo.rate})`);
        } catch (conversionError) {
          console.error('❌ Erreur lors de la conversion de devise pour le transfert:', conversionError);
          // En cas d'erreur, utiliser le montant original (dégradation gracieuse)
          // Note: Cela peut causer des problèmes si les devises sont différentes
        }
      }
```

**Issue Identified:**
- Conversion only happens if currencies differ
- For EUR to EUR: `targetAmount = transferData.amount` (no change)
- **BUT:** `transferData.amount` might be in wrong currency if `displayCurrency` ≠ account currency

### 6.4 API Service Transfer Creation

```357:390:frontend/src/services/apiService.ts
      // Créer les deux transactions (débit et crédit)
      const { data: fromTransaction, error: fromError } = await db.transactions()
        .insert({
          user_id: userId,
          account_id: fromAccountId,
          amount: -amount, // Débit
          type: 'transfer',
          category: 'Transfert sortant',
          description: description || `Transfert vers ${toAccountId}`,
          target_account_id: toAccountId,
          transfer_fee: transferFee,
          date: transferDate.toISOString().split('T')[0] // Format YYYY-MM-DD for Supabase
        })
        .select()
        .single();

      if (fromError) throw fromError;

      const { data: toTransaction, error: toError } = await db.transactions()
        .insert({
          user_id: userId,
          account_id: toAccountId,
          amount: amount, // Crédit
          type: 'transfer',
          category: 'Transfert entrant',
          description: description || `Transfert depuis ${fromAccountId}`,
          target_account_id: fromAccountId,
          transfer_fee: 0,
          date: transferDate.toISOString().split('T')[0] // Same date for both transactions
        })
        .select()
        .single();
```

**Issue Identified:**
- Both transactions use same `amount` value
- No currency conversion applied in API service
- Assumes amount is already in correct currency

---

## 7. ROOT CAUSE ANALYSIS

### Problem Hypothesis:

**The issue occurs when `displayCurrency` (UI preference) differs from actual account currencies:**

1. User sets `displayCurrency = EUR` in UI preferences
2. User has two EUR accounts
3. User enters amount (e.g., 100) in CurrencyInput with EUR display
4. Amount stored as `"100"` in `formData.amount`
5. On submit: `amount = 100` (parsed)
6. `createTransfer()` receives `amount: 100`
7. Checks: `sourceAccount.currency === targetAccount.currency` (both EUR)
8. **NO conversion** because currencies match
9. BUT: If amount was interpreted as MGA somewhere, it might get converted incorrectly

### Alternative Hypothesis:

**The issue might be in account balance update logic:**

1. Transfer created correctly with amount 100 EUR
2. Account balance update might convert incorrectly
3. Line 758: `updateAccountBalanceAfterTransaction(transferData.fromAccountId, -Math.abs(transferData.amount), userId)`
4. Line 761: `updateAccountBalanceAfterTransaction(transferData.toAccountId, Math.abs(targetAmount), userId)`
5. If `updateAccountBalanceAfterTransaction` has currency conversion logic, it might convert incorrectly

### Most Likely Root Cause:

**Missing currency context in amount flow:**

- `CurrencyInput` uses `displayCurrency` (UI preference)
- Amount stored without currency information
- `createTransfer()` receives numeric value only
- No validation that `displayCurrency` matches account currencies
- If user enters amount thinking it's in EUR (displayCurrency), but system interprets as MGA, conversion might occur incorrectly

---

## 8. FILES AND LINE NUMBERS SUMMARY

| Component | File Path | Key Lines | Purpose |
|-----------|-----------|-----------|---------|
| TransferPage Component | `frontend/src/pages/TransferPage.tsx` | 30-403 | Main transfer UI and form handling |
| Amount Input | `frontend/src/pages/TransferPage.tsx` | 517-539 | CurrencyInput component usage |
| Form Submit Handler | `frontend/src/pages/TransferPage.tsx` | 203-403 | handleSubmit function |
| Amount Parsing | `frontend/src/pages/TransferPage.tsx` | 224 | parseFloat(formData.amount) |
| Transfer Service | `frontend/src/services/transactionService.ts` | 652-774 | createTransfer function |
| Currency Conversion | `frontend/src/services/transactionService.ts` | 676-699 | Currency conversion logic |
| API Service | `frontend/src/services/apiService.ts` | 337-399 | createTransfer API call |
| Exchange Rate Service | `frontend/src/services/exchangeRateService.ts` | 246-291 | convertAmount function |
| Currency Input Component | `frontend/src/components/Currency/CurrencyInput.tsx` | 22-144 | CurrencyInput implementation |
| Currency Hook | `frontend/src/hooks/useCurrency.ts` | 56-136 | useCurrency hook |

---

## 9. CRITICAL FINDINGS

### Finding 1: Currency Context Missing
- Amount stored as string/number without currency information
- `displayCurrency` (UI preference) may differ from account currencies
- No validation that entered amount currency matches account currencies

### Finding 2: Conversion Logic Only for Different Currencies
- Conversion ONLY happens if `sourceAccount.currency !== targetAccount.currency`
- For EUR to EUR transfers, NO conversion should occur
- But if amount was misinterpreted, it might get converted incorrectly elsewhere

### Finding 3: API Service Uses Original Amount
- `apiService.createTransfer()` receives `transferData.amount` (original)
- NOT `targetAmount` (which might be converted)
- Comment says "Montant original dans la devise source"
- For same-currency transfers, this should be correct

### Finding 4: CurrencyInput Doesn't Convert on Toggle
- `handleCurrencyToggle` keeps same numeric value
- Comment says "Keep the same numeric value, just change currency"
- Parent component should handle conversion but doesn't

---

## 10. RECOMMENDATIONS FOR FURTHER INVESTIGATION

1. **Check `updateAccountBalanceAfterTransaction` function:**
   - Verify if it has currency conversion logic
   - Check if it incorrectly converts EUR amounts

2. **Verify account currency retrieval:**
   - Confirm `sourceAccount.currency` and `targetAccount.currency` are correctly retrieved
   - Check if currency values are 'EUR' or 'eur' (case sensitivity)

3. **Check if amount is converted elsewhere:**
   - Search for other places where transfer amount might be converted
   - Verify transaction display logic doesn't convert amounts

4. **Test with console logs:**
   - Add logging at each step to track amount value and currency
   - Verify conversion logic execution path

---

**AGENT-1-TRANSFER-FLOW-COMPLETE**
