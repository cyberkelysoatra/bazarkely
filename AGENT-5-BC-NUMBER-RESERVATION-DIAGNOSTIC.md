# DIAGNOSTIC: Réservation de Numéros BC - Analyse READ-ONLY
## BazarKELY Construction POC - Agent 5

**Date:** 2025-11-28  
**Objectif:** Comprendre comment améliorer le message d'erreur "Numéro déjà réservé" pour inclure un lien vers le BC existant

---

## 1. FONCTION reserveNumber - LOCALISATION ET LOGIQUE

### Fichier
`frontend/src/modules/construction-poc/services/bcNumberReservationService.ts`

### Emplacement
**Lignes 127-194**

### Signature
```typescript
async reserveNumber(
  companyId: string,
  orderType: 'BCI' | 'BCE',
  yearPrefix: string,
  sequenceNumber: number
): Promise<ReservationResult>
```

### Logique d'erreur

```typescript
// Ligne 145-151: Appel de la fonction RPC Supabase
const { data, error } = await supabase.rpc('reserve_bc_number', {
  p_company_id: companyId,
  p_order_type: orderType,
  p_year_prefix: yearPrefix,
  p_sequence_number: sequenceNumber,
  p_reserved_by: userId
} as any);

// Ligne 153-158: Gestion erreur RPC
if (error) {
  return {
    success: false,
    error: `Erreur lors de la réservation: ${error.message}`
  };
}

// Ligne 167-179: Traitement réponse RPC
const result = data as {
  success: boolean;
  message: string;
  reservation_id: string | null;
  full_number: string | null;
};

if (!result.success) {
  return {
    success: false,
    error: result.message || 'Erreur lors de la réservation'
  };
}
```

**Point clé:** Le message d'erreur vient de `result.message` retourné par la fonction RPC `reserve_bc_number` côté serveur.

---

## 2. DONNÉES RETOURNÉES EN CAS DE CONFLIT/DUPLICAT

### Structure de réponse actuelle

**Interface ReservationResult (lignes 40-45):**
```typescript
export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  fullNumber?: string;
  error?: string;
}
```

### En cas de numéro déjà pris

**Réponse retournée:**
```typescript
{
  success: false,
  error: result.message  // Message de la RPC, probablement "Numéro déjà réservé"
}
```

**Données disponibles dans la réponse:**
- ✅ `success: false`
- ✅ `error: string` (message d'erreur)
- ❌ **PAS d'ID du BC existant**
- ❌ **PAS de purchase_order_id**
- ❌ **PAS d'informations sur le BC qui utilise déjà ce numéro**

---

## 3. ID DU BC EXISTANT DANS LA RÉPONSE D'ERREUR

### ❌ NON DISPONIBLE ACTUELLEMENT

**Analyse:**
- La fonction RPC `reserve_bc_number` retourne uniquement:
  - `success: boolean`
  - `message: string`
  - `reservation_id: string | null`
  - `full_number: string | null`

- **Aucun champ pour l'ID du BC existant** n'est retourné dans la réponse d'erreur.

- Le message d'erreur `result.message` contient probablement "Numéro déjà réservé" mais ne contient pas l'ID du BC.

---

## 4. COMMENT OBTENIR L'ID DU BC DEPUIS order_number

### ❌ AUCUNE FONCTION EXISTANTE

**Recherche effectuée:**
- ✅ Aucune fonction `findByOrderNumber` ou `getByOrderNumber` dans `pocPurchaseOrderService.ts`
- ✅ Aucune requête existante filtrant par `order_number` dans les services

### Pattern de requête suggéré

Pour trouver un BC par `order_number`, utiliser cette requête Supabase:

```typescript
// Pattern de requête pour trouver un BC par order_number
const { data: existingOrder, error } = await supabase
  .from('poc_purchase_orders')
  .select('id, order_number, buyer_company_id, status')
  .eq('order_number', orderNumber)
  .eq('buyer_company_id', companyId)  // Filtrer par compagnie pour éviter les conflits inter-entreprises
  .single();
```

**Note:** Il est important de filtrer aussi par `buyer_company_id` car le même numéro peut exister dans différentes compagnies (selon la logique métier).

### Fonction suggérée à ajouter

```typescript
/**
 * Trouve un bon de commande par son numéro de commande
 * @param orderNumber - Numéro de commande au format AA/NNN
 * @param companyId - ID de la compagnie (optionnel, pour filtrer)
 * @returns ServiceResult avec le PurchaseOrder ou null si non trouvé
 */
async findByOrderNumber(
  orderNumber: string,
  companyId?: string
): Promise<ServiceResult<PurchaseOrder | null>> {
  try {
    let query = supabase
      .from('poc_purchase_orders')
      .select('*')
      .eq('order_number', orderNumber);
    
    if (companyId) {
      query = query.eq('buyer_company_id', companyId);
    }
    
    const { data, error } = await query.single();
    
    if (error || !data) {
      return {
        success: true,
        data: null  // Non trouvé, pas une erreur
      };
    }
    
    // Mapper vers PurchaseOrder (utiliser la logique de getById)
    // ...
    
    return {
      success: true,
      data: mappedOrder
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Erreur lors de la recherche'
    };
  }
}
```

---

## 5. FONCTIONS EXISTANTES POUR TROUVER BC PAR order_number

### ❌ AUCUNE FONCTION EXISTANTE

**Fonctions disponibles dans pocPurchaseOrderService.ts:**
- ✅ `getById(orderId: string)` - Trouve par ID
- ✅ `updateOrderNumber(orderId, orderNumber)` - Met à jour le numéro
- ❌ **Aucune fonction pour trouver par order_number**

**Conclusion:** Il faut créer une nouvelle fonction ou modifier la fonction RPC côté serveur pour retourner l'ID du BC existant.

---

## 6. UTILISATION ACTUELLE DE reserveNumber

### OrderDetailPage.tsx (ligne 537)

```typescript
const reservationResult = await reserveNumber(
  activeCompany.id,
  order.orderType,
  parsed.yearPrefix,
  parsed.sequenceNumber
);

if (!reservationResult.success || !reservationResult.reservationId) {
  setOrderNumberError(reservationResult.error || 'Erreur lors de la réservation');
  return;
}
```

**Gestion d'erreur:** Affiche simplement `reservationResult.error` dans `setOrderNumberError`.

### PurchaseOrderForm.tsx (ligne 1785)

```typescript
const result = await reserveNumber(
  activeCompany.id,
  orderType,
  parsed.yearPrefix,
  parsed.sequenceNumber
);

if (result.success && result.reservationId && result.fullNumber) {
  // Succès
} else {
  setOrderNumberError(result.error || 'Erreur lors de la réservation');
}
```

**Gestion d'erreur:** Affiche simplement `result.error` dans `setOrderNumberError`.

---

## 7. RECOMMANDATIONS POUR AMÉLIORATION

### Option 1: Modifier la fonction RPC côté serveur (RECOMMANDÉ)

**Modifier `reserve_bc_number` pour retourner l'ID du BC existant:**

```sql
-- Dans la fonction RPC reserve_bc_number
-- Ajouter dans la réponse JSON:
{
  success: false,
  message: 'Numéro déjà réservé',
  existing_purchase_order_id: uuid,  -- NOUVEAU
  existing_order_number: text         -- NOUVEAU
}
```

**Avantages:**
- ✅ Une seule requête
- ✅ Données disponibles immédiatement
- ✅ Pas de requête supplémentaire côté client

### Option 2: Requête supplémentaire côté client

**Après l'erreur de réservation, faire une requête pour trouver le BC:**

```typescript
// Dans bcNumberReservationService.ts
async reserveNumber(...) {
  // ... code existant ...
  
  if (!result.success) {
    // Si erreur "déjà réservé", chercher le BC existant
    if (result.message?.includes('déjà réservé') || result.message?.includes('already')) {
      const fullNumber = this.formatFullNumber(yearPrefix, sequenceNumber);
      const existingBC = await this.findBCByOrderNumber(fullNumber, companyId);
      
      return {
        success: false,
        error: result.message,
        existingPurchaseOrderId: existingBC?.id  // NOUVEAU
      };
    }
    
    return {
      success: false,
      error: result.message
    };
  }
}
```

**Avantages:**
- ✅ Pas besoin de modifier la RPC
- ✅ Solution côté client uniquement

**Inconvénients:**
- ❌ Requête supplémentaire
- ❌ Performance légèrement dégradée

### Option 3: Étendre l'interface ReservationResult

**Ajouter un champ optionnel pour l'ID du BC existant:**

```typescript
export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  fullNumber?: string;
  error?: string;
  existingPurchaseOrderId?: string;  // NOUVEAU
}
```

---

## 8. PATTERN DE REQUÊTE POUR TROUVER BC PAR order_number

### Requête Supabase

```typescript
// Trouver un BC par order_number
const { data: purchaseOrder, error } = await supabase
  .from('poc_purchase_orders')
  .select('id, order_number, buyer_company_id, status, created_at')
  .eq('order_number', orderNumber)
  .eq('buyer_company_id', companyId)  // Important: filtrer par compagnie
  .single();
```

### Contraintes importantes

1. **Filtrer par `buyer_company_id`:** Les numéros BC sont uniques par compagnie, pas globalement.
2. **Utiliser `.single()`:** Un seul BC devrait avoir ce numéro pour une compagnie donnée.
3. **Gérer le cas "non trouvé":** Si aucun BC n'existe, retourner `null` (pas une erreur).

---

## 9. RÉSUMÉ DES TROUVAILLES

### ✅ Ce qui existe

1. **Fonction reserveNumber:** Ligne 127-194 de `bcNumberReservationService.ts`
2. **Gestion d'erreur:** Retourne `{ success: false, error: string }`
3. **Message d'erreur:** Vient de la fonction RPC `reserve_bc_number` côté serveur
4. **Utilisation:** OrderDetailPage et PurchaseOrderForm utilisent `reserveNumber`

### ❌ Ce qui manque

1. **ID du BC existant:** Non retourné dans la réponse d'erreur
2. **Fonction findByOrderNumber:** N'existe pas dans `pocPurchaseOrderService.ts`
3. **Requête par order_number:** Aucun pattern existant dans le code

### 🔧 Solutions possibles

1. **Modifier la RPC** pour retourner `existing_purchase_order_id` (RECOMMANDÉ)
2. **Ajouter une fonction** `findByOrderNumber` dans `pocPurchaseOrderService.ts`
3. **Étendre ReservationResult** avec `existingPurchaseOrderId?: string`
4. **Faire une requête supplémentaire** après l'erreur pour trouver le BC existant

---

## 10. PROCHAINES ÉTAPES SUGGÉRÉES

1. **Analyser la fonction RPC `reserve_bc_number`** côté serveur pour voir si elle peut être modifiée
2. **Créer la fonction `findByOrderNumber`** dans `pocPurchaseOrderService.ts`
3. **Étendre l'interface `ReservationResult`** avec `existingPurchaseOrderId`
4. **Modifier `reserveNumber`** pour inclure la recherche du BC existant en cas d'erreur
5. **Mettre à jour les composants** (OrderDetailPage, PurchaseOrderForm) pour afficher un lien vers le BC existant

---

**AGENT-5-DIAGNOSTIC-COMPLETE**












