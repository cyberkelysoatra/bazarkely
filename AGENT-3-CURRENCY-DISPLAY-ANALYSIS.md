# AGENT-3 - CURRENCY DISPLAY PATTERN ANALYSIS
## Documentation READ-ONLY - Analyse des patterns d'affichage de devise

**Date:** 2025-11-23  
**Agent:** Agent 3 - Currency Display Analysis  
**Mission:** READ-ONLY - Analyse et documentation uniquement  
**Objectif:** Analyser les patterns d'affichage de devise dans BazarKELY pour identifier les incohérences et recommander une approche centralisée

---

## ⛔ CONFIRMATION READ-ONLY

**STATUT:** ✅ **READ-ONLY CONFIRMÉ**  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement  
**MODIFICATIONS SUGGÉRÉES:** Recommandations uniquement

---

## 1. CURRENCY DISPLAY COMPONENT

### 1.1 Composant Principal

**Fichier:** `frontend/src/components/Currency/CurrencyDisplay.tsx`  
**Lignes:** 1-185

**Fonctionnalités:**
- ✅ Affichage formaté des montants avec symbole de devise
- ✅ Conversion automatique MGA ↔ EUR via `convertAmount()`
- ✅ Toggle cliquable pour changer la devise d'affichage
- ✅ Cache des conversions pour éviter appels API répétés
- ✅ Support de différentes tailles (`sm`, `md`, `lg`, `xl`)
- ✅ Support de `displayCurrency` prop pour contrôle externe

**Interface:**
```typescript
interface CurrencyDisplayProps {
  amount: number;
  originalCurrency: Currency; // 'MGA' | 'EUR'
  showConversion?: boolean; // Default: true
  size?: 'sm' | 'md' | 'lg' | 'xl'; // Default: 'md'
  className?: string;
  colorBySign?: boolean; // Color green/red by sign
  displayCurrency?: Currency; // Optional prop to control display currency
}
```

**Formatage:**
```typescript
// MGA: pas de décimales, séparateurs d'espaces
formatAmount(value, 'MGA') => "1 234 567" + " Ar"

// EUR: 2 décimales, virgule pour décimales
formatAmount(value, 'EUR') => "1 234,56" + " €"
```

**Symbole de Devise:**
```typescript
getCurrencySymbol('MGA') => 'Ar'
getCurrencySymbol('EUR') => '€'
```

### 1.2 Utilisation dans l'Application

**Pages Utilisant CurrencyDisplay:**
- ✅ `DashboardPage.tsx` - 6 utilisations
- ✅ `AccountsPage.tsx` - 4 utilisations
- ✅ `TransactionsPage.tsx` - 3 utilisations
- ✅ `BudgetsPage.tsx` - 7 utilisations
- ✅ `GoalsPage.tsx` - 4 utilisations
- ✅ `MonthlySummaryCard.tsx` - 3 utilisations

**Pattern d'Utilisation:**
```typescript
<CurrencyDisplay
  amount={account.balance}
  originalCurrency={account.currency || 'MGA'}
  displayCurrency={displayCurrency} // ← Préférence depuis localStorage
  size="md"
  showConversion={true}
/>
```

---

## 2. CURRENCY HOOK

### 2.1 Hook Centralisé

**RÉSULTAT:** ❌ **AUCUN HOOK CENTRALISÉ N'EXISTE**

**Preuve:**
- ✅ Recherche de `useCurrency.ts` / `useCurrency.tsx` - **AUCUN FICHIER TROUVÉ**
- ✅ Recherche de `useCurrencyPreference.ts` - **AUCUN FICHIER TROUVÉ**
- ✅ Aucun hook dans `frontend/src/hooks/` pour la devise

### 2.2 Pattern Actuel (Non Centralisé)

**Pattern Utilisé:** Accès direct à `localStorage` dans chaque composant

**Clé de Stockage:**
```typescript
const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';
```

**Fonctions Utilitaires (Dupliquées):**
- `SettingsPage.tsx` (lignes 14-28): `saveDisplayCurrency()`, `getDisplayCurrency()`
- `DashboardPage.tsx` (ligne 20): Définition de `CURRENCY_STORAGE_KEY`
- `AccountsPage.tsx` (ligne 11): Définition de `CURRENCY_STORAGE_KEY`
- `BudgetsPage.tsx` (ligne 14): Définition de `CURRENCY_STORAGE_KEY`
- `TransactionsPage.tsx` (ligne 14): Définition de `CURRENCY_STORAGE_KEY`
- `GoalsPage.tsx` (ligne 9): Définition de `CURRENCY_STORAGE_KEY`

**Pattern Répété dans Chaque Page:**
```typescript
// 1. Définir la clé
const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

// 2. Initialiser depuis localStorage
const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
  const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
  return (saved === 'EUR' || saved === 'MGA') ? saved : 'MGA';
});

// 3. Écouter les changements depuis Settings
useEffect(() => {
  const handleCurrencyChange = (event: CustomEvent<{ currency: Currency }>) => {
    setDisplayCurrency(event.detail.currency);
  };
  window.addEventListener('currencyChanged', handleCurrencyChange);
  return () => window.removeEventListener('currencyChanged', handleCurrencyChange);
}, []);
```

**Problème Identifié:** ⚠️ **DUPLICATION DE CODE** - Même logique répétée dans 6+ fichiers

### 2.3 Événement Custom pour Synchronisation

**Fichier:** `SettingsPage.tsx` (ligne 57)

**Pattern:**
```typescript
// Quand la devise change dans Settings
window.dispatchEvent(new CustomEvent('currencyChanged', { 
  detail: { currency } 
}));
```

**Pages Écoutant l'Événement:**
- ✅ `DashboardPage.tsx` (lignes 88-95)
- ✅ `AccountsPage.tsx` (lignes 49-57)
- ✅ `BudgetsPage.tsx` (lignes 36-44)
- ✅ `TransactionsPage.tsx` (lignes 114-122)
- ✅ `GoalsPage.tsx` (lignes 25-33)

**Note:** Pattern fonctionnel mais non centralisé - chaque page doit implémenter l'écoute.

---

## 3. CONVERSION LOGIC

### 3.1 Service de Conversion Principal

**Fichier:** `frontend/src/services/exchangeRateService.ts`  
**Fonction:** `convertAmount()`  
**Lignes:** 246-291

**Signature:**
```typescript
export async function convertAmount(
  amount: number,
  fromCurrency: string = 'EUR',
  toCurrency: string = 'MGA',
  date?: string
): Promise<number>
```

**Logique de Conversion:**
```typescript
// 1. Si devises identiques, retourner tel quel
if (fromCurrency === toCurrency) return amount;

// 2. Récupérer le taux de change
const exchangeRate = await getExchangeRate(fromCurrency, toCurrency, date);
const rate = exchangeRate.rate; // Default: 4950 (1 EUR = 4950 MGA)

// 3. Convertir selon la direction
if (fromCurrency === 'EUR' && toCurrency === 'MGA') {
  convertedAmount = amount * rate; // Multiplier
} else if (fromCurrency === 'MGA' && toCurrency === 'EUR') {
  convertedAmount = amount / rate; // Diviser
}

// 4. Arrondir selon la devise cible
if (toCurrency === 'MGA') {
  return Math.round(convertedAmount); // Pas de décimales
} else if (toCurrency === 'EUR') {
  return Math.round(convertedAmount * 100) / 100; // 2 décimales
}
```

**Taux de Change:**
- **Source:** API externe `https://api.exchangerate-api.com/v4/latest/EUR`
- **Taux par Défaut:** `4950` (1 EUR = 4950 MGA)
- **Stockage:** Base de données Supabase via fonction RPC `get_exchange_rate`
- **Mise à Jour:** Quotidienne via `initializeDailyRate()`

### 3.2 Service Alternatif (Non Utilisé)

**Fichier:** `frontend/src/services/multiCurrencyService.ts`  
**Statut:** ⚠️ **EXISTE MAIS PEU UTILISÉ**

**Note:** Ce service semble être une implémentation alternative avec support multi-devises (USD, JPY, GBP), mais n'est pas utilisé dans l'application principale. L'application utilise uniquement `exchangeRateService.ts`.

---

## 4. DISPLAY PATTERN

### 4.1 Pattern Centralisé (CurrencyDisplay)

**Composant:** `CurrencyDisplay.tsx`

**Formatage:**
```typescript
// MGA: pas de décimales, séparateurs d'espaces
formatAmount(value, 'MGA') => Math.round(value).toLocaleString('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
}) + " Ar"

// EUR: 2 décimales, virgule pour décimales
formatAmount(value, 'EUR') => value.toLocaleString('fr-FR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
}) + " €"
```

**Exemple d'Utilisation:**
```typescript
<CurrencyDisplay
  amount={1000000}
  originalCurrency="MGA"
  displayCurrency="EUR" // ← Préférence utilisateur
  showConversion={true}
/>
// Affiche: "202,02 €" (converti depuis 1 000 000 Ar)
```

### 4.2 Pattern Non Centralisé (formatCurrency Locale)

**Problème Identifié:** ⚠️ **FONCTIONS LOCALES DUPLIQUÉES**

**Fichiers avec formatCurrency Locale:**

1. **`TransactionsPage.tsx`** (ligne 148):
```typescript
const formatCurrency = (amount: number) => {
  return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
};
```
**Problème:** Hardcodé "Ar", pas de conversion EUR

2. **`BudgetsPage.tsx`** (ligne 297):
```typescript
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} Ar`;
};
```
**Problème:** Hardcodé "Ar", pas de conversion EUR

3. **`RecurringTransactionDetailPage.tsx`** (ligne 175):
```typescript
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} Ar`;
};
```
**Problème:** Hardcodé "Ar", pas de conversion EUR

4. **`AccountDetailPage.tsx`** (ligne 133):
```typescript
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} Ar`;
};
```
**Problème:** Hardcodé "Ar", pas de conversion EUR

5. **`AddBudgetPage.tsx`** (ligne 26):
```typescript
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} Ar`;
};
```
**Problème:** Hardcodé "Ar", pas de conversion EUR

**Pattern Problématique:**
- ❌ Hardcodé "Ar" dans toutes les fonctions locales
- ❌ Pas de support pour EUR
- ❌ Pas de conversion automatique
- ❌ Duplication de code

### 4.3 Pattern dans exchangeRateService

**Fichier:** `exchangeRateService.ts` (ligne 299)

**Fonction:** `formatAmount(amount, currency)`

```typescript
export function formatAmount(amount: number, currency: string): string {
  if (currency === 'MGA') {
    const formatted = Math.round(amount).toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
    return `${formatted} Ar`; // Symbole après
  } else if (currency === 'EUR') {
    const formatted = amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return `${formatted} €`; // Symbole après
  }
  return amount.toLocaleString('fr-FR');
}
```

**Note:** Cette fonction existe mais n'est pas utilisée dans les pages - elles utilisent leurs propres fonctions locales.

---

## 5. INPUT PATTERN

### 5.1 Composant CurrencyInput

**Fichier:** `frontend/src/components/Currency/CurrencyInput.tsx`  
**Lignes:** 1-147

**Fonctionnalités:**
- ✅ Input avec formatage automatique selon devise
- ✅ Toggle de devise intégré (`CurrencyToggle`)
- ✅ Formatage MGA: pas de décimales, séparateurs d'espaces
- ✅ Formatage EUR: 2 décimales max, virgule pour décimales
- ✅ Gestion focus/blur pour formatage

**Interface:**
```typescript
interface CurrencyInputProps {
  value: number | string;
  onChange: (value: number, currency: Currency) => void;
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  required?: boolean;
}
```

**Formatage:**
```typescript
// MGA: pas de décimales, séparateurs d'espaces
formatNumber(num, 'MGA') => Math.round(num).toLocaleString('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

// EUR: 2 décimales max, virgule pour décimales
formatNumber(num, 'EUR') => num.toLocaleString('fr-FR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})
```

### 5.2 Utilisation de CurrencyInput

**RÉSULTAT:** ⚠️ **PEU UTILISÉ**

**Recherche:** Aucune utilisation trouvée dans les pages principales (`AddTransactionPage.tsx`, `AddAccountPage.tsx`, etc.)

**Pattern Actuel dans les Forms:**

**`AddTransactionPage.tsx`** (lignes 271-282):
```typescript
<input
  type="number"
  value={formData.amount}
  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
  placeholder="0"
  min="0"
  step="0.01"
/>
// + Affichage hardcodé "Ar" après le champ
```

**Problème:** 
- ❌ Utilise `<input type="number">` standard
- ❌ Pas de formatage automatique
- ❌ Pas de toggle de devise
- ❌ Hardcodé "Ar" dans l'affichage

**`AddAccountPage.tsx`** (lignes 178-187):
```typescript
<input
  type="number"
  name="balance"
  value={formData.balance}
  onChange={handleChange}
  placeholder="0"
  min="0"
  step="1"
/>
// Currency hardcodé "MGA" dans le service
```

**Problème:**
- ❌ Utilise `<input type="number">` standard
- ❌ Pas de formatage automatique
- ❌ Devise hardcodée "MGA" dans `accountService.createAccount()`

### 5.3 Composant Input.tsx avec Support Currency

**Fichier:** `frontend/src/components/UI/Input.tsx`  
**Lignes:** 49-57

**Fonctionnalité:**
```typescript
const formatCurrency = (value: string) => {
  if (!currency || currency !== 'MGA') return value
  const numericValue = value.replace(/\D/g, '')
  return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}
```

**Problème:**
- ⚠️ Support uniquement pour MGA
- ⚠️ Pas de support EUR
- ⚠️ Pas utilisé dans `AddTransactionPage.tsx` ou `AddAccountPage.tsx`

---

## 6. GAP ANALYSIS

### 6.1 Incohérences Identifiées

#### 6.1.1 Display vs Input

**Display (CurrencyDisplay):**
- ✅ Support MGA et EUR
- ✅ Conversion automatique
- ✅ Formatage cohérent
- ✅ Utilisé dans la plupart des pages

**Input (CurrencyInput):**
- ✅ Support MGA et EUR
- ✅ Formatage cohérent
- ❌ **PAS UTILISÉ** dans les formulaires principaux

**Gap:** Les formulaires utilisent `<input type="number">` standard au lieu de `CurrencyInput`.

#### 6.1.2 Formatage Centralisé vs Local

**Centralisé:**
- ✅ `CurrencyDisplay.formatAmount()` - Utilisé dans CurrencyDisplay
- ✅ `exchangeRateService.formatAmount()` - Existe mais non utilisé

**Local (Dupliqué):**
- ❌ `formatCurrency()` dans 5+ pages - Hardcodé "Ar"
- ❌ Pas de conversion EUR
- ❌ Duplication de code

**Gap:** Fonctions locales dupliquées au lieu d'utiliser le formatage centralisé.

#### 6.1.3 Hook Centralisé vs Pattern Répété

**Hook Centralisé:**
- ❌ **N'EXISTE PAS**

**Pattern Répété:**
- ⚠️ Même logique répétée dans 6+ fichiers:
  - Définition de `CURRENCY_STORAGE_KEY`
  - Initialisation depuis `localStorage`
  - Écoute de l'événement `currencyChanged`

**Gap:** Pas de hook `useCurrency()` pour centraliser la logique.

#### 6.1.4 Préférence de Devise

**Stockage:**
- ✅ `localStorage.getItem('bazarkely_display_currency')`
- ✅ Synchronisation via événement custom `currencyChanged`

**Problème:**
- ⚠️ Chaque page doit implémenter l'écoute manuellement
- ⚠️ Pas de hook pour accéder facilement à la préférence

**Gap:** Pas de hook pour accéder à la préférence de devise.

### 6.2 Recommandations

#### 6.2.1 Créer Hook useCurrency()

**Fichier à Créer:** `frontend/src/hooks/useCurrency.ts`

**Implémentation Recommandée:**
```typescript
import { useState, useEffect } from 'react';
import type { Currency } from '../components/Currency/CurrencyToggle';

const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

export function useCurrency() {
  const [displayCurrency, setDisplayCurrency] = useState<Currency>(() => {
    const saved = localStorage.getItem(CURRENCY_STORAGE_KEY);
    return (saved === 'EUR' || saved === 'MGA') ? saved : 'MGA';
  });

  useEffect(() => {
    const handleCurrencyChange = (event: CustomEvent<{ currency: Currency }>) => {
      setDisplayCurrency(event.detail.currency);
    };
    window.addEventListener('currencyChanged', handleCurrencyChange as EventListener);
    return () => {
      window.removeEventListener('currencyChanged', handleCurrencyChange as EventListener);
    };
  }, []);

  return displayCurrency;
}
```

**Avantages:**
- ✅ Centralise la logique
- ✅ Réutilisable dans tous les composants
- ✅ Élimine la duplication

#### 6.2.2 Remplacer formatCurrency Locales

**Action:** Remplacer toutes les fonctions `formatCurrency()` locales par `CurrencyDisplay` ou `exchangeRateService.formatAmount()`.

**Exemple:**
```typescript
// AVANT (TransactionsPage.tsx)
const formatCurrency = (amount: number) => {
  return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
};

// APRÈS
import { CurrencyDisplay } from '../components/Currency';
import { useCurrency } from '../hooks/useCurrency';

const displayCurrency = useCurrency();
<CurrencyDisplay
  amount={Math.abs(amount)}
  originalCurrency="MGA"
  displayCurrency={displayCurrency}
  showConversion={true}
/>
```

#### 6.2.3 Utiliser CurrencyInput dans les Forms

**Action:** Remplacer `<input type="number">` par `<CurrencyInput>` dans:
- `AddTransactionPage.tsx`
- `AddAccountPage.tsx`
- `AddBudgetPage.tsx`
- Autres formulaires avec montants

**Exemple:**
```typescript
// AVANT
<input
  type="number"
  value={formData.amount}
  onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
/>

// APRÈS
<CurrencyInput
  value={formData.amount}
  currency={formData.currency || 'MGA'}
  onChange={(value, currency) => setFormData({ ...formData, amount: value, currency })}
  onCurrencyChange={(currency) => setFormData({ ...formData, currency })}
/>
```

#### 6.2.4 Centraliser formatAmount

**Action:** Utiliser `exchangeRateService.formatAmount()` ou créer une fonction utilitaire centralisée.

**Fichier à Créer:** `frontend/src/utils/currencyFormat.ts`

```typescript
import { formatAmount as formatAmountService } from '../services/exchangeRateService';
import type { Currency } from '../components/Currency/CurrencyToggle';

export function formatCurrency(
  amount: number,
  currency: Currency,
  displayCurrency?: Currency
): string {
  // Si displayCurrency différent, nécessite conversion (géré par CurrencyDisplay)
  // Pour formatage simple, utiliser le service
  return formatAmountService(amount, currency);
}
```

---

## 7. SUMMARY

### 7.1 Réponses aux Questions

**1. CURRENCY DISPLAY COMPONENT:**
- ✅ **OUI** - `CurrencyDisplay.tsx` existe et fonctionne bien
- ✅ Support MGA et EUR avec conversion automatique
- ✅ Utilisé dans la plupart des pages principales

**2. CURRENCY HOOK:**
- ❌ **NON** - Aucun hook centralisé n'existe
- ⚠️ Pattern répété dans 6+ fichiers avec accès direct à localStorage

**3. CONVERSION LOGIC:**
- ✅ **OUI** - `exchangeRateService.convertAmount()` fonctionne
- ✅ Taux depuis API externe avec fallback
- ✅ Stockage dans Supabase

**4. DISPLAY PATTERN:**
- ✅ Pattern centralisé: `CurrencyDisplay` (bien utilisé)
- ❌ Pattern local: `formatCurrency()` dupliqué (hardcodé "Ar")

**5. INPUT PATTERN:**
- ✅ Composant `CurrencyInput` existe
- ❌ **PAS UTILISÉ** dans les formulaires principaux
- ⚠️ Formulaires utilisent `<input type="number">` standard

**6. GAP ANALYSIS:**
- ⚠️ **3 gaps majeurs identifiés:**
  1. Pas de hook `useCurrency()` centralisé
  2. Fonctions `formatCurrency()` locales dupliquées (hardcodé "Ar")
  3. `CurrencyInput` non utilisé dans les formulaires

### 7.2 Actions Recommandées

**Priorité HAUTE:**
1. ✅ Créer hook `useCurrency()` pour centraliser la logique
2. ✅ Remplacer fonctions `formatCurrency()` locales par `CurrencyDisplay`
3. ✅ Utiliser `CurrencyInput` dans les formulaires

**Priorité MOYENNE:**
4. ✅ Centraliser `formatAmount` dans un utilitaire
5. ✅ Documenter le pattern recommandé dans README

**Priorité BASSE:**
6. ✅ Migrer `multiCurrencyService.ts` si besoin futur
7. ✅ Ajouter tests pour les composants currency

---

**AGENT-3-CURRENCY-DISPLAY-COMPLETE**

**Résumé:**
- ✅ Composant `CurrencyDisplay` analysé et documenté
- ✅ Service de conversion `exchangeRateService` analysé
- ✅ Composant `CurrencyInput` identifié mais non utilisé
- ✅ Hook centralisé absent identifié
- ✅ Incohérences entre display et input documentées
- ✅ Recommandations complètes fournies

**FICHIERS LUS:** 12  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement











