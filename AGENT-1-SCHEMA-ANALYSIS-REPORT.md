# RAPPORT D'ANALYSE DU SCHÉMA - TRANSFERT DE PROPRIÉTÉ DES TRANSACTIONS

**Date:** 2025-01-19  
**Agent:** Agent 1 - Database Schema Analysis  
**Objectif:** Analyser le schéma actuel pour comprendre la structure des transactions, la propriété, le partage familial et les remboursements

---

## 1. TRANSACTIONS TABLE SCHEMA

### Colonnes de la table `transactions` (d'après `frontend/src/types/supabase.ts`)

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | string (UUID) | NOT NULL | Identifiant unique |
| `user_id` | string (UUID) | NOT NULL | **Propriétaire original** de la transaction |
| `account_id` | string (UUID) | NOT NULL | Compte associé |
| `amount` | number | NOT NULL | Montant |
| `type` | string | NOT NULL | Type: 'income' | 'expense' | 'transfer' |
| `category` | string | NOT NULL | Catégorie |
| `description` | string | NULL | Description |
| `date` | string (ISO) | NOT NULL | Date de la transaction |
| `target_account_id` | string (UUID) | NULL | Pour les transferts |
| `transfer_fee` | number | NOT NULL | Frais de transfert |
| `tags` | Json | NULL | Tags (JSONB) |
| `location` | string | NULL | Localisation |
| `status` | string | NOT NULL | Statut |
| `notes` | string | NULL | Notes |
| `created_at` | string (ISO) | NOT NULL | Date de création |
| `updated_at` | string (ISO) | NOT NULL | Date de mise à jour |

### Interface TypeScript Transaction (`frontend/src/types/index.ts`)

```typescript
export interface Transaction {
  id: string;
  userId: string;  // Propriétaire original
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  targetAccountId?: string;
  transferFee?: number;
  originalCurrency?: 'MGA' | 'EUR';
  originalAmount?: number;
  exchangeRateUsed?: number;
  notes?: string;
  createdAt: Date;
  isRecurring?: boolean;
  recurringTransactionId?: string | null;
}
```

---

## 2. OWNERSHIP FIELDS

### Champs existants liés à la propriété

#### Table `transactions`
- **`user_id`** (string, NOT NULL)
  - Propriétaire original de la transaction
  - Clé étrangère vers `users.id`
  - Utilisé pour déterminer qui a créé/possède la transaction
  - **Aucun champ pour propriétaire actuel ou transfert**

#### Table `family_shared_transactions`
- **`shared_by`** (string, NOT NULL)
  - UserId de la personne qui a partagé la transaction
  - Peut être différent de `user_id` de la transaction originale
- **`paid_by`** (string, NOT NULL)
  - UserId de la personne qui a payé la transaction
  - Utilisé pour déterminer le créancier dans les remboursements
  - Fallback sur `shared_by` si non défini (ligne 58 de `familySharingService.ts`)

### Constat
- **AUCUN champ `current_owner_id`** dans la table `transactions`
- **AUCUN champ `transferred_from`** dans la table `transactions`
- **AUCUN champ `transferred_at`** dans la table `transactions`
- La propriété est actuellement **immutable** via `user_id`

---

## 3. REIMBURSEMENT FIELDS

### Table `family_shared_transactions`
- **`has_reimbursement_request`** (boolean, NOT NULL, default: false)
  - Indicateur qu'une demande de remboursement existe pour cette transaction partagée
  - Mis à jour via RPC function `update_reimbursement_request` (ligne 351 de `familySharingService.ts`)

### Table `reimbursement_requests`
- **`id`** (string, UUID)
- **`shared_transaction_id`** (string, NOT NULL)
  - Référence vers `family_shared_transactions.id`
- **`from_member_id`** (string, NOT NULL)
  - Membre débiteur (doit rembourser)
- **`to_member_id`** (string, NOT NULL)
  - Membre créancier (doit recevoir le remboursement)
- **`amount`** (number, NOT NULL)
- **`currency`** (string, NOT NULL)
- **`status`** ('pending' | 'settled' | 'cancelled')
- **`created_at`** (string, ISO)
- **`updated_at`** (string, ISO)
- **`settled_at`** (string | null, ISO)
- **`settled_by`** (string | null)
  - UserId qui a marqué comme réglé
- **`note`** (string | null)

### Logique de remboursement
- Le créancier (`to_member_id`) correspond à `paid_by` dans `family_shared_transactions`
- Le débiteur (`from_member_id`) correspond aux autres membres dans `split_details`
- Le statut `settled` indique que le remboursement est réglé
- **AUCUNE logique de transfert de propriété** après remboursement

---

## 4. FOREIGN KEYS & CONSTRAINTS

### Table `transactions`
- **`user_id`** → `users.id` (ON DELETE CASCADE probable)
- **`account_id`** → `accounts.id` (ON DELETE SET NULL probable)

### Table `family_shared_transactions`
- **`family_group_id`** → `family_groups.id`
- **`transaction_id`** → `transactions.id` (NULLABLE, pour transactions virtuelles)
- **`shared_by`** → `users.id` (implicite, pas de FK explicite trouvée)
- **`paid_by`** → `users.id` (implicite, pas de FK explicite trouvée)

### Table `reimbursement_requests`
- **`shared_transaction_id`** → `family_shared_transactions.id`
- **`from_member_id`** → `family_members.id`
- **`to_member_id`** → `family_members.id`
- **`settled_by`** → `users.id` (implicite)

### Constat
- Aucune contrainte de transfert de propriété
- Aucune table d'historique de transferts

---

## 5. EXISTING TRANSFER LOGIC

### Résultat de l'analyse
- **AUCUNE logique de transfert de propriété** trouvée dans le code
- **AUCUN champ `current_owner_id`** dans aucune table
- **AUCUN champ `transferred_from`** dans aucune table
- **AUCUN champ `transferred_at`** dans aucune table
- **AUCUNE table `transaction_transfers`** ou similaire

### Code vérifié
- `frontend/src/types/index.ts` - Interface Transaction
- `frontend/src/types/supabase.ts` - Schéma Supabase
- `frontend/src/types/family.ts` - Types famille
- `frontend/src/services/familySharingService.ts` - Service de partage
- `frontend/src/services/reimbursementService.ts` - Service de remboursement
- `database/init.sql` - Schéma SQLite (local)
- `supabase/migrations/` - Migrations Supabase

---

## 6. TYPE DEFINITIONS

### Transaction Interface (complet)
```typescript
// frontend/src/types/index.ts (lignes 87-108)
export interface Transaction {
  id: string;
  userId: string;  // Propriétaire original, IMMUTABLE actuellement
  accountId: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  description: string;
  category: TransactionCategory;
  date: Date;
  targetAccountId?: string;
  transferFee?: number;
  originalCurrency?: 'MGA' | 'EUR';
  originalAmount?: number;
  exchangeRateUsed?: number;
  notes?: string;
  createdAt: Date;
  isRecurring?: boolean;
  recurringTransactionId?: string | null;
}
```

### FamilySharedTransaction Interface
```typescript
// frontend/src/types/family.ts (lignes 96-118)
export interface FamilySharedTransaction {
  id: string;
  familyGroupId: string;
  transactionId: string | null;
  sharedBy: string;  // userId qui a partagé
  description: string;
  amount: number;
  category: string;
  date: Date;
  splitType: SplitType;
  paidBy: string;  // userId qui a payé (créancier)
  splitDetails: SplitDetail[];
  isSettled: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  transaction?: {
    id: string;
    accountId: string;
    type: 'income' | 'expense' | 'transfer';
  };
}
```

### FamilySharedTransactionRow (format Supabase)
```typescript
// frontend/src/types/family.ts (lignes 357-373)
export interface FamilySharedTransactionRow {
  id: string;
  family_group_id: string;
  transaction_id: string | null;
  shared_by: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  split_type: SplitType;
  paid_by: string;
  split_details: SplitDetail[];
  is_settled: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Note: has_reimbursement_request existe dans la DB mais pas dans cette interface
}
```

---

## 7. GAP ANALYSIS

### Champs manquants pour la fonctionnalité de transfert de propriété

#### Table `transactions`
1. **`current_owner_id`** (string, UUID, NULLABLE)
   - Propriétaire actuel de la transaction
   - NULL = propriétaire original (`user_id`)
   - NOT NULL = transaction transférée
   - Clé étrangère vers `users.id`

2. **`transferred_from`** (string, UUID, NULLABLE)
   - UserId du propriétaire précédent
   - NULL = jamais transférée
   - NOT NULL = transaction transférée depuis cet utilisateur

3. **`transferred_at`** (timestamp, NULLABLE)
   - Date/heure du transfert
   - NULL = jamais transférée
   - NOT NULL = date du transfert

4. **`transfer_reason`** (string, NULLABLE)
   - Raison du transfert (ex: "remboursement_settled", "manual_transfer")
   - Optionnel mais recommandé pour audit

5. **`transferred_by`** (string, UUID, NULLABLE)
   - UserId qui a effectué le transfert
   - Peut être différent de `transferred_from` (transfert par admin)
   - NULL = jamais transférée

#### Table `transaction_transfers` (nouvelle table recommandée)
Alternative à l'ajout de colonnes dans `transactions`:
- **`id`** (UUID, PRIMARY KEY)
- **`transaction_id`** (UUID, NOT NULL, FK → transactions.id)
- **`from_user_id`** (UUID, NOT NULL, FK → users.id)
- **`to_user_id`** (UUID, NOT NULL, FK → users.id)
- **`transferred_by`** (UUID, NULLABLE, FK → users.id)
- **`reason`** (string, NULLABLE)
- **`created_at`** (timestamp, NOT NULL)
- **`metadata`** (JSONB, NULLABLE)

**Avantages de la table séparée:**
- Historique complet des transferts
- Pas de modification de la table `transactions`
- Plus flexible pour les futures fonctionnalités

#### Contraintes à ajouter
1. **CHECK constraint:**
   ```sql
   CHECK (
     (current_owner_id IS NULL AND transferred_from IS NULL) OR
     (current_owner_id IS NOT NULL AND transferred_from IS NOT NULL)
   )
   ```

2. **Index:**
   - `idx_transactions_current_owner_id` sur `current_owner_id`
   - `idx_transactions_transferred_from` sur `transferred_from`

3. **RLS Policies:**
   - Les utilisateurs peuvent voir les transactions où `user_id = auth.uid()` OU `current_owner_id = auth.uid()`
   - Les utilisateurs peuvent transférer seulement leurs propres transactions

#### Logique métier à implémenter
1. **Après remboursement réglé (`reimbursement_requests.status = 'settled'`):**
   - Vérifier si la transaction doit être transférée
   - Si `paid_by` (créancier) ≠ `user_id` de la transaction originale:
     - Transférer la propriété de `user_id` (propriétaire original) vers `paid_by` (créancier)
     - Mettre à jour `current_owner_id`, `transferred_from`, `transferred_at`, `transferred_by`

2. **Vérification de propriété:**
   - Modifier toutes les requêtes pour vérifier `current_owner_id` OU `user_id`
   - Mettre à jour les services pour utiliser le propriétaire actuel

3. **Affichage:**
   - Afficher le propriétaire actuel dans l'UI
   - Afficher l'historique de transferts si disponible

---

## RÉSUMÉ

### Champs existants
✅ `transactions.user_id` - Propriétaire original (immutable)  
✅ `family_shared_transactions.paid_by` - Qui a payé (créancier)  
✅ `family_shared_transactions.shared_by` - Qui a partagé  
✅ `reimbursement_requests.status` - Statut du remboursement  

### Champs manquants
❌ `transactions.current_owner_id` - Propriétaire actuel  
❌ `transactions.transferred_from` - Propriétaire précédent  
❌ `transactions.transferred_at` - Date du transfert  
❌ `transactions.transferred_by` - Qui a effectué le transfert  
❌ `transactions.transfer_reason` - Raison du transfert  

### Tables manquantes
❌ `transaction_transfers` - Historique des transferts (optionnel mais recommandé)

### Logique manquante
❌ Fonction de transfert de propriété  
❌ Trigger automatique après remboursement réglé  
❌ Mise à jour des requêtes pour utiliser `current_owner_id`  
❌ RLS policies pour les transactions transférées  

---

**AGENT-1-SCHEMA-COMPLETE**

