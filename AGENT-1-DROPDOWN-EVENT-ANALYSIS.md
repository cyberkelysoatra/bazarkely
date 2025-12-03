# AGENT 1 - ANALYSE FLUX ÉVÉNEMENTS DROPDOWN PRODUITS

**Agent:** Agent 01 - Dropdown Event Flow Analysis  
**Date:** 2025-11-23  
**Objectif:** Analyser le flux d'événements lors de la sélection d'un produit depuis le dropdown pour comprendre pourquoi la ligne vide disparaît immédiatement

---

## 1. DROPDOWN COMPONENT IDENTIFICATION (Identification du composant dropdown)

### 1.1 Composant dropdown utilisé

**Type:** Dropdown inline personnalisé (pas de composant externe)

**Localisation:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Lignes:** 2398-2460

**Code du dropdown:**
```tsx
{/* Search dropdown */}
{showDropdown && searchResults.length > 0 && (
  <div className="absolute z-[9999] mt-1 w-full bg-white border border-[#A8B8A0] rounded-lg shadow-xl max-h-60 overflow-auto left-0">
    {searchResults.map((product) => {
      return (
        <div
          key={product.id}
          onClick={() => {
            // Handler de sélection (lignes 2406-2435)
          }}
          className="p-3 hover:bg-[#F0F3EF] cursor-pointer border-b border-[#E8EDE7] last:border-b-0 transition-colors"
        >
          {/* Contenu produit */}
        </div>
      );
    })}
  </div>
)}
```

### 1.2 Classe z-index utilisée

**Classe z-index:** `z-[9999]` (ligne 2400)

**Code:**
```tsx
<div className="absolute z-[9999] mt-1 w-full bg-white ...">
```

**Confirmation:** ✅ Le dropdown utilise bien `z-[9999]` comme prévu dans la logique d'exclusion

### 1.3 Handlers du dropdown

**Handlers identifiés:**

1. **onClick sur produit** (ligne 2406)
   - Handler inline dans le map des produits
   - Exécute la sélection et ferme le dropdown

2. **handleClickOutside** (lignes 657-670)
   - Ferme le dropdown quand on clique en dehors
   - Utilise `searchInputRef` pour vérifier si le click est en dehors
   - Écoute `mousedown` sur document

**Aucun handler onBlur, onClose, ou onSelect séparé** - tout est géré via onClick inline

---

## 2. SELECTION HANDLER (Handler de sélection)

### 2.1 Fonction de sélection

**Localisation:** Lignes 2406-2435

**Code complet:**
```tsx
onClick={() => {
  // Fill current row with selected product
  const newItems = [...items];
  newItems[index] = {
    ...newItems[index],
    catalogItemId: product.id,
    itemName: product.name,
    description: product.description,
    unit: product.unit || 'unité',
    unitPrice: product.currentPrice || 0,
    totalPrice: (product.currentPrice || 0) * newItems[index].quantity
  };
  
  // Auto-create new empty row
  const newEmptyItem: FormItem = {
    tempId: `temp-${Date.now()}-${Math.random()}`,
    itemName: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalPrice: 0,
    description: '',
    catalogItemId: undefined
  };
  
  setItems([...newItems, newEmptyItem]);
  setSearchQuery('');
  setSearchResults([]);
  setShowDropdown(false);  // ⚠️ FERME LE DROPDOWN IMMÉDIATEMENT
}}
```

### 2.2 Changements d'état déclenchés

**Séquence d'état lors de la sélection:**

1. **`setItems([...newItems, newEmptyItem])`** (ligne 2431)
   - Met à jour la liste des items
   - Ajoute une nouvelle ligne vide

2. **`setSearchQuery('')`** (ligne 2432)
   - Réinitialise la requête de recherche

3. **`setSearchResults([])`** (ligne 2433)
   - Vide les résultats de recherche

4. **`setShowDropdown(false)`** (ligne 2434)
   - ⚠️ **FERME LE DROPDOWN IMMÉDIATEMENT**
   - C'est ici que le problème commence

### 2.3 Impact sur isTableFocused

**Analyse:**
- ❌ Le handler de sélection **NE modifie PAS** directement `isTableFocused`
- ❌ Aucun appel à `setIsTableFocused(true)` dans le handler
- ⚠️ Le problème vient du fait que le dropdown est fermé, ce qui déclenche le document click listener

---

## 3. EXCLUSION LOGIC (Logique d'exclusion)

### 3.1 Code d'exclusion actuel

**Localisation:** Lignes 1733-1737

**Code:**
```tsx
// Exclude dropdown from click detection
const clickedOnDropdown = (target as Element)?.closest('[class*="z-[9999]"]') !== null;
if (clickedOnDropdown) {
  return; // Ignore clicks on dropdown
}
```

### 3.2 Sélecteur utilisé

**Sélecteur actuel:** `[class*="z-[9999]"]`

**Méthode:** `closest()` pour trouver un ancêtre avec la classe contenant `z-[9999]`

**Classe réelle du dropdown:** `z-[9999]` (ligne 2400)

**Match status:** ✅ **MATCH** - Le sélecteur devrait trouver le dropdown

### 3.3 Problème identifié

**Problème de timing:**

1. **Click sur produit** → Handler onClick s'exécute
2. **`setShowDropdown(false)`** → Dropdown retiré du DOM (React re-render)
3. **Event propagation** → Click event se propage au document
4. **Document click listener** → S'exécute APRÈS le re-render
5. **`closest('[class*="z-[9999]"]')`** → ❌ **NE TROUVE RIEN** car le dropdown n'est plus dans le DOM
6. **Click détecté comme "outside table"** → `setIsTableFocused(false)`
7. **Ligne vide disparaît** → `isTableFocused` est false

**Conclusion:** Le dropdown est fermé **AVANT** que le document click listener ne puisse vérifier s'il était sur le dropdown. C'est un problème d'ordre d'exécution/timing.

---

## 4. EVENT SEQUENCE (Séquence d'événements)

### 4.1 Séquence complète lors de la sélection

**Ordre d'exécution:**

```
1. User clicks on product in dropdown
   ↓
2. onClick handler executes (ligne 2406)
   ↓
3. setItems([...newItems, newEmptyItem]) - Update items state
   ↓
4. setSearchQuery('') - Clear search query
   ↓
5. setSearchResults([]) - Clear search results
   ↓
6. setShowDropdown(false) - ⚠️ CLOSE DROPDOWN IMMEDIATELY
   ↓
7. React re-renders (dropdown removed from DOM)
   ↓
8. Click event propagates to document
   ↓
9. handleDocumentClick executes (ligne 1730)
   ↓
10. clickedOnDropdown check (ligne 1734)
    - closest('[class*="z-[9999]"]') → ❌ RETURNS NULL
    - Dropdown no longer in DOM!
   ↓
11. clickedInside check (ligne 1740)
    - tableContainerRef.current?.contains(target)
    - ⚠️ Click was on dropdown (now removed), so returns false
   ↓
12. else block executes (ligne 1750)
    - hasProducts = true (product was just added)
    - setIsTableFocused(false) - ⚠️ HIDE EMPTY ROW
   ↓
13. Empty row disappears (ligne 2331)
```

### 4.2 Problème de race condition

**Race condition identifiée:**

- Le dropdown est fermé **SYNCHRONEMENT** dans le handler onClick
- Le document click listener s'exécute **APRÈS** le re-render React
- Le dropdown n'est plus dans le DOM quand `closest()` est appelé
- Le click est détecté comme "outside table" alors qu'il était sur le dropdown

**Timing:**
- Handler onClick: **Immédiat** (synchronisé)
- React re-render: **Immédiat** (synchronisé)
- Document click listener: **Après propagation** (asynchrone par rapport au handler)

---

## 5. ROOT CAUSE (Cause racine)

### 5.1 Cause principale

**Problème:** Le dropdown est fermé **AVANT** que le document click listener ne puisse vérifier s'il était sur le dropdown, causant une détection incorrecte du click comme étant "outside table".

**Détails techniques:**

1. **Fermeture prématurée du dropdown:**
   - `setShowDropdown(false)` est appelé dans le handler onClick (ligne 2434)
   - Le dropdown est retiré du DOM immédiatement lors du re-render React
   - Le document click listener s'exécute après, mais le dropdown n'existe plus

2. **Échec de la détection d'exclusion:**
   - `closest('[class*="z-[9999]"]')` ne trouve rien car le dropdown n'est plus dans le DOM
   - Le click est traité comme étant "outside table"
   - `setIsTableFocused(false)` est appelé incorrectement

3. **Conséquence:**
   - La ligne vide disparaît immédiatement après la sélection
   - L'utilisateur voit brièvement la ligne vide (1 seconde) puis elle disparaît

### 5.2 Pourquoi ça fonctionne avec d'autres interactions

**Avec d'autres interactions (ex: clic direct dans la table):**
- Pas de fermeture de dropdown
- Le document click listener détecte correctement le click "inside table"
- `setIsTableFocused(true)` est appelé
- La ligne vide reste visible

**Avec sélection dropdown:**
- Dropdown fermé immédiatement
- Document click listener ne trouve pas le dropdown
- Click détecté comme "outside table"
- `setIsTableFocused(false)` appelé
- Ligne vide disparaît

---

## 6. RECOMMENDED FIX (Correction recommandée)

### 6.1 Solution 1: Délai avant fermeture dropdown (RECOMMANDÉ)

**Approche:** Ajouter un petit délai avant de fermer le dropdown pour permettre au document click listener de s'exécuter d'abord.

**Code modifié (lignes 2406-2435):**

```tsx
onClick={() => {
  // Fill current row with selected product
  const newItems = [...items];
  newItems[index] = {
    ...newItems[index],
    catalogItemId: product.id,
    itemName: product.name,
    description: product.description,
    unit: product.unit || 'unité',
    unitPrice: product.currentPrice || 0,
    totalPrice: (product.currentPrice || 0) * newItems[index].quantity
  };
  
  // Auto-create new empty row
  const newEmptyItem: FormItem = {
    tempId: `temp-${Date.now()}-${Math.random()}`,
    itemName: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalPrice: 0,
    description: '',
    catalogItemId: undefined
  };
  
  setItems([...newItems, newEmptyItem]);
  setSearchQuery('');
  setSearchResults([]);
  
  // ✅ FIX: Delay closing dropdown to allow document click listener to execute first
  setTimeout(() => {
    setShowDropdown(false);
  }, 0); // Use setTimeout with 0ms to defer to next event loop tick
  
  // ✅ FIX: Ensure table stays focused after product selection
  setIsTableFocused(true);
}}
```

**Avantages:**
- Simple à implémenter
- Permet au document click listener de s'exécuter d'abord
- Maintient le focus sur la table

### 6.2 Solution 2: Vérifier le dropdown avant fermeture

**Approche:** Vérifier si le click était sur le dropdown avant de fermer, et ne pas fermer si c'était le cas.

**Code modifié (lignes 2406-2435):**

```tsx
onClick={(e) => {
  // ✅ FIX: Stop event propagation to prevent document click listener from firing
  e.stopPropagation();
  
  // Fill current row with selected product
  const newItems = [...items];
  newItems[index] = {
    ...newItems[index],
    catalogItemId: product.id,
    itemName: product.name,
    description: product.description,
    unit: product.unit || 'unité',
    unitPrice: product.currentPrice || 0,
    totalPrice: (product.currentPrice || 0) * newItems[index].quantity
  };
  
  // Auto-create new empty row
  const newEmptyItem: FormItem = {
    tempId: `temp-${Date.now()}-${Math.random()}`,
    itemName: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    totalPrice: 0,
    description: '',
    catalogItemId: undefined
  };
  
  setItems([...newItems, newEmptyItem]);
  setSearchQuery('');
  setSearchResults([]);
  setShowDropdown(false);
  
  // ✅ FIX: Ensure table stays focused after product selection
  setIsTableFocused(true);
}}
```

**Avantages:**
- Empêche la propagation du click au document
- Le document click listener ne s'exécute pas
- Plus direct et prévisible

### 6.3 Solution 3: Améliorer la logique d'exclusion

**Approche:** Améliorer la logique d'exclusion pour vérifier le dropdown même s'il est en train de se fermer.

**Code modifié (lignes 1728-1769):**

```tsx
// Detect clicks inside/outside table to control empty row visibility
useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node;
    
    // ✅ FIX: Check if click was on dropdown using multiple methods
    const clickedOnDropdown = 
      (target as Element)?.closest('[class*="z-[9999]"]') !== null ||
      (target as Element)?.closest('[class*="dropdown"]') !== null ||
      searchInputRef.current?.contains(target) || // Check if click was in search input area
      (target as Element)?.closest('.product-search-dropdown') !== null; // Add specific class
    
    if (clickedOnDropdown) {
      // ✅ FIX: Keep table focused when clicking on dropdown
      setIsTableFocused(true);
      return; // Ignore clicks on dropdown
    }
    
    // Check if click is inside or outside table container
    const clickedInside = tableContainerRef.current?.contains(target) ?? false;
    
    if (clickedInside) {
      // Clicked inside table → show empty row (if products exist)
      setIsTableFocused(true);
      // Clear any pending blur timeout
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    } else {
      // Clicked outside table → hide empty row (if products exist)
      const hasProducts = itemsRef.current.some(item => item.itemName || item.catalogItemId);
      if (hasProducts) {
        setIsTableFocused(false);
      }
    }
  };

  // Attach listener to document
  document.addEventListener('click', handleDocumentClick);
  
  // Cleanup on unmount
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, []); // Empty dependency array
```

**Avantages:**
- Plus robuste
- Vérifie plusieurs méthodes pour détecter le dropdown
- Maintient le focus même si le dropdown est fermé

### 6.4 Solution recommandée (combinaison)

**Solution combinée (Solution 1 + Solution 2):**

**Modifications requises:**

1. **Dans le handler onClick du produit (ligne 2406):**
```tsx
onClick={(e) => {
  // ✅ FIX 1: Stop event propagation
  e.stopPropagation();
  
  // ... existing code ...
  
  setItems([...newItems, newEmptyItem]);
  setSearchQuery('');
  setSearchResults([]);
  
  // ✅ FIX 2: Delay closing dropdown
  setTimeout(() => {
    setShowDropdown(false);
  }, 0);
  
  // ✅ FIX 3: Ensure table stays focused
  setIsTableFocused(true);
}}
```

2. **Dans le document click listener (ligne 1734):**
```tsx
// ✅ FIX: Also check searchInputRef to catch clicks in search area
const clickedOnDropdown = 
  (target as Element)?.closest('[class*="z-[9999]"]') !== null ||
  searchInputRef.current?.contains(target);
  
if (clickedOnDropdown) {
  setIsTableFocused(true); // ✅ Keep table focused
  return;
}
```

**Avantages de la solution combinée:**
- ✅ Empêche la propagation du click (Solution 2)
- ✅ Délai de sécurité si la propagation échoue (Solution 1)
- ✅ Maintient le focus sur la table (Solution 3)
- ✅ Robuste contre les cas limites

---

## 7. RÉSUMÉ

### 7.1 Problème identifié

**Symptôme:** Ligne vide disparaît immédiatement après sélection d'un produit depuis le dropdown

**Cause racine:** Le dropdown est fermé avant que le document click listener ne puisse vérifier s'il était sur le dropdown, causant une détection incorrecte du click comme étant "outside table"

### 7.2 Séquence d'événements problématique

1. Click sur produit → Handler onClick
2. `setShowDropdown(false)` → Dropdown retiré du DOM
3. Click event propagation → Document click listener
4. `closest('[class*="z-[9999]"]')` → ❌ Ne trouve rien (dropdown retiré)
5. Click détecté comme "outside table" → `setIsTableFocused(false)`
6. Ligne vide disparaît

### 7.3 Solution recommandée

**Combinaison de 3 fixes:**

1. **`e.stopPropagation()`** dans le handler onClick pour empêcher la propagation
2. **`setTimeout(() => setShowDropdown(false), 0)`** pour délai de sécurité
3. **`setIsTableFocused(true)`** pour maintenir le focus après sélection
4. **Améliorer la logique d'exclusion** pour vérifier `searchInputRef`

**Complexité:** LOW - Modifications simples et ciblées

**Risque:** LOW - Pas de changement de logique métier, seulement correction de timing

---

**AGENT-1-DROPDOWN-EVENT-ANALYSIS-COMPLETE**


