# Module Construction POC - Workflow de Validation des Bons de Commande

## 📋 Description

Module isolé pour la gestion du workflow de validation des bons de commande avec 3 niveaux obligatoires de validation, intégration de vérification automatique du stock, et gestion manuelle de l'inventaire.

## 🏗️ Architecture

### Services

1. **`pocWorkflowService`** - Gestion de la machine à états
   - Validation des transitions de statut
   - Vérification des permissions utilisateur
   - Gestion des actions disponibles
   - Vérification automatique du stock

2. **`pocPurchaseOrderService`** - Gestion des bons de commande
   - CRUD complet (Create, Read, Update, Delete)
   - Transitions de workflow pour chaque niveau
   - Historique des transitions
   - Génération de numéros de commande

3. **`pocStockService`** - Gestion manuelle du stock
   - Vérification de disponibilité
   - Entrées/sorties de stock
   - Ajustements manuels
   - Mouvements de stock

### Types

Tous les types sont définis dans `types/construction.ts`:
- `PurchaseOrderStatus` (16 statuts)
- `WorkflowAction` (10 actions)
- `PurchaseOrder`, `PurchaseOrderItem`
- `StockCheckResult`, `InventoryItem`, `StockMovement`
- `WorkflowHistory`

## 🔄 Workflow

### Niveaux de Validation

1. **Niveau 1 - Création** (Chef Equipe)
   - Création du brouillon (`draft`)
   - Soumission pour validation (`pending_site_manager`)

2. **Niveau 2 - Validation Chef Chantier**
   - Approuve → `approved_site_manager` → `checking_stock`
   - Rejette → `draft` (retour au créateur)

3. **Niveau 3 - Vérification Stock** (Automatique)
   - Stock suffisant → `fulfilled_internal` → `completed`
   - Stock insuffisant → `needs_external_order` → `pending_management`

4. **Niveau 4 - Validation Direction** (Conditionnelle)
   - Uniquement si stock insuffisant
   - Approuve → `approved_management` → `submitted_to_supplier` → `pending_supplier`
   - Rejette → `rejected_management` (FINAL)

5. **Niveau 5 - Validation Fournisseur**
   - Accepte → `accepted_supplier` → `in_transit` → `delivered` → `completed`
   - Rejette → `rejected_supplier` (FINAL)

### États Finaux

- `completed` - Workflow terminé avec succès
- `cancelled` - Annulé à n'importe quel stade
- `rejected_management` - Rejeté par Direction
- `rejected_supplier` - Rejeté par Fournisseur

## 📁 Structure des Fichiers

```
frontend/src/modules/construction-poc/
├── types/
│   └── construction.ts          # Types TypeScript
├── services/
│   ├── pocWorkflowService.ts     # Service de workflow
│   ├── pocPurchaseOrderService.ts # Service de bons de commande
│   └── pocStockService.ts        # Service de stock
├── index.ts                      # Export centralisé
├── README.md                     # Ce fichier
├── WORKFLOW-STATE-MACHINE.md     # Diagramme et documentation workflow
└── USAGE-EXAMPLES.md             # Exemples d'utilisation
```

## 🚀 Utilisation

### Import

```typescript
import {
  pocWorkflowService,
  pocPurchaseOrderService,
  pocStockService,
  PurchaseOrderStatus,
  WorkflowAction
} from '@/modules/construction-poc';
```

### Exemple Rapide

```typescript
// Créer un brouillon
const result = await pocPurchaseOrderService.createDraft(
  userId,
  companyId,
  projectId,
  [{ itemName: 'Ciment', quantity: 100, unit: 'sac', unitPrice: 15000, totalPrice: 1500000 }]
);

// Soumettre pour validation
await pocPurchaseOrderService.submitForApproval(orderId, userId);

// Approuver (Chef Chantier)
await pocPurchaseOrderService.approveBySiteManager(orderId, siteManagerId);
```

## 🔒 Sécurité

- **Validation stricte des transitions**: Impossible de sauter des niveaux
- **Vérification des permissions**: Chaque action vérifie le rôle et les permissions
- **Historique complet**: Toutes les transitions sont enregistrées
- **Isolation**: Module isolé, utilise uniquement les tables `poc_*`

## 📊 Tables de Base de Données

Le module utilise les tables suivantes (préfixe `poc_`):

- `poc_purchase_orders` - Bons de commande
- `poc_purchase_order_items` - Items des bons de commande
- `poc_workflow_history` - Historique des transitions
- `poc_inventory` - Inventaire
- `poc_stock_movements` - Mouvements de stock

## 📖 Documentation

- **WORKFLOW-STATE-MACHINE.md** - Diagramme complet de la machine à états
- **USAGE-EXAMPLES.md** - Exemples détaillés pour chaque service

## ⚠️ Contraintes

- **Module isolé**: Ne modifie pas les services BazarKELY existants
- **Tables préfixées**: Utilise uniquement les tables `poc_*`
- **TypeScript strict**: Mode strict activé
- **Supabase uniquement**: Utilise le client Supabase existant

## 🔧 Maintenance

Tous les services suivent les patterns BazarKELY:
- Gestion d'erreurs complète
- Types TypeScript stricts
- Retours `ServiceResult<T>` standardisés
- Logging des erreurs

## 📝 Notes

- Les transitions automatiques (ex: `approved_site_manager` → `checking_stock`) sont gérées par le système
- Le stock est vérifié automatiquement après approbation Chef Chantier
- La validation Direction n'est déclenchée que si le stock est insuffisant
- Toutes les dates sont enregistrées automatiquement lors des transitions





