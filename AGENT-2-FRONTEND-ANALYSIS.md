# AGENT 2 - ANALYSE FRONTEND PurchaseOrderForm.tsx

**Agent:** Agent 02 - Frontend Form Analysis  
**Date:** 2025-11-23  
**Objectif:** Analyser PurchaseOrderForm.tsx pour déterminer exactement quelles données sont envoyées au backend service

---

## 1. FILE LOCATION (Localisation du fichier)

**Chemin exact:** `frontend/src/modules/construction-poc/components/PurchaseOrderForm.tsx`

**Statut:** ✅ Fichier trouvé et analysé

---

## 2. STATE DEFINITIONS (Définitions d'état)

### 2.1 orderType State

**Localisation:** Ligne 129

**Code:**
```tsx
const [orderType, setOrderType] = useState<'BCI' | 'BCE'>('BCE');
```

**Type:** `'BCI' | 'BCE'`  
**Valeur par défaut:** `'BCE'`  
**Valeurs possibles:** 
- `'BCI'` - Bon de Commande Interne
- `'BCE'` - Bon de Commande Externe

**Modifications:**
- Ligne 2311: `setOrderType('BCI')` - Changement vers BCI
- Ligne 2328: `setOrderType('BCE')` - Changement vers BCE

### 2.2 orgUnitId State

**Localisation:** Ligne 131

**Code:**
```tsx
const [orgUnitId, setOrgUnitId] = useState(''); // Unité organisationnelle pour BCI
```

**Type:** `string`  
**Valeur par défaut:** `''` (chaîne vide)  
**Utilisation:** Uniquement pour les commandes BCI

**Modifications:**
- Ligne 365: `setOrgUnitId(userOrgUnitId)` - Auto-sélection si utilisateur membre d'une seule unité
- Ligne 1302: `setOrgUnitId(newOrgUnit.id)` - Après création d'une nouvelle unité
- Ligne 2330: `setOrgUnitId('')` - Réinitialisation lors du changement vers BCE

---

## 3. SERVICE CALL - handleSaveDraft (Appel service - handleSaveDraft)

### 3.1 Localisation

**Fonction:** `handleSaveDraft`  
**Lignes:** 1570-1622

### 3.2 Code complet de l'appel

**Lignes 1579-1608:**
```tsx
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
  orderData.orgUnitId = orgUnitId;
  orderData.phaseId = selectedPhase || undefined;
} else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierId = supplierId;
}

// Note: Le service createDraft devra être mis à jour pour accepter ces nouveaux champs
const result = await pocPurchaseOrderService.createDraft(
  orderType === 'BCE' ? projectId : undefined,
  orderItems,
  orderData
);
```

### 3.3 Paramètres passés à createDraft()

**Paramètre 1:** `projectId` (string | undefined)
- **Valeur:** `orderType === 'BCE' ? projectId : undefined`
- **Type:** `string | undefined`
- **Note:** Passé uniquement pour BCE, `undefined` pour BCI

**Paramètre 2:** `orderItems` (array)
- **Type:** `Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[]`
- **Structure:**
  ```tsx
  {
    catalogItemId: string | undefined,
    itemName: string,
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    totalPrice: number
  }[]
  ```

**Paramètre 3:** `orderData` (object)
- **Type:** `any` (pas de type strict)
- **Structure selon orderType:**

  **Pour BCI:**
  ```tsx
  {
    orderType: 'BCI',
    items: orderItems,  // ⚠️ PROBLÈME: items inclus dans orderData
    orgUnitId: string,
    phaseId: string | undefined
  }
  ```

  **Pour BCE:**
  ```tsx
  {
    orderType: 'BCE',
    items: orderItems,  // ⚠️ PROBLÈME: items inclus dans orderData
    projectId: string,
    supplierId: string  // ⚠️ PROBLÈME: nom incorrect (devrait être supplierCompanyId)
  }
  ```

---

## 4. SERVICE CALL - handleSubmit (Appel service - handleSubmit)

### 4.1 Localisation

**Fonction:** `handleSubmit`  
**Lignes:** 1625-1702

### 4.2 Code complet de l'appel

**Lignes 1650-1680:**
```tsx
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
  orderData.orgUnitId = orgUnitId;
  orderData.phaseId = selectedPhase || undefined;
} else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierId = supplierId;
}

// Créer le brouillon
// Note: Le service createDraft devra être mis à jour pour accepter ces nouveaux champs
const createResult = await pocPurchaseOrderService.createDraft(
  orderType === 'BCE' ? projectId : undefined,
  orderItems,
  orderData
);
```

### 4.3 Paramètres passés à createDraft()

**Identique à handleSaveDraft** - Même structure et même problèmes

---

## 5. DATA SENT (Données envoyées)

### 5.1 Structure complète des données envoyées

**Pour BCI (Bon de Commande Interne):**

```tsx
// Paramètre 1: projectId
undefined

// Paramètre 2: orderItems
[
  {
    catalogItemId: string | undefined,
    itemName: string,
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    totalPrice: number
  },
  // ... autres items
]

// Paramètre 3: orderData
{
  orderType: 'BCI',
  items: orderItems,  // ⚠️ PROBLÈME: items inclus alors qu'ils sont déjà en paramètre 2
  orgUnitId: string,
  phaseId: string | undefined  // ⚠️ PROBLÈME: phaseId non attendu dans orderData
}
```

**Pour BCE (Bon de Commande Externe):**

```tsx
// Paramètre 1: projectId
string  // ID du projet

// Paramètre 2: orderItems
[
  {
    catalogItemId: string | undefined,
    itemName: string,
    description: string,
    quantity: number,
    unit: string,
    unitPrice: number,
    totalPrice: number
  },
  // ... autres items
]

// Paramètre 3: orderData
{
  orderType: 'BCE',
  items: orderItems,  // ⚠️ PROBLÈME: items inclus alors qu'ils sont déjà en paramètre 2
  projectId: string,  // ⚠️ PROBLÈME: projectId inclus alors qu'il est déjà en paramètre 1
  supplierId: string  // ⚠️ PROBLÈME: nom incorrect, devrait être supplierCompanyId
}
```

### 5.2 Propriétés incluses dans orderData

**Propriétés communes:**
- ✅ `orderType` - Type de commande ('BCI' | 'BCE')
- ⚠️ `items` - Liste des items (redondant, déjà en paramètre 2)

**Propriétés pour BCI:**
- ✅ `orgUnitId` - ID de l'unité organisationnelle
- ⚠️ `phaseId` - ID de la phase (non attendu dans orderData selon signature service)

**Propriétés pour BCE:**
- ⚠️ `projectId` - ID du projet (redondant, déjà en paramètre 1)
- ❌ `supplierId` - ID du fournisseur (nom incorrect, devrait être `supplierCompanyId`)

---

## 6. MISMATCH ANALYSIS (Analyse des incohérences)

### 6.1 Signature du service createDraft

**Localisation:** `frontend/src/modules/construction-poc/services/pocPurchaseOrderService.ts` (lignes 30-38)

**Signature:**
```tsx
async createDraft(
  projectId: string | undefined,
  items: Omit<PurchaseOrderItem, 'id' | 'purchaseOrderId' | 'createdAt' | 'updatedAt'>[],
  orderData: {
    orderType: 'BCI' | 'BCE';
    orgUnitId?: string;
    supplierCompanyId?: string;
  }
): Promise<ServiceResult<PurchaseOrder>>
```

### 6.2 Comparaison Frontend vs Service

| Aspect | Frontend envoie | Service attend | Statut |
|--------|----------------|----------------|--------|
| **Paramètre 1 (projectId)** | `orderType === 'BCE' ? projectId : undefined` | `string \| undefined` | ✅ **MATCH** |
| **Paramètre 2 (items)** | `orderItems[]` | `Omit<PurchaseOrderItem, ...>[]` | ✅ **MATCH** |
| **orderData.orderType** | `'BCI' \| 'BCE'` | `'BCI' \| 'BCE'` | ✅ **MATCH** |
| **orderData.items** | `orderItems` (inclus) | ❌ **NON ATTENDU** | ❌ **MISMATCH** |
| **orderData.orgUnitId** | `orgUnitId` (pour BCI) | `orgUnitId?: string` | ✅ **MATCH** |
| **orderData.phaseId** | `selectedPhase \| undefined` (pour BCI) | ❌ **NON ATTENDU** | ❌ **MISMATCH** |
| **orderData.projectId** | `projectId` (pour BCE) | ❌ **NON ATTENDU** (déjà en paramètre 1) | ❌ **MISMATCH** |
| **orderData.supplierId** | `supplierId` (pour BCE) | ❌ **NON ATTENDU** (nom incorrect) | ❌ **MISMATCH** |
| **orderData.supplierCompanyId** | ❌ **NON ENVOYÉ** | `supplierCompanyId?: string` | ❌ **MISMATCH** |

### 6.3 Problèmes identifiés

**Problème 1: Items redondants dans orderData**
- ❌ Le frontend inclut `items` dans `orderData`
- ❌ Le service n'attend pas `items` dans `orderData` (déjà en paramètre 2)
- **Impact:** Données redondantes, mais probablement ignorées par le service

**Problème 2: phaseId non attendu**
- ❌ Le frontend envoie `phaseId` dans `orderData` pour BCI
- ❌ Le service n'attend pas `phaseId` dans `orderData`
- **Impact:** Données ignorées, phaseId n'est pas sauvegardé

**Problème 3: projectId redondant dans orderData**
- ❌ Le frontend envoie `projectId` dans `orderData` pour BCE
- ❌ Le service n'attend pas `projectId` dans `orderData` (déjà en paramètre 1)
- **Impact:** Données redondantes, mais probablement ignorées

**Problème 4: Nom incorrect pour supplierId**
- ❌ Le frontend envoie `supplierId` dans `orderData`
- ❌ Le service attend `supplierCompanyId` (pas `supplierId`)
- **Impact:** ⚠️ **CRITIQUE** - Le fournisseur n'est pas sauvegardé pour les commandes BCE

### 6.4 Analyse détaillée des incohérences

**Incohérence 1: phaseId non sauvegardé**

**Frontend (ligne 1597):**
```tsx
if (orderType === 'BCI') {
  orderData.orgUnitId = orgUnitId;
  orderData.phaseId = selectedPhase || undefined;  // ⚠️ Envoyé mais non attendu
}
```

**Service (lignes 33-37):**
```tsx
orderData: {
  orderType: 'BCI' | 'BCE';
  orgUnitId?: string;
  supplierCompanyId?: string;
  // ❌ phaseId non présent dans la signature
}
```

**Impact:** La phase sélectionnée n'est **PAS** sauvegardée dans la base de données

**Incohérence 2: supplierId vs supplierCompanyId**

**Frontend (ligne 1600):**
```tsx
else if (orderType === 'BCE') {
  orderData.projectId = projectId;
  orderData.supplierId = supplierId;  // ⚠️ Nom incorrect
}
```

**Service (ligne 36):**
```tsx
supplierCompanyId?: string;  // ✅ Nom attendu
```

**Impact:** ⚠️ **CRITIQUE** - Le fournisseur n'est **PAS** sauvegardé car le nom de propriété est incorrect

**Vérification dans le service (lignes 98-103):**
```tsx
if (!orderData.supplierCompanyId) {
  return {
    success: false,
    error: 'Un fournisseur est requis pour les commandes externes (BCE)'
  };
}
```

**Conclusion:** Les commandes BCE échoueront avec l'erreur "Un fournisseur est requis" même si `supplierId` est fourni, car le service cherche `supplierCompanyId`.

---

## 7. RÉSUMÉ DES FINDINGS

### 7.1 Données envoyées correctement

✅ **orderType** - Envoyé correctement  
✅ **orgUnitId** - Envoyé correctement pour BCI  
✅ **projectId** - Passé correctement en paramètre 1 pour BCE  
✅ **items** - Passé correctement en paramètre 2

### 7.2 Problèmes identifiés

❌ **items dans orderData** - Redondant (déjà en paramètre 2)  
❌ **phaseId** - Envoyé mais non attendu par le service  
❌ **projectId dans orderData** - Redondant (déjà en paramètre 1)  
❌ **supplierId** - Nom incorrect, devrait être `supplierCompanyId`  
⚠️ **CRITIQUE:** Les commandes BCE échoueront car `supplierCompanyId` n'est pas fourni

### 7.3 Corrections requises

**Correction 1: Renommer supplierId en supplierCompanyId**

**Ligne 1600:**
```tsx
// AVANT:
orderData.supplierId = supplierId;

// APRÈS:
orderData.supplierCompanyId = supplierId;
```

**Correction 2: Retirer items de orderData (optionnel)**

**Lignes 1590-1593:**
```tsx
// AVANT:
const orderData: any = {
  orderType,
  items: orderItems  // Redondant
};

// APRÈS:
const orderData: any = {
  orderType
  // items retiré (déjà en paramètre 2)
};
```

**Correction 3: Retirer projectId de orderData pour BCE (optionnel)**

**Lignes 1599-1601:**
```tsx
// AVANT:
else if (orderType === 'BCE') {
  orderData.projectId = projectId;  // Redondant
  orderData.supplierCompanyId = supplierId;
}

// APRÈS:
else if (orderType === 'BCE') {
  orderData.supplierCompanyId = supplierId;
  // projectId retiré (déjà en paramètre 1)
}
```

**Correction 4: Gérer phaseId (si nécessaire)**

**Option A:** Retirer phaseId si non utilisé
```tsx
// Retirer ligne 1597:
// orderData.phaseId = selectedPhase || undefined;
```

**Option B:** Mettre à jour le service pour accepter phaseId
- Nécessite modification du service (hors scope de cette analyse)

---

## 8. IMPACT ANALYSIS (Analyse d'impact)

### 8.1 Impact des incohérences

**Incohérence 1: items dans orderData**
- **Impact:** LOW - Redondant mais probablement ignoré par le service
- **Action:** Optionnel de corriger

**Incohérence 2: phaseId non sauvegardé**
- **Impact:** MEDIUM - La phase sélectionnée n'est pas sauvegardée
- **Action:** Soit retirer du frontend, soit mettre à jour le service

**Incohérence 3: projectId redondant**
- **Impact:** LOW - Redondant mais probablement ignoré
- **Action:** Optionnel de corriger

**Incohérence 4: supplierId vs supplierCompanyId**
- **Impact:** ⚠️ **CRITIQUE** - Les commandes BCE échouent
- **Action:** **REQUIS** de corriger immédiatement

### 8.2 Test de validation

**Test pour BCE:**
1. Créer une commande BCE avec un fournisseur sélectionné
2. Le service retournera: `"Un fournisseur est requis pour les commandes externes (BCE)"`
3. Même si `supplierId` est fourni dans `orderData`, le service cherche `supplierCompanyId`

**Test pour BCI:**
1. Créer une commande BCI avec une phase sélectionnée
2. La phase ne sera pas sauvegardée (mais la commande peut être créée)

---

**AGENT-2-FRONTEND-ANALYSIS-COMPLETE**





