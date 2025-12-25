# Database Schema Documentation - family_shared_transactions

**Date de création:** 2025-12-08  
**Dernière mise à jour:** 2025-12-08  
**Table:** `family_shared_transactions`

---

## Table: family_shared_transactions

Table de liaison pour partager des transactions entre membres d'un groupe familial.

### Colonnes

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | UUID | NO | Identifiant unique de la transaction partagée (PRIMARY KEY) |
| `family_group_id` | UUID | NO | Référence au groupe familial (FOREIGN KEY → `family_groups.id`) |
| `transaction_id` | UUID | YES | Référence à la transaction originale (FOREIGN KEY → `transactions.id`) |
| `shared_by` | UUID | NO | Utilisateur qui a partagé la transaction (FOREIGN KEY → `auth.users(id)`) |
| `paid_by` | UUID | YES | Utilisateur qui a payé pour la transaction partagée (FOREIGN KEY → `auth.users(id)`) |
| `is_private` | BOOLEAN | NO | Indique si la transaction est privée (défaut: false) |
| `split_type` | TEXT | YES | Type de répartition (ex: 'equal', 'custom', etc.) |
| `split_details` | JSONB | YES | Détails de la répartition personnalisée |
| `has_reimbursement_request` | BOOLEAN | NO | Indique si une demande de remboursement est en attente (défaut: false) |
| `shared_at` | TIMESTAMP | NO | Date et heure du partage (défaut: CURRENT_TIMESTAMP) |
| `created_at` | TIMESTAMP | NO | Date de création (défaut: CURRENT_TIMESTAMP) |
| `updated_at` | TIMESTAMP | NO | Date de mise à jour (défaut: CURRENT_TIMESTAMP) |

### Colonne: paid_by

**Type:** UUID  
**Nullable:** YES (pour compatibilité ascendante)  
**Référence:** `auth.users(id)`  
**Index:** `idx_family_shared_transactions_paid_by`

**Description:**  
Colonne ajoutée le 2025-12-08 pour suivre qui a réellement payé pour une transaction partagée. Cette information est essentielle pour le suivi des remboursements dans les groupes familiaux.

**Utilisation:**
- Permet de distinguer entre l'utilisateur qui a partagé la transaction (`shared_by`) et celui qui l'a payée (`paid_by`)
- Utilisé pour calculer les équilibres de remboursement entre membres
- Permet de générer des rapports de "qui doit quoi à qui"

**Fallback:**
- Si `paid_by` est NULL, utiliser `shared_by` comme valeur par défaut pour la compatibilité avec les transactions existantes créées avant l'ajout de cette colonne

**Exemple:**
```sql
-- Transaction où Alice partage une dépense qu'elle a payée
INSERT INTO family_shared_transactions (
  family_group_id,
  transaction_id,
  shared_by,
  paid_by  -- Même personne que shared_by
) VALUES (
  'group-uuid',
  'transaction-uuid',
  'alice-uuid',
  'alice-uuid'
);

-- Transaction où Bob partage une dépense payée par Alice
INSERT INTO family_shared_transactions (
  family_group_id,
  transaction_id,
  shared_by,
  paid_by  -- Différent de shared_by
) VALUES (
  'group-uuid',
  'transaction-uuid',
  'bob-uuid',
  'alice-uuid'
);
```

### Index

- `idx_family_shared_transactions_paid_by` - Index sur `paid_by` pour optimiser les requêtes de recherche par payeur

### Contraintes

- PRIMARY KEY sur `id`
- FOREIGN KEY `family_group_id` → `family_groups.id`
- FOREIGN KEY `transaction_id` → `transactions.id`
- FOREIGN KEY `shared_by` → `auth.users(id)`
- FOREIGN KEY `paid_by` → `auth.users(id)`

### RLS Policies

Les politiques RLS (Row Level Security) garantissent que:
- Les utilisateurs ne peuvent voir que les transactions partagées dans les groupes où ils sont membres
- Seul le créateur (`shared_by`) peut modifier ou supprimer une transaction partagée

---

## Migration SQL

La colonne `paid_by` a été ajoutée via une migration SQL:

```sql
-- Ajout de la colonne paid_by
ALTER TABLE family_shared_transactions
ADD COLUMN paid_by UUID REFERENCES auth.users(id);

-- Création de l'index pour optimiser les requêtes
CREATE INDEX idx_family_shared_transactions_paid_by 
ON family_shared_transactions(paid_by);

-- Commentaire pour documentation
COMMENT ON COLUMN family_shared_transactions.paid_by IS 
'Utilisateur qui a payé pour la transaction partagée. NULL pour compatibilité ascendante (utiliser shared_by comme fallback).';
```

---

## Notes de Compatibilité

**Compatibilité ascendante:**
- Les transactions existantes créées avant l'ajout de `paid_by` auront cette colonne à NULL
- Le code frontend doit utiliser `paid_by || shared_by` comme fallback pour garantir l'affichage correct
- Les nouvelles transactions doivent toujours spécifier `paid_by` lors de la création

**Impact sur le code:**
- `familySharingService.ts` utilise déjà `paid_by` avec fallback sur `shared_by` lors de l'insertion
- `FamilyDashboardPage.tsx` utilise `paidBy || sharedBy` pour trouver le membre payeur
- Les types TypeScript dans `types/family.ts` incluent `paidBy` comme optionnel

---

**Documentation créée le:** 2025-12-08  
**Agent:** Agent 3 - Database Schema Documentation











