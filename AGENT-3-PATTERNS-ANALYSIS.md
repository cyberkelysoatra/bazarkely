# AGENT 3 - ANALYSE PATTERNS SIMILAIRES - CRÉATION PRODUIT INLINE
## PurchaseOrderForm.tsx - Bug "Créer et Ajouter" Ajoute Nouvelle Ligne au Lieu de Mettre à Jour Ligne Courante

**Date:** 2025-11-23  
**Agent:** Agent 03 - Patterns Analysis & Documentation Verification  
**Objectif:** Trouver des patterns similaires qui fonctionnent correctement et recommander une solution basée sur les patterns existants

---

## 1. SIMILAR WORKING PATTERNS

### 1.1 Pattern Fonctionnel: Sélection Produit depuis Recherche

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Code fonctionnel (lignes 2424-2465):**

```typescript
onClick={(e) => {
  e.stopPropagation();
  
  // Fill current row with selected product
  const newItems = [...items];
  newItems[index] = {  // ✅ Met à jour la ligne COURANTE (index)
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
  
  setItems([...newItems, newEmptyItem]);  // ✅ Ajoute nouvelle ligne vide APRÈS mise à jour
  // ... reste du code ...
}}
```

**Pattern identifié:**
- ✅ Utilise `index` de la ligne courante (dans le `.map()`)
- ✅ Met à jour `newItems[index]` directement
- ✅ Crée nouvelle ligne vide APRÈS mise à jour
- ✅ Utilise spread operator pour immutabilité

**Conclusion:** ✅ **Pattern fonctionnel identifié** - Ce pattern met à jour la ligne courante correctement

### 1.2 Pattern Fonctionnel: handleUpdateItem

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Code fonctionnel (lignes 1343-1353):**

```typescript
const handleUpdateItem = (index: number, field: keyof FormItem, value: any) => {
  const updated = [...items];
  updated[index] = { ...updated[index], [field]: value };  // ✅ Met à jour ligne spécifique
  
  // Recalculer totalPrice si quantity ou unitPrice change
  if (field === 'quantity' || field === 'unitPrice') {
    updated[index].totalPrice = updated[index].quantity * updated[index].unitPrice;
  }
  
  setItems(updated);
};
```

**Pattern identifié:**
- ✅ Prend `index` en paramètre
- ✅ Met à jour `updated[index]` directement
- ✅ Utilise spread operator pour immutabilité
- ✅ Recalcule les valeurs dérivées

**Conclusion:** ✅ **Pattern fonctionnel identifié** - Fonction utilitaire existante pour mettre à jour une ligne spécifique

### 1.3 Pattern Non-Fonctionnel: handleCreateProduct

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Code problématique (lignes 1069-1082):**

```typescript
if (result.success && result.data) {
  // Ajouter le produit créé au panier
  const newItem: FormItem = {
    tempId: `temp-${Date.now()}`,
    catalogItemId: result.data.id,
    itemName: result.data.name,
    description: result.data.description,
    quantity: 1,
    unit: result.data.unit,
    unitPrice: result.data.currentPrice || 0,
    totalPrice: result.data.currentPrice || 0
  };
  
  setItems([...items, newItem]);  // ❌ Ajoute NOUVELLE ligne au lieu de mettre à jour ligne courante
}
```

**Problème identifié:**
- ❌ N'utilise pas `index` de la ligne courante
- ❌ Ajoute nouvelle ligne avec `[...items, newItem]`
- ❌ Ne met pas à jour la ligne qui a ouvert le modal

**Conclusion:** ❌ **Pattern problématique** - Ne suit pas le pattern fonctionnel de sélection produit

---

## 2. EXISTING UTILITIES

### 2.1 Fonction handleUpdateItem

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Signature (ligne 1343):**
```typescript
const handleUpdateItem = (index: number, field: keyof FormItem, value: any) => void
```

**Usage:**
- Utilisée pour mettre à jour `quantity`, `unit`, `itemName`, `unitPrice`
- Prend `index` en paramètre pour identifier la ligne
- Met à jour la ligne spécifique sans créer de nouvelle ligne

**Conclusion:** ✅ **Fonction utilitaire existante** - Peut être utilisée comme référence pour le pattern correct

### 2.2 Fonction getFirstEmptyRowIndex

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Code (lignes 1369-1373):**
```typescript
const getFirstEmptyRowIndex = () => {
  return items.findIndex(item => 
    !item.itemName || item.itemName.trim() === ''
  );
};
```

**Usage:**
- Trouve l'index de la première ligne vide
- Utilisée pour déterminer quelle ligne afficher le champ de recherche

**Conclusion:** ✅ **Fonction utilitaire existante** - Peut être utilisée pour identifier la ligne courante

### 2.3 Pas de Fonction updateRowProduct

**Recherche effectuée:**
- `updateRowProduct` - ❌ Non trouvé
- `updateLineItem` - ❌ Non trouvé
- `setRowProduct` - ❌ Non trouvé

**Conclusion:** ❌ **Pas de fonction utilitaire spécifique** - Doit utiliser le pattern de `handleUpdateItem` ou sélection produit

---

## 3. DOCUMENTATION STATUS

### 3.1 Documentation Générale

**FEATURE-MATRIX.md (ligne 697):**
- **Formulaire Commande:** ✅ DONE - PurchaseOrderForm.tsx - Création BC complète
- Pas de détails sur le flow de création produit inline

**README.md:**
- Pas de mention spécifique du flow "Créer et Ajouter"
- Mention générale: "PurchaseOrderForm.tsx - Formulaire création bons de commande"

**ETAT-TECHNIQUE-COMPLET.md:**
- Pas de mention spécifique du flow de création produit inline

**GAP-TECHNIQUE-COMPLET.md:**
- Pas de gap documenté pour ce problème

**Conclusion:** ⚠️ **Documentation limitée** - Le flow "Créer et Ajouter" n'est pas explicitement documenté

### 3.2 Documentation Code (Comments)

**Commentaire dans code (ligne 887):**
```typescript
// PHASE 1 - PRIORITY 0: Fonction manquante handleAddProductFromSearch
// Ajoute un produit sélectionné depuis la recherche au panier
```

**Commentaire dans code (ligne 1052):**
```typescript
// TODO: Vérifier si Magasinier peut créer produits ou si besoin supplierId
```

**Conclusion:** ⚠️ **Commentaires limités** - Pas de commentaire spécifique sur le flow "Créer et Ajouter"

---

## 4. TODO/FIXME COMMENTS

### 4.1 TODOs Identifiés

**Ligne 1052:**
```typescript
// TODO: Vérifier si Magasinier peut créer produits ou si besoin supplierId
```

**Ligne 125:**
```typescript
// TODO: Will be !!orderId when edit mode is implemented
```

**Ligne 240:**
```typescript
// PHASE 1: BCI/BCE Number format (temporaire - TODO: utiliser séquence DB)
```

**Conclusion:** ⚠️ **Pas de TODO spécifique** - Aucun TODO mentionnant le problème de création produit dans ligne courante

### 4.2 FIXME/BUG Comments

**Aucun FIXME ou BUG comment trouvé** concernant ce problème spécifique.

**Conclusion:** ❌ **Pas de commentaire de bug** - Le problème n'est pas documenté dans les commentaires

---

## 5. RECOMMENDED APPROACH

### 5.1 Solution Basée sur Pattern Fonctionnel

**Pattern à suivre:** Sélection produit depuis recherche (lignes 2424-2465)

**Changement requis dans `handleCreateProduct`:**

**AVANT (ligne 1082):**
```typescript
setItems([...items, newItem]);  // ❌ Ajoute nouvelle ligne
```

**APRÈS (basé sur pattern fonctionnel):**
```typescript
// Trouver l'index de la ligne courante (celle qui a ouvert le modal)
const currentRowIndex = getFirstEmptyRowIndex();  // Ou utiliser un état trackingRowIndex

if (currentRowIndex !== -1) {
  // Mettre à jour la ligne courante (comme sélection produit)
  const newItems = [...items];
  newItems[currentRowIndex] = {
    ...newItems[currentRowIndex],
    catalogItemId: result.data.id,
    itemName: result.data.name,
    description: result.data.description,
    unit: result.data.unit,
    unitPrice: result.data.currentPrice || 0,
    totalPrice: (result.data.currentPrice || 0) * newItems[currentRowIndex].quantity
  };
  
  // Créer nouvelle ligne vide APRÈS mise à jour
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
} else {
  // Fallback: ajouter nouvelle ligne si pas de ligne vide trouvée
  setItems([...items, newItem]);
}
```

### 5.2 Solution Alternative: État pour Tracking Ligne Courante

**Approche recommandée (plus robuste):**

**Ajouter état:**
```typescript
const [creatingProductForRowIndex, setCreatingProductForRowIndex] = useState<number | null>(null);
```

**Modifier ouverture modal (lignes 2504-2509 et 2532-2537):**
```typescript
onClick={() => {
  if (searchQuery.trim()) {
    setNewProductName(searchQuery.trim());
  }
  setCreatingProductForRowIndex(index);  // ✅ Tracker ligne courante
  setShowCreateProductModal(true);
  setShowDropdown(false);
}}
```

**Modifier handleCreateProduct:**
```typescript
if (result.success && result.data) {
  if (creatingProductForRowIndex !== null) {
    // Mettre à jour ligne courante
    const newItems = [...items];
    newItems[creatingProductForRowIndex] = {
      ...newItems[creatingProductForRowIndex],
      catalogItemId: result.data.id,
      itemName: result.data.name,
      description: result.data.description,
      unit: result.data.unit,
      unitPrice: result.data.currentPrice || 0,
      totalPrice: (result.data.currentPrice || 0) * newItems[creatingProductForRowIndex].quantity
    };
    
    // Créer nouvelle ligne vide
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
    setCreatingProductForRowIndex(null);  // Reset
  } else {
    // Fallback: comportement actuel
    setItems([...items, newItem]);
  }
}
```

**Avantages:**
- ✅ Plus robuste (tracking explicite)
- ✅ Fonctionne même si ligne vide n'existe plus
- ✅ Cohérent avec pattern sélection produit
- ✅ Réutilisable pour autres cas similaires

### 5.3 Solution Recommandée Finale

**Approche hybride (meilleure):**

1. **Ajouter état pour tracking:**
```typescript
const [creatingProductForRowIndex, setCreatingProductForRowIndex] = useState<number | null>(null);
```

2. **Modifier ouverture modal** pour tracker `index`

3. **Modifier `handleCreateProduct`** pour utiliser `creatingProductForRowIndex` et suivre le pattern de sélection produit

4. **Réutiliser logique** de création ligne vide depuis pattern fonctionnel

**Code complet recommandé:**

```typescript
// État pour tracker ligne courante
const [creatingProductForRowIndex, setCreatingProductForRowIndex] = useState<number | null>(null);

// Modifier handleCreateProduct (lignes 1069-1082)
if (result.success && result.data) {
  if (creatingProductForRowIndex !== null && creatingProductForRowIndex < items.length) {
    // Pattern identique à sélection produit (lignes 2429-2452)
    const newItems = [...items];
    newItems[creatingProductForRowIndex] = {
      ...newItems[creatingProductForRowIndex],
      catalogItemId: result.data.id,
      itemName: result.data.name,
      description: result.data.description,
      unit: result.data.unit,
      unitPrice: result.data.currentPrice || 0,
      totalPrice: (result.data.currentPrice || 0) * newItems[creatingProductForRowIndex].quantity
    };
    
    // Auto-create new empty row (identique à sélection produit)
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
    setCreatingProductForRowIndex(null);
  } else {
    // Fallback: comportement actuel si pas de ligne tracking
    const newItem: FormItem = {
      tempId: `temp-${Date.now()}`,
      catalogItemId: result.data.id,
      itemName: result.data.name,
      description: result.data.description,
      quantity: 1,
      unit: result.data.unit,
      unitPrice: result.data.currentPrice || 0,
      totalPrice: result.data.currentPrice || 0
    };
    setItems([...items, newItem]);
  }
  
  // ... reste du code (reset form, close modal) ...
}
```

---

## 6. REGRESSION RISKS

### 6.1 Risques Identifiés

**Risque #1: Ligne Vide Supprimée Entre Ouverture Modal et Création**
- **Scénario:** Utilisateur ouvre modal depuis ligne vide, ligne vide supprimée par autre action, puis crée produit
- **Impact:** `creatingProductForRowIndex` pointe vers ligne inexistante
- **Mitigation:** Vérifier `creatingProductForRowIndex < items.length` avant mise à jour

**Risque #2: Ligne Remplie Entre Ouverture Modal et Création**
- **Scénario:** Utilisateur ouvre modal depuis ligne vide, ligne remplie par sélection produit, puis crée produit
- **Impact:** Écrase données existantes
- **Mitigation:** Vérifier que ligne est toujours vide avant mise à jour

**Risque #3: Multiple Modals Ouverts**
- **Scénario:** Utilisateur ouvre plusieurs modals depuis différentes lignes
- **Impact:** `creatingProductForRowIndex` peut pointer vers mauvaise ligne
- **Mitigation:** Fermer modal automatiquement si nouveau modal ouvert, ou utiliser Map pour tracker multiples

**Risque #4: Comportement Fallback**
- **Scénario:** Si `creatingProductForRowIndex` est null, comportement actuel (ajouter nouvelle ligne)
- **Impact:** Pas de régression, comportement existant préservé
- **Mitigation:** ✅ Aucune régression attendue

### 6.2 Tests de Régression Requis

**Tests à effectuer:**
- [ ] Créer produit depuis ligne vide → Vérifier ligne mise à jour
- [ ] Créer produit depuis ligne vide → Vérifier nouvelle ligne vide créée
- [ ] Créer produit si ligne vide supprimée entre-temps → Vérifier fallback
- [ ] Créer produit si ligne remplie entre-temps → Vérifier pas d'écrasement
- [ ] Créer produit depuis recherche (pattern existant) → Vérifier toujours fonctionne
- [ ] Créer produit depuis modal sans ligne tracking → Vérifier fallback fonctionne
- [ ] Créer produit avec ligne tracking invalide → Vérifier fallback fonctionne

### 6.3 Features Affectées

**Features à vérifier:**
- ✅ **Sélection produit depuis recherche** - Ne devrait pas être affectée (pattern différent)
- ✅ **handleUpdateItem** - Ne devrait pas être affectée (fonction séparée)
- ✅ **handleAddProductFromSearch** - Ne devrait pas être affectée (fonction séparée)
- ✅ **handleRemoveItem** - Ne devrait pas être affectée (fonction séparée)
- ⚠️ **Création produit modal** - Sera modifiée (c'est le but)

**Conclusion:** ✅ **Risques de régression limités** - Changement isolé à `handleCreateProduct` et ouverture modal

---

## 7. COMPARISON PATTERNS

### 7.1 Pattern Sélection Produit (FONCTIONNEL)

**Caractéristiques:**
- ✅ Utilise `index` depuis closure `.map()`
- ✅ Met à jour `newItems[index]` directement
- ✅ Crée nouvelle ligne vide APRÈS mise à jour
- ✅ Utilise spread operator pour immutabilité
- ✅ Recalcule `totalPrice` basé sur `quantity` existante

**Code:**
```typescript
const newItems = [...items];
newItems[index] = { ...newItems[index], ...productData };
setItems([...newItems, newEmptyItem]);
```

### 7.2 Pattern Création Produit (PROBLÉMATIQUE)

**Caractéristiques:**
- ❌ N'utilise pas `index` de ligne courante
- ❌ Ajoute nouvelle ligne avec `[...items, newItem]`
- ❌ Ne met pas à jour ligne qui a ouvert modal
- ✅ Utilise spread operator pour immutabilité
- ✅ Crée `newItem` avec valeurs par défaut

**Code:**
```typescript
const newItem: FormItem = { ... };
setItems([...items, newItem]);  // ❌ Ajoute nouvelle ligne
```

### 7.3 Pattern handleUpdateItem (FONCTIONNEL)

**Caractéristiques:**
- ✅ Prend `index` en paramètre
- ✅ Met à jour `updated[index]` directement
- ✅ Utilise spread operator pour immutabilité
- ✅ Recalcule valeurs dérivées

**Code:**
```typescript
const updated = [...items];
updated[index] = { ...updated[index], [field]: value };
setItems(updated);
```

**Conclusion:** ✅ **Patterns fonctionnels identifiés** - `handleCreateProduct` doit suivre le même pattern que sélection produit

---

## 8. CODE CORRIGÉ RECOMMANDÉ

### 8.1 Ajout État Tracking

**Ligne ~228 (après autres états):**
```typescript
// État pour tracker quelle ligne a ouvert le modal création produit
const [creatingProductForRowIndex, setCreatingProductForRowIndex] = useState<number | null>(null);
```

### 8.2 Modification Ouverture Modal

**Lignes 2504-2509 (premier bouton "Nouveau produit"):**
```typescript
onClick={() => {
  if (searchQuery.trim()) {
    setNewProductName(searchQuery.trim());
  }
  setCreatingProductForRowIndex(index);  // ✅ AJOUTER: Tracker ligne courante
  setShowCreateProductModal(true);
  setShowDropdown(false);
}}
```

**Lignes 2532-2537 (deuxième bouton "Nouveau produit"):**
```typescript
onClick={() => {
  if (searchQuery.trim()) {
    setNewProductName(searchQuery.trim());
  }
  setCreatingProductForRowIndex(index);  // ✅ AJOUTER: Tracker ligne courante
  setShowCreateProductModal(true);
  setShowDropdown(false);
}}
```

### 8.3 Modification handleCreateProduct

**Lignes 1069-1093 (remplacer):**
```typescript
if (result.success && result.data) {
  // Vérifier si on doit mettre à jour ligne courante ou ajouter nouvelle ligne
  if (creatingProductForRowIndex !== null && creatingProductForRowIndex < items.length) {
    // Pattern identique à sélection produit (lignes 2429-2452)
    const newItems = [...items];
    const currentRow = newItems[creatingProductForRowIndex];
    
    // Vérifier que ligne est toujours vide (sécurité)
    if (!currentRow.itemName || currentRow.itemName.trim() === '') {
      // Mettre à jour ligne courante
      newItems[creatingProductForRowIndex] = {
        ...currentRow,
        catalogItemId: result.data.id,
        itemName: result.data.name,
        description: result.data.description,
        unit: result.data.unit,
        unitPrice: result.data.currentPrice || 0,
        totalPrice: (result.data.currentPrice || 0) * currentRow.quantity
      };
      
      // Auto-create new empty row (identique à sélection produit)
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
    } else {
      // Ligne remplie entre-temps, fallback: ajouter nouvelle ligne
      const newItem: FormItem = {
        tempId: `temp-${Date.now()}`,
        catalogItemId: result.data.id,
        itemName: result.data.name,
        description: result.data.description,
        quantity: 1,
        unit: result.data.unit,
        unitPrice: result.data.currentPrice || 0,
        totalPrice: result.data.currentPrice || 0
      };
      setItems([...items, newItem]);
    }
    
    setCreatingProductForRowIndex(null);  // Reset tracking
  } else {
    // Fallback: comportement actuel (ajouter nouvelle ligne)
    const newItem: FormItem = {
      tempId: `temp-${Date.now()}`,
      catalogItemId: result.data.id,
      itemName: result.data.name,
      description: result.data.description,
      quantity: 1,
      unit: result.data.unit,
      unitPrice: result.data.currentPrice || 0,
      totalPrice: result.data.currentPrice || 0
    };
    setItems([...items, newItem]);
  }
  
  // Réinitialiser le formulaire
  setNewProductName('');
  setNewProductUnit('unité');
  setNewProductPrice('');
  setNewProductDescription('');
  setShowCreateProductModal(false);
  setSearchQuery('');
  
  toast.success('Produit créé et ajouté au panier');
  console.log('✅ [Product Creation] Product created and added:', result.data.name);
}
```

### 8.4 Modification Fermeture Modal

**Lignes 3019-3025 (bouton Annuler):**
```typescript
onClick={() => {
  setShowCreateProductModal(false);
  setCreatingProductForRowIndex(null);  // ✅ AJOUTER: Reset tracking
  setNewProductName('');
  setNewProductUnit('unité');
  setNewProductPrice('');
  setNewProductDescription('');
}}
```

---

## 9. TESTING CHECKLIST

### 9.1 Tests Fonctionnels

- [ ] Créer produit depuis ligne vide → Vérifier ligne mise à jour avec produit créé
- [ ] Créer produit depuis ligne vide → Vérifier nouvelle ligne vide créée après
- [ ] Créer produit depuis ligne vide → Vérifier `totalPrice` calculé correctement (price * quantity)
- [ ] Créer produit depuis ligne vide → Vérifier `catalogItemId` défini
- [ ] Créer produit depuis ligne vide → Vérifier `unit` copié depuis produit
- [ ] Annuler création produit → Vérifier ligne vide reste vide
- [ ] Créer produit sans ligne tracking → Vérifier fallback (ajouter nouvelle ligne)

### 9.2 Tests de Régression

- [ ] Sélection produit depuis recherche → Vérifier toujours fonctionne
- [ ] handleUpdateItem → Vérifier toujours fonctionne
- [ ] handleRemoveItem → Vérifier toujours fonctionne
- [ ] handleAddProductFromSearch → Vérifier toujours fonctionne
- [ ] Créer produit si ligne remplie entre-temps → Vérifier fallback (pas d'écrasement)

### 9.3 Tests Edge Cases

- [ ] Créer produit si ligne supprimée entre-temps → Vérifier fallback
- [ ] Créer produit si ligne tracking invalide → Vérifier fallback
- [ ] Créer produit depuis deux lignes différentes → Vérifier comportement correct
- [ ] Créer produit avec quantité > 1 dans ligne → Vérifier totalPrice correct

---

## 10. CONCLUSION

### 10.1 Résumé des Patterns

**Patterns fonctionnels identifiés:**
- ✅ **Sélection produit depuis recherche** (lignes 2424-2465) - Met à jour ligne courante avec `index`
- ✅ **handleUpdateItem** (ligne 1343) - Met à jour ligne spécifique avec `index` en paramètre

**Pattern problématique:**
- ❌ **handleCreateProduct** (ligne 1082) - Ajoute nouvelle ligne au lieu de mettre à jour ligne courante

**Cause racine:**
- ❌ Pas de tracking de quelle ligne a ouvert le modal
- ❌ Utilise `[...items, newItem]` au lieu de `newItems[index] = {...}`

### 10.2 Solution Recommandée

**Approche:**
1. ✅ Ajouter état `creatingProductForRowIndex` pour tracker ligne courante
2. ✅ Modifier ouverture modal pour setter `creatingProductForRowIndex = index`
3. ✅ Modifier `handleCreateProduct` pour suivre pattern sélection produit
4. ✅ Ajouter vérifications de sécurité (ligne existe, ligne vide)
5. ✅ Conserver fallback pour compatibilité

**Code basé sur:**
- Pattern sélection produit (lignes 2429-2452)
- Pattern handleUpdateItem (ligne 1343)
- Logique création ligne vide depuis sélection produit

**Risques de régression:**
- ✅ Limités (changement isolé)
- ✅ Fallback préservé pour compatibilité
- ✅ Vérifications de sécurité ajoutées

---

**AGENT-3-PATTERNS-COMPLETE**

**Résumé:**
- ✅ Pattern fonctionnel identifié: Sélection produit (lignes 2424-2465) met à jour ligne courante
- ✅ Fonction utilitaire existante: `handleUpdateItem` (ligne 1343) pour référence
- ⚠️ Documentation limitée: Flow "Créer et Ajouter" pas explicitement documenté
- ❌ Pas de TODO/FIXME: Problème non documenté dans commentaires
- ✅ Solution recommandée: Ajouter `creatingProductForRowIndex` état + suivre pattern sélection produit
- ✅ Risques de régression: Limités avec fallback et vérifications de sécurité





