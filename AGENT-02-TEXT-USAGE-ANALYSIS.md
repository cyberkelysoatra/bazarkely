# AGENT 02 - ANALYSE USAGE TEXTE "ÉCONOMISER" → "ENREGISTRER"
## Add Expense Page: Changement texte bouton

**Date:** 2026-01-19  
**Agent:** Agent 02 - Text Usage Analysis  
**Version:** BazarKELY v2.4.6  
**Objectif:** Analyser où et comment le texte "Économiser" est utilisé pour déterminer comment le changer en "Enregistrer" UNIQUEMENT sur Add Expense page

---

## 📋 RÉSUMÉ

**Demande:** Changer texte bouton de "Économiser" à "Enregistrer" UNIQUEMENT sur Add Expense page.

**Résultat recherche:** ❌ **AUCUNE occurrence de "Économiser" trouvée** dans le codebase.

**Texte actuel:** Le bouton dans AddTransactionPage utilise déjà **"Enregistrer"** (ligne 674).

---

## 1. ALL OCCURRENCES

### 1.1 Recherche "Économiser"

**Résultat:** ❌ **AUCUNE occurrence exacte trouvée**

**Recherche effectuée:**
- `grep "Économiser"` dans `frontend/src/` → **0 résultat**
- `grep -i "economiser"` dans `frontend/src/` → **1 résultat** (commentaire seulement)

**Seule occurrence trouvée (commentaire, non UI):**
- `frontend/src/services/SafariStorageFallback.ts` ligne 57:
  ```typescript
  // Activer la compression sur iOS pour économiser l'espace
  ```
  ⚠️ **Commentaire de code, pas texte UI**

### 1.2 Recherche Textes Similaires

**"Enregistrer":**
- ✅ Trouvé dans `AddTransactionPage.tsx` ligne 674 (texte actuel du bouton)
- ✅ Trouvé dans `AddBudgetPage.tsx` ligne 302
- ✅ Trouvé dans `TransactionDetailPage.tsx` ligne 1281 ("Sauvegarder")

**"Sauvegarder":**
- ✅ Trouvé dans `TransactionDetailPage.tsx` ligne 1281 (bouton édition)
- ✅ Trouvé dans `FamilySettingsPage.tsx` ligne 171
- ✅ Trouvé dans `NotificationPreferencesPage.tsx` ligne 432

**Conclusion:** Le texte "Économiser" n'existe pas dans le codebase actuel. Le texte actuel est déjà "Enregistrer".

---

## 2. USAGE ANALYSIS

### 2.1 AddTransactionPage - Bouton Submit

**Fichier:** `frontend/src/pages/AddTransactionPage.tsx`  
**Lignes:** 659-677

**Code actuel:**
```tsx
<button
  type="submit"
  disabled={isLoading}
  className={`flex-1 px-6 py-3 rounded-lg font-semibold text-white transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
    isIncome 
      ? 'bg-green-600 hover:bg-green-700' 
      : 'bg-red-600 hover:bg-red-700'
  }`}
>
  <Save className="w-5 h-5" />
  <span>
    {isLoading 
      ? 'Enregistrement...' 
      : isRecurring 
        ? 'Créer la récurrence' 
        : 'Enregistrer'  // ⚠️ Texte actuel ligne 674
    }
  </span>
</button>
```

**Logique actuelle:**
- Si `isLoading` → "Enregistrement..."
- Si `isRecurring` → "Créer la récurrence"
- Sinon → **"Enregistrer"** (pour income ET expense)

**Type de transaction déterminé:**
- Ligne 27: `const transactionType = searchParams.get('type') || 'expense';`
- Ligne 424: `const isIncome = transactionType === 'income';`

### 2.2 Autres Pages Utilisant "Enregistrer"

**AddBudgetPage.tsx (ligne 302):**
```tsx
<span>{isLoading ? 'Enregistrement...' : 'Enregistrer'}</span>
```

**TransactionDetailPage.tsx (ligne 1281):**
```tsx
<span>Sauvegarder</span>  // ⚠️ Utilise "Sauvegarder", pas "Enregistrer"
```

**AddAccountPage.tsx (ligne 211):**
```tsx
<span>{isLoading ? 'Création...' : 'Créer'}</span>  // ⚠️ Utilise "Créer"
```

**TransferPage.tsx (ligne 992):**
```tsx
{isLoading 
  ? 'Transfert en cours...' 
  : isRecurring 
    ? 'Créer la récurrence' 
    : 'Effectuer le transfert'  // ⚠️ Texte spécifique
}
```

**Conclusion:** Chaque page utilise son propre texte hardcodé. Aucun fichier de constantes partagé.

---

## 3. TEXT SOURCE

### 3.1 Source du Texte

**Type:** ✅ **HARDCODÉ directement dans le composant**

**Fichier:** `frontend/src/pages/AddTransactionPage.tsx`  
**Ligne:** 674  
**Méthode:** String littérale dans JSX

**Aucun fichier de constantes:**
- ❌ Pas de fichier `frontend/src/constants/buttonTexts.ts`
- ❌ Pas de fichier `frontend/src/i18n/` (pas de système de traduction)
- ❌ Pas de fichier `frontend/src/utils/texts.ts`

**Fichier de constantes existant:**
- ✅ `frontend/src/constants/index.ts` existe mais ne contient PAS de textes de boutons
- Contient: ACCOUNT_TYPES, TRANSACTION_CATEGORIES, ERROR_MESSAGES, SUCCESS_MESSAGES, etc.
- ❌ Pas de constantes pour textes de boutons

### 3.2 Système de Traduction

**Recherche i18n:**
- ❌ Aucun fichier `i18n.ts` trouvé
- ❌ Aucun système de traduction détecté
- ✅ Tous les textes sont hardcodés en français

**Conclusion:** Le texte est **hardcodé directement dans le composant**, pas dans un fichier de constantes ou de traduction.

---

## 4. SHARED vs SPECIFIC

### 4.1 Texte Partagé ou Spécifique?

**Analyse AddTransactionPage:**

**Texte actuel (ligne 674):**
```tsx
: 'Enregistrer'  // ⚠️ Utilisé pour income ET expense
```

**Utilisation:**
- ✅ **Partagé** entre Add Income et Add Expense
- ✅ Même texte pour les deux types de transaction
- ✅ Pas de distinction basée sur `transactionType` ou `isIncome`

**Logique conditionnelle actuelle:**
```tsx
{isLoading 
  ? 'Enregistrement...' 
  : isRecurring 
    ? 'Créer la récurrence' 
    : 'Enregistrer'  // ⚠️ Même texte pour income et expense
}
```

### 4.2 Comparaison avec Autres Pages

**AddBudgetPage:**
- Texte: "Enregistrer" (spécifique à cette page)

**AddAccountPage:**
- Texte: "Créer" (spécifique à cette page)

**TransactionDetailPage:**
- Texte: "Sauvegarder" (spécifique à cette page)

**TransferPage:**
- Texte: "Effectuer le transfert" (spécifique à cette page)

**Conclusion:** Chaque page a son propre texte hardcodé. Le texte dans AddTransactionPage est **partagé** entre income et expense, mais **spécifique** à cette page (pas utilisé ailleurs).

---

## 5. IMPACT ASSESSMENT

### 5.1 Impact si Changement dans AddTransactionPage

**Scénario 1: Changer uniquement pour Expense**

**Modification proposée:**
```tsx
: isIncome 
  ? 'Enregistrer'  // Garde "Enregistrer" pour income
  : 'Enregistrer'  // Change en "Enregistrer" pour expense (déjà le cas)
```

**Impact:**
- ✅ **Aucun impact** sur Add Income page (reste "Enregistrer")
- ✅ **Aucun impact** sur autres pages (textes indépendants)
- ✅ **Aucun impact** sur TransactionDetailPage (utilise "Sauvegarder")
- ✅ **Aucun impact** sur AddBudgetPage (utilise "Enregistrer" indépendamment)

**Conclusion:** Le changement serait isolé à AddTransactionPage uniquement.

### 5.2 Pages Affectées

**Si changement ligne 674 AddTransactionPage:**

**Pages affectées:**
- ✅ `/add-transaction?type=expense` - Add Expense page
- ✅ `/add-transaction?type=income` - Add Income page (si on garde la même logique)

**Pages NON affectées:**
- ✅ `/add-transaction` (défaut expense) - Affecté si expense
- ✅ `/add-budget` - Texte indépendant
- ✅ `/add-account` - Texte indépendant
- ✅ `/transaction/:id` - Texte indépendant ("Sauvegarder")
- ✅ `/transfer` - Texte indépendant

**Conclusion:** Seule AddTransactionPage serait affectée, avec possibilité de distinguer income vs expense.

---

## 6. ISOLATION STRATEGY

### 6.1 Stratégie pour Changer UNIQUEMENT Add Expense

**Option 1: Condition basée sur `isIncome` (RECOMMANDÉ)**

**Code actuel:**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : 'Enregistrer'  // ⚠️ Même texte pour income et expense
  }
</span>
```

**Code modifié:**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : isIncome 
        ? 'Enregistrer'  // Garde "Enregistrer" pour income
        : 'Enregistrer'  // Change en "Enregistrer" pour expense (déjà le cas)
  }
</span>
```

**Note:** Le texte est déjà "Enregistrer" pour expense. Si l'utilisateur veut un texte différent, il faudrait spécifier quel texte exactement.

**Option 2: Condition basée sur `transactionType`**

**Code modifié:**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : transactionType === 'expense'
        ? 'Enregistrer'  // Texte pour expense
        : 'Enregistrer'  // Texte pour income
  }
</span>
```

**Avantage:** Plus explicite, utilise directement `transactionType` au lieu de `isIncome`.

### 6.2 Si Texte Différent Nécessaire

**Si l'utilisateur veut un texte différent pour expense (ex: "Sauvegarder"):**

**Code modifié:**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : isIncome 
        ? 'Enregistrer'  // Texte pour income
        : 'Sauvegarder'  // Texte différent pour expense
  }
</span>
```

**Impact:**
- ✅ Add Income → "Enregistrer" (inchangé)
- ✅ Add Expense → "Sauvegarder" (changé)
- ✅ Autres pages → Aucun impact

---

## 7. RECOMMENDATION

### 7.1 Situation Actuelle

**Texte actuel:** "Enregistrer" (déjà présent pour expense)

**Si l'utilisateur veut changer de "Économiser" à "Enregistrer":**
- ✅ Le texte est **déjà "Enregistrer"** dans le code actuel
- ⚠️ "Économiser" n'existe pas dans le codebase

**Hypothèses possibles:**
1. L'utilisateur voit "Économiser" dans une version antérieure ou en production
2. L'utilisateur veut confirmer que le texte est bien "Enregistrer"
3. L'utilisateur veut un texte différent de "Enregistrer" pour expense

### 7.2 Recommandation

**Si changement nécessaire (texte différent pour expense):**

**Option A: Créer constante locale dans composant (RECOMMANDÉ)**

**Code modifié:**
```tsx
// En haut du composant, après les hooks
const getSubmitButtonText = () => {
  if (isLoading) return 'Enregistrement...';
  if (isRecurring) return 'Créer la récurrence';
  if (isIncome) return 'Enregistrer';
  return 'Enregistrer';  // Ou autre texte pour expense
};

// Dans le JSX
<span>{getSubmitButtonText()}</span>
```

**Avantages:**
- ✅ Logique centralisée et lisible
- ✅ Facile à modifier
- ✅ Pas de fichier de constantes nécessaire (texte spécifique à cette page)

**Option B: Constante dans fichier constants (si texte partagé)**

**Si le texte doit être partagé avec d'autres pages:**
```tsx
// frontend/src/constants/index.ts
export const BUTTON_TEXTS = {
  SAVE_EXPENSE: 'Enregistrer',
  SAVE_INCOME: 'Enregistrer',
  SAVE_BUDGET: 'Enregistrer',
  // ...
} as const;

// Dans AddTransactionPage.tsx
import { BUTTON_TEXTS } from '../constants';

<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : isIncome 
        ? BUTTON_TEXTS.SAVE_INCOME
        : BUTTON_TEXTS.SAVE_EXPENSE
  }
</span>
```

**Avantages:**
- ✅ Centralisé si texte partagé
- ✅ Facile à maintenir

**Inconvénients:**
- ⚠️ Overhead si texte utilisé uniquement dans une page

### 7.3 Recommandation Finale

**Pour changement UNIQUEMENT dans Add Expense:**

**✅ Option A recommandée:** Fonction locale dans composant

**Justification:**
1. ✅ Texte spécifique à AddTransactionPage uniquement
2. ✅ Pas besoin de fichier de constantes (overhead inutile)
3. ✅ Logique claire et facile à modifier
4. ✅ Isolation parfaite (aucun impact sur autres pages)

**Code recommandé:**
```tsx
// Dans AddTransactionPage.tsx, après ligne 28
const getSubmitButtonText = () => {
  if (isLoading) return 'Enregistrement...';
  if (isRecurring) return 'Créer la récurrence';
  // Texte différent pour expense si nécessaire
  return isIncome ? 'Enregistrer' : 'Enregistrer';
};

// Ligne 669-675, remplacer par:
<span>{getSubmitButtonText()}</span>
```

---

## 8. CODE TRANSFORMATION EXACTE

### 8.1 Si Texte Déjà "Enregistrer"

**Situation actuelle:**
- Texte expense: "Enregistrer" ✅
- Texte income: "Enregistrer" ✅

**Action:** Aucune modification nécessaire si texte déjà correct.

### 8.2 Si Changement Nécessaire (Exemple: "Sauvegarder" pour Expense)

**AVANT (ligne 669-675):**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : 'Enregistrer'
  }
</span>
```

**APRÈS (Option 1 - Inline condition):**
```tsx
<span>
  {isLoading 
    ? 'Enregistrement...' 
    : isRecurring 
      ? 'Créer la récurrence' 
      : isIncome 
        ? 'Enregistrer' 
        : 'Enregistrer'  // Ou autre texte pour expense
  }
</span>
```

**APRÈS (Option 2 - Fonction helper, RECOMMANDÉ):**
```tsx
// Après ligne 28, ajouter:
const getSubmitButtonText = () => {
  if (isLoading) return 'Enregistrement...';
  if (isRecurring) return 'Créer la récurrence';
  return isIncome ? 'Enregistrer' : 'Enregistrer';  // Ou autre texte
};

// Ligne 669-675, remplacer par:
<span>{getSubmitButtonText()}</span>
```

---

## 9. FICHIERS CONCERNÉS

### 9.1 Fichier Principal

**`frontend/src/pages/AddTransactionPage.tsx`**
- **Ligne 27:** `transactionType` déterminé depuis URL params
- **Ligne 424:** `isIncome` calculé depuis `transactionType`
- **Ligne 669-675:** Texte bouton submit (à modifier si nécessaire)

### 9.2 Fichiers NON Affectés

- ✅ `AddBudgetPage.tsx` - Texte indépendant
- ✅ `AddAccountPage.tsx` - Texte indépendant
- ✅ `TransactionDetailPage.tsx` - Texte indépendant
- ✅ `TransferPage.tsx` - Texte indépendant
- ✅ `frontend/src/constants/index.ts` - Pas de constantes boutons

---

## 10. CONCLUSION

### 10.1 Résumé Analyse

✅ **AUCUNE occurrence de "Économiser" trouvée** dans le codebase  
✅ **Texte actuel:** "Enregistrer" (déjà présent pour expense)  
✅ **Source:** Hardcodé directement dans `AddTransactionPage.tsx` ligne 674  
✅ **Partagé:** Texte partagé entre income et expense dans même composant  
✅ **Isolation:** Changement isolé à AddTransactionPage uniquement  
✅ **Impact:** Aucun impact sur autres pages (textes indépendants)

### 10.2 Recommandation

**Si texte déjà "Enregistrer":**
- ✅ **Aucune modification nécessaire**

**Si changement nécessaire (texte différent pour expense):**
- ✅ **Option recommandée:** Fonction helper locale dans composant
- ✅ **Code:** Ajouter `getSubmitButtonText()` après ligne 28
- ✅ **Modification:** Remplacer ligne 669-675 par `<span>{getSubmitButtonText()}</span>`

### 10.3 Prochaines Étapes

1. ✅ Confirmer avec utilisateur si texte actuel "Enregistrer" est correct
2. ✅ Si changement nécessaire, spécifier texte exact souhaité pour expense
3. ✅ Appliquer modification avec fonction helper recommandée
4. ✅ Tester sur `/add-transaction?type=expense` et `/add-transaction?type=income`

---

**AGENT-2-TEXT-USAGE-COMPLETE**
