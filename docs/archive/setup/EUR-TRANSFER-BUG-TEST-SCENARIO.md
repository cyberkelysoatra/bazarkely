# Scénario de Test - Bug de Transfert EUR → EUR

**Version:** BazarKELY v2.4.4  
**Date:** 2025-01-19  
**Agent:** Agent 6 - Test Scenario Creation  
**Type:** Bug Reproduction Test

---

## 📋 RÉSUMÉ DU BUG

**Description:** Lors d'un transfert entre deux comptes EUR, le montant affiché après validation est incorrect. Le montant semble être traité comme MGA et divisé par le taux de change EUR, ce qui donne un montant beaucoup plus petit que prévu.

**Exemple:** Transfert de 100 EUR → affiche ~0.02 EUR (100 / 4950 ≈ 0.02)

**Sévérité:** 🔴 CRITIQUE - Impact direct sur la fonctionnalité de transfert multi-devises

---

## 1. TEST DATA SETUP

### 1.1 Comptes de Test

Créer deux comptes EUR avec des soldes connus :

```javascript
// Compte Source EUR
{
  id: 'test-eur-source-001',
  name: 'Compte EUR Source',
  type: 'epargne',
  currency: 'EUR',
  balance: 1000.00, // 1000 EUR
  userId: 'test-user-id',
  isDefault: false
}

// Compte Destination EUR
{
  id: 'test-eur-dest-001',
  name: 'Compte EUR Destination',
  type: 'epargne',
  currency: 'EUR',
  balance: 500.00, // 500 EUR
  userId: 'test-user-id',
  isDefault: false
}
```

### 1.2 Taux de Change

Configurer un taux de change EUR/MGA connu et stable :

```javascript
// Taux de change EUR → MGA
{
  fromCurrency: 'EUR',
  toCurrency: 'MGA',
  rate: 4950.00, // 1 EUR = 4950 MGA
  date: '2025-01-19',
  source: 'manual_test'
}
```

### 1.3 Données de Transfert

```javascript
const transferData = {
  fromAccountId: 'test-eur-source-001',
  toAccountId: 'test-eur-dest-001',
  amount: 100.00, // 100 EUR
  description: 'Test transfert EUR → EUR',
  date: new Date('2025-01-19')
};
```

### 1.4 État Initial Attendu

**Avant le transfert:**
- Compte Source: 1000.00 EUR
- Compte Destination: 500.00 EUR
- Total: 1500.00 EUR

**Après le transfert (comportement attendu):**
- Compte Source: 900.00 EUR (1000 - 100)
- Compte Destination: 600.00 EUR (500 + 100)
- Total: 1500.00 EUR (inchangé)

---

## 2. REPRODUCTION STEPS

### Étape 1: Préparation de l'environnement

1. Ouvrir l'application BazarKELY dans le navigateur
2. Se connecter avec un compte de test (`test-user-id`)
3. Ouvrir la console développeur (F12)
4. Vérifier que les comptes EUR existent :

```javascript
// Console command
const accounts = await db.accounts.toArray();
console.log('Comptes EUR:', accounts.filter(a => a.currency === 'EUR'));
```

### Étape 2: Vérification du taux de change

```javascript
// Console command
const { getExchangeRate } = await import('./src/services/exchangeRateService.ts');
const rate = await getExchangeRate('EUR', 'MGA', '2025-01-19');
console.log('Taux EUR/MGA:', rate);
// Attendu: { rate: 4950.00, ... }
```

### Étape 3: Navigation vers la page Transfert

1. Cliquer sur "Transferts" dans le menu de navigation
2. Vérifier que l'URL est `/transfer`
3. Vérifier que le formulaire de transfert est visible

### Étape 4: Sélection des comptes

1. **Compte source:** Sélectionner "Compte EUR Source" dans le dropdown
   - Vérifier que le solde affiché est 1000.00 EUR
2. **Compte destination:** Sélectionner "Compte EUR Destination" dans le dropdown
   - Vérifier que le solde affiché est 500.00 EUR

### Étape 5: Saisie du montant

1. Cliquer dans le champ "Montant"
2. Saisir `100`
3. Vérifier que le champ affiche `100` (ou `100,00` selon le formatage)
4. Vérifier que la devise affichée est EUR (bouton toggle à droite du champ)

**Checkpoint 1 - Montant avant soumission:**
```javascript
// Dans la console, vérifier formData
// Attendu: formData.amount = "100"
// Attendu: displayCurrency = "EUR"
```

### Étape 6: Remplir la description

1. Saisir "Test transfert EUR → EUR" dans le champ Description

### Étape 7: Soumettre le formulaire

1. Cliquer sur le bouton "Enregistrer le transfert"
2. Observer les logs dans la console

**Checkpoint 2 - Montant au moment de la soumission:**
```javascript
// Logs attendus dans console:
// "💸 TRANSFER START - fromAccountId: ..., toAccountId: ..., amount: 100"
```

### Étape 8: Observer le résultat

1. Attendre la confirmation de succès
2. Vérifier les soldes des comptes après le transfert
3. Vérifier les transactions créées

---

## 3. EXPECTED BEHAVIOR (Comportement Attendu)

### 3.1 Flux de Données Attendu

```
1. User Input: 100 EUR
   ↓
2. TransferPage.handleSubmit: amount = 100 (number)
   ↓
3. transactionService.createTransfer: transferData.amount = 100
   ↓
4. Currency Check: sourceAccount.currency === targetAccount.currency === 'EUR'
   ↓
5. NO CONVERSION (currencies match)
   ↓
6. apiService.createTransfer: amount = 100
   ↓
7. Supabase Insert:
   - Debit transaction: amount = -100
   - Credit transaction: amount = 100
   ↓
8. Account Balance Update:
   - Source: balance = 1000 - 100 = 900 EUR
   - Destination: balance = 500 + 100 = 600 EUR
```

### 3.2 Valeurs Attendues à Chaque Étape

| Étape | Variable | Valeur Attendue | Devise |
|-------|----------|-----------------|--------|
| Form Input | `formData.amount` | `"100"` | EUR |
| Parse | `parseFloat(formData.amount)` | `100` | EUR |
| createTransfer | `transferData.amount` | `100` | EUR |
| Currency Check | `sourceAccount.currency` | `"EUR"` | - |
| Currency Check | `targetAccount.currency` | `"EUR"` | - |
| Conversion | `targetAmount` | `100` (pas de conversion) | EUR |
| API Call | `amount` | `100` | EUR |
| Supabase Debit | `amount` | `-100` | EUR |
| Supabase Credit | `amount` | `100` | EUR |
| Source Balance | `balance` | `900` | EUR |
| Dest Balance | `balance` | `600` | EUR |

---

## 4. ACTUAL BUGGY BEHAVIOR (Comportement Bugué)

### 4.1 Symptômes Observés

**Après validation du transfert:**
- Le montant affiché dans les transactions est incorrect (~0.02 EUR au lieu de 100 EUR)
- Les soldes des comptes ne sont pas mis à jour correctement
- Le montant semble avoir été divisé par le taux de change (100 / 4950 ≈ 0.02)

### 4.2 Hypothèses sur la Cause

**Hypothèse 1:** Le montant est converti de EUR vers MGA, puis reconverti en EUR
```
100 EUR → 495000 MGA → 495000 / 4950 = 100 EUR (correct)
Mais si: 100 EUR → traité comme 100 MGA → 100 / 4950 = 0.02 EUR (BUG)
```

**Hypothèse 2:** Le montant est divisé par le taux de change quelque part dans le flux
```
100 EUR → 100 / 4950 = 0.02 EUR (BUG)
```

**Hypothèse 3:** Le montant est stocké en MGA mais affiché comme EUR
```
100 EUR → stocké comme 100 MGA → affiché comme 100 MGA / 4950 = 0.02 EUR (BUG)
```

### 4.3 Valeurs Bugées Observées

| Étape | Variable | Valeur Bugée | Valeur Attendue |
|-------|----------|--------------|-----------------|
| Supabase Debit | `amount` | `-0.02` | `-100` |
| Supabase Credit | `amount` | `0.02` | `100` |
| Source Balance | `balance` | `999.98` | `900` |
| Dest Balance | `balance` | `500.02` | `600` |

---

## 5. DEBUGGING CHECKPOINTS

### 5.1 Checkpoint 1: TransferPage - handleSubmit

**Fichier:** `frontend/src/pages/TransferPage.tsx`  
**Ligne:** ~224

```typescript
// Ajouter après ligne 224
const amount = parseFloat(formData.amount);
console.log('🔍 [DEBUG CHECKPOINT 1] TransferPage.handleSubmit:', {
  formDataAmount: formData.amount,
  parsedAmount: amount,
  displayCurrency: displayCurrency,
  fromAccount: accounts.find(acc => acc.id === formData.fromAccountId),
  toAccount: accounts.find(acc => acc.id === formData.toAccountId)
});
```

**Assertions:**
- `formData.amount` === `"100"`
- `amount` === `100`
- `displayCurrency` === `"EUR"`

### 5.2 Checkpoint 2: transactionService - createTransfer Entry

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~664

```typescript
// Déjà présent à la ligne 664, vérifier les logs
console.log('💸 TRANSFER START - fromAccountId:', transferData.fromAccountId, 'toAccountId:', transferData.toAccountId, 'amount:', transferData.amount);
```

**Assertions:**
- `transferData.amount` === `100`
- `transferData.fromAccountId` === `'test-eur-source-001'`
- `transferData.toAccountId` === `'test-eur-dest-001'`

### 5.3 Checkpoint 3: Currency Check

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~668-676

```typescript
// Ajouter après ligne 676
console.log('🔍 [DEBUG CHECKPOINT 3] Currency Check:', {
  sourceCurrency: sourceAccount.currency,
  targetCurrency: targetAccount.currency,
  currenciesMatch: sourceAccount.currency === targetAccount.currency,
  originalAmount: transferData.amount,
  targetAmount: targetAmount
});
```

**Assertions:**
- `sourceAccount.currency` === `"EUR"`
- `targetAccount.currency` === `"EUR"`
- `currenciesMatch` === `true`
- `targetAmount` === `100` (pas de conversion)

### 5.4 Checkpoint 4: API Service Call

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~703

```typescript
// Ajouter avant ligne 703
console.log('🔍 [DEBUG CHECKPOINT 4] Before API Call:', {
  amountToAPI: transferData.amount,
  targetAmount: targetAmount,
  fromAccountId: transferData.fromAccountId,
  toAccountId: transferData.toAccountId
});
```

**Assertions:**
- `amountToAPI` === `100`
- `targetAmount` === `100`

### 5.5 Checkpoint 5: API Service - createTransfer Entry

**Fichier:** `frontend/src/services/apiService.ts`  
**Ligne:** ~351

```typescript
// Ajouter après ligne 351
console.log('🔍 [DEBUG CHECKPOINT 5] apiService.createTransfer:', {
  receivedAmount: amount,
  fromAccountId: fromAccountId,
  toAccountId: toAccountId,
  transferDate: transferDate.toISOString().split('T')[0]
});
```

**Assertions:**
- `receivedAmount` === `100`

### 5.6 Checkpoint 6: Supabase Insert - Debit Transaction

**Fichier:** `frontend/src/services/apiService.ts`  
**Ligne:** ~358-371

```typescript
// Ajouter après ligne 371
console.log('🔍 [DEBUG CHECKPOINT 6] Supabase Debit Transaction:', {
  insertedAmount: fromTransaction.amount,
  expectedAmount: -amount,
  transactionId: fromTransaction.id
});
```

**Assertions:**
- `fromTransaction.amount` === `-100`
- `expectedAmount` === `-100`

### 5.7 Checkpoint 7: Supabase Insert - Credit Transaction

**Fichier:** `frontend/src/services/apiService.ts`  
**Ligne:** ~375-390

```typescript
// Ajouter après ligne 390
console.log('🔍 [DEBUG CHECKPOINT 7] Supabase Credit Transaction:', {
  insertedAmount: toTransaction.amount,
  expectedAmount: amount,
  transactionId: toTransaction.id
});
```

**Assertions:**
- `toTransaction.amount` === `100`
- `expectedAmount` === `100`

### 5.8 Checkpoint 8: Account Balance Update - Source

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~757-758

```typescript
// Déjà présent, vérifier les logs
console.log('🔍 Updating source account:', transferData.fromAccountId, 'with amount:', -Math.abs(transferData.amount));
```

**Assertions:**
- `-Math.abs(transferData.amount)` === `-100`

### 5.9 Checkpoint 9: Account Balance Update - Destination

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~760-761

```typescript
// Déjà présent, vérifier les logs
console.log('🔍 Updating destination account:', transferData.toAccountId, 'with amount:', Math.abs(targetAmount));
```

**Assertions:**
- `Math.abs(targetAmount)` === `100`

### 5.10 Checkpoint 10: Final Account Balances

**Fichier:** `frontend/src/services/transactionService.ts`  
**Ligne:** ~763 (après updateAccountBalanceAfterTransaction)

```typescript
// Ajouter après ligne 763
const finalSourceAccount = await accountService.getAccount(transferData.fromAccountId, userId);
const finalDestAccount = await accountService.getAccount(transferData.toAccountId, userId);
console.log('🔍 [DEBUG CHECKPOINT 10] Final Account Balances:', {
  sourceBalance: finalSourceAccount?.balance,
  expectedSourceBalance: 900,
  destBalance: finalDestAccount?.balance,
  expectedDestBalance: 600
});
```

**Assertions:**
- `finalSourceAccount.balance` === `900`
- `finalDestAccount.balance` === `600`

---

## 6. TEST ASSERTIONS

### 6.1 Assertions par Checkpoint

| Checkpoint | Variable | Assertion | Type |
|------------|----------|-----------|------|
| 1 | `formData.amount` | `=== "100"` | String |
| 1 | `amount` | `=== 100` | Number |
| 1 | `displayCurrency` | `=== "EUR"` | String |
| 2 | `transferData.amount` | `=== 100` | Number |
| 3 | `sourceAccount.currency` | `=== "EUR"` | String |
| 3 | `targetAccount.currency` | `=== "EUR"` | String |
| 3 | `targetAmount` | `=== 100` | Number |
| 4 | `amountToAPI` | `=== 100` | Number |
| 5 | `receivedAmount` | `=== 100` | Number |
| 6 | `fromTransaction.amount` | `=== -100` | Number |
| 7 | `toTransaction.amount` | `=== 100` | Number |
| 8 | `updateAmount (source)` | `=== -100` | Number |
| 9 | `updateAmount (dest)` | `=== 100` | Number |
| 10 | `finalSourceAccount.balance` | `=== 900` | Number |
| 10 | `finalDestAccount.balance` | `=== 600` | Number |

### 6.2 Assertions Globales

```javascript
// Toutes ces assertions doivent être vraies
assert(formData.amount === "100", "Form amount should be 100");
assert(parseFloat(formData.amount) === 100, "Parsed amount should be 100");
assert(sourceAccount.currency === "EUR", "Source account should be EUR");
assert(targetAccount.currency === "EUR", "Target account should be EUR");
assert(targetAmount === 100, "Target amount should be 100 (no conversion)");
assert(fromTransaction.amount === -100, "Debit transaction should be -100");
assert(toTransaction.amount === 100, "Credit transaction should be 100");
assert(finalSourceAccount.balance === 900, "Source balance should be 900");
assert(finalDestAccount.balance === 600, "Dest balance should be 600");
```

---

## 7. MANUAL TEST SCRIPT

### 7.1 Console Commands - Setup

```javascript
// 1. Vérifier les comptes EUR
const accounts = await db.accounts.toArray();
const eurAccounts = accounts.filter(a => a.currency === 'EUR');
console.log('Comptes EUR:', eurAccounts.map(a => ({
  id: a.id,
  name: a.name,
  currency: a.currency,
  balance: a.balance
})));

// 2. Vérifier le taux de change
const { getExchangeRate } = await import('./src/services/exchangeRateService.ts');
const rate = await getExchangeRate('EUR', 'MGA', '2025-01-19');
console.log('Taux EUR/MGA:', rate);

// 3. Créer les comptes de test si nécessaire
const accountService = await import('./src/services/accountService.ts').then(m => m.default);
const userId = 'test-user-id'; // Remplacer par votre userId

// Compte source
const sourceAccount = await accountService.createAccount(userId, {
  name: 'Compte EUR Source',
  type: 'epargne',
  currency: 'EUR',
  balance: 1000.00,
  isDefault: false
});
console.log('Compte source créé:', sourceAccount);

// Compte destination
const destAccount = await accountService.createAccount(userId, {
  name: 'Compte EUR Destination',
  type: 'epargne',
  currency: 'EUR',
  balance: 500.00,
  isDefault: false
});
console.log('Compte destination créé:', destAccount);
```

### 7.2 Console Commands - Monitoring

```javascript
// Ajouter ces logs temporaires dans le code avant de tester

// Dans TransferPage.tsx ligne ~224
const amount = parseFloat(formData.amount);
console.log('🔍 [MANUAL TEST] TransferPage - Amount:', {
  formDataAmount: formData.amount,
  parsedAmount: amount,
  displayCurrency: displayCurrency
});

// Dans transactionService.ts ligne ~676 (après targetAmount)
console.log('🔍 [MANUAL TEST] Currency Check:', {
  sourceCurrency: sourceAccount.currency,
  targetCurrency: targetAccount.currency,
  originalAmount: transferData.amount,
  targetAmount: targetAmount
});

// Dans apiService.ts ligne ~351 (après const amount)
console.log('🔍 [MANUAL TEST] API Service - Amount received:', amount);

// Dans apiService.ts ligne ~371 (après fromTransaction)
console.log('🔍 [MANUAL TEST] Supabase Debit:', {
  amount: fromTransaction.amount,
  expected: -amount
});

// Dans apiService.ts ligne ~390 (après toTransaction)
console.log('🔍 [MANUAL TEST] Supabase Credit:', {
  amount: toTransaction.amount,
  expected: amount
});
```

### 7.3 Console Commands - Verification

```javascript
// Après le transfert, vérifier les résultats

// 1. Vérifier les transactions créées
const transactions = await db.transactions
  .where('accountId')
  .anyOf([sourceAccount.id, destAccount.id])
  .and(t => t.type === 'transfer')
  .sortBy('createdAt');
const latestTransfer = transactions.slice(-2);
console.log('Dernières transactions de transfert:', latestTransfer.map(t => ({
  id: t.id,
  accountId: t.accountId,
  amount: t.amount,
  type: t.type,
  description: t.description
})));

// 2. Vérifier les soldes finaux
const finalSource = await accountService.getAccount(sourceAccount.id, userId);
const finalDest = await accountService.getAccount(destAccount.id, userId);
console.log('Soldes finaux:', {
  source: {
    id: finalSource.id,
    name: finalSource.name,
    balance: finalSource.balance,
    expected: 900
  },
  dest: {
    id: finalDest.id,
    name: finalDest.name,
    balance: finalDest.balance,
    expected: 600
  }
});

// 3. Calculer les différences
const sourceDiff = finalSource.balance - 1000;
const destDiff = finalDest.balance - 500;
console.log('Différences:', {
  sourceDiff: sourceDiff,
  expectedSourceDiff: -100,
  destDiff: destDiff,
  expectedDestDiff: 100,
  sourceCorrect: sourceDiff === -100,
  destCorrect: destDiff === 100
});
```

---

## 8. AUTOMATED TEST TEMPLATE

### 8.1 Jest Test File Structure

**File:** `frontend/src/services/__tests__/transferEURBug.test.ts`

```typescript
/**
 * Test: EUR to EUR Transfer Bug Reproduction
 * 
 * This test reproduces the bug where EUR transfers between EUR accounts
 * show incorrect amounts after validation.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import transactionService from '../transactionService';
import accountService from '../accountService';
import { db } from '../../lib/database';

describe('EUR Transfer Bug Reproduction', () => {
  const userId = 'test-user-eur-transfer';
  let sourceAccountId: string;
  let destAccountId: string;
  const testAmount = 100.00;
  const eurRate = 4950.00; // 1 EUR = 4950 MGA

  beforeEach(async () => {
    // Cleanup previous test data
    await db.accounts.where('userId').equals(userId).delete();
    await db.transactions.where('userId').equals(userId).delete();

    // Create source EUR account
    const sourceAccount = await accountService.createAccount(userId, {
      name: 'Test EUR Source',
      type: 'epargne',
      currency: 'EUR',
      balance: 1000.00,
      isDefault: false
    });
    sourceAccountId = sourceAccount.id;

    // Create destination EUR account
    const destAccount = await accountService.createAccount(userId, {
      name: 'Test EUR Destination',
      type: 'epargne',
      currency: 'EUR',
      balance: 500.00,
      isDefault: false
    });
    destAccountId = destAccount.id;
  });

  afterEach(async () => {
    // Cleanup
    await db.accounts.where('userId').equals(userId).delete();
    await db.transactions.where('userId').equals(userId).delete();
  });

  it('should transfer 100 EUR between EUR accounts without conversion', async () => {
    // Step 1: Get initial balances
    const initialSource = await accountService.getAccount(sourceAccountId, userId);
    const initialDest = await accountService.getAccount(destAccountId, userId);
    
    expect(initialSource?.balance).toBe(1000.00);
    expect(initialDest?.balance).toBe(500.00);

    // Step 2: Create transfer
    const result = await transactionService.createTransfer(userId, {
      fromAccountId: sourceAccountId,
      toAccountId: destAccountId,
      amount: testAmount,
      description: 'Test EUR to EUR transfer',
      date: new Date('2025-01-19')
    });

    // Step 3: Assert transfer success
    expect(result.success).toBe(true);
    expect(result.transactions).toBeDefined();
    expect(result.transactions?.length).toBe(2);

    // Step 4: Assert transaction amounts
    const [debitTransaction, creditTransaction] = result.transactions!;
    
    // Debit should be negative
    expect(debitTransaction.amount).toBe(-testAmount);
    
    // Credit should be positive
    expect(creditTransaction.amount).toBe(testAmount);

    // Step 5: Assert final balances
    const finalSource = await accountService.getAccount(sourceAccountId, userId);
    const finalDest = await accountService.getAccount(destAccountId, userId);
    
    expect(finalSource?.balance).toBe(900.00); // 1000 - 100
    expect(finalDest?.balance).toBe(600.00);   // 500 + 100

    // Step 6: Assert no currency conversion occurred
    // Both transactions should have same absolute amount
    expect(Math.abs(debitTransaction.amount)).toBe(Math.abs(creditTransaction.amount));
    expect(Math.abs(debitTransaction.amount)).toBe(testAmount);
  });

  it('should NOT divide amount by exchange rate for EUR to EUR transfers', async () => {
    // This test specifically checks that the bug does NOT occur
    const result = await transactionService.createTransfer(userId, {
      fromAccountId: sourceAccountId,
      toAccountId: destAccountId,
      amount: testAmount,
      description: 'Test EUR to EUR transfer - no conversion',
      date: new Date('2025-01-19')
    });

    const [debitTransaction, creditTransaction] = result.transactions!;
    
    // BUG CHECK: Amount should NOT be divided by exchange rate
    const buggyAmount = testAmount / eurRate; // ~0.02
    expect(debitTransaction.amount).not.toBe(-buggyAmount);
    expect(creditTransaction.amount).not.toBe(buggyAmount);
    
    // CORRECT: Amount should remain 100
    expect(debitTransaction.amount).toBe(-testAmount);
    expect(creditTransaction.amount).toBe(testAmount);
  });

  it('should preserve amount through entire transfer flow', async () => {
    // This test traces the amount through the entire flow
    const transferAmount = 100.00;
    
    // Mock console.log to capture values
    const logValues: any[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      if (args[0]?.includes?.('TRANSFER') || args[0]?.includes?.('CHECKPOINT')) {
        logValues.push(args);
      }
      originalLog(...args);
    };

    await transactionService.createTransfer(userId, {
      fromAccountId: sourceAccountId,
      toAccountId: destAccountId,
      amount: transferAmount,
      description: 'Test amount preservation',
      date: new Date('2025-01-19')
    });

    // Restore console.log
    console.log = originalLog;

    // Verify amount was preserved (check logs if available)
    // This is a smoke test - actual verification is in the transaction amounts
    const finalSource = await accountService.getAccount(sourceAccountId, userId);
    expect(finalSource?.balance).toBe(1000.00 - transferAmount);
  });
});
```

### 8.2 React Testing Library Test Template

**File:** `frontend/src/pages/__tests__/TransferPageEUR.test.tsx`

```typescript
/**
 * Integration Test: TransferPage EUR to EUR Transfer
 * 
 * Tests the full UI flow for EUR to EUR transfers
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import TransferPage from '../TransferPage';
import { useAppStore } from '../../stores/appStore';
import accountService from '../../services/accountService';
import transactionService from '../../services/transactionService';

// Mock services
jest.mock('../../services/accountService');
jest.mock('../../services/transactionService');

describe('TransferPage - EUR to EUR Transfer', () => {
  const mockUser = {
    id: 'test-user',
    email: 'test@example.com',
    username: 'testuser'
  };

  const mockSourceAccount = {
    id: 'eur-source-001',
    name: 'Compte EUR Source',
    currency: 'EUR',
    balance: 1000.00,
    type: 'epargne',
    userId: mockUser.id
  };

  const mockDestAccount = {
    id: 'eur-dest-001',
    name: 'Compte EUR Destination',
    currency: 'EUR',
    balance: 500.00,
    type: 'epargne',
    userId: mockUser.id
  };

  beforeEach(() => {
    // Setup store
    useAppStore.setState({ user: mockUser });

    // Mock accountService
    (accountService.getAccounts as jest.Mock).mockResolvedValue([
      mockSourceAccount,
      mockDestAccount
    ]);

    // Mock transactionService
    (transactionService.createTransfer as jest.Mock).mockResolvedValue({
      success: true,
      transactions: [
        { id: 't1', amount: -100, accountId: mockSourceAccount.id },
        { id: 't2', amount: 100, accountId: mockDestAccount.id }
      ]
    });
  });

  it('should display correct amount in EUR input field', async () => {
    render(
      <BrowserRouter>
        <TransferPage />
      </BrowserRouter>
    );

    // Wait for accounts to load
    await waitFor(() => {
      expect(screen.getByText('Compte EUR Source')).toBeInTheDocument();
    });

    // Select source account
    const sourceSelect = screen.getByLabelText(/compte source/i);
    fireEvent.change(sourceSelect, { target: { value: mockSourceAccount.id } });

    // Select destination account
    const destSelect = screen.getByLabelText(/compte destination/i);
    fireEvent.change(destSelect, { target: { value: mockDestAccount.id } });

    // Enter amount
    const amountInput = screen.getByLabelText(/montant/i);
    fireEvent.change(amountInput, { target: { value: '100' } });

    // Verify amount is displayed correctly
    expect(amountInput).toHaveValue('100');
  });

  it('should call createTransfer with correct amount (100 EUR)', async () => {
    render(
      <BrowserRouter>
        <TransferPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Compte EUR Source')).toBeInTheDocument();
    });

    // Fill form
    fireEvent.change(screen.getByLabelText(/compte source/i), {
      target: { value: mockSourceAccount.id }
    });
    fireEvent.change(screen.getByLabelText(/compte destination/i), {
      target: { value: mockDestAccount.id }
    });
    fireEvent.change(screen.getByLabelText(/montant/i), {
      target: { value: '100' }
    });
    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: 'Test transfer' }
    });

    // Submit form
    const submitButton = screen.getByRole('button', { name: /enregistrer/i });
    fireEvent.click(submitButton);

    // Verify createTransfer was called with correct amount
    await waitFor(() => {
      expect(transactionService.createTransfer).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          amount: 100,
          fromAccountId: mockSourceAccount.id,
          toAccountId: mockDestAccount.id
        })
      );
    });
  });
});
```

---

## 9. TEST EXECUTION CHECKLIST

### 9.1 Pre-Test Setup

- [ ] Environnement de test configuré
- [ ] Comptes EUR créés avec soldes connus
- [ ] Taux de change EUR/MGA configuré (4950)
- [ ] Console développeur ouverte
- [ ] Logs de débogage ajoutés aux checkpoints

### 9.2 Test Execution

- [ ] Navigation vers `/transfer` réussie
- [ ] Comptes EUR visibles dans les dropdowns
- [ ] Montant 100 saisi correctement
- [ ] Devise EUR sélectionnée
- [ ] Formulaire soumis
- [ ] Tous les checkpoints loggés

### 9.3 Post-Test Verification

- [ ] Transactions créées dans Supabase
- [ ] Montants des transactions vérifiés
- [ ] Soldes des comptes vérifiés
- [ ] Logs analysés pour identifier le point de défaillance

### 9.4 Bug Confirmation

- [ ] Bug reproduit avec succès
- [ ] Point de défaillance identifié
- [ ] Valeurs bugées documentées
- [ ] Hypothèse sur la cause formulée

---

## 10. EXPECTED TEST RESULTS

### 10.1 Si le Bug N'Existe Pas (Comportement Correct)

```
✅ Tous les checkpoints passent
✅ Montant reste 100 EUR tout au long du flux
✅ Transactions créées avec montants corrects (-100, +100)
✅ Soldes mis à jour correctement (900, 600)
✅ Aucune conversion de devise effectuée
```

### 10.2 Si le Bug Existe (Comportement Bugué)

```
❌ Checkpoint 6 ou 7 échoue (montant incorrect dans Supabase)
❌ Montant divisé par taux de change (100 / 4950 ≈ 0.02)
❌ Transactions créées avec montants incorrects (-0.02, +0.02)
❌ Soldes mis à jour incorrectement (999.98, 500.02)
❌ Conversion de devise effectuée incorrectement
```

---

## 11. NEXT STEPS AFTER TEST

### 11.1 Si Bug Confirmé

1. **Identifier le point de défaillance** grâce aux logs des checkpoints
2. **Analyser le code** à l'endroit identifié
3. **Formuler une hypothèse** sur la cause racine
4. **Créer un ticket de bug** avec:
   - Description détaillée
   - Étapes de reproduction
   - Logs des checkpoints
   - Valeurs attendues vs observées
5. **Proposer une solution** de correction

### 11.2 Si Bug Non Reproduit

1. **Vérifier les conditions** de test
2. **Essayer avec d'autres valeurs** (montants différents, dates différentes)
3. **Vérifier les logs** pour d'autres anomalies
4. **Documenter** que le bug n'a pas pu être reproduit

---

## 12. REFERENCES

### 12.1 Fichiers Clés

- `frontend/src/pages/TransferPage.tsx` - UI du formulaire de transfert
- `frontend/src/services/transactionService.ts` - Logique de création de transfert
- `frontend/src/services/apiService.ts` - Appels API Supabase
- `frontend/src/services/exchangeRateService.ts` - Conversion de devises
- `frontend/src/components/Currency/CurrencyInput.tsx` - Composant de saisie de montant

### 12.2 Documentation Associée

- `AGENT-1-TRANSFER-FLOW-IDENTIFICATION.md` - Analyse du flux de transfert
- `AGENT-3-DATABASE-PERSISTENCE-ANALYSIS.md` - Analyse de la persistance

---

**AGENT-6-TEST-SCENARIO-COMPLETE**
