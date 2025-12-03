# Architecture Base de Données - POC Construction Marketplace

**Agent 1: Database Architecture Design**  
**Date:** 2025-01-XX  
**Version:** 1.0.0  
**Statut:** ✅ Architecture complète et prête pour déploiement

---

## 📋 Résumé Exécutif

Schéma de base de données **complet** et **isolé** pour le module POC Construction Marketplace. Le schéma est conçu pour être **100% isolé** des tables existantes de BazarKELY grâce au préfixe `poc_` sur toutes les tables.

### Caractéristiques Principales

- ✅ **Isolation complète** (préfixe `poc_`)
- ✅ **Multi-tenant** (Suppliers + Builders)
- ✅ **7 rôles** de membres de compagnie
- ✅ **Workflow à 3 niveaux** de validation
- ✅ **Gestion manuelle** des stocks
- ✅ **Suivi de livraison** simplifié (3 statuts)
- ✅ **RLS complet** pour sécurité multi-tenant
- ✅ **17 statuts** de workflow supportés
- ✅ **Audit trail** complet (historique workflow)

---

## 🗄️ Structure des Tables

### 1. `poc_companies` - Compagnies

**Description:** Compagnies du marketplace (Suppliers et Builders)

**Colonnes principales:**
- `id` (UUID, PK)
- `name` (TEXT)
- `type` (ENUM: 'supplier' | 'builder')
- `status` (ENUM: 'pending' | 'approved' | 'rejected' | 'suspended')
- `created_by` (FK → auth.users)
- `approved_by` (FK → auth.users, nullable) - Admin Joel
- `metadata` (JSONB)

**Relations:**
- 1:N → `poc_company_members`
- 1:N → `poc_products` (si supplier)
- 1:N → `poc_projects` (si builder)
- 1:N → `poc_purchase_orders` (buyer ou supplier)
- 1:N → `poc_inventory_items` (si builder)

**Contraintes:**
- `approved_by` requis si `status = 'approved'`
- `rejection_reason` requis si `status = 'rejected'`

---

### 2. `poc_company_members` - Membres des Compagnies

**Description:** Membres des compagnies avec leurs rôles et statuts

**Colonnes principales:**
- `id` (UUID, PK)
- `company_id` (FK → poc_companies)
- `user_id` (FK → users)
- `role` (ENUM: 7 rôles)
- `status` (ENUM: 'active' | 'inactive' | 'pending')
- `invited_by` (FK → auth.users, nullable)
- `joined_at` (TIMESTAMP, nullable)

**Relations:**
- N:1 → `poc_companies`
- N:1 → `users`

**Contraintes:**
- `UNIQUE(company_id, user_id)` - Un utilisateur ne peut être membre qu'une fois par compagnie

**Rôles supportés:**
1. `admin` - Administrateur compagnie
2. `direction` - Direction
3. `resp_finance` - Responsable Finance
4. `magasinier` - Magasinier
5. `logistique` - Logistique
6. `chef_chantier` - Chef de Chantier
7. `chef_equipe` - Chef d'Équipe

---

### 3. `poc_product_categories` - Catégories de Produits

**Description:** Catégories de produits avec support hiérarchique (parent/enfant)

**Colonnes principales:**
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `parent_category_id` (FK → poc_product_categories, nullable)
- `icon_url` (TEXT, nullable)
- `sort_order` (INTEGER)
- `is_active` (BOOLEAN)

**Relations:**
- 1:N → `poc_product_categories` (self-reference)
- 1:N → `poc_products`

**Contraintes:**
- `CHECK (id != parent_category_id)` - Pas de boucle

---

### 4. `poc_products` - Catalogue de Produits

**Description:** Catalogue de produits créés par les suppliers

**Colonnes principales:**
- `id` (UUID, PK)
- `supplier_id` (FK → poc_companies, type='supplier')
- `category_id` (FK → poc_product_categories, nullable)
- `name` (TEXT)
- `description` (TEXT, nullable)
- `sku` (TEXT, nullable)
- `unit` (TEXT, default='unité')
- `current_price` (NUMERIC(15,2))
- `currency` (TEXT, default='MGA')
- `stock_available` (INTEGER, default=0)
- `min_order_quantity` (INTEGER, default=1)
- `images_urls` (TEXT[])
- `specifications` (JSONB)
- `is_active` (BOOLEAN)

**Relations:**
- N:1 → `poc_companies` (supplier)
- N:1 → `poc_product_categories`
- 1:N → `poc_purchase_order_items`
- 1:N → `poc_inventory_items` (référence)

**Contraintes:**
- `supplier_id` doit être une compagnie de type 'supplier'
- `current_price >= 0`
- `stock_available >= 0`
- `min_order_quantity > 0`

---

### 5. `poc_projects` - Projets de Construction

**Description:** Projets de construction créés par les builders

**Colonnes principales:**
- `id` (UUID, PK)
- `company_id` (FK → poc_companies, type='builder')
- `name` (TEXT)
- `client_name` (TEXT, nullable)
- `location` (TEXT, nullable)
- `start_date` (DATE, nullable)
- `estimated_end_date` (DATE, nullable)
- `status` (ENUM: 'active' | 'completed' | 'on_hold' | 'cancelled')
- `total_budget` (NUMERIC(15,2), nullable)
- `currency` (TEXT, default='MGA')
- `created_by` (FK → auth.users)

**Relations:**
- N:1 → `poc_companies` (builder)
- 1:N → `poc_purchase_orders`

**Contraintes:**
- `company_id` doit être une compagnie de type 'builder'
- `estimated_end_date >= start_date` (si les deux sont définis)

---

### 6. `poc_purchase_orders` - Commandes d'Achat

**Description:** Commandes d'achat avec workflow de validation à 3 niveaux

**Colonnes principales:**
- `id` (UUID, PK)
- `order_number` (TEXT) - Unique par buyer
- `buyer_company_id` (FK → poc_companies, type='builder')
- `supplier_company_id` (FK → poc_companies, type='supplier')
- `project_id` (FK → poc_projects, nullable)
- `created_by` (FK → auth.users) - Chef Equipe
- `status` (ENUM: 17 statuts)
- `site_manager_id` (FK → auth.users, nullable) - Chef Chantier

**Timestamps de validation:**
- `submitted_at`
- `site_manager_approved_at` / `site_manager_rejected_at`
- `management_approved_at` / `management_rejected_at`
- `supplier_submitted_at`
- `supplier_accepted_at` / `supplier_rejected_at`

**Résultat de contrôle de stock:**
- `stock_check_result` (JSONB)
- `stock_check_performed_at`
- `stock_check_performed_by`

**Montants:**
- `subtotal` (NUMERIC(15,2))
- `tax` (NUMERIC(15,2))
- `delivery_fee` (NUMERIC(15,2))
- `total` (NUMERIC(15,2)) - Calculé: subtotal + tax + delivery_fee

**Livraison:**
- `delivery_address` (TEXT)
- `delivery_notes` (TEXT, nullable)
- `estimated_delivery_date` (DATE, nullable)
- `actual_delivery_date` (DATE, nullable)

**Relations:**
- N:1 → `poc_companies` (buyer)
- N:1 → `poc_companies` (supplier)
- N:1 → `poc_projects`
- 1:N → `poc_purchase_order_items`
- 1:N → `poc_purchase_order_workflow_history`

**Contraintes:**
- `UNIQUE(buyer_company_id, order_number)`
- `buyer_company_id` doit être un builder
- `supplier_company_id` doit être un supplier
- `total = subtotal + tax + delivery_fee`

**Statuts du workflow (17):**
1. `draft` - Brouillon
2. `pending_site_manager` - En attente validation Chef Chantier
3. `approved_site_manager` - Approuvé par Chef Chantier
4. `checking_stock` - Vérification du stock
5. `fulfilled_internal` - Rempli depuis stock interne
6. `needs_external_order` - Nécessite commande externe
7. `pending_management` - En attente validation Direction
8. `rejected_management` - Rejeté par Direction
9. `approved_management` - Approuvé par Direction
10. `submitted_to_supplier` - Soumis au supplier
11. `pending_supplier` - En attente supplier
12. `accepted_supplier` - Accepté par supplier
13. `rejected_supplier` - Rejeté par supplier
14. `in_transit` - En transit
15. `delivered` - Livré
16. `completed` - Terminé
17. `cancelled` - Annulé

---

### 7. `poc_purchase_order_items` - Items des Commandes

**Description:** Items des commandes avec snapshot des produits (pour historique)

**Colonnes principales:**
- `id` (UUID, PK)
- `purchase_order_id` (FK → poc_purchase_orders)
- `product_id` (FK → poc_products, nullable) - Pour entrées manuelles
- `item_name` (TEXT) - Snapshot
- `item_description` (TEXT, nullable) - Snapshot
- `item_sku` (TEXT, nullable) - Snapshot
- `item_unit` (TEXT) - Snapshot
- `quantity` (INTEGER)
- `unit_price` (NUMERIC(15,2))
- `total_price` (NUMERIC(15,2))
- `notes` (TEXT, nullable)

**Relations:**
- N:1 → `poc_purchase_orders`
- N:1 → `poc_products` (nullable)

**Contraintes:**
- `quantity > 0`
- `unit_price >= 0`
- `total_price = quantity * unit_price`

**Note:** Les snapshots permettent de conserver l'historique même si le produit est supprimé.

---

### 8. `poc_purchase_order_workflow_history` - Historique Workflow

**Description:** Historique complet des transitions de statut du workflow

**Colonnes principales:**
- `id` (UUID, PK)
- `purchase_order_id` (FK → poc_purchase_orders)
- `from_status` (ENUM, nullable) - Statut précédent
- `to_status` (ENUM) - Nouveau statut
- `changed_by` (FK → auth.users)
- `changed_at` (TIMESTAMP)
- `notes` (TEXT, nullable)
- `metadata` (JSONB)

**Relations:**
- N:1 → `poc_purchase_orders`

**Note:** Rempli automatiquement via trigger lors des changements de statut.

---

### 9. `poc_inventory_items` - Inventaire

**Description:** Inventaire (stock) des builders avec gestion manuelle

**Colonnes principales:**
- `id` (UUID, PK)
- `company_id` (FK → poc_companies, type='builder')
- `product_id` (FK → poc_products, nullable)
- `product_name` (TEXT) - Snapshot
- `sku` (TEXT, nullable) - Snapshot
- `unit` (TEXT) - Snapshot
- `quantity_available` (INTEGER, default=0)
- `minimum_quantity` (INTEGER, default=0)
- `location` (TEXT, nullable)
- `notes` (TEXT, nullable)
- `last_updated` (TIMESTAMP)
- `updated_by` (FK → auth.users)

**Relations:**
- N:1 → `poc_companies` (builder)
- N:1 → `poc_products` (nullable)
- 1:N → `poc_stock_movements`

**Contraintes:**
- `company_id` doit être un builder
- `quantity_available >= 0`
- `minimum_quantity >= 0`

---

### 10. `poc_stock_movements` - Mouvements de Stock

**Description:** Mouvements de stock manuels (entrées, sorties, ajustements)

**Colonnes principales:**
- `id` (UUID, PK)
- `company_id` (FK → poc_companies, type='builder')
- `inventory_item_id` (FK → poc_inventory_items)
- `type` (ENUM: 'entry' | 'exit' | 'adjustment')
- `quantity` (INTEGER)
- `reference_type` (ENUM, nullable)
- `reference_id` (UUID, nullable)
- `notes` (TEXT, nullable)
- `created_by` (FK → auth.users)
- `created_at` (TIMESTAMP)

**Relations:**
- N:1 → `poc_companies` (builder)
- N:1 → `poc_inventory_items`

**Contraintes:**
- `company_id` doit être un builder
- `quantity > 0`

**Types de référence:**
- `purchase_order` - Référence à une commande
- `manual_entry` - Entrée manuelle
- `inventory_adjustment` - Ajustement d'inventaire
- `delivery` - Livraison
- `other` - Autre

---

## 🔐 Sécurité Multi-Tenant (RLS)

### Principes de Sécurité

1. **Isolation par compagnie:** Chaque compagnie ne voit que ses propres données
2. **Rôles et permissions:** 7 rôles avec permissions granulaires
3. **Admin Joel:** Accès complet pour approbation et gestion
4. **Workflow sécurisé:** Validation à 3 niveaux avec audit trail

### Politiques RLS Implémentées

**Pour chaque table:**
- **SELECT:** Voir les données de sa compagnie ou données publiques
- **INSERT:** Créer selon les permissions de rôle
- **UPDATE:** Modifier selon les permissions de rôle
- **DELETE:** Supprimer uniquement avec rôle admin/direction ou admin Joel

**Rôles avec permissions élevées:**
- `admin` (compagnie) - Gestion complète de la compagnie
- `direction` - Validation et gestion stratégique
- `magasinier` - Gestion des stocks
- `admin` (Joel) - Accès complet système

---

## 📊 Indexes de Performance

### Indexes Principaux

**poc_companies:**
- `type`, `status`, `created_by`, `approved_by`

**poc_company_members:**
- `company_id`, `user_id`, `role`, `status`
- Composite: `(company_id, role)`

**poc_products:**
- `supplier_id`, `category_id`, `sku`, `is_active`
- Composite: `(supplier_id, is_active)`

**poc_purchase_orders:**
- `buyer_company_id`, `supplier_company_id`, `status`, `project_id`
- Composite: `(buyer_company_id, status)`

**poc_stock_movements:**
- `company_id`, `inventory_item_id`, `type`, `created_at`
- Composite: `(reference_type, reference_id)`

**Total:** 30+ indexes pour optimiser les requêtes fréquentes.

---

## 🔄 Workflow de Validation

### Flux de Validation à 3 Niveaux

```
1. Chef Equipe
   ↓ Crée commande (draft)
   
2. Chef Chantier (site_manager_id)
   ↓ Valide (pending_site_manager → approved_site_manager)
   ↓ Vérifie stock (checking_stock)
   ↓ Résultat: fulfilled_internal OU needs_external_order
   
3. Direction
   ↓ Valide (pending_management → approved_management)
   
4. Supplier
   ↓ Reçoit (submitted_to_supplier)
   ↓ Traite (pending_supplier → accepted_supplier)
   
5. Livraison
   ↓ En transit (in_transit)
   ↓ Livré (delivered)
   ↓ Terminé (completed)
```

### Transitions Enregistrées

Toutes les transitions sont automatiquement enregistrées dans `poc_purchase_order_workflow_history` via trigger.

---

## 📈 Statistiques du Schéma

| Composant | Nombre |
|-----------|--------|
| Tables | 10 |
| Types énumérés | 8 |
| Indexes | 30+ |
| Politiques RLS | 30+ |
| Triggers | 8 |
| Fonctions | 2 |
| **Complexité** | **Moyenne à Haute** |

---

## 🎯 Points Clés de l'Architecture

### 1. Isolation Complète

- Toutes les tables utilisent le préfixe `poc_`
- Aucune modification des tables existantes
- Foreign keys vers `users` et `auth.users` uniquement

### 2. Multi-Tenant Sécurisé

- RLS sur toutes les tables
- Isolation par compagnie
- Permissions granulaires par rôle

### 3. Historique et Audit

- Snapshots des produits dans les commandes
- Historique complet du workflow
- Timestamps automatiques

### 4. Performance

- Indexes sur toutes les clés étrangères
- Indexes composites pour requêtes fréquentes
- Indexes partiels pour colonnes filtrées

### 5. Flexibilité

- Champs JSONB pour métadonnées extensibles
- Support hiérarchique pour catégories
- Workflow extensible avec 17 statuts

---

## ✅ Validation du Schéma

### Checklist de Validation

- [x] Toutes les tables ont le préfixe `poc_`
- [x] Toutes les foreign keys référencent les bonnes tables
- [x] RLS activé sur toutes les tables
- [x] Indexes sur toutes les clés étrangères
- [x] Contraintes de validation implémentées
- [x] Triggers pour automatisation
- [x] Workflow complet avec 17 statuts
- [x] Audit trail pour workflow
- [x] Support multi-tenant sécurisé
- [x] Documentation complète

---

## 📝 Notes Techniques

### Dépendances

- `auth.users` - Authentification Supabase
- `public.users` - Table users existante de BazarKELY
- Aucune dépendance vers autres tables BazarKELY

### Compatibilité

- PostgreSQL 12+
- Supabase (compatible)
- RLS activé par défaut

### Migration

Voir `POC-MIGRATION-GUIDE.md` pour les instructions complètes.

---

**AGENT-1-DATABASE-ARCHITECTURE-COMPLETE**

**Tables créées:** 10  
**Complexité estimée:** Moyenne à Haute  
**Statut:** ✅ Architecture complète et prête pour déploiement





