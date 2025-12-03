# 📋 RÉSUMÉ SESSION - 25 NOVEMBRE 2025 (APRÈS-MIDI)
## PurchaseOrderForm.tsx - Optimisations UI et État GOLDEN

---

## ⚠️ 1. CONTEXTE CRITIQUE

### ⚠️ AVERTISSEMENT IMPORTANT
**TRAVAIL PERDU :** Cette session de 6 heures a abouti à un **ÉTAT GOLDEN validé par l'utilisateur**, mais des tentatives ultérieures de correction du drag-and-drop ont causé des **régressions critiques** nécessitant un **rollback Git complet**. 

**TOUT LE TRAVAIL VALIDÉ A ÉTÉ PERDU** mais est **intégralement documenté** dans ce fichier pour recréation immédiate.

### État Actuel
- **Fichier actuel :** État pré-session (avant optimisations)
- **État GOLDEN :** Perdu mais documenté ci-dessous
- **Durée session :** ~6 heures
- **Validations utilisateur :** "Je suis vraiment satisfait" (padding p-3)

### Ce qui a été perdu
1. ✅ Padding optimisé (p-3 validé)
2. ✅ Colonnes extrêmes optimisées (drag handle + trash)
3. ✅ Logique à 3 types de lignes vides
4. ✅ Système de visibilité stabilisé (itemsRef + document click listener)
5. ✅ Helpers restaurés (isRowFilled, isLastEmptyRow)
6. ✅ Delete button conditionnel sur lignes remplies

---

## ✨ 2. ÉTAT GOLDEN ATTEINT

### 2.1 Padding Validé (p-3)

**Location :** Lignes 1696-1697

**Code GOLDEN :**
```typescript
<Card className="mb-6 border-2 rounded-lg p-3" style={{ backgroundColor: '#E8EDE7', borderColor: '#A8B8A0' }}>
  <div className="p-3">
```

**Validation utilisateur :** "Je suis vraiment satisfait" - 6 heures de travail pour obtenir ce padding exact.

**État actuel :** `p-6` (incorrect, doit être restauré à `p-3`)

---

### 2.2 Colonnes Extrêmes Optimisées

#### 2.2.1 Drag Handle Column (Gauche)

**Location :** Lignes 86-108 (SortableRow component)

**Code GOLDEN :**
```typescript
<td className="p-0 text-left" style={index === 0 ? { paddingTop: '4px' } : {}}>
  <div
    {...attributes}
    {...listeners}
    className="cursor-move hover:text-blue-600 transition-colors flex items-center justify-start pl-0 pr-0 py-1"
    title="Glisser pour réorganiser"
  >
    <svg>...</svg>
  </div>
</td>
```

**Header (Ligne ~2208) :**
```typescript
<th className="bg-[#E8EDE7] p-0 w-6 sm:w-8">
  <span className="sr-only">Drag handle</span>
</th>
```

**Optimisations :**
- `pr-0` (pas de padding droite)
- `py-1` (padding vertical minimal)
- `p-0` sur le `<th>` (pas de padding)
- `w-6 sm:w-8` (largeur réduite)

#### 2.2.2 Trash Icon Column (Droite)

**Location :** Lignes ~2485-2496

**Code GOLDEN :**
```typescript
<td className="p-0 pr-1" style={index === 0 ? { paddingTop: '4px' } : {}}>
  {/* Only show delete button if row is filled and there's more than one row */}
  {isFilled && items.length > 1 && (
    <button
      type="button"
      onClick={() => handleRemoveItem(index)}
      className="text-red-600 hover:text-red-700 transition-colors flex items-center justify-end"
      title="Supprimer"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  )}
</td>
```

**Header (Ligne ~2214) :**
```typescript
<th className="bg-[#E8EDE7] p-0 w-4 sm:w-5 md:w-6"></th>
```

**Optimisations :**
- `pr-1` (petit padding droite)
- `justify-end` (alignement à droite)
- `w-4 sm:w-5 md:w-6` (largeur réduite)
- Condition `isFilled` pour affichage conditionnel

---

### 2.3 Logique à 3 Types de Lignes Vides

**Location :** Lignes ~1680-1690 (helpers) et ~2230-2240 (rendering)

**Code GOLDEN - Helpers :**
```typescript
// Helper to check if row is filled
const isRowFilled = (item: FormItem) => {
  return Boolean(item.itemName || item.catalogItemId);
};

// Helper to check if this is the last empty row
const isLastEmptyRow = (index: number) => {
  const hasProducts = items.some(item => item.itemName || item.catalogItemId);
  const isLast = index === items.length - 1;
  const isEmpty = !items[index].itemName && !items[index].catalogItemId;
  return hasProducts && isLast && isEmpty;
};
```

**Code GOLDEN - Rendering Logic :**
```typescript
{items.map((item, index) => {
  const itemId = item.tempId || `item-${index}`;
  
  // Determine row type
  const isFilled = isRowFilled(item);
  const isLast = isLastEmptyRow(index);
  
  // Visibility logic for last empty row
  if (isLast && !isTableFocused) {
    return null; // Hide last empty row when not focused
  }
  
  return (
    <SortableRow key={itemId} id={itemId} index={index}>
      {/* ... cells ... */}
      <td className="p-0 pr-1">
        {isFilled && items.length > 1 && (
          <button>...</button>
        )}
      </td>
    </SortableRow>
  );
})}
```

**Règles de visibilité :**
- **Type 1 - Première ligne vide (pas de produits) :** Toujours visible, jamais cachée
- **Type 2 - Lignes remplies :** Toujours visibles, drag handle + delete button
- **Type 3 - Dernière ligne vide (avec produits) :** Visible si `isTableFocused === true`, cachée sinon

---

### 2.4 Système de Visibilité Stabilisé

**Location :** Lignes ~168-174 (refs) et ~1435-1467 (useEffect)

**Code GOLDEN - Refs :**
```typescript
// Timer ref for blur delay
const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

// Ref for table container to detect clicks inside/outside
const tableContainerRef = useRef<HTMLDivElement | null>(null);

// Ref for items to access current value in document click listener without re-running effect
const itemsRef = useRef(items);
```

**Code GOLDEN - Document Click Listener :**
```typescript
// Update itemsRef when items change (for document click listener)
useEffect(() => {
  itemsRef.current = items;
}, [items]);

// Detect clicks inside/outside table to control empty row visibility
useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node;
    
    // Exclude dropdown from click detection
    const clickedOnDropdown = (target as Element)?.closest('[class*="z-[9999]"]') !== null;
    if (clickedOnDropdown) {
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
      // But keep visible if no products (first empty row case)
      // Use itemsRef to access current value without re-running effect
      const hasProducts = itemsRef.current.some(item => item.itemName || item.catalogItemId);
      if (hasProducts) {
        setIsTableFocused(false);
      }
      // If !hasProducts, don't change isTableFocused (keep empty row visible)
    }
  };

  // Attach listener to document
  document.addEventListener('click', handleDocumentClick);
  
  // Cleanup on unmount
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, []); // Empty dependency array - effect runs once, uses itemsRef for current items value
```

**Code GOLDEN - Focus/Blur Handlers :**
```typescript
// Handle table focus - show empty row
const handleTableFocus = () => {
  // Clear any pending blur timeout
  if (blurTimeoutRef.current) {
    clearTimeout(blurTimeoutRef.current);
    blurTimeoutRef.current = null;
  }
  setIsTableFocused(true);
};

// Handle table blur - hide empty row after delay (only if products exist)
const handleTableBlur = () => {
  // Delay hiding to allow focus to move between cells
  blurTimeoutRef.current = setTimeout(() => {
    setIsTableFocused(false);
  }, 200); // 200ms delay to handle focus transitions
};

// Cleanup blur timeout on unmount
useEffect(() => {
  return () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }
  };
}, []);
```

**Code GOLDEN - Table Container :**
```typescript
<div 
  ref={tableContainerRef}
  className={showDropdown ? 'overflow-visible' : 'overflow-x-auto'}
  onFocus={handleTableFocus}
  onBlur={handleTableBlur}
>
```

**Fixes appliqués :**
1. ✅ `itemsRef` pour éviter réexécution du useEffect après chaque changement de `items`
2. ✅ Exclusion du dropdown (`z-[9999]`) de la détection de clic
3. ✅ Dépendances vides `[]` sur le document click listener
4. ✅ Utilisation de `itemsRef.current` au lieu de `items` directement

---

## ❌ 3. MODIFICATIONS TENTÉES (ÉCHOUÉES)

### 3.1 Tentative de Correction Drag-and-Drop

**Objectif :** Corriger le drag-and-drop qui ne fonctionnait pas après refactoring.

**Modifications tentées :**
1. Ajout de props `isDraggable` et `showDragHandle` à `SortableRow`
2. Filtrage dans `SortableContext` pour ne garder que les lignes remplies
3. Rendu conditionnel du drag handle basé sur `showDragHandle`
4. Utilisation de `originalIndex` pour préserver les IDs après filtrage

**Résultat :** ❌ **ÉCHEC** - Régressions critiques :
- Drag handle visible sur lignes vides
- Delete button visible sur lignes vides
- Drag-and-drop toujours non fonctionnel
- Layout cassé

**Action :** Rollback Git complet

---

### 3.2 Tentative de Suppression du Div Wrapper

**Objectif :** Supprimer le div wrapper interne pour aplatir la structure.

**Modifications tentées :**
1. Suppression de `<div className="p-3">` interne
2. Déplacement du contenu directement dans la Card

**Résultat :** ❌ **ÉCHEC** - Erreurs JSX :
- Balises de fermeture orphelines
- Structure JSX cassée
- Erreurs de compilation

**Action :** Rollback partiel

---

## ✅ 4. FONCTIONNALITÉS VALIDÉES (AVANT ROLLBACK)

### 4.1 Padding p-3
- ✅ Validé par l'utilisateur : "Je suis vraiment satisfait"
- ✅ 6 heures de travail pour obtenir ce padding exact
- ✅ État : `p-3` sur Card et div interne

### 4.2 Colonnes Optimisées
- ✅ Drag handle : `p-0 w-6 sm:w-8`, `pl-0 pr-0 py-1`
- ✅ Trash icon : `p-0 pr-1`, `w-4 sm:w-5 md:w-6`, `justify-end`
- ✅ DESIGNATION : Expansion automatique avec espace récupéré

### 4.3 Logique 3 Types de Lignes
- ✅ Helpers `isRowFilled` et `isLastEmptyRow` fonctionnels
- ✅ Visibilité conditionnelle basée sur `isTableFocused`
- ✅ Delete button conditionnel sur `isFilled`

### 4.4 Système de Visibilité
- ✅ Document click listener stabilisé
- ✅ Exclusion dropdown fonctionnelle
- ✅ Focus/blur handlers complémentaires
- ✅ Pas de réexécution inutile du useEffect

---

## 🔍 5. DIAGNOSTIC COMPLET EFFECTUÉ

### 5.1 Diagnostic Empty Row Visibility System

**Date :** Pendant la session
**Objectif :** Comprendre pourquoi la ligne vide ne s'affichait pas après sélection de produit

**Résultats :**
- ✅ 7 zones analysées (State/Refs, Helpers, Event Handlers, Visibility Logic, Flow Analysis, Conflicts, Root Cause)
- ✅ Cause racine identifiée : Réexécution du document click listener après `setItems`
- ✅ Solution proposée : Utilisation de `itemsRef` avec dépendances vides

**Fichier diagnostic :** Documenté dans conversation (AGENT01-EMPTY-ROW-COMPLETE-DIAGNOSTIC-FINISHED)

---

## 🐛 6. PROBLÈMES NON RÉSOLUS

### 6.1 Drag-and-Drop Non Fonctionnel

**Problème :** Le drag-and-drop ne fonctionne pas correctement après le refactoring.

**Tentatives :**
1. ❌ Correction des IDs dans SortableContext (utilisé `originalIndex`)
2. ❌ Ajout de props conditionnelles à SortableRow
3. ❌ Filtrage des items dans SortableContext

**État actuel :** Non fonctionnel, nécessite investigation approfondie

**Priorité :** Moyenne (fonctionnalité secondaire)

---

### 6.2 Structure JSX Complexe

**Problème :** Structure JSX très imbriquée avec plusieurs niveaux de divs.

**Tentatives :**
1. ❌ Suppression du div wrapper interne (cassé la structure)

**État actuel :** Structure fonctionnelle mais complexe

**Priorité :** Basse (refactoring futur)

---

## 📁 7. FICHIERS INTACTS

### 7.1 Fichiers Non Modifiés
- ✅ `OrderDetailPage.tsx` - Intact
- ✅ `ThresholdAlert.tsx` - Intact
- ✅ Autres composants construction-poc - Intacts
- ✅ Services et utilities - Intacts

### 7.2 Fichier Modifié
- ⚠️ `PurchaseOrderForm.tsx` - Rollback à l'état pré-session

---

## 🎯 8. PROCHAINES PRIORITÉS

### Séquence de Recréation (Ordre Recommandé)

**PRIORITÉ 1 - Padding p-3 (5 minutes)**
- Restaurer `p-3` sur Card et div interne
- Validation immédiate par l'utilisateur

**PRIORITÉ 2 - Colonnes Extrêmes (10 minutes)**
- Optimiser drag handle column (gauche)
- Optimiser trash icon column (droite)
- Vérifier expansion DESIGNATION

**PRIORITÉ 3 - Logique 3 Types Lignes (15 minutes)**
- Ajouter helpers `isRowFilled` et `isLastEmptyRow`
- Implémenter logique de visibilité conditionnelle
- Tester les 3 scénarios

**PRIORITÉ 4 - Système de Visibilité (20 minutes)**
- Ajouter refs (`itemsRef`, `tableContainerRef`, `blurTimeoutRef`)
- Implémenter document click listener avec `itemsRef`
- Ajouter focus/blur handlers
- Tester clics inside/outside

**PRIORITÉ 5 - Drag-and-Drop (Investigation future)**
- Diagnostic approfondi nécessaire
- Ne pas tenter de correction avant stabilisation des autres fixes

---

## 📊 9. MÉTRIQUES SESSION

### 9.1 Durée et Activité
- **Durée totale :** ~6 heures
- **Heure début :** Après-midi 25 novembre 2025
- **Heure fin :** Soirée 25 novembre 2025
- **Nombre de modifications :** ~15-20 modifications majeures
- **Nombre de rollbacks :** 2 (drag-and-drop, wrapper div)

### 9.2 Validations Utilisateur
- ✅ Padding p-3 : "Je suis vraiment satisfait"
- ✅ Colonnes optimisées : Validé visuellement
- ✅ Logique 3 types : Validé fonctionnellement
- ✅ Système visibilité : Validé après fixes

### 9.3 Code Modifié
- **Lignes modifiées :** ~200-300 lignes
- **Fichiers modifiés :** 1 (`PurchaseOrderForm.tsx`)
- **Fonctions ajoutées :** 2 helpers + 3 handlers
- **useEffect ajoutés :** 3 (cleanup, itemsRef update, document click)

### 9.4 Échecs et Apprentissages
- **Tentatives échouées :** 2
- **Rollbacks nécessaires :** 2
- **Temps perdu :** ~1-2 heures sur corrections échouées
- **Temps validé :** ~4 heures de travail GOLDEN

---

## 🔄 10. PROMPTS POUR RECRÉER ÉTAT GOLDEN

### PROMPT 1 - Restaurer Padding p-3

```
CONTEXT: BazarKELY Construction POC - PurchaseOrderForm.tsx padding was validated as perfect (p-3) after 6 hours of work. User confirmed satisfaction. Current state has wrong padding (p-6). Need IMMEDIATE restoration to validated state.

OBJECTIVE: Restore EXACT padding to p-3 (12px) on main white container Card.

EXACT FIX REQUIRED:

FIND (around line 1696):
```typescript
<Card className="mb-6 border-2 rounded-lg p-6" style={{ backgroundColor: '#E8EDE7', borderColor: '#A8B8A0' }}>
  <div className="p-6">
```

REPLACE WITH:
```typescript
<Card className="mb-6 border-2 rounded-lg p-3" style={{ backgroundColor: '#E8EDE7', borderColor: '#A8B8A0' }}>
  <div className="p-3">
```

CONSTRAINTS:
- Work in isolated Git worktree
- ONLY change padding from p-6 to p-3
- DO NOT touch anything else
- This is HIGHEST PRIORITY
- User spent 6 hours getting this right

CRITICAL SAFETY CONSTRAINTS:
- Change ONLY padding values
- Preserve all other classes and styles
- Verify padding is exactly 12px (p-3) on all sides

OUTPUT FORMAT:
1. LINE NUMBER: Exact line where change was made
2. BEFORE: p-6 on Card and div
3. AFTER: p-3 on Card and div
4. CONFIRMATION: Padding is now exactly 12px (p-3) on all sides

TESTING:
- Visual check: Content has small breathing room (not touching borders)
- NOT excessive padding (p-6 = 24px was too much)
- Exactly the state user validated as "vraiment satisfait"

CURSOR 2.0 FEATURES: Use Composer model for instant precise fix.

AGENT09 SIGNATURE: Report "AGENT09-PADDING-RESTORED-URGENT-COMPLETE" with exact line number and confirmation that padding is now p-3 as validated by user.
```

---

### PROMPT 2 - Optimiser Colonnes Extrêmes

```
CONTEXT: BazarKELY Construction POC - PurchaseOrderForm.tsx table needs two adjustments to extreme columns (first and last): reduce space on drag handle column (left) and trash icon column (right). Only DESIGNATION column should expand to fill recovered space.

OBJECTIVE: 
1. Make drag handle column narrower (pr-1 → pr-0, reduce th width)
2. Make trash column narrower and align icon to the right
3. DESIGNATION column automatically expands (it has min-w-* classes)
4. Do NOT modify Qté or UNITE columns

EXACT FIXES REQUIRED:

FIX 1 - DRAG HANDLE DIV (SortableRow, around line 90):
FIND:
```typescript
className="cursor-move hover:text-blue-600 transition-colors flex items-center justify-start pl-0 pr-1 py-2"
```
REPLACE WITH:
```typescript
className="cursor-move hover:text-blue-600 transition-colors flex items-center justify-start pl-0 pr-0 py-1"
```

FIX 2 - DRAG HANDLE HEADER TH (around line 2208):
FIND:
```typescript
<th className="bg-[#E8EDE7] p-2 w-12 sm:w-14">
```
REPLACE WITH:
```typescript
<th className="bg-[#E8EDE7] p-0 w-6 sm:w-8">
```

FIX 3 - TRASH ICON TD (around line 2489):
FIND:
```typescript
<td className="p-0 text-center" style={index === 0 ? { paddingTop: '4px' } : {}}>
  {items.length > 1 && (
    <button className="text-red-600 hover:text-red-700 transition-colors">
      <Trash2 className="w-4 h-4 mx-auto" />
    </button>
  )}
</td>
```
REPLACE WITH:
```typescript
<td className="p-0 pr-1" style={index === 0 ? { paddingTop: '4px' } : {}}>
  {isFilled && items.length > 1 && (
    <button className="text-red-600 hover:text-red-700 transition-colors flex items-center justify-end">
      <Trash2 className="w-4 h-4" />
    </button>
  )}
</td>
```

FIX 4 - TRASH HEADER TH (around line 2214):
FIND:
```typescript
<th className="bg-[#E8EDE7] p-0 text-center w-6 sm:w-7 md:w-8"></th>
```
REPLACE WITH:
```typescript
<th className="bg-[#E8EDE7] p-0 w-4 sm:w-5 md:w-6"></th>
```

CONSTRAINTS:
- Work in isolated Git worktree
- ONLY modify drag handle column (first) and trash column (last)
- DO NOT modify Qté or UNITE columns
- DO NOT modify DESIGNATION column width classes

CRITICAL SAFETY CONSTRAINTS:
- PRESERVE drag-and-drop functionality
- PRESERVE delete button functionality
- PRESERVE all onClick handlers
- TEST both drag and delete still work
- VERIFY Qté and UNITE columns unchanged

OUTPUT FORMAT:
1. FIX 1: Drag handle div - pr-1 → pr-0, py-2 → py-1
2. FIX 2: Drag handle th - p-2 → p-0, w-12 → w-6, w-14 → w-8
3. FIX 3: Trash td - text-center removed, pr-1 added, button justify-end, condition isFilled
4. FIX 4: Trash th - width reduced by ~2

TESTING:
1. DRAG COLUMN: Narrower, icon aligned left, drag works
2. TRASH COLUMN: Narrower, icon aligned right, delete works
3. QTÉ AND UNITE: Same width (unchanged)
4. DESIGNATION: Wider (recovered space)
5. OVERALL TABLE: Columns properly aligned

CURSOR 2.0 FEATURES: Use Composer model for multi-location changes.

AGENT09 SIGNATURE: Report "AGENT09-EXTREME-COLUMNS-OPTIMIZED-COMPLETE" with confirmation that drag handle and trash columns are optimized, DESIGNATION expanded, and Qté/UNITE unchanged.
```

---

### PROMPT 3 - Implémenter Logique 3 Types de Lignes

```
CONTEXT: BazarKELY Construction POC - PurchaseOrderForm.tsx needs three-tier row logic to differentiate between first empty row, filled rows, and last empty row. Different visibility rules and conditional rendering for drag handles and delete buttons.

OBJECTIVE: Implement three-tier row logic with conditional rendering of drag handles, delete buttons, and visibility rules.

IMPLEMENTATION STRATEGY:

STEP 1 - Add helper functions (around line 1680):
```typescript
// Helper to check if row is filled
const isRowFilled = (item: FormItem) => {
  return Boolean(item.itemName || item.catalogItemId);
};

// Helper to check if this is the last empty row
const isLastEmptyRow = (index: number) => {
  const hasProducts = items.some(item => item.itemName || item.catalogItemId);
  const isLast = index === items.length - 1;
  const isEmpty = !items[index].itemName && !items[index].catalogItemId;
  return hasProducts && isLast && isEmpty;
};
```

STEP 2 - Modify items.map() rendering (around line 2230):
```typescript
{items.map((item, index) => {
  const itemId = item.tempId || `item-${index}`;
  
  // Determine row type
  const isFilled = isRowFilled(item);
  const isLast = isLastEmptyRow(index);
  
  // Visibility logic for last empty row
  if (isLast && !isTableFocused) {
    return null; // Hide last empty row when not focused
  }
  
  return (
    <SortableRow key={itemId} id={itemId} index={index}>
      {/* ... cells ... */}
      <td className="p-0 pr-1">
        {isFilled && items.length > 1 && (
          <button>...</button>
        )}
      </td>
    </SortableRow>
  );
})}
```

CONSTRAINTS:
- Work in isolated Git worktree
- Add helper functions before return statement
- Modify items.map() to use row type logic
- Preserve all existing functionality

CRITICAL SAFETY CONSTRAINTS:
- First empty row NEVER hidden (always visible)
- Last empty row hides on blur only (when products exist)
- Only filled rows have drag handles and can be reordered
- Only filled rows have delete buttons
- Drag-and-drop works only between filled rows
- TEST all three row types behave correctly

OUTPUT FORMAT:
1. HELPER FUNCTIONS: Line numbers and code
2. ITEMS.MAP() MODIFICATION: Complete conditional rendering logic
3. VISIBILITY RULES: Summary of when each row type appears

TESTING:
1. EMPTY TABLE: One empty row visible, NO drag handle, NO delete button
2. ADD FIRST PRODUCT: First row shows drag handle + delete, new empty row appears
3. CLICK OUTSIDE: Last empty row HIDES
4. CLICK BACK IN: Last empty row REAPPEARS
5. ADD MULTIPLE: All filled rows have icons, can drag
6. DELETE UNTIL EMPTY: Back to one empty row, no icons

CURSOR 2.0 FEATURES: Use Composer model for multi-location comprehensive changes.

AGENT09 SIGNATURE: Report "AGENT09-ROW-LOGIC-REFACTORED-COMPLETE" with confirmation that three row types implemented correctly, drag handles only on filled rows, delete buttons only on filled rows, first empty row always visible, last empty row conditionally visible.
```

---

### PROMPT 4 - Stabiliser Système de Visibilité

```
CONTEXT: BazarKELY Construction POC - PurchaseOrderForm.tsx has complex empty row visibility system with focus/blur handlers and document click listener. After diagnostic, root cause identified: document click listener re-executes after setItems due to [items] dependency, causing state resets. Need to stabilize using itemsRef pattern.

OBJECTIVE: Fix empty row visibility system by stabilizing document click listener using itemsRef pattern to prevent re-execution after items changes.

EXACT FIX REQUIRED:

STEP 1 - Add itemsRef (around line 174):
FIND:
```typescript
const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
const tableContainerRef = useRef<HTMLDivElement | null>(null);
```
ADD AFTER:
```typescript
// Ref for items to access current value in document click listener without re-running effect
const itemsRef = useRef(items);
```

STEP 2 - Update itemsRef when items change (around line 1438):
ADD:
```typescript
// Update itemsRef when items change (for document click listener)
useEffect(() => {
  itemsRef.current = items;
}, [items]);
```

STEP 3 - Modify document click listener (around line 1443):
FIND:
```typescript
useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    const clickedInside = tableContainerRef.current?.contains(event.target as Node) ?? false;
    
    if (clickedInside) {
      setIsTableFocused(true);
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    } else {
      const hasProducts = items.some(item => item.itemName || item.catalogItemId);
      if (hasProducts) {
        setIsTableFocused(false);
      }
    }
  };

  document.addEventListener('click', handleDocumentClick);
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, [items]);
```

REPLACE WITH:
```typescript
useEffect(() => {
  const handleDocumentClick = (event: MouseEvent) => {
    const target = event.target as Node;
    
    // Exclude dropdown from click detection
    const clickedOnDropdown = (target as Element)?.closest('[class*="z-[9999]"]') !== null;
    if (clickedOnDropdown) {
      return; // Ignore clicks on dropdown
    }
    
    const clickedInside = tableContainerRef.current?.contains(target) ?? false;
    
    if (clickedInside) {
      setIsTableFocused(true);
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
        blurTimeoutRef.current = null;
      }
    } else {
      // Use itemsRef to access current value without re-running effect
      const hasProducts = itemsRef.current.some(item => item.itemName || item.catalogItemId);
      if (hasProducts) {
        setIsTableFocused(false);
      }
    }
  };

  document.addEventListener('click', handleDocumentClick);
  return () => {
    document.removeEventListener('click', handleDocumentClick);
  };
}, []); // Empty dependency array - effect runs once, uses itemsRef for current items value
```

STEP 4 - Add tableContainerRef to table div (around line 2354):
FIND:
```typescript
<div className={showDropdown ? 'overflow-visible' : 'overflow-x-auto'}>
```
REPLACE WITH:
```typescript
<div 
  ref={tableContainerRef}
  className={showDropdown ? 'overflow-visible' : 'overflow-x-auto'}
  onFocus={handleTableFocus}
  onBlur={handleTableBlur}
>
```

CONSTRAINTS:
- Work in isolated Git worktree
- Add itemsRef and update useEffect
- Modify document click listener to use itemsRef
- Add tableContainerRef to table div
- Preserve all existing functionality

CRITICAL SAFETY CONSTRAINTS:
- Empty row ALONE (no products) NEVER hides
- Empty row AFTER products hides on outside click
- Empty row shows immediately on inside click
- Product selection still works normally
- No breaking changes to existing functionality

OUTPUT FORMAT:
1. ITEMSREF ADDED: Line number where itemsRef declared
2. USEEFFECT ITEMSREF: Line numbers where itemsRef updated
3. DOCUMENT CLICK MODIFIED: Line numbers and changes
4. TABLECONTAINERREF ADDED: Line number where ref attached

TESTING:
1. INITIAL STATE: Empty row visible, click outside → stays visible
2. ADD PRODUCT: Empty row appears, click outside → hides
3. CLICK BACK: Empty row reappears
4. PRODUCT SELECTION: Empty row appears immediately after selection
5. RAPID CLICKS: Empty row shows/hides responsively

CURSOR 2.0 FEATURES: Use Composer model for comprehensive changes.

AGENT09 SIGNATURE: Report "AGENT09-EMPTY-ROW-CLICK-DETECTION-COMPLETE" with confirmation that document click listener stabilized, empty row alone never hides, empty row after products hides on outside click, empty row shows on inside click, immediate response to clicks.
```

---

## 🔄 11. PHRASE POUR PROCHAINE SESSION

**Phrase de continuation :**

```
Bonjour, je reprends le travail sur PurchaseOrderForm.tsx. 
J'ai perdu 6 heures de travail validé lors de la session du 25 novembre après-midi 
à cause de régressions après tentatives de correction drag-and-drop. 

J'ai un fichier RESUME-SESSION-2025-11-25-PM.md qui documente l'état GOLDEN validé 
et contient 4 prompts prêts à l'emploi pour recréer le travail perdu.

Merci d'exécuter les 4 prompts dans l'ordre (section 10 du fichier résumé) 
pour restaurer l'état GOLDEN validé. Temps estimé : 15-20 minutes total.

Priorité : PROMPT 1 (padding p-3) d'abord car c'était la validation la plus importante.
```

---

## 📝 12. FICHIERS IMPACTÉS

### 12.1 Fichier Principal
- **`frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`**
  - **Lignes modifiées :** ~200-300 lignes
  - **Sections impactées :**
    - Helpers (lignes ~1680-1690)
    - Refs (lignes ~168-174)
    - useEffects (lignes ~1426-1467)
    - SortableRow component (lignes ~60-112)
    - Table rendering (lignes ~2200-2500)
    - Card padding (lignes ~1696-1697)

### 12.2 Fichiers Non Impactés
- ✅ `OrderDetailPage.tsx`
- ✅ `ThresholdAlert.tsx`
- ✅ Autres composants construction-poc
- ✅ Services et utilities

---

## ✅ 13. VALIDATION FINALE

### 13.1 État GOLDEN Documenté
- ✅ Padding p-3 : Code exact avec lignes
- ✅ Colonnes optimisées : Code exact avec lignes
- ✅ Logique 3 types : Code exact avec lignes
- ✅ Système visibilité : Code exact avec lignes

### 13.2 Prompts de Recréation
- ✅ 4 prompts complets au format IP2
- ✅ Chaque prompt contient CONTEXT, OBJECTIVE, CONSTRAINTS, OUTPUT FORMAT, TESTING
- ✅ Prêts à copier-coller pour prochaine session
- ✅ Temps estimé : 15-20 minutes total

### 13.3 Métriques Documentées
- ✅ Durée session : ~6 heures
- ✅ Validations utilisateur : Documentées
- ✅ Tentatives échouées : Documentées
- ✅ Rollbacks : Documentés avec raisons

### 13.4 Leçons Apprises
- ⚠️ **Ne pas modifier le drag-and-drop avant stabilisation complète des autres fixes**
- ⚠️ **Tester chaque modification isolément avant de passer à la suivante**
- ⚠️ **Créer des commits Git fréquents pour faciliter les rollbacks**
- ✅ **Documentation complète permet recréation rapide**

### 13.5 Prêt pour Recréation
- ✅ Tous les codes GOLDEN sont documentés avec lignes exactes
- ✅ 4 prompts prêts à l'emploi
- ✅ Séquence claire de priorité
- ✅ Tests de validation documentés
- ✅ Phrase de continuation prête

---

## 📌 NOTES FINALES

### Temps de Recréation Estimé
- **Prompt 1 (Padding) :** 5 minutes
- **Prompt 2 (Colonnes) :** 10 minutes
- **Prompt 3 (Logique 3 types) :** 15 minutes
- **Prompt 4 (Visibilité) :** 20 minutes
- **Total :** ~50 minutes (conservateur) ou 15-20 minutes (expérimenté)

### Ordre d'Exécution Recommandé
1. **PROMPT 1** - Padding p-3 (validation utilisateur la plus importante)
2. **PROMPT 2** - Colonnes optimisées (amélioration visuelle)
3. **PROMPT 3** - Logique 3 types (fonctionnalité)
4. **PROMPT 4** - Système visibilité (stabilité)

### Avertissement
⚠️ **NE PAS tenter de corriger le drag-and-drop avant d'avoir restauré l'état GOLDEN complet.** Le drag-and-drop nécessite une investigation approfondie séparée.

---

**Fichier créé le :** 25 novembre 2025
**Dernière mise à jour :** 25 novembre 2025
**Statut :** ✅ Complet et prêt pour recréation

---

**AGENT09-SESSION-RESUME-COMPLETE** - Fichier de résumé créé avec succès :
- ✅ 13 sections complètes
- ✅ 4 prompts IP2 format prêts à l'emploi
- ✅ Code GOLDEN documenté avec lignes exactes
- ✅ Métriques et timeline documentés
- ✅ Phrase de continuation prête
- ✅ Prêt pour recréation immédiate (15-20 minutes)


