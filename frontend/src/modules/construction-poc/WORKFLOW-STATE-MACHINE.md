# Machine à États - Workflow de Validation des Bons de Commande

## 📊 Diagramme de la Machine à États

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW DE VALIDATION - BONS DE COMMANDE               │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────┐
│  DRAFT  │ ◄─────────────────────────────────────────┐
│         │                                           │
│ (Niveau 1)                                          │
│ Chef Equipe                                         │
└────┬────┘                                           │
     │                                                │
     │ submit                                         │
     ▼                                                │
┌─────────────────────┐                              │
│ PENDING_SITE_MANAGER│                              │
│                     │                              │
│ (Niveau 2)          │                              │
│ Chef Chantier       │                              │
│                     │                              │
│ approve_site        │ reject_site                  │
│         │           │         │                     │
│         │           │         │                     │
│         ▼           │         │                     │
│ ┌─────────────────┐ │         │                     │
│ │APPROVED_SITE_MGR│ │         │                     │
│ └────────┬────────┘ │         │                     │
│          │          │         │                     │
│          │          │         │                     │
│          │          │         │                     │
│          │          │         │                     │
│          │          └─────────┴─────────────────────┘
│          │
│          │ (automatique)
│          ▼
│ ┌─────────────────┐
│ │ CHECKING_STOCK   │
│ │                 │
│ │ (Niveau 3)      │
│ │ Système         │
│ └────┬────┬───────┘
│      │    │
│      │    │
│      │    │ stock insuffisant
│      │    │
│      │    ▼
│      │ ┌──────────────────────┐
│      │ │ NEEDS_EXTERNAL_ORDER  │
│      │ └──────────┬────────────┘
│      │            │
│      │            │ (automatique)
│      │            ▼
│      │ ┌──────────────────────┐
│      │ │ PENDING_MANAGEMENT   │
│      │ │                      │
│      │ │ (Niveau 4)           │
│      │ │ Direction            │
│      │ │                      │
│      │ │ approve_mgmt         │ reject_mgmt
│      │ │      │               │      │
│      │ │      │               │      │
│      │ │      ▼               │      ▼
│      │ │ ┌─────────────────┐ │ ┌─────────────────┐
│      │ │ │APPROVED_MGMT    │ │ │REJECTED_MGMT    │
│      │ │ └────────┬────────┘ │ └─────────────────┘
│      │ │          │           │      (FINAL)
│      │ │          │           │
│      │ │          │ (automatique)
│      │ │          ▼
│      │ │ ┌──────────────────────┐
│      │ │ │SUBMITTED_TO_SUPPLIER  │
│      │ │ └──────────┬───────────┘
│      │ │            │
│      │ │            │ (automatique)
│      │ │            ▼
│      │ │ ┌──────────────────────┐
│      │ │ │ PENDING_SUPPLIER     │
│      │ │ │                      │
│      │ │ │ (Niveau 5)           │
│      │ │ │ Fournisseur          │
│      │ │ │                      │
│      │ │ │ accept_supplier     │ reject_supplier
│      │ │ │      │               │      │
│      │ │ │      │               │      │
│      │ │ │      ▼               │      ▼
│      │ │ │ ┌──────────────┐     │ ┌─────────────────┐
│      │ │ │ │ACCEPTED_SUPPL│     │ │REJECTED_SUPPLIER│
│      │ │ │ └──────┬───────┘     │ └─────────────────┘
│      │ │ │        │             │      (FINAL)
│      │ │ │        │             │
│      │ │ │        │ (automatique)
│      │ │ │        ▼
│      │ │ │ ┌──────────────┐
│      │ │ │ │  IN_TRANSIT  │
│      │ │ │ └──────┬───────┘
│      │ │ │        │
│      │ │ │        │ deliver
│      │ │ │        ▼
│      │ │ │ ┌──────────────┐
│      │ │ │ │  DELIVERED   │
│      │ │ │ └──────┬───────┘
│      │ │ │        │
│      │ │ │        │ complete
│      │ │ │        ▼
│      │ │ │ ┌──────────────┐
│      │ │ │ │  COMPLETED   │
│      │ │ │ └──────────────┘
│      │ │ │      (FINAL)
│      │ │ │
│      │ │ └──────────────────────┐
│      │ │                        │
│      │ │                        │
│      │ │ stock suffisant        │
│      │ │                        │
│      │ │                        │
│      │ │                        │
│      │ │                        │
│      │ └────────────────────────┘
│      │
│      │
│      ▼
│ ┌──────────────────────┐
│ │ FULFILLED_INTERNAL   │
│ │                      │
│ │ (Stock suffisant)    │
│ │                      │
│ │ complete             │
│ │      │               │
│ │      ▼               │
│ │ ┌──────────────┐     │
│ │ │  COMPLETED   │     │
│ │ └──────────────┘     │
│ │      (FINAL)         │
│ └──────────────────────┘
│
│
│ ┌──────────────┐
│ │  CANCELLED   │ (accessible depuis n'importe quel état)
│ └──────────────┘
│      (FINAL)
│
└─────────────────────────────────────────────────────────────────────────────┘
```

## 📋 Description des États

### **Niveau 1 - Création**
- **`draft`**: Bon de commande en brouillon créé par Chef Equipe
  - **Actions possibles**: `submit`, `cancel`
  - **Transition**: `draft` → `pending_site_manager` (via `submit`)

### **Niveau 2 - Validation Chef Chantier**
- **`pending_site_manager`**: En attente de validation par Chef Chantier
  - **Actions possibles**: `approve_site`, `reject_site`, `cancel`
  - **Transitions**: 
    - → `approved_site_manager` (via `approve_site`)
    - → `draft` (via `reject_site`)

- **`approved_site_manager`**: Approuvé par Chef Chantier
  - **Transition automatique**: → `checking_stock`

### **Niveau 3 - Vérification Stock (Automatique)**
- **`checking_stock`**: Système vérifie la disponibilité du stock
  - **Transition automatique** selon résultat:
    - → `fulfilled_internal` (stock suffisant)
    - → `needs_external_order` (stock insuffisant)

- **`fulfilled_internal`**: Stock suffisant, satisfait depuis l'entrepôt
  - **Actions possibles**: `complete`
  - **Transition**: → `completed` (via `complete`)

- **`needs_external_order`**: Stock insuffisant, commande externe nécessaire
  - **Transition automatique**: → `pending_management`

### **Niveau 4 - Validation Direction (Conditionnelle)**
- **`pending_management`**: En attente de validation par Direction (uniquement si stock insuffisant)
  - **Actions possibles**: `approve_mgmt`, `reject_mgmt`, `cancel`
  - **Transitions**:
    - → `approved_management` (via `approve_mgmt`)
    - → `rejected_management` (via `reject_mgmt`) **[FINAL]**

- **`approved_management`**: Approuvé par Direction
  - **Transitions automatiques**: → `submitted_to_supplier` → `pending_supplier`

- **`rejected_management`**: Rejeté par Direction **[FINAL]**

### **Niveau 5 - Validation Fournisseur**
- **`submitted_to_supplier`**: Soumis au fournisseur
  - **Transition automatique**: → `pending_supplier`

- **`pending_supplier`**: En attente de réponse du fournisseur
  - **Actions possibles**: `accept_supplier`, `reject_supplier`, `cancel`
  - **Transitions**:
    - → `accepted_supplier` (via `accept_supplier`)
    - → `rejected_supplier` (via `reject_supplier`) **[FINAL]**

- **`accepted_supplier`**: Accepté par le fournisseur
  - **Transition automatique**: → `in_transit`

- **`rejected_supplier`**: Rejeté par le fournisseur **[FINAL]**

### **États de Livraison**
- **`in_transit`**: En transit vers le chantier
  - **Actions possibles**: `deliver`
  - **Transition**: → `delivered` (via `deliver`)

- **`delivered`**: Livré au chantier
  - **Actions possibles**: `complete`
  - **Transition**: → `completed` (via `complete`)

### **États Finaux**
- **`completed`**: Workflow terminé, stock mis à jour **[FINAL]**
- **`cancelled`**: Annulé à n'importe quel stade **[FINAL]**
- **`rejected_management`**: Rejeté par Direction **[FINAL]**
- **`rejected_supplier`**: Rejeté par Fournisseur **[FINAL]**

## 🔄 Transitions Valides

### Matrice de Transitions

| État Source | États Destination Valides |
|------------|---------------------------|
| `draft` | `pending_site_manager`, `cancelled` |
| `pending_site_manager` | `approved_site_manager`, `draft`, `cancelled` |
| `approved_site_manager` | `checking_stock`, `cancelled` |
| `checking_stock` | `fulfilled_internal`, `needs_external_order`, `cancelled` |
| `fulfilled_internal` | `completed`, `cancelled` |
| `needs_external_order` | `pending_management`, `cancelled` |
| `pending_management` | `approved_management`, `rejected_management`, `cancelled` |
| `approved_management` | `submitted_to_supplier`, `cancelled` |
| `submitted_to_supplier` | `pending_supplier`, `cancelled` |
| `pending_supplier` | `accepted_supplier`, `rejected_supplier`, `cancelled` |
| `accepted_supplier` | `in_transit`, `cancelled` |
| `in_transit` | `delivered`, `cancelled` |
| `delivered` | `completed`, `cancelled` |
| `completed` | *(aucune - état final)* |
| `cancelled` | *(aucune - état final)* |
| `rejected_management` | *(aucune - état final)* |
| `rejected_supplier` | *(aucune - état final)* |

## 👥 Permissions par Rôle

### Chef Equipe (`chef_equipe`)
- ✅ Créer des brouillons (`draft`)
- ✅ Soumettre pour validation (`submit`)
- ✅ Annuler (`cancel`)

### Chef Chantier (`chef_chantier`)
- ✅ Approuver (`approve_site`)
- ✅ Rejeter (`reject_site`)
- ✅ Annuler (`cancel`)

### Direction (`direction`)
- ✅ Approuver commande externe (`approve_mgmt`)
- ✅ Rejeter commande externe (`reject_mgmt`)
- ✅ Annuler (`cancel`)

### Fournisseur (`supplier`)
- ✅ Accepter bon de commande (`accept_supplier`)
- ✅ Rejeter bon de commande (`reject_supplier`)

### Admin (`admin`)
- ✅ Toutes les actions (bypass des permissions)

## 🔍 Points de Validation

1. **Validation Niveau 1**: Chef Equipe doit soumettre le bon de commande
2. **Validation Niveau 2**: Chef Chantier assigné doit approuver/rejeter
3. **Vérification Stock**: Système vérifie automatiquement la disponibilité
4. **Validation Niveau 4** (conditionnelle): Direction valide seulement si stock insuffisant
5. **Validation Niveau 5**: Fournisseur assigné doit accepter/rejeter

## 📝 Historique

Toutes les transitions sont enregistrées dans `poc_workflow_history` avec:
- `from_status`, `to_status`
- `changed_by` (userId)
- `changed_at` (timestamp)
- `notes` (optionnel)
- `action` (action effectuée)

## 🚨 Gestion d'Erreurs

- **Transition invalide**: Rejetée avec message d'erreur
- **Permission insuffisante**: Rejetée avec message d'erreur
- **Stock insuffisant**: Passage automatique vers `pending_management`
- **Rejet**: Retour à l'état précédent ou état final selon le niveau

## 📊 Flux Complets

### Flux 1: Stock Suffisant
```
draft → pending_site_manager → approved_site_manager → checking_stock 
→ fulfilled_internal → completed
```

### Flux 2: Stock Insuffisant (Commande Externe)
```
draft → pending_site_manager → approved_site_manager → checking_stock 
→ needs_external_order → pending_management → approved_management 
→ submitted_to_supplier → pending_supplier → accepted_supplier 
→ in_transit → delivered → completed
```

### Flux 3: Rejet Chef Chantier
```
draft → pending_site_manager → draft (rejet)
```

### Flux 4: Rejet Direction
```
... → pending_management → rejected_management (FINAL)
```

### Flux 5: Rejet Fournisseur
```
... → pending_supplier → rejected_supplier (FINAL)
```





