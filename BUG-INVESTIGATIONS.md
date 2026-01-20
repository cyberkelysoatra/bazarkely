# BUG INVESTIGATIONS - BazarKELY

**Date de création:** 2026-01-18  
**Dernière mise à jour:** 2026-01-18  
**Projet:** BazarKELY - Application PWA Gestion Budget Familial  
**Objectif:** Historique des investigations critiques de bugs, analyses de cause racine et résolutions

---

## 📋 TABLE DES MATIÈRES

- [EUR Transfer Bug (2026-01-18)](#eur-transfer-bug-2026-01-18)
- [Investigation Process](#investigation-process)
- [Related Files](#related-files)

---

## 🔴 EUR TRANSFER BUG (2026-01-18)

**Date:** 2026-01-18  
**Session:** S38  
**Severity:** CRITICAL  
**Status:** ✅ RESOLVED (v2.4.5 → v2.4.6)  
**Version Fix:** v2.4.5 (2026-01-18), v2.4.6 (2026-01-18)

---

### **SYMPTOM**

**Problème Rapporté:**
Les transferts EUR vers EUR affichent un changement de montant après validation. Le montant saisi (ex: 100 EUR) apparaît converti comme s'il avait été saisi en MGA puis divisé par le taux EUR.

**Exemple Concret:**
- Utilisateur saisit: **100 EUR** dans un transfert entre deux comptes EUR
- Après validation, le montant affiché devient: **~0.02 EUR** (100 MGA ÷ 4950 ≈ 0.02 EUR)
- Le montant original est perdu et remplacé par une valeur incorrecte

**Impact:**
- ❌ Perte de données financières critiques
- ❌ Transactions EUR incorrectes dans l'historique
- ❌ Solde des comptes EUR incorrect
- ❌ Confiance utilisateur compromise

---

### **ROOT CAUSE**

**Cause Racine Identifiée:**

1. **Schéma Supabase Incomplet**
   - Les colonnes `original_currency`, `original_amount`, `exchange_rate_used` **n'existaient pas** dans la table `transactions` de Supabase
   - Le schéma TypeScript (`Transaction` interface) supportait ces champs, mais Supabase les ignorait lors de la synchronisation

2. **Fallback MGA Incorrect**
   - Dans `transactionService.ts`, ligne 312:
     ```typescript
     const transactionCurrency = transactionData.originalCurrency || 'MGA';  // ⚠️ DÉFAUT MGA
     ```
   - Si `originalCurrency` n'était pas fourni, le système assumait MGA par défaut
   - Pour les comptes EUR avec `currency` undefined/null, le fallback MGA causait une conversion incorrecte

3. **Conversion Automatique Déclenchée Incorrectement**
   - Dans `transactionService.createTransaction()` (lignes 322-334):
     ```typescript
     if (transactionCurrency !== accountCurrency) {
       // Conversion automatique déclenchée
       amountToStore = await convertAmount(transactionData.amount, transactionCurrency, accountCurrency, transactionDate);
     }
     ```
   - Si `account.currency` était `undefined` ou `null`, le fallback `|| 'MGA'` causait une conversion EUR → MGA même pour des comptes EUR

4. **Perte de Données lors Synchronisation**
   - Les champs `originalCurrency`, `originalAmount`, `exchangeRateUsed` étaient sauvegardés dans IndexedDB
   - Lors de la synchronisation Supabase, ces champs étaient envoyés mais **ignorés** (colonnes n'existaient pas)
   - Après récupération depuis Supabase, ces champs étaient `undefined`
   - L'affichage utilisait alors `amount` (montant converti) au lieu de `originalAmount` (montant original)

**Flux Problématique:**

```
1. Utilisateur saisit: amount=100, originalCurrency='EUR' (implicite)
2. Compte: currency=undefined ou null
3. Fallback: transactionCurrency = 'EUR' || 'MGA' = 'EUR' ✅
4. Fallback: accountCurrency = account.currency || 'MGA' = 'MGA' ❌
5. Conversion déclenchée: EUR ≠ MGA → conversion 100 EUR → 495000 MGA
6. IndexedDB stocke: amount=495000, originalCurrency='EUR', originalAmount=100 ✅
7. Supabase stocke: amount=495000, original_currency='EUR' (IGNORÉ), original_amount=100 (IGNORÉ) ❌
8. Après récupération: originalCurrency=undefined, originalAmount=undefined ❌
9. Affichage: amount=495000 MGA au lieu de originalAmount=100 EUR ❌
```

---

### **INVESTIGATION PROCESS**

**Workflow Multi-Agents Diagnostic:**

**Session S38 - Investigation Multi-Agents (2026-01-18)**

**Agents Utilisés:**
1. **AGENT 3 - Database Persistence Analysis**
   - Analyse schéma base de données (IndexedDB + Supabase)
   - Identification incompatibilité schéma TypeScript vs Supabase
   - Analyse logique de persistance dans `transactionService.ts`

2. **AGENT 7 - Data Audit**
   - Audit des données existantes (IndexedDB + Supabase)
   - Requêtes pour identifier transactions affectées
   - Statistiques des transactions par devise originale

3. **AGENT 02 - Currency Conversion Investigation**
   - Analyse fonctions de conversion (`exchangeRateService.ts`, `multiCurrencyService.ts`)
   - Identification fallbacks et valeurs par défaut
   - Analyse logique de conversion automatique

4. **AGENT 5 - Triggers & RPC Analysis**
   - Vérification triggers Supabase sur table `transactions`
   - Vérification fonctions SQL modifiant les transactions
   - Confirmation: conversion uniquement dans frontend

5. **AGENT 1 - Transfer Flow Identification**
   - Analyse flux de création transfert (`TransferPage.tsx`)
   - Identification point de soumission formulaire
   - Analyse passage de données vers `transactionService`

**Hypothèses Testées:**

1. ✅ **Hypothèse 1:** Trigger Supabase modifiant les montants
   - **Résultat:** ❌ Aucun trigger trouvé sur table `transactions`

2. ✅ **Hypothèse 2:** Fonction SQL modifiant les montants
   - **Résultat:** ❌ Aucune fonction SQL trouvée modifiant les transactions

3. ✅ **Hypothèse 3:** Conversion automatique dans frontend
   - **Résultat:** ✅ Confirmé - Conversion dans `transactionService.createTransaction()`

4. ✅ **Hypothèse 4:** Fallback MGA incorrect
   - **Résultat:** ✅ Confirmé - Fallback `|| 'MGA'` causait conversion incorrecte

5. ✅ **Hypothèse 5:** Schéma Supabase incomplet
   - **Résultat:** ✅ Confirmé - Colonnes `original_currency`, `original_amount`, `exchange_rate_used` manquantes

**Temps d'Investigation:**
- Diagnostic multi-agents: ~2 heures
- Analyse code: ~1 heure
- Tests validation: ~30 minutes
- **Total:** ~3.5 heures

---

### **CODE ANALYSIS**

#### **1. Schéma Transaction TypeScript**

**Fichier:** `frontend/src/types/index.ts` (lignes 91-119)

```typescript
export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;  // ⚠️ MONTANT STOCKÉ (peut être converti)
  description: string;
  category: TransactionCategory;
  date: Date;
  // Pour multi-devise
  originalCurrency?: 'MGA' | 'EUR';  // ⚠️ DEVISE ORIGINALE
  originalAmount?: number;          // ⚠️ MONTANT ORIGINAL (non converti)
  exchangeRateUsed?: number;         // ⚠️ TAUX DE CHANGE UTILISÉ
  // ...
}
```

**Problème:** Interface TypeScript supporte multi-devise, mais Supabase ne stocke pas ces champs.

---

#### **2. Schéma Supabase (AVANT Fix)**

**Fichier:** `frontend/src/types/supabase.ts` (lignes 97-170)

```typescript
transactions: {
  Row: {
    id: string
    user_id: string
    account_id: string
    amount: number  // ⚠️ SEUL MONTANT STOCKÉ
    type: string
    category: string
    // ... pas de original_currency, original_amount, exchange_rate_used
  }
}
```

**Problème:** Colonnes `original_currency`, `original_amount`, `exchange_rate_used` **n'existent pas** dans Supabase.

---

#### **3. Logique de Conversion (BUG)**

**Fichier:** `frontend/src/services/transactionService.ts` (lignes 309-334)

```typescript
async createTransaction(userId: string, transactionData: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction | null> {
  // Determine transaction currency (from input or account default)
  const transactionCurrency = transactionData.originalCurrency || 'MGA';  // ⚠️ DÉFAUT MGA
  
  // Get the account to check its currency
  const account = await accountService.getAccount(transactionData.accountId, userId);
  const accountCurrency = account?.currency || 'MGA';  // ⚠️ DÉFAUT MGA si undefined

  let amountToStore = transactionData.amount;
  let exchangeRateUsed: number | null = null;

  // ⚠️ BUG: Si currencies diffèrent, conversion automatique
  if (transactionCurrency !== accountCurrency) {
    try {
      const transactionDate = transactionData.date?.toISOString().split('T')[0];
      const rateInfo = await getExchangeRate(transactionCurrency, accountCurrency, transactionDate);
      exchangeRateUsed = rateInfo.rate;
      amountToStore = await convertAmount(transactionData.amount, transactionCurrency, accountCurrency, transactionDate);
      // ⚠️ PROBLÈME: Pour EUR→EUR, si accountCurrency est undefined, fallback MGA déclenche conversion
    } catch (conversionError) {
      console.error('📱 [TransactionService] ❌ Erreur lors de la conversion de devise:', conversionError);
      exchangeRateUsed = null;
    }
  }
  
  // Créer l'objet Transaction complet
  const transaction: Transaction = {
    // ...
    amount: amountToStore,  // ⚠️ MONTANT CONVERTI
    originalCurrency: transactionCurrency,
    originalAmount: transactionData.amount,  // ✅ MONTANT ORIGINAL
    exchangeRateUsed: exchangeRateUsed || undefined,
    // ...
  };

  // Sauvegarder dans IndexedDB (TOUS LES CHAMPS) ✅
  await db.transactions.add(transaction);

  // Synchroniser vers Supabase (SEUL amount converti, autres champs ignorés) ❌
  const supabaseData = {
    // ...
    amount: amountToStore,
    original_currency: transactionCurrency,  // ⚠️ ENVOYÉ MAIS COLONNE N'EXISTE PAS
    original_amount: transactionData.amount,  // ⚠️ ENVOYÉ MAIS COLONNE N'EXISTE PAS
    exchange_rate_used: exchangeRateUsed,     // ⚠️ ENVOYÉ MAIS COLONNE N'EXISTE PAS
  };
}
```

**Problème:** Fallback `|| 'MGA'` cause conversion incorrecte si `account.currency` est `undefined`.

---

#### **4. Mapping Supabase → Transaction (BUG)**

**Fichier:** `frontend/src/services/transactionService.ts` (lignes 84-108)

```typescript
private mapSupabaseToTransaction(supabaseTransaction: any): Transaction {
  return {
    // ...
    amount: supabaseTransaction.amount,  // ⚠️ MONTANT CONVERTI SEULEMENT
    // ...
    originalCurrency: supabaseTransaction.original_currency || undefined,  // ⚠️ TOUJOURS undefined (colonne n'existe pas)
    originalAmount: supabaseTransaction.original_amount || undefined,      // ⚠️ TOUJOURS undefined (colonne n'existe pas)
    exchangeRateUsed: supabaseTransaction.exchange_rate_used || undefined, // ⚠️ TOUJOURS undefined (colonne n'existe pas)
    // ...
  };
}
```

**Problème:** Mapping retourne `undefined` pour les champs multi-devise car colonnes n'existent pas dans Supabase.

---

### **RESOLUTION**

**Version v2.4.5 (2026-01-18) - Fix Initial**

**STEP 1: Migration Supabase - Ajout Colonnes Multi-Currency**

**Fichier:** `supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql`

```sql
-- Ajouter colonnes pour support multi-devise
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3) NULL,
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(15, 2) NULL,
ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(10, 4) NULL;

-- Commentaires pour documentation
COMMENT ON COLUMN public.transactions.original_currency IS 'Devise originale de la transaction (MGA ou EUR)';
COMMENT ON COLUMN public.transactions.original_amount IS 'Montant original avant conversion (si conversion appliquée)';
COMMENT ON COLUMN public.transactions.exchange_rate_used IS 'Taux de change utilisé pour la conversion (si conversion appliquée)';

-- Index pour requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_transactions_original_currency 
ON public.transactions(original_currency) 
WHERE original_currency IS NOT NULL;
```

**Résultat:** Colonnes ajoutées, types Supabase régénérés.

---

**STEP 2: Fix Fallback MGA dans transactionService.ts**

**Fichier:** `frontend/src/services/transactionService.ts` (lignes 312-334)

**AVANT (BUG):**
```typescript
const transactionCurrency = transactionData.originalCurrency || 'MGA';  // ⚠️ DÉFAUT MGA
const accountCurrency = account?.currency || 'MGA';  // ⚠️ DÉFAUT MGA
```

**APRÈS (FIX):**
```typescript
const transactionCurrency = transactionData.originalCurrency;  // ✅ Pas de fallback, doit être explicite
const accountCurrency = account?.currency;  // ✅ Pas de fallback, peut être undefined/null

// Validation stricte: les deux devises doivent être définies pour conversion
if (transactionCurrency && accountCurrency && transactionCurrency !== accountCurrency) {
  // Conversion uniquement si les deux devises sont explicites et différentes
  const transactionDate = transactionData.date?.toISOString().split('T')[0];
  const rateInfo = await getExchangeRate(transactionCurrency, accountCurrency, transactionDate);
  exchangeRateUsed = rateInfo.rate;
  amountToStore = await convertAmount(transactionData.amount, transactionCurrency, accountCurrency, transactionDate);
} else {
  // Pas de conversion si devises identiques ou undefined
  amountToStore = transactionData.amount;
}
```

**Résultat:** Conversion uniquement si devises explicites et différentes.

---

**STEP 3: Validation Frontend dans TransferPage.tsx**

**Fichier:** `frontend/src/pages/TransferPage.tsx`

**Ajout validation précoce:**
```typescript
// Validation avant soumission
if (!sourceAccount.currency || !targetAccount.currency) {
  toast.error('Les deux comptes doivent avoir une devise définie pour effectuer un transfert');
  return;
}

if (sourceAccount.currency !== targetAccount.currency && !transferData.originalCurrency) {
  toast.warning(`Transfert entre devises différentes: ${sourceAccount.currency} → ${targetAccount.currency}`);
}
```

**Résultat:** Détection précoce des problèmes de devise avant appel service.

---

**Version v2.4.6 (2026-01-18) - Support Multi-Currency Complet**

**STEP 4: Support Multi-Currency Accounts**

**Fichier:** `frontend/src/types/index.ts` (lignes 70-84)

**Modification Account Interface:**
```typescript
export interface Account {
  // ...
  /**
   * Preferred display currency for UI purposes only (not a constraint)
   * Accounts support multi-currency transactions (EUR and MGA can coexist)
   * NULL/undefined means account has no preferred currency preference
   */
  currency?: 'MGA' | 'EUR' | null;  // ✅ Optionnel/nullable
  // ...
}
```

**Résultat:** Comptes peuvent accepter transactions EUR et MGA dans le même compte.

---

**STEP 5: Capture originalCurrency depuis Formulaire**

**Fichier:** `frontend/src/pages/TransferPage.tsx`, `frontend/src/pages/AddTransactionPage.tsx`

**Modification soumission formulaire:**
```typescript
// Capturer originalCurrency depuis toggle devise formulaire
const transactionData = {
  // ...
  originalCurrency: formCurrency,  // ✅ Devise sélectionnée dans formulaire
  // ...
};

await transactionService.createTransaction(userId, transactionData);
```

**Résultat:** `originalCurrency` capturé explicitement depuis formulaire.

---

**STEP 6: Affichage avec Taux Stocké**

**Fichier:** `frontend/src/utils/currencyConversion.ts`

**Nouvelle fonction:**
```typescript
export function convertAmountWithStoredRate(
  amount: number,
  originalCurrency: 'MGA' | 'EUR' | undefined,
  displayCurrency: 'MGA' | 'EUR',
  exchangeRateUsed?: number
): number {
  // Utiliser taux stocké si disponible (jamais recalculer avec taux actuel)
  if (originalCurrency === displayCurrency) {
    return amount;
  }
  
  if (exchangeRateUsed) {
    // Utiliser taux historique stocké
    return originalCurrency === 'EUR' && displayCurrency === 'MGA'
      ? amount * exchangeRateUsed
      : amount / exchangeRateUsed;
  }
  
  // Fallback si pas de taux stocké (ne devrait pas arriver)
  return amount;
}
```

**Résultat:** Affichage utilise toujours taux historique, jamais taux actuel.

---

### **PREVENTION**

**Best Practices pour Prévenir Bugs Similaires:**

1. **Validation Stricte des Devises**
   - ✅ Ne jamais utiliser fallback `|| 'MGA'` pour devises
   - ✅ Exiger devises explicites pour conversions
   - ✅ Valider devises avant opérations financières

2. **Synchronisation Schéma TypeScript ↔ Supabase**
   - ✅ Vérifier que toutes les colonnes TypeScript existent dans Supabase
   - ✅ Migration automatique lors ajout nouveaux champs
   - ✅ Tests de synchronisation après migrations

3. **Tests Multi-Currency**
   - ✅ Tests EUR→EUR, MGA→MGA, EUR→MGA, MGA→EUR
   - ✅ Tests avec comptes currency=null
   - ✅ Tests synchronisation IndexedDB ↔ Supabase

4. **Logging Complet**
   - ✅ Logger toutes conversions de devise
   - ✅ Logger valeurs originalCurrency/originalAmount
   - ✅ Logger synchronisation Supabase

5. **Documentation Schéma**
   - ✅ Documenter toutes colonnes multi-devise
   - ✅ Documenter logique de conversion
   - ✅ Documenter fallbacks et valeurs par défaut

---

### **AUDIT QUERIES**

#### **IndexedDB Audit (Dexie)**

**1. Compter transactions par devise originale:**
```javascript
// Exécuter dans console navigateur (F12)
const txByCurrency = await db.transactions
  .toArray()
  .then(txs => {
    const counts = {
      'MGA': 0,
      'EUR': 0,
      'undefined': 0,
      'null': 0
    };
    txs.forEach(tx => {
      if (tx.originalCurrency === 'MGA') counts.MGA++;
      else if (tx.originalCurrency === 'EUR') counts.EUR++;
      else if (tx.originalCurrency === undefined) counts.undefined++;
      else if (tx.originalCurrency === null) counts.null++;
    });
    return counts;
  });
console.table(txByCurrency);
```

**2. Identifier transactions EUR sans originalAmount:**
```javascript
const eurTxsMissingAmount = await db.transactions
  .toArray()
  .then(txs => txs.filter(tx => 
    tx.originalCurrency === 'EUR' && 
    (tx.originalAmount === undefined || tx.originalAmount === null)
  ));
console.log(`⚠️ Transactions EUR sans originalAmount: ${eurTxsMissingAmount.length}`);
console.table(eurTxsMissingAmount);
```

**3. Identifier transferts EUR→EUR suspects:**
```javascript
const eurTransfers = await db.transactions
  .where('type').equals('transfer')
  .and(tx => tx.originalCurrency === 'EUR')
  .toArray()
  .then(async txs => {
    const accounts = await db.accounts.toArray();
    const accountMap = new Map(accounts.map(acc => [acc.id, acc]));
    
    return txs.map(tx => {
      const sourceAccount = accountMap.get(tx.accountId);
      const targetAccount = tx.targetAccountId ? accountMap.get(tx.targetAccountId) : null;
      return {
        id: tx.id,
        amount: tx.amount,
        originalAmount: tx.originalAmount,
        sourceAccountCurrency: sourceAccount?.currency,
        targetAccountCurrency: targetAccount?.currency,
        isEURtoEUR: sourceAccount?.currency === 'EUR' && targetAccount?.currency === 'EUR',
        suspicious: sourceAccount?.currency === 'EUR' && targetAccount?.currency === 'EUR' && tx.amount !== tx.originalAmount
      };
    });
  });
console.table(eurTransfers.filter(tx => tx.suspicious));
```

---

#### **Supabase Audit (SQL)**

**1. Compter transactions par type avec statistiques:**
```sql
-- Exécuter dans Supabase SQL Editor
SELECT 
  type,
  COUNT(*) as count,
  AVG(amount) as avg_amount,
  MIN(amount) as min_amount,
  MAX(amount) as max_amount,
  COUNT(CASE WHEN original_currency IS NOT NULL THEN 1 END) as with_original_currency,
  COUNT(CASE WHEN original_amount IS NOT NULL THEN 1 END) as with_original_amount
FROM transactions
GROUP BY type
ORDER BY count DESC;
```

**2. Identifier transferts avec montants suspects:**
```sql
-- Identifier transferts avec montants > 100000 MGA (probable conversion EUR)
SELECT 
  id,
  type,
  amount,
  original_currency,
  original_amount,
  exchange_rate_used,
  account_id,
  target_account_id,
  date,
  CASE 
    WHEN amount > 100000 AND original_currency IS NULL THEN 'SUSPECTEUR' 
    ELSE 'NORMAL'
  END as suspicion_level,
  ROUND(amount / 4950.0, 2) as possible_eur_amount
FROM transactions
WHERE type = 'transfer'
  AND amount > 100000
ORDER BY amount DESC
LIMIT 50;
```

**3. Identifier transferts EUR→EUR (via accounts table):**
```sql
-- Identifier transferts entre comptes EUR
SELECT 
  t.id,
  t.type,
  t.amount,
  t.original_currency,
  t.original_amount,
  t.account_id,
  t.target_account_id,
  t.date,
  source_acc.currency as source_currency,
  target_acc.currency as target_currency,
  CASE 
    WHEN source_acc.currency = 'EUR' AND target_acc.currency = 'EUR' THEN 'EUR_TO_EUR'
    WHEN source_acc.currency = 'MGA' AND target_acc.currency = 'MGA' THEN 'MGA_TO_MGA'
    ELSE 'CROSS_CURRENCY'
  END as transfer_type,
  CASE 
    WHEN source_acc.currency = 'EUR' AND target_acc.currency = 'EUR' 
         AND t.original_amount IS NULL THEN 'MISSING_ORIGINAL'
    ELSE 'OK'
  END as data_quality
FROM transactions t
LEFT JOIN accounts source_acc ON t.account_id = source_acc.id
LEFT JOIN accounts target_acc ON t.target_account_id = target_acc.id
WHERE t.type = 'transfer'
  AND source_acc.currency = 'EUR' 
  AND target_acc.currency = 'EUR'
ORDER BY t.date DESC
LIMIT 50;
```

---

### **RELATED FILES**

**Fichiers d'Investigation:**
- `AGENT-7-EUR-TRANSFER-BUG-AUDIT-REPORT.md` - Audit complet des données
- `AGENT-02-CURRENCY-CONVERSION-INVESTIGATION.md` - Analyse fonctions conversion
- `AGENT-5-TRIGGERS-RPC-ANALYSIS.md` - Vérification triggers et fonctions SQL
- `AGENT-1-TRANSFER-FLOW-IDENTIFICATION.md` - Analyse flux transfert
- `AGENT-3-DATABASE-PERSISTENCE-ANALYSIS.md` - Analyse persistance base de données

**Fichiers de Code Modifiés:**
- `frontend/src/services/transactionService.ts` - Fix fallback MGA, validation devises
- `frontend/src/types/index.ts` - Account interface (currency optionnel)
- `frontend/src/types/supabase.ts` - Types régénérés avec colonnes multi-currency
- `frontend/src/pages/TransferPage.tsx` - Validation frontend, capture originalCurrency
- `frontend/src/pages/AddTransactionPage.tsx` - Capture originalCurrency depuis formulaire
- `frontend/src/utils/currencyConversion.ts` - Fonction convertAmountWithStoredRate()

**Migrations:**
- `supabase/migrations/20260118134130_add_multi_currency_columns_to_transactions.sql` - Ajout colonnes multi-currency

**Documentation:**
- `RESUME-SESSION-2026-01-18-S38-EUR-TRANSFER-BUG-FIX.md` - Résumé session (à créer)
- `FEATURE-MATRIX.md` - Matrice fonctionnalités mise à jour
- `ETAT-TECHNIQUE-COMPLET.md` - Documentation technique (à mettre à jour)

---

### **COMMITS**

**Version v2.4.5 (2026-01-18):**
- Migration Supabase: Ajout colonnes `original_currency`, `original_amount`, `exchange_rate_used`
- Fix fallback MGA dans `transactionService.ts`
- Validation frontend dans `TransferPage.tsx`

**Version v2.4.6 (2026-01-18):**
- Support multi-currency accounts (currency optionnel)
- Capture `originalCurrency` depuis formulaire
- Fonction `convertAmountWithStoredRate()` pour affichage avec taux historique
- Correction toggle devise dans formulaires

---

### **TESTING**

**Tests de Validation:**

1. ✅ **EUR→EUR Transfer:** Montant préservé sans conversion
2. ✅ **MGA→MGA Transfer:** Montant préservé sans conversion
3. ✅ **EUR→MGA Transfer:** Conversion correcte avec taux historique
4. ✅ **MGA→EUR Transfer:** Conversion correcte avec taux historique
5. ✅ **Synchronisation IndexedDB ↔ Supabase:** Tous champs multi-currency préservés
6. ✅ **Affichage:** Utilise `originalAmount` + `originalCurrency` si disponibles
7. ✅ **Comptes currency=null:** Acceptent transactions EUR et MGA

**Résultats:**
- ✅ Tous tests passés
- ✅ Aucune régression identifiée
- ✅ Données historiques préservées

---

### **LESSONS LEARNED**

1. **Synchronisation Schéma Critique**
   - Toujours vérifier que schéma TypeScript correspond à Supabase
   - Migrations automatiques lors ajout nouveaux champs
   - Tests de synchronisation après migrations

2. **Fallbacks Dangereux**
   - Ne jamais utiliser fallback `|| 'MGA'` pour devises
   - Exiger devises explicites pour conversions
   - Validation stricte avant opérations financières

3. **Multi-Agent Investigation Efficace**
   - Diagnostic parallèle réduit temps investigation
   - Chaque agent analyse aspect spécifique
   - Synthèse complète des résultats

4. **Documentation Permanente**
   - Bug investigations doivent être documentées
   - Préserver contexte historique pour référence future
   - Inclure requêtes audit pour validation production

---

**🔴 EUR TRANSFER BUG - INVESTIGATION COMPLÈTE**

*Documentation créée le 2026-01-18 - Session S38*
