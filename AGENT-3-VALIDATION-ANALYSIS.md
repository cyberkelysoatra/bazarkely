# AGENT 3 - ANALYSE LOGIQUE VALIDATION - BCI ORG UNIT
## PurchaseOrderForm.tsx - Erreur Validation Unité Organisationnelle BCI

**Date:** 2025-11-23  
**Agent:** Agent 03 - Validation Logic Analysis  
**Objectif:** Identifier la logique de validation qui requiert l'unité organisationnelle pour les commandes BCI

---

## 1. SUBMIT HANDLER LOCATION

### 1.1 Fonction Principale

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Fonction:** `handleSubmit`
- **Ligne de début:** 1130
- **Ligne de fin:** 1206
- **Type:** `async () => void`

**Code (lignes 1130-1206):**
```typescript
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Veuillez corriger les erreurs du formulaire');
    return;
  }
  
  // Phase 3 Security - Vérifier si un seuil est dépassé...
  
  try {
    setLoading(true);
    
    const orderItems = items.map(item => ({...}));
    
    // Préparer les données selon le type de commande
    const orderData: any = {
      orderType,
      items: orderItems
    };
    
    if (orderType === 'BCI') {
      orderData.phaseId = selectedPhase || undefined;  // ⚠️ PROBLÈME: Pas d'orgUnitId
    } else if (orderType === 'BCE') {
      orderData.projectId = projectId;
      orderData.supplierId = supplierId;
    }
    
    // Créer le brouillon
    const createResult = await pocPurchaseOrderService.createDraft(
      orderType === 'BCE' ? projectId : undefined,
      orderItems,
      orderData
    );
    
    // ... reste du code ...
  }
}
```

### 1.2 Fonction de Sauvegarde Brouillon

**Fonction:** `handleSaveDraft`
- **Ligne de début:** 1076
- **Ligne de fin:** 1127
- **Même problème:** Ne passe pas `orgUnitId` dans `orderData` pour BCI

---

## 2. VALIDATION LOGIC

### 2.1 Validation Client-Side (React)

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Fonction:** `validateForm`
- **Ligne de début:** 1021
- **Ligne de fin:** 1068

**Code de validation BCI (lignes 1031-1035):**
```typescript
// Validation conditionnelle selon le type de commande
if (orderType === 'BCI') {
  // Pour BCI: phase requise, fournisseur non requis
  if (!selectedPhase) {
    newErrors.phaseId = 'Veuillez sélectionner une phase';
  }
  // ⚠️ PROBLÈME: Pas de validation pour orgUnitId dans validateForm()
} else if (orderType === 'BCE') {
  // Pour BCE: projet et fournisseur requis
  if (!projectId) {
    newErrors.projectId = 'Veuillez sélectionner un projet';
  }
  if (!supplierId) {
    newErrors.supplierId = 'Le fournisseur est requis';
  }
}
```

**Conclusion:** ❌ **Pas de validation client-side pour `orgUnitId`** - La validation `validateForm()` ne vérifie pas `orgUnitId` pour BCI

### 2.2 Validation Server-Side (Backend)

**Fichier:** `frontend/src/modules/construction-poc/services/pocPurchaseOrderService.ts`

**Fonction:** `createDraft`
- **Ligne de début:** 30
- **Ligne de fin:** ~200

**Code de validation BCI (lignes 68-89):**
```typescript
// Validation selon le type de commande
if (orderData.orderType === 'BCI') {
  // BCI (Bon de Commande Interne): orgUnitId requis, projectId optionnel
  if (!orderData.orgUnitId) {  // ⚠️ Vérifie orderData.orgUnitId
    return {
      success: false,
      error: 'Une unité organisationnelle est requise pour les commandes internes (BCI)'  // ⚠️ MESSAGE D'ERREUR
    };
  }
  // Vérifier que l'org_unit existe et appartient à la compagnie
  const { data: orgUnit, error: orgUnitError } = await supabase
    .from('poc_org_units')
    .select('id, company_id')
    .eq('id', orderData.orgUnitId)
    .eq('company_id', company.companyId)
    .single();
    
  if (orgUnitError || !orgUnit) {
    return {
      success: false,
      error: 'Unité organisationnelle introuvable ou n\'appartient pas à votre compagnie'
    };
  }
}
```

**Conclusion:** ✅ **Validation server-side présente** - Le service backend vérifie `orderData.orgUnitId` pour BCI

---

## 3. ERROR MESSAGE GENERATION

### 3.1 Source du Message d'Erreur

**Fichier:** `frontend/src/modules/construction-poc/services/pocPurchaseOrderService.ts`

**Ligne exacte:** 73

**Message d'erreur:**
```typescript
error: 'Une unité organisationnelle est requise pour les commandes internes (BCI)'
```

### 3.2 Affichage de l'Erreur

**Dans `handleSubmit` (ligne 1186-1188):**
```typescript
if (!createResult.success || !createResult.data) {
  toast.error(createResult.error || 'Erreur lors de la création');  // ⚠️ Affiche l'erreur backend
  return;
}
```

**Dans `handleSaveDraft` (ligne 1118-1120):**
```typescript
if (result.success) {
  toast.success('Brouillon sauvegardé avec succès');
  navigate('/construction/orders');
} else {
  toast.error(result.error || 'Erreur lors de la sauvegarde');  // ⚠️ Affiche l'erreur backend
}
```

**Conclusion:** ✅ **Erreur affichée via `toast.error()`** - Le message d'erreur backend est affiché dans un toast

---

## 4. FORM DATA STRUCTURE

### 4.1 Structure `orderData` Créée dans `handleSubmit`

**Code (lignes 1165-1176):**
```typescript
// Préparer les données selon le type de commande
const orderData: any = {
  orderType,
  items: orderItems
};

if (orderType === 'BCI') {
  orderData.phaseId = selectedPhase || undefined;  // ⚠️ PROBLÈME: Pas d'orgUnitId
} else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierId = supplierId;
}
```

**Structure actuelle pour BCI:**
```typescript
{
  orderType: 'BCI',
  items: [...],
  phaseId: string | undefined  // ⚠️ Présent
  // ❌ orgUnitId: MANQUANT
}
```

### 4.2 Structure Attendue par Backend

**Fichier:** `frontend/src/modules/construction-poc/services/pocPurchaseOrderService.ts`

**Signature de fonction (lignes 30-38):**
```typescript
async createDraft(
  projectId: string | undefined,
  items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[],
  orderData: {
    orderType: 'BCI' | 'BCE';
    orgUnitId?: string;  // ⚠️ ATTENDU pour BCI
    supplierCompanyId?: string;
  }
): Promise<ServiceResult<PurchaseOrder>>
```

**Structure attendue pour BCI:**
```typescript
{
  orderType: 'BCI',
  orgUnitId: string  // ⚠️ REQUIS pour BCI
}
```

**Conclusion:** ❌ **Gap identifié** - `orderData` ne contient pas `orgUnitId` alors que le backend l'attend

### 4.3 Mapping vers Base de Données

**Code backend (lignes 130-141):**
```typescript
const purchaseOrderData: any = {
  buyer_company_id: company.companyId,
  project_id: projectId || null, // NULL pour BCI, requis pour BCE
  created_by: userId,
  order_number: orderNumber,
  order_type: orderData.orderType, // BCI ou BCE
  org_unit_id: orderData.orgUnitId || null, // ⚠️ NULL pour BCE, requis pour BCI
  supplier_company_id: orderData.supplierCompanyId || null, // NULL pour BCI, requis pour BCE
  status: 'draft' as PurchaseOrderStatus,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};
```

**Conclusion:** ✅ **Mapping correct** - Si `orderData.orgUnitId` est présent, il est mappé vers `org_unit_id` dans la DB

---

## 5. BCI SPECIFIC CHECKS

### 5.1 Vérifications Client-Side

**Dans `validateForm()` (lignes 1031-1035):**
```typescript
if (orderType === 'BCI') {
  // Pour BCI: phase requise, fournisseur non requis
  if (!selectedPhase) {
    newErrors.phaseId = 'Veuillez sélectionner une phase';
  }
  // ⚠️ PROBLÈME: Pas de vérification orgUnitId
}
```

**Conclusion:** ❌ **Pas de vérification `orgUnitId` client-side** - Seulement `selectedPhase` est vérifié

### 5.2 Vérifications Server-Side

**Dans `createDraft()` (lignes 68-89):**
```typescript
if (orderData.orderType === 'BCI') {
  // BCI (Bon de Commande Interne): orgUnitId requis, projectId optionnel
  if (!orderData.orgUnitId) {  // ⚠️ Vérification stricte
    return {
      success: false,
      error: 'Une unité organisationnelle est requise pour les commandes internes (BCI)'
    };
  }
  // Vérification existence et appartenance org_unit
  const { data: orgUnit, error: orgUnitError } = await supabase
    .from('poc_org_units')
    .select('id, company_id')
    .eq('id', orderData.orgUnitId)
    .eq('company_id', company.companyId)
    .single();
    
  if (orgUnitError || !orgUnit) {
    return {
      success: false,
      error: 'Unité organisationnelle introuvable ou n\'appartient pas à votre compagnie'
    };
  }
}
```

**Conclusion:** ✅ **Vérifications server-side complètes** - Existence et appartenance vérifiées

---

## 6. BACKEND VALIDATION

### 6.1 Validation dans Service

**Fichier:** `frontend/src/modules/construction-poc/services/pocPurchaseOrderService.ts`

**Validations identifiées:**
1. ✅ **Vérification `orgUnitId` présent** (ligne 70)
2. ✅ **Vérification existence org_unit** (lignes 77-82)
3. ✅ **Vérification appartenance compagnie** (ligne 81: `.eq('company_id', company.companyId)`)

### 6.2 Validation Base de Données

**Contraintes SQL possibles:**
- `org_unit_id` peut être NULL (pour BCE)
- `org_unit_id` doit référencer `poc_org_units.id` (FK)
- Contrainte CHECK `check_supplier_by_order_type` vérifie que `supplier_company_id` est NULL pour BCI

**RLS Policies:**
- Les politiques RLS sur `poc_org_units` vérifient l'accès selon `company_id`
- Les politiques RLS sur `poc_purchase_orders` vérifient l'accès selon `buyer_company_id`

**Conclusion:** ✅ **Validations backend complètes** - Service + Base de données

---

## 7. ROOT CAUSE ANALYSIS

### 7.1 Problème Identifié

**GAP CRITIQUE:** `orgUnitId` n'est pas inclus dans `orderData` lors de la soumission BCI

**Code problématique (lignes 1165-1176):**
```typescript
const orderData: any = {
  orderType,
  items: orderItems
};

if (orderType === 'BCI') {
  orderData.phaseId = selectedPhase || undefined;  // ✅ Inclus
  // ❌ orderData.orgUnitId = orgUnitId;  // MANQUANT
} else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierId = supplierId;
}
```

**État actuel:**
- ✅ `orgUnitId` existe dans le state React (ligne 53: `const [orgUnitId, setOrgUnitId] = useState('')`)
- ✅ `orgUnitId` est sélectionné via le sélecteur UI (lignes 1643-1680)
- ❌ `orgUnitId` n'est PAS inclus dans `orderData` lors de la soumission
- ❌ Backend reçoit `orderData` sans `orgUnitId` → Validation échoue → Erreur affichée

### 7.2 Pourquoi le Problème Existe

**Hypothèse:**
- Le code a été écrit pour inclure `phaseId` pour BCI (nouvelle fonctionnalité)
- Mais `orgUnitId` a été oublié lors de la préparation de `orderData`
- Le backend attend toujours `orgUnitId` (validation existante)
- Résultat: Gap entre frontend et backend

### 7.3 Impact

**Symptômes:**
- ✅ Formulaire se valide côté client (pas de validation `orgUnitId`)
- ✅ Soumission atteint le backend
- ❌ Backend rejette avec erreur "Une unité organisationnelle est requise pour les commandes internes (BCI)"
- ❌ Utilisateur voit l'erreur mais ne peut pas soumettre

---

## 8. SOLUTION REQUISE

### 8.1 Correction Nécessaire

**Fichier:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Changement dans `handleSubmit` (lignes 1171-1172):**
```typescript
// AVANT (INCORRECT)
if (orderType === 'BCI') {
  orderData.phaseId = selectedPhase || undefined;
}

// APRÈS (CORRECT)
if (orderType === 'BCI') {
  orderData.orgUnitId = orgUnitId;  // ✅ Ajouter orgUnitId
  orderData.phaseId = selectedPhase || undefined;
}
```

**Changement dans `handleSaveDraft` (lignes 1101-1102):**
```typescript
// AVANT (INCORRECT)
if (orderType === 'BCI') {
  orderData.phaseId = selectedPhase || undefined;
}

// APRÈS (CORRECT)
if (orderType === 'BCI') {
  orderData.orgUnitId = orgUnitId;  // ✅ Ajouter orgUnitId
  orderData.phaseId = selectedPhase || undefined;
}
```

### 8.2 Validation Client-Side Recommandée

**Ajout dans `validateForm()` (lignes 1031-1035):**
```typescript
if (orderType === 'BCI') {
  // Pour BCI: orgUnitId et phase requis
  if (!orgUnitId) {
    newErrors.orgUnitId = 'Veuillez sélectionner une unité organisationnelle';
  }
  if (!selectedPhase) {
    newErrors.phaseId = 'Veuillez sélectionner une phase';
  }
}
```

**Avantages:**
- ✅ Erreur affichée avant soumission
- ✅ Meilleure UX (pas d'attente backend)
- ✅ Cohérence avec validation BCE

---

## 9. CODE CORRIGÉ COMPLET

### 9.1 `handleSubmit` Corrigé

```typescript
const handleSubmit = async () => {
  if (!validateForm()) {
    toast.error('Veuillez corriger les erreurs du formulaire');
    return;
  }
  
  // ... Phase 3 Security check ...
  
  try {
    setLoading(true);
    
    const orderItems = items.map(item => ({
      catalogItemId: item.catalogItemId,
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice
    }));
    
    // Préparer les données selon le type de commande
    const orderData: any = {
      orderType,
      items: orderItems
    };
    
    if (orderType === 'BCI') {
      orderData.orgUnitId = orgUnitId;  // ✅ AJOUTÉ
      orderData.phaseId = selectedPhase || undefined;
    } else if (orderType === 'BCE') {
      orderData.projectId = projectId;
      orderData.supplierId = supplierId;
    }
    
    // Créer le brouillon
    const createResult = await pocPurchaseOrderService.createDraft(
      orderType === 'BCE' ? projectId : undefined,
      orderItems,
      orderData
    );
    
    // ... reste du code ...
  }
}
```

### 9.2 `handleSaveDraft` Corrigé

```typescript
const handleSaveDraft = async () => {
  if (!validateForm()) {
    toast.error('Veuillez corriger les erreurs du formulaire');
    return;
  }
  
  try {
    setLoading(true);
    
    const orderItems = items.map(item => ({...}));
    
    const orderData: any = {
      orderType,
      items: orderItems
    };
    
    if (orderType === 'BCI') {
      orderData.orgUnitId = orgUnitId;  // ✅ AJOUTÉ
      orderData.phaseId = selectedPhase || undefined;
    } else if (orderType === 'BCE') {
      orderData.projectId = projectId;
      orderData.supplierId = supplierId;
    }
    
    const result = await pocPurchaseOrderService.createDraft(
      orderType === 'BCE' ? projectId : undefined,
      orderItems,
      orderData
    );
    
    // ... reste du code ...
  }
}
```

### 9.3 `validateForm` Amélioré

```typescript
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};
  
  // ... validation date livraison ...
  
  // Validation conditionnelle selon le type de commande
  if (orderType === 'BCI') {
    // Pour BCI: orgUnitId et phase requis
    if (!orgUnitId) {
      newErrors.orgUnitId = 'Veuillez sélectionner une unité organisationnelle';  // ✅ AJOUTÉ
    }
    if (!selectedPhase) {
      newErrors.phaseId = 'Veuillez sélectionner une phase';
    }
  } else if (orderType === 'BCE') {
    // Pour BCE: projet et fournisseur requis
    if (!projectId) {
      newErrors.projectId = 'Veuillez sélectionner un projet';
    }
    if (!supplierId) {
      newErrors.supplierId = 'Le fournisseur est requis';
    }
  }
  
  // ... reste de la validation ...
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};
```

---

## 10. TESTING CHECKLIST

### 10.1 Vérifications Post-Correction

- [ ] `orgUnitId` inclus dans `orderData` pour BCI dans `handleSubmit`
- [ ] `orgUnitId` inclus dans `orderData` pour BCI dans `handleSaveDraft`
- [ ] Validation client-side `orgUnitId` ajoutée dans `validateForm`
- [ ] Message d'erreur client-side affiché si `orgUnitId` manquant
- [ ] Soumission BCI réussit avec `orgUnitId` valide
- [ ] Sauvegarde brouillon BCI réussit avec `orgUnitId` valide
- [ ] Erreur backend ne s'affiche plus pour `orgUnitId` manquant
- [ ] `orgUnitId` correctement mappé vers `org_unit_id` dans la DB

---

## 11. CONCLUSION

### 11.1 Résumé du Problème

**Cause Racine:**
- ❌ `orgUnitId` n'est pas inclus dans `orderData` lors de la préparation des données BCI
- ❌ Backend attend `orderData.orgUnitId` mais reçoit `undefined`
- ❌ Validation backend échoue → Erreur affichée

**Localisation:**
- **Frontend:** `PurchaseOrderForm.tsx` lignes 1171-1172 (`handleSubmit`) et 1101-1102 (`handleSaveDraft`)
- **Backend:** `pocPurchaseOrderService.ts` ligne 70-73 (validation `orgUnitId`)

**Message d'erreur:**
- **Source:** `pocPurchaseOrderService.ts` ligne 73
- **Texte:** `'Une unité organisationnelle est requise pour les commandes internes (BCI)'`
- **Affichage:** Via `toast.error()` dans `handleSubmit` ligne 1187 et `handleSaveDraft` ligne 1119

### 11.2 Solution

**Changements requis:**
1. ✅ Ajouter `orderData.orgUnitId = orgUnitId;` dans `handleSubmit` (ligne 1171)
2. ✅ Ajouter `orderData.orgUnitId = orgUnitId;` dans `handleSaveDraft` (ligne 1101)
3. ✅ Ajouter validation client-side `orgUnitId` dans `validateForm()` (ligne 1031)

**Impact:**
- ✅ Soumission BCI fonctionnera avec `orgUnitId` valide
- ✅ Erreur backend ne s'affichera plus
- ✅ Meilleure UX avec validation client-side

---

**AGENT-3-VALIDATION-ANALYSIS-COMPLETE**

**Résumé:**
- ✅ Submit handler localisé: `handleSubmit` ligne 1130, `handleSaveDraft` ligne 1076
- ✅ Validation backend localisée: `pocPurchaseOrderService.createDraft()` ligne 70-73
- ✅ Message d'erreur localisé: ligne 73 du service backend
- ❌ **PROBLÈME:** `orgUnitId` manquant dans `orderData` pour BCI (lignes 1171-1172 et 1101-1102)
- ✅ **SOLUTION:** Ajouter `orderData.orgUnitId = orgUnitId;` dans les deux handlers + validation client-side


