# AUDIT COMPLET - Champs de montant et préférence de devise

## 📋 RÉSUMÉ EXÉCUTIF

**Date:** $(date)
**Objectif:** Identifier toutes les pages avec champs de montant et vérifier leur conformité à la préférence de devise (€/MGA) depuis les paramètres.

**Résultat:** Sur 10+ pages identifiées, seulement 2 pages sont **conformes** (utilisent CurrencyInput/CurrencyDisplay). Les autres pages ont des montants codés en dur avec "Ar" ou "MGA".

---

## 1. PAGES AVEC CHAMPS DE MONTANT

### ✅ PAGES CONFORMES (lisent la préférence de devise)

#### 1.1 AddTransactionPage.tsx
- **Fichier:** `frontend/src/pages/AddTransactionPage.tsx`
- **Composant utilisé:** `CurrencyInput` (ligne 345)
- **État devise:** `transactionCurrency` (ligne 39) - initialisé à 'MGA'
- **Comportement:** 
  - ✅ Utilise `CurrencyInput` avec toggle EUR/MGA
  - ✅ Gère `transactionCurrency` dans le state
  - ⚠️ **PROBLÈME:** Initialisé à 'MGA' par défaut, ne lit pas la préférence depuis Settings
  - ⚠️ Affichage des comptes: `{account.balance.toLocaleString('fr-FR')} MGA` (ligne 453) - codé en dur

#### 1.2 GoalsPage.tsx
- **Fichier:** `frontend/src/pages/GoalsPage.tsx`
- **Composant utilisé:** `CurrencyDisplay` (lignes 141, 149, 245, 255)
- **État devise:** `displayCurrency` (ligne 19) - lit depuis localStorage
- **Comportement:**
  - ✅ Lit `CURRENCY_STORAGE_KEY` depuis localStorage
  - ✅ Écoute l'événement `currencyChanged` depuis Settings
  - ✅ Utilise `CurrencyDisplay` pour tous les montants
  - ✅ **CONFORME** - Respecte la préférence utilisateur

#### 1.3 BudgetsPage.tsx
- **Fichier:** `frontend/src/pages/BudgetsPage.tsx`
- **Composant utilisé:** `CurrencyDisplay` (ligne 11)
- **État devise:** `displayCurrency` (ligne 30) - lit depuis localStorage
- **Comportement:**
  - ✅ Lit `CURRENCY_STORAGE_KEY` depuis localStorage
  - ✅ Écoute l'événement `currencyChanged` depuis Settings
  - ✅ Utilise `CurrencyDisplay` pour l'affichage
  - ⚠️ **PROBLÈME:** Input de montant personnalisé (ligne 701) n'utilise pas CurrencyInput
  - ⚠️ Formatage interne: `toLocaleString('fr-FR') + ' Ar'` (lignes 104, 127, 144, etc.)

#### 1.4 DashboardPage.tsx
- **Fichier:** `frontend/src/pages/DashboardPage.tsx`
- **Composant utilisé:** `CurrencyDisplay` (lignes 355, 383, 411)
- **État devise:** `displayCurrency` (ligne 82) - lit depuis localStorage
- **Comportement:**
  - ✅ Lit la préférence depuis localStorage
  - ✅ Écoute l'événement `currencyChanged`
  - ✅ Utilise `CurrencyDisplay` pour l'affichage
  - ✅ **CONFORME** - Pas de champs de saisie de montant

---

### ❌ PAGES NON CONFORMES (codées en dur avec "Ar" ou "MGA")

#### 2.1 TransferPage.tsx
- **Fichier:** `frontend/src/pages/TransferPage.tsx`
- **Problème:** Input de montant codé en dur avec "Ar" (ligne 268)
- **Code problématique:**
  ```tsx
  <input type="number" ... />
  <div className="absolute right-3 ...">Ar</div>
  ```
- **Affichages codés en dur:**
  - Ligne 268: `Ar` (label du champ)
  - Ligne 289, 311: `{account.balance.toLocaleString('fr-FR')} MGA`
  - Lignes 412, 419, 427, 433, 445: Tous les montants affichés avec `MGA`
  - Ligne 133: Message d'erreur avec `Ar`
- **Action requise:** Remplacer par `CurrencyInput` et utiliser `CurrencyDisplay` pour les affichages

#### 2.2 AddBudgetPage.tsx
- **Fichier:** `frontend/src/pages/AddBudgetPage.tsx`
- **Problème:** Input de montant codé en dur avec "Ar" (ligne 208)
- **Code problématique:**
  ```tsx
  <input type="number" ... />
  <div className="absolute right-3 ...">Ar</div>
  ```
- **Fonction formatCurrency:** Ligne 26-28 - retourne toujours `Ar`
  ```tsx
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('fr-FR')} Ar`;
  };
  ```
- **Action requise:** Remplacer par `CurrencyInput` et supprimer `formatCurrency` ou la modifier

#### 2.3 TransactionDetailPage.tsx
- **Fichier:** `frontend/src/pages/TransactionDetailPage.tsx`
- **Problème:** Fonction `formatCurrency` codée en dur (ligne 347)
- **Code problématique:**
  ```tsx
  const formatCurrency = (amount: number) => {
    return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
  };
  ```
- **Action requise:** Remplacer par `CurrencyDisplay`

#### 2.4 FeeManagementPage.tsx
- **Fichier:** `frontend/src/pages/FeeManagementPage.tsx`
- **Problème:** Inputs de montant avec labels "Ar" (lignes 311, 323, 335)
- **Code problématique:**
  ```tsx
  <label>Montant min (Ar)</label>
  <label>Montant max (Ar)</label>
  <label>Frais fixes (Ar)</label>
  ```
- **Fonction formatCurrency:** Ligne 126 - retourne toujours `Ar`
- **Action requise:** Utiliser `CurrencyInput` pour les champs de saisie

#### 2.5 RecurringTransactionDetailPage.tsx
- **Fichier:** `frontend/src/pages/RecurringTransactionDetailPage.tsx`
- **Problème:** Fonction de formatage codée en dur (ligne 176)
- **Code problématique:**
  ```tsx
  return `${amount.toLocaleString('fr-FR')} Ar`;
  ```
- **Action requise:** Remplacer par `CurrencyDisplay`

#### 2.6 RecurringConfigSection.tsx
- **Fichier:** `frontend/src/components/RecurringConfig/RecurringConfigSection.tsx`
- **Problème:** Affichage de budget codé en dur (ligne 353)
- **Code problématique:**
  ```tsx
  {budget.category} - {budget.amount.toLocaleString('fr-FR')} Ar/mois
  ```
- **Action requise:** Utiliser `CurrencyDisplay` pour l'affichage

#### 2.7 TransactionsPage.tsx
- **Fichier:** `frontend/src/pages/TransactionsPage.tsx`
- **Problème:** Fonction de formatage codée en dur (ligne 149)
- **Code problématique:**
  ```tsx
  return `${Math.abs(amount).toLocaleString('fr-FR')} Ar`;
  ```
- **Action requise:** Remplacer par `CurrencyDisplay`

#### 2.8 AccountDetailPage.tsx
- **Fichier:** `frontend/src/pages/AccountDetailPage.tsx`
- **Problème:** Fonction de formatage codée en dur (ligne 134)
- **Code problématique:**
  ```tsx
  return `${amount.toLocaleString('fr-FR')} Ar`;
  ```
- **Action requise:** Remplacer par `CurrencyDisplay`

#### 2.9 Composants Dashboard/Widgets
- **RecurringTransactionsWidget.tsx:** Ligne 51 - `Ar` codé en dur
- **RecurringTransactionsList.tsx:** Ligne 102 - `Ar` codé en dur
- **Action requise:** Remplacer par `CurrencyDisplay`

---

## 2. COMPOSANTS PARTAGÉS DISPONIBLES

### ✅ CurrencyInput
- **Fichier:** `frontend/src/components/Currency/CurrencyInput.tsx`
- **Fonctionnalité:** Input de nombre avec toggle EUR/MGA intégré
- **Props:**
  - `value`: number | string
  - `onChange`: (value: number, currency: Currency) => void
  - `currency`: Currency ('MGA' | 'EUR')
  - `onCurrencyChange`: (currency: Currency) => void
- **Utilisation actuelle:** AddTransactionPage.tsx uniquement

### ✅ CurrencyDisplay
- **Fichier:** `frontend/src/components/Currency/CurrencyDisplay.tsx`
- **Fonctionnalité:** Affichage de montant avec conversion automatique
- **Props:**
  - `amount`: number
  - `originalCurrency`: string
  - `displayCurrency`: Currency
  - `showConversion`: boolean
  - `size`: 'sm' | 'md' | 'lg'
- **Utilisation actuelle:** GoalsPage, BudgetsPage, DashboardPage

---

## 3. PATTERN DE PRÉFÉRENCE DE DEVISE

### Pattern conforme (à suivre):
```tsx
const CURRENCY_STORAGE_KEY = 'bazarkely_display_currency';

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
```

### Pattern non conforme (à éviter):
```tsx
// ❌ Éviter
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('fr-FR')} Ar`;
};

// ❌ Éviter
<div>Ar</div>

// ❌ Éviter
{amount.toLocaleString('fr-FR')} MGA
```

---

## 4. VALEURS PAR DÉFAUT IDENTIFIÉES

| Page | Valeur par défaut | Source |
|------|-------------------|--------|
| AddTransactionPage | 'MGA' | Hardcodé ligne 39 |
| TransferPage | 'Ar' (affichage) | Hardcodé ligne 268 |
| AddBudgetPage | 'Ar' (affichage) | Hardcodé ligne 208 |
| GoalsPage | localStorage ou 'MGA' | ✅ Conforme |
| BudgetsPage | localStorage ou 'MGA' | ✅ Conforme |
| DashboardPage | localStorage ou 'MGA' | ✅ Conforme |
| TransactionDetailPage | 'Ar' | Hardcodé ligne 347 |
| FeeManagementPage | 'Ar' | Hardcodé lignes 311, 323, 335 |
| RecurringTransactionDetailPage | 'Ar' | Hardcodé ligne 176 |
| RecurringConfigSection | 'Ar' | Hardcodé ligne 353 |
| TransactionsPage | 'Ar' | Hardcodé ligne 149 |
| AccountDetailPage | 'Ar' | Hardcodé ligne 134 |

---

## 5. LISTE DE PRIORITÉ DES CORRECTIONS

### 🔴 PRIORITÉ HAUTE (Pages principales avec input)
1. **TransferPage.tsx** - Page de transfert, input principal
2. **AddBudgetPage.tsx** - Page de création de budget, input principal
3. **FeeManagementPage.tsx** - Page de gestion des frais, 3 inputs de montant

### 🟡 PRIORITÉ MOYENNE (Pages d'affichage)
4. **TransactionDetailPage.tsx** - Détail de transaction
5. **TransactionsPage.tsx** - Liste des transactions
6. **AccountDetailPage.tsx** - Détail de compte
7. **RecurringTransactionDetailPage.tsx** - Détail transaction récurrente

### 🟢 PRIORITÉ BASSE (Composants/widgets)
8. **RecurringConfigSection.tsx** - Section de configuration
9. **RecurringTransactionsWidget.tsx** - Widget dashboard
10. **RecurringTransactionsList.tsx** - Liste de transactions récurrentes

### ⚠️ AMÉLIORATIONS NÉCESSAIRES (Pages partiellement conformes)
11. **AddTransactionPage.tsx** - Initialiser `transactionCurrency` depuis localStorage
12. **BudgetsPage.tsx** - Remplacer l'input personnalisé (ligne 701) par CurrencyInput

---

## 6. RECOMMANDATIONS

### Pour les champs de saisie (input):
- ✅ Utiliser `CurrencyInput` au lieu de `<input type="number">` + label "Ar"
- ✅ Initialiser la devise depuis localStorage au montage
- ✅ Écouter l'événement `currencyChanged` pour les mises à jour en temps réel

### Pour l'affichage (display):
- ✅ Utiliser `CurrencyDisplay` au lieu de `toLocaleString() + ' Ar'`
- ✅ Passer `displayCurrency` depuis le state local
- ✅ Utiliser `originalCurrency="MGA"` pour les données stockées

### Pour les messages d'erreur:
- ✅ Utiliser `CurrencyDisplay` dans les messages d'erreur
- ✅ Éviter les strings codées en dur "Ar" ou "MGA"

---

## 7. STATISTIQUES

- **Total pages identifiées:** 12
- **Pages conformes:** 4 (33%)
- **Pages non conformes:** 8 (67%)
- **Composants partagés disponibles:** 2 (CurrencyInput, CurrencyDisplay)
- **Pattern de préférence:** Défini et fonctionnel (localStorage + événement)

---

**AGENT-2-AMOUNT-AUDIT-COMPLETE**





