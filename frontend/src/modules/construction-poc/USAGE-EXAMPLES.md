# Exemples d'Utilisation - Services Workflow Construction POC

## 📚 Guide d'utilisation des services

### 1. Service de Workflow (`pocWorkflowService`)

#### Vérifier si une transition est valide
```typescript
import workflowService from './services/pocWorkflowService';
import { PurchaseOrderStatus } from './types/construction';

const isValid = workflowService.validateTransition(
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PENDING_SITE_MANAGER
);
// Retourne: true
```

#### Vérifier les permissions d'un utilisateur
```typescript
const canApprove = await workflowService.canUserPerformAction(
  userId,
  purchaseOrderId,
  'approve_site'
);
if (!canApprove) {
  console.error('Utilisateur non autorisé');
}
```

#### Récupérer les actions disponibles
```typescript
const availableActions = await workflowService.getAvailableActions(
  purchaseOrderId,
  userId
);
// Retourne: ['submit', 'cancel'] ou ['approve_site', 'reject_site', 'cancel'], etc.
```

#### Vérifier la disponibilité du stock
```typescript
const stockCheck = await workflowService.checkStockAvailability(orderId);
if (stockCheck.available) {
  console.log('Stock suffisant');
} else {
  console.log(`${stockCheck.missingItems.length} items manquants`);
}
```

### 2. Service de Purchase Order (`pocPurchaseOrderService`)

#### Créer un brouillon de bon de commande
```typescript
import purchaseOrderService from './services/pocPurchaseOrderService';

const result = await purchaseOrderService.createDraft(
  creatorId,
  companyId,
  projectId,
  [
    {
      itemName: 'Ciment Portland',
      quantity: 100,
      unit: 'sac',
      unitPrice: 15000,
      totalPrice: 1500000
    },
    {
      itemName: 'Barres d\'acier',
      quantity: 50,
      unit: 'barre',
      unitPrice: 25000,
      totalPrice: 1250000
    }
  ]
);

if (result.success && result.data) {
  console.log('Bon de commande créé:', result.data.orderNumber);
}
```

#### Soumettre pour validation (Chef Equipe)
```typescript
const result = await purchaseOrderService.submitForApproval(
  orderId,
  creatorUserId
);

if (result.success) {
  console.log('Bon de commande soumis pour validation');
} else {
  console.error('Erreur:', result.error);
}
```

#### Approuver par Chef Chantier (Niveau 2)
```typescript
const result = await purchaseOrderService.approveBySiteManager(
  orderId,
  siteManagerId
);

if (result.success) {
  // Le système vérifie automatiquement le stock
  // → Si stock suffisant: fulfilled_internal
  // → Si stock insuffisant: pending_management
  console.log('Statut actuel:', result.data?.status);
}
```

#### Rejeter par Chef Chantier
```typescript
const result = await purchaseOrderService.rejectBySiteManager(
  orderId,
  siteManagerId,
  'Quantités incorrectes, retour au créateur'
);

if (result.success) {
  // Le bon de commande revient à draft
  console.log('Bon de commande rejeté, retour à draft');
}
```

#### Approuver par Direction (Niveau 4 - conditionnel)
```typescript
// Seulement si stock insuffisant
const result = await purchaseOrderService.approveByManagement(
  orderId,
  managementUserId
);

if (result.success) {
  // Le bon de commande est automatiquement soumis au fournisseur
  // → submitted_to_supplier → pending_supplier
  console.log('Approuvé par direction, soumis au fournisseur');
}
```

#### Rejeter par Direction
```typescript
const result = await purchaseOrderService.rejectByManagement(
  orderId,
  managementUserId,
  'Budget insuffisant pour cette commande externe'
);

if (result.success) {
  // Le workflow se termine avec rejected_management
  console.log('Rejeté par direction, workflow terminé');
}
```

#### Accepter par Fournisseur (Niveau 5)
```typescript
const result = await purchaseOrderService.acceptBySupplier(
  orderId,
  supplierUserId
);

if (result.success) {
  // Transition automatique vers in_transit
  console.log('Accepté par fournisseur, en transit');
}
```

#### Rejeter par Fournisseur
```typescript
const result = await purchaseOrderService.rejectBySupplier(
  orderId,
  supplierUserId,
  'Items non disponibles actuellement'
);

if (result.success) {
  // Le workflow se termine avec rejected_supplier
  console.log('Rejeté par fournisseur, workflow terminé');
}
```

#### Marquer comme livré
```typescript
const result = await purchaseOrderService.markAsDelivered(
  orderId,
  userId
);

if (result.success) {
  console.log('Bon de commande marqué comme livré');
}
```

#### Finaliser le bon de commande
```typescript
const result = await purchaseOrderService.complete(
  orderId,
  userId
);

if (result.success) {
  // Si fulfilled_internal, le stock est automatiquement déduit
  console.log('Bon de commande finalisé');
}
```

#### Annuler un bon de commande
```typescript
const result = await purchaseOrderService.cancel(
  orderId,
  userId,
  'Commande annulée par erreur'
);

if (result.success) {
  console.log('Bon de commande annulé');
}
```

#### Récupérer un bon de commande
```typescript
const result = await purchaseOrderService.getById(orderId);

if (result.success && result.data) {
  console.log('Bon de commande:', result.data);
  console.log('Items:', result.data.items);
  console.log('Statut:', result.data.status);
}
```

#### Récupérer l'historique du workflow
```typescript
const result = await purchaseOrderService.getWorkflowHistory(orderId);

if (result.success && result.data) {
  result.data.forEach(entry => {
    console.log(`${entry.fromStatus} → ${entry.toStatus} par ${entry.changedBy}`);
    console.log(`Date: ${entry.changedAt}`);
    if (entry.notes) {
      console.log(`Notes: ${entry.notes}`);
    }
  });
}
```

### 3. Service de Stock (`pocStockService`)

#### Vérifier le stock pour un bon de commande
```typescript
import stockService from './services/pocStockService';

const stockCheck = await stockService.checkStockForOrder(orderId);

if (stockCheck.available) {
  console.log('Stock suffisant pour tous les items');
} else {
  console.log('Items manquants:');
  stockCheck.missingItems.forEach(item => {
    console.log(`- ${item.itemName}: ${item.available}/${item.requested}`);
  });
}
```

#### Satisfaire depuis le stock interne
```typescript
const result = await stockService.fulfillFromStock(orderId, userId);

if (result.success) {
  console.log('Stock déduit avec succès');
} else {
  console.error('Erreur:', result.error);
  // Vérifier si le stock est insuffisant
}
```

#### Enregistrer une entrée de stock
```typescript
const result = await stockService.recordStockEntry(
  companyId,
  [
    {
      inventoryItemId: 'item-123',
      quantity: 50
    }
  ],
  'purchase-order-456', // Référence
  userId,
  'Réception livraison fournisseur'
);

if (result.success) {
  console.log('Entrée de stock enregistrée');
}
```

#### Enregistrer une sortie de stock
```typescript
const result = await stockService.recordStockExit(
  companyId,
  [
    {
      inventoryItemId: 'item-123',
      quantity: 25
    }
  ],
  'purchase-order-456', // Référence
  userId,
  'Sortie pour bon de commande'
);

if (result.success) {
  console.log('Sortie de stock enregistrée');
}
```

#### Récupérer l'inventaire complet
```typescript
const result = await stockService.getInventory(companyId);

if (result.success && result.data) {
  result.data.forEach(item => {
    console.log(`${item.itemName}: ${item.quantity} ${item.unit}`);
    
    // Vérifier les seuils d'alerte
    if (item.minStockLevel && item.quantity < item.minStockLevel) {
      console.warn(`⚠️ Stock faible pour ${item.itemName}`);
    }
  });
}
```

#### Ajuster manuellement le stock
```typescript
const result = await stockService.adjustStock(
  inventoryItemId,
  150, // Nouvelle quantité
  'Ajustement après inventaire physique',
  userId
);

if (result.success && result.data) {
  console.log(`Stock ajusté: ${result.data.quantity}`);
}
```

#### Récupérer les mouvements de stock
```typescript
const result = await stockService.getStockMovements(
  inventoryItemId,
  20 // Limite (défaut: 50)
);

if (result.success && result.data) {
  result.data.forEach(movement => {
    console.log(`${movement.movementType}: ${movement.quantity} - ${movement.reason}`);
    console.log(`Date: ${movement.performedAt}`);
  });
}
```

## 🔄 Exemple de Workflow Complet

### Scénario: Bon de commande avec stock insuffisant

```typescript
import purchaseOrderService from './services/pocPurchaseOrderService';
import workflowService from './services/pocWorkflowService';

// 1. Chef Equipe crée un brouillon
const createResult = await purchaseOrderService.createDraft(
  chefEquipeId,
  companyId,
  projectId,
  [
    { itemName: 'Ciment', quantity: 200, unit: 'sac', unitPrice: 15000, totalPrice: 3000000 }
  ]
);

if (!createResult.success) {
  throw new Error(createResult.error);
}

const orderId = createResult.data!.id;

// 2. Chef Equipe soumet pour validation
await purchaseOrderService.submitForApproval(orderId, chefEquipeId);
// Statut: pending_site_manager

// 3. Chef Chantier approuve
await purchaseOrderService.approveBySiteManager(orderId, siteManagerId);
// Statut: approved_site_manager → checking_stock

// 4. Système vérifie le stock automatiquement
// Si stock insuffisant:
// Statut: needs_external_order → pending_management

// 5. Direction approuve la commande externe
await purchaseOrderService.approveByManagement(orderId, managementId);
// Statut: approved_management → submitted_to_supplier → pending_supplier

// 6. Fournisseur accepte
await purchaseOrderService.acceptBySupplier(orderId, supplierId);
// Statut: accepted_supplier → in_transit

// 7. Marquer comme livré
await purchaseOrderService.markAsDelivered(orderId, userId);
// Statut: delivered

// 8. Finaliser
await purchaseOrderService.complete(orderId, userId);
// Statut: completed

// 9. Récupérer l'historique complet
const historyResult = await purchaseOrderService.getWorkflowHistory(orderId);
console.log('Historique:', historyResult.data);
```

### Scénario: Bon de commande avec stock suffisant

```typescript
// 1-3. Identique au scénario précédent...

// 4. Système vérifie le stock automatiquement
// Si stock suffisant:
// Statut: fulfilled_internal

// 5. Finaliser directement (stock déduit automatiquement)
await purchaseOrderService.complete(orderId, userId);
// Statut: completed
// Stock déduit automatiquement
```

## ⚠️ Gestion des Erreurs

Tous les services retournent un `ServiceResult<T>` avec:
- `success: boolean`
- `data?: T` (si success = true)
- `error?: string` (si success = false)
- `errors?: Record<string, string>` (pour erreurs multiples)

```typescript
const result = await purchaseOrderService.submitForApproval(orderId, userId);

if (!result.success) {
  // Gérer l'erreur
  console.error(result.error);
  
  // Afficher à l'utilisateur
  alert(`Erreur: ${result.error}`);
  
  // Si erreurs multiples
  if (result.errors) {
    Object.entries(result.errors).forEach(([field, message]) => {
      console.error(`${field}: ${message}`);
    });
  }
}
```

## 🔒 Vérification des Permissions

Avant d'effectuer une action, toujours vérifier les permissions:

```typescript
import workflowService from './services/pocWorkflowService';

// Vérifier si l'utilisateur peut effectuer l'action
const canApprove = await workflowService.canUserPerformAction(
  userId,
  orderId,
  'approve_site'
);

if (!canApprove) {
  // Afficher un message d'erreur ou désactiver le bouton
  return;
}

// Effectuer l'action
const result = await purchaseOrderService.approveBySiteManager(orderId, userId);
```

## 📊 Récupération des Actions Disponibles

Pour afficher dynamiquement les boutons disponibles:

```typescript
const availableActions = await workflowService.getAvailableActions(
  orderId,
  userId
);

// Dans votre composant React
{availableActions.includes('approve_site') && (
  <button onClick={() => handleApprove()}>Approuver</button>
)}

{availableActions.includes('reject_site') && (
  <button onClick={() => handleReject()}>Rejeter</button>
)}
```





