# RAPPORT D'ANALYSE - INTÉGRITÉ DES DONNÉES: reimbursement_requests
**Agent 3 - Analyse des enregistrements orphelins dans reimbursement_requests**

**Date:** 2025-12-08  
**Objectif:** Analyser la structure de la table `reimbursement_requests`, identifier les scénarios d'orphelins possibles, et préparer des requêtes SQL de diagnostic pour détecter les données incohérentes.

---

## 1. TABLE STRUCTURE

### 1.1 Structure actuelle (nouvelle version)

**Source:** `frontend/src/types/family.ts` (lignes 435-448)  
**Source:** `frontend/src/services/reimbursementService.ts` (lignes 18-32)

**Colonnes de la table `reimbursement_requests`:**

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | UUID | NO | Clé primaire (générée automatiquement) |
| `shared_transaction_id` | UUID | NO | **FK** → `family_shared_transactions.id` |
| `from_member_id` | UUID | NO | **FK** → `family_members.id` (débiteur) |
| `to_member_id` | UUID | NO | **FK** → `family_members.id` (créancier) |
| `amount` | NUMERIC | NO | Montant du remboursement |
| `currency` | TEXT | NO | Devise (ex: 'MGA') |
| `status` | TEXT | NO | Statut: 'pending' \| 'settled' \| 'cancelled' |
| `created_at` | TIMESTAMP | NO | Date de création |
| `updated_at` | TIMESTAMP | NO | Date de mise à jour |
| `settled_at` | TIMESTAMP | YES | Date de règlement (si status = 'settled') |
| `settled_by` | UUID | YES | **FK** → `auth.users(id)` (qui a marqué comme réglé) |
| `note` | TEXT | YES | Note optionnelle |
| `family_group_id` | UUID | YES | **FK** → `family_groups(id)` (optionnel selon structure) |

### 1.2 Structure ancienne (dépréciée)

**Source:** `frontend/src/types/family.ts` (lignes 396-410)

**Colonnes de l'ancienne structure:**
- `family_group_id` (NOT NULL)
- `requested_by` (UUID → `auth.users(id)`)
- `requested_from` (UUID → `auth.users(id)`)
- `family_shared_transaction_id` (UUID → `family_shared_transactions.id`)

**Note:** Le code gère les deux structures via `mapRowToReimbursementRequest()` (lignes 111-150 dans `reimbursementService.ts`).

---

## 2. FOREIGN KEYS

### 2.1 Relations identifiées

**Source:** Analyse du code TypeScript et des types

#### Relation 1: `shared_transaction_id` → `family_shared_transactions.id`
- **Type:** Foreign Key (obligatoire)
- **Cascade:** ⚠️ **NON DÉFINI dans le code** (pas de migration SQL trouvée)
- **Usage:** Lie la demande de remboursement à la transaction partagée
- **Impact orphelin:** Si `family_shared_transactions` est supprimée, les `reimbursement_requests` restent

#### Relation 2: `from_member_id` → `family_members.id`
- **Type:** Foreign Key (obligatoire)
- **Cascade:** ⚠️ **NON DÉFINI dans le code**
- **Usage:** Identifie le membre débiteur (qui doit rembourser)
- **Impact orphelin:** Si `family_members` est supprimé, les `reimbursement_requests` restent

#### Relation 3: `to_member_id` → `family_members.id`
- **Type:** Foreign Key (obligatoire)
- **Cascade:** ⚠️ **NON DÉFINI dans le code**
- **Usage:** Identifie le membre créancier (qui doit recevoir)
- **Impact orphelin:** Si `family_members` est supprimé, les `reimbursement_requests` restent

#### Relation 4: `settled_by` → `auth.users(id)`
- **Type:** Foreign Key (optionnelle)
- **Cascade:** ⚠️ **NON DÉFINI dans le code**
- **Usage:** Identifie qui a marqué le remboursement comme réglé
- **Impact orphelin:** Si `auth.users` est supprimé, `settled_by` devient invalide

#### Relation 5: `family_group_id` → `family_groups(id)` (optionnel)
- **Type:** Foreign Key (optionnelle selon structure)
- **Cascade:** ⚠️ **NON DÉFINI dans le code**
- **Usage:** Référence directe au groupe familial
- **Impact orphelin:** Si `family_groups` est supprimé, les `reimbursement_requests` restent

### 2.2 Cascade behaviors attendus vs réels

**Comportement attendu (selon AGENT-1-DATABASE-SCHEMA-COMPLETE.md ligne 253):**
```sql
family_shared_transaction_id UUID NOT NULL REFERENCES family_shared_transactions(id) ON DELETE CASCADE
```

**Comportement réel:** ⚠️ **NON CONFIRMÉ** - Aucune migration SQL trouvée dans `supabase/migrations/` qui crée cette contrainte.

**Conclusion:** Les comportements CASCADE ne sont **PAS garantis** sans migration SQL explicite.

---

## 3. ORPHAN SCENARIOS

### 3.1 Scénario 1: Transaction supprimée mais reimbursement_request reste

**Cause:**
- Une transaction est supprimée de la table `transactions`
- La `family_shared_transaction` associée est supprimée (via `unshareTransaction()` ou cascade)
- Les `reimbursement_requests` associées **restent** dans la base

**Code concerné:** `frontend/src/services/familySharingService.ts` (lignes 243-282)
```typescript
export async function unshareTransaction(sharedTransactionId: string): Promise<void> {
  // ... vérifications ...
  
  // Supprimer la transaction partagée
  const { error: deleteError } = await supabase
    .from('family_shared_transactions')
    .delete()
    .eq('id', sharedTransactionId);
  
  // ⚠️ PROBLÈME: Aucun nettoyage des reimbursement_requests
}
```

**Impact:**
- Les `reimbursement_requests` avec `shared_transaction_id` invalide apparaissent dans les requêtes
- La vue `family_member_balances` calcule des soldes incorrects
- `getPendingReimbursements()` peut retourner des données invalides

### 3.2 Scénario 2: family_shared_transaction supprimée mais request reste

**Cause:**
- `family_shared_transactions` est supprimée (via `unshareTransaction()` ou suppression manuelle)
- Les `reimbursement_requests` associées **restent** si CASCADE n'est pas défini

**Code concerné:** `frontend/src/services/familySharingService.ts` (lignes 269-273)

**Impact:**
- `reimbursement_requests.shared_transaction_id` pointe vers un ID inexistant
- Les JOIN dans `getPendingReimbursements()` retournent `null` pour `shared_transaction`
- Le filtre ligne 300 dans `reimbursementService.ts` devrait exclure ces items, mais si le JOIN retourne quand même des données (cache Supabase?), ils apparaissent

### 3.3 Scénario 3: Utilisateur supprimé mais requests restent

**Cause:**
- Un utilisateur est supprimé de `auth.users`
- Les `family_members` associés sont désactivés (`is_active = false`) ou supprimés
- Les `reimbursement_requests` avec `from_member_id` ou `to_member_id` invalides **restent**

**Impact:**
- Impossible d'afficher les noms des membres (JOIN sur `family_members` échoue)
- Les soldes calculés dans `family_member_balances` sont incorrects

### 3.4 Scénario 4: Membre supprimé mais requests restent

**Cause:**
- Un `family_members` est supprimé (quitte le groupe)
- Les `reimbursement_requests` avec `from_member_id` ou `to_member_id` invalides **restent**

**Code concerné:** Aucun nettoyage trouvé lors de la suppression d'un membre

**Impact:**
- Les JOIN sur `family_members` échouent
- Les remboursements ne peuvent pas être affichés correctement

### 3.5 Scénario 5: Groupe familial supprimé mais requests restent

**Cause:**
- Un `family_groups` est supprimé
- Les `reimbursement_requests` avec `family_group_id` invalide **restent** (si colonne existe)

**Impact:**
- Les filtres par groupe retournent des données incorrectes
- Les soldes calculés incluent des données d'un groupe supprimé

### 3.6 Scénario 6: Statut incohérent

**Cause:**
- `status = 'settled'` mais `settled_at IS NULL`
- `status = 'pending'` mais `settled_at IS NOT NULL`
- `status = 'cancelled'` mais `settled_by IS NOT NULL`

**Impact:**
- Les calculs de soldes sont incorrects
- L'affichage des remboursements est incohérent

### 3.7 Scénario 7: Transaction partagée supprimée mais transaction originale existe

**Cause:**
- Une transaction est retirée du partage (`unshareTransaction()`)
- La transaction originale dans `transactions` existe toujours
- Les `reimbursement_requests` restent avec `shared_transaction_id` invalide

**Impact:**
- Les remboursements ne peuvent plus être liés à la transaction originale
- Les données historiques sont perdues

---

## 4. DIAGNOSTIC QUERIES

### 4.1 Query 1: Trouver les requests référençant des transactions partagées inexistantes

```sql
-- Trouver les reimbursement_requests avec shared_transaction_id invalide
SELECT 
    rr.id,
    rr.shared_transaction_id,
    rr.from_member_id,
    rr.to_member_id,
    rr.amount,
    rr.status,
    rr.created_at,
    CASE 
        WHEN fst.id IS NULL THEN 'ORPHANED'
        ELSE 'VALID'
    END AS status_check
FROM reimbursement_requests rr
LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
WHERE fst.id IS NULL
ORDER BY rr.created_at DESC;
```

**Résultat attendu:** Liste des `reimbursement_requests` orphelines (sans `family_shared_transactions` correspondante)

### 4.2 Query 2: Trouver les requests référençant des membres inexistants

```sql
-- Trouver les reimbursement_requests avec from_member_id ou to_member_id invalide
SELECT 
    rr.id,
    rr.shared_transaction_id,
    rr.from_member_id,
    rr.to_member_id,
    rr.amount,
    rr.status,
    CASE 
        WHEN fm_from.id IS NULL THEN 'ORPHANED_FROM_MEMBER'
        WHEN fm_to.id IS NULL THEN 'ORPHANED_TO_MEMBER'
        ELSE 'VALID'
    END AS member_status
FROM reimbursement_requests rr
LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
WHERE fm_from.id IS NULL OR fm_to.id IS NULL
ORDER BY rr.created_at DESC;
```

**Résultat attendu:** Liste des `reimbursement_requests` avec membres invalides

### 4.3 Query 3: Trouver les requests avec statuts incohérents

```sql
-- Trouver les reimbursement_requests avec statuts incohérents
SELECT 
    rr.id,
    rr.shared_transaction_id,
    rr.status,
    rr.settled_at,
    rr.settled_by,
    CASE 
        WHEN rr.status = 'settled' AND rr.settled_at IS NULL THEN 'SETTLED_WITHOUT_DATE'
        WHEN rr.status = 'pending' AND rr.settled_at IS NOT NULL THEN 'PENDING_WITH_DATE'
        WHEN rr.status = 'cancelled' AND rr.settled_by IS NOT NULL THEN 'CANCELLED_WITH_SETTLER'
        WHEN rr.status = 'settled' AND rr.settled_by IS NULL THEN 'SETTLED_WITHOUT_SETTLER'
        ELSE 'VALID'
    END AS inconsistency_type
FROM reimbursement_requests rr
WHERE 
    (rr.status = 'settled' AND rr.settled_at IS NULL)
    OR (rr.status = 'pending' AND rr.settled_at IS NOT NULL)
    OR (rr.status = 'cancelled' AND rr.settled_by IS NOT NULL)
    OR (rr.status = 'settled' AND rr.settled_by IS NULL)
ORDER BY rr.created_at DESC;
```

**Résultat attendu:** Liste des `reimbursement_requests` avec statuts incohérents

### 4.4 Query 4: Trouver les requests référençant des transactions originales supprimées

```sql
-- Trouver les reimbursement_requests où la transaction originale a été supprimée
SELECT 
    rr.id,
    rr.shared_transaction_id,
    fst.transaction_id,
    rr.amount,
    rr.status,
    CASE 
        WHEN t.id IS NULL THEN 'TRANSACTION_DELETED'
        ELSE 'TRANSACTION_EXISTS'
    END AS transaction_status
FROM reimbursement_requests rr
LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE fst.transaction_id IS NOT NULL AND t.id IS NULL
ORDER BY rr.created_at DESC;
```

**Résultat attendu:** Liste des `reimbursement_requests` où la transaction originale a été supprimée

### 4.5 Query 5: Statistiques globales des orphelins

```sql
-- Statistiques globales des orphelins
SELECT 
    COUNT(*) AS total_requests,
    COUNT(CASE WHEN fst.id IS NULL THEN 1 END) AS orphaned_shared_transactions,
    COUNT(CASE WHEN fm_from.id IS NULL OR fm_to.id IS NULL THEN 1 END) AS orphaned_members,
    COUNT(CASE 
        WHEN (rr.status = 'settled' AND rr.settled_at IS NULL)
            OR (rr.status = 'pending' AND rr.settled_at IS NOT NULL)
            OR (rr.status = 'cancelled' AND rr.settled_by IS NOT NULL)
        THEN 1 
    END) AS inconsistent_statuses,
    COUNT(CASE WHEN fst.transaction_id IS NOT NULL AND t.id IS NULL THEN 1 END) AS deleted_transactions
FROM reimbursement_requests rr
LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
LEFT JOIN transactions t ON t.id = fst.transaction_id;
```

**Résultat attendu:** Compteurs globaux des différents types d'orphelins

### 4.6 Query 6: Trouver les requests avec settled_by invalide

```sql
-- Trouver les reimbursement_requests avec settled_by pointant vers un utilisateur inexistant
SELECT 
    rr.id,
    rr.shared_transaction_id,
    rr.settled_by,
    rr.status,
    rr.settled_at,
    CASE 
        WHEN au.id IS NULL THEN 'ORPHANED_SETTLED_BY'
        ELSE 'VALID'
    END AS settled_by_status
FROM reimbursement_requests rr
LEFT JOIN auth.users au ON au.id = rr.settled_by
WHERE rr.settled_by IS NOT NULL AND au.id IS NULL
ORDER BY rr.settled_at DESC;
```

**Résultat attendu:** Liste des `reimbursement_requests` avec `settled_by` invalide

---

## 5. CLEANUP STRATEGY

### 5.1 Approche recommandée: Hard Delete avec vérifications

**Raison:** Les `reimbursement_requests` sont des données transactionnelles qui perdent leur sens si les entités référencées n'existent plus.

### 5.2 Ordre d'opérations recommandé

#### Étape 1: Identifier les orphelins
```sql
-- Créer une vue temporaire pour identifier les orphelins
CREATE OR REPLACE VIEW orphaned_reimbursement_requests AS
SELECT 
    rr.id,
    rr.shared_transaction_id,
    CASE 
        WHEN fst.id IS NULL THEN 'ORPHANED_SHARED_TRANSACTION'
        WHEN fm_from.id IS NULL THEN 'ORPHANED_FROM_MEMBER'
        WHEN fm_to.id IS NULL THEN 'ORPHANED_TO_MEMBER'
        WHEN fst.transaction_id IS NOT NULL AND t.id IS NULL THEN 'ORPHANED_TRANSACTION'
        ELSE 'VALID'
    END AS orphan_type
FROM reimbursement_requests rr
LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE 
    fst.id IS NULL 
    OR fm_from.id IS NULL 
    OR fm_to.id IS NULL
    OR (fst.transaction_id IS NOT NULL AND t.id IS NULL);
```

#### Étape 2: Sauvegarder les données avant suppression
```sql
-- Créer une table de sauvegarde
CREATE TABLE IF NOT EXISTS reimbursement_requests_backup_20251208 AS
SELECT * FROM reimbursement_requests
WHERE id IN (SELECT id FROM orphaned_reimbursement_requests);
```

#### Étape 3: Supprimer les orphelins
```sql
-- Supprimer les reimbursement_requests orphelines
DELETE FROM reimbursement_requests
WHERE id IN (
    SELECT id FROM orphaned_reimbursement_requests
);
```

#### Étape 4: Corriger les statuts incohérents
```sql
-- Corriger les statuts incohérents
UPDATE reimbursement_requests
SET 
    settled_at = NULL,
    settled_by = NULL
WHERE status = 'pending' AND settled_at IS NOT NULL;

UPDATE reimbursement_requests
SET 
    settled_at = updated_at,
    settled_by = (
        SELECT user_id 
        FROM family_members 
        WHERE id = reimbursement_requests.to_member_id
    )
WHERE status = 'settled' AND settled_at IS NULL;

UPDATE reimbursement_requests
SET 
    settled_by = NULL
WHERE status = 'cancelled' AND settled_by IS NOT NULL;
```

### 5.3 Alternative: Soft Delete

**Si la conservation des données historiques est importante:**

```sql
-- Ajouter une colonne deleted_at si elle n'existe pas
ALTER TABLE reimbursement_requests 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Marquer les orphelins comme supprimés au lieu de les supprimer
UPDATE reimbursement_requests
SET deleted_at = NOW()
WHERE id IN (
    SELECT id FROM orphaned_reimbursement_requests
);

-- Modifier les requêtes pour exclure les supprimés
-- Dans getPendingReimbursements(), ajouter:
-- .is('deleted_at', null)
```

**Avantages:**
- Conservation des données historiques
- Possibilité de restaurer si nécessaire
- Audit trail complet

**Inconvénients:**
- Nécessite une colonne supplémentaire
- Les requêtes doivent filtrer `deleted_at IS NULL`
- La vue `family_member_balances` doit exclure les supprimés

### 5.4 Prévention future: Trigger automatique

**Créer un trigger pour nettoyer automatiquement:**

```sql
-- Fonction de nettoyage automatique
CREATE OR REPLACE FUNCTION cleanup_orphaned_reimbursement_requests()
RETURNS TRIGGER AS $$
BEGIN
    -- Supprimer les reimbursement_requests associées quand family_shared_transactions est supprimée
    DELETE FROM reimbursement_requests
    WHERE shared_transaction_id = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger
DROP TRIGGER IF EXISTS trigger_cleanup_reimbursement_requests ON family_shared_transactions;
CREATE TRIGGER trigger_cleanup_reimbursement_requests
AFTER DELETE ON family_shared_transactions
FOR EACH ROW
EXECUTE FUNCTION cleanup_orphaned_reimbursement_requests();
```

**Modifier `unshareTransaction()` pour nettoyer explicitement:**

**Fichier:** `frontend/src/services/familySharingService.ts`  
**Lignes:** 269-273

**Ajout recommandé:**
```typescript
// Supprimer la transaction partagée
const { error: deleteError } = await supabase
  .from('family_shared_transactions')
  .delete()
  .eq('id', sharedTransactionId);

if (deleteError) {
  throw new Error(`Erreur lors du retrait du partage: ${deleteError.message}`);
}

// ⭐ NOUVEAU: Supprimer les remboursements associés
const { error: cleanupError } = await supabase
  .from('reimbursement_requests')
  .delete()
  .eq('shared_transaction_id', sharedTransactionId);

if (cleanupError) {
  console.warn('Erreur lors du nettoyage des remboursements:', cleanupError);
  // Ne pas throw - la transaction partagée est déjà supprimée
}
```

---

## 6. RLS CONSIDERATIONS

### 6.1 Politiques RLS existantes

**Recherche effectuée:** Aucune politique RLS spécifique trouvée pour `reimbursement_requests` dans les migrations SQL.

**Hypothèse:** Les politiques RLS peuvent être définies directement dans Supabase Dashboard ou via des migrations non versionnées.

### 6.2 Impact sur les opérations de nettoyage

**Problème potentiel:** Si RLS est activé sur `reimbursement_requests`, les opérations de nettoyage doivent être exécutées:
1. **Via un service admin** (service role key)
2. **Via une fonction RPC** avec `SECURITY DEFINER`
3. **Via un trigger** (s'exécute avec les privilèges du propriétaire de la fonction)

### 6.3 Requête pour vérifier les politiques RLS

```sql
-- Vérifier les politiques RLS sur reimbursement_requests
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'reimbursement_requests'
ORDER BY policyname;
```

### 6.4 Fonction RPC recommandée pour le nettoyage

**Si RLS bloque les suppressions directes:**

```sql
-- Créer une fonction RPC pour nettoyer les orphelins (avec SECURITY DEFINER)
CREATE OR REPLACE FUNCTION cleanup_orphaned_reimbursement_requests_rpc()
RETURNS TABLE(
    deleted_count INTEGER,
    orphan_types JSONB
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
    v_orphan_types JSONB := '{}'::JSONB;
BEGIN
    -- Compter les orphelins par type
    SELECT jsonb_object_agg(orphan_type, count)
    INTO v_orphan_types
    FROM (
        SELECT 
            CASE 
                WHEN fst.id IS NULL THEN 'orphaned_shared_transaction'
                WHEN fm_from.id IS NULL THEN 'orphaned_from_member'
                WHEN fm_to.id IS NULL THEN 'orphaned_to_member'
                WHEN fst.transaction_id IS NOT NULL AND t.id IS NULL THEN 'orphaned_transaction'
            END AS orphan_type,
            COUNT(*) AS count
        FROM reimbursement_requests rr
        LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
        LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
        LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
        LEFT JOIN transactions t ON t.id = fst.transaction_id
        WHERE 
            fst.id IS NULL 
            OR fm_from.id IS NULL 
            OR fm_to.id IS NULL
            OR (fst.transaction_id IS NOT NULL AND t.id IS NULL)
        GROUP BY orphan_type
    ) subq;
    
    -- Supprimer les orphelins
    WITH orphaned AS (
        SELECT rr.id
        FROM reimbursement_requests rr
        LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
        LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
        LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
        LEFT JOIN transactions t ON t.id = fst.transaction_id
        WHERE 
            fst.id IS NULL 
            OR fm_from.id IS NULL 
            OR fm_to.id IS NULL
            OR (fst.transaction_id IS NOT NULL AND t.id IS NULL)
    )
    DELETE FROM reimbursement_requests
    WHERE id IN (SELECT id FROM orphaned);
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RETURN QUERY SELECT v_deleted_count, v_orphan_types;
END;
$$;

-- Appel depuis le frontend:
-- const { data, error } = await supabase.rpc('cleanup_orphaned_reimbursement_requests_rpc');
```

### 6.5 Permissions requises

**Pour exécuter le nettoyage:**
- **Service role key** (pour les opérations admin)
- **Ou** fonction RPC avec `SECURITY DEFINER` (pour contourner RLS)
- **Ou** trigger automatique (s'exécute avec les privilèges du propriétaire)

---

## 7. RECOMMENDATIONS FINALES

### 7.1 Actions immédiates

1. **Exécuter les requêtes de diagnostic** (section 4) pour identifier les orphelins
2. **Sauvegarder les données** avant toute suppression
3. **Supprimer les orphelins** selon la stratégie choisie (hard delete ou soft delete)

### 7.2 Actions préventives

1. **Créer un trigger** pour nettoyer automatiquement lors de la suppression de `family_shared_transactions`
2. **Modifier `unshareTransaction()`** pour nettoyer explicitement les `reimbursement_requests`
3. **Ajouter des contraintes CASCADE** dans une migration SQL si elles n'existent pas

### 7.3 Actions à long terme

1. **Ajouter une colonne `deleted_at`** pour soft delete si conservation historique nécessaire
2. **Créer une fonction RPC** pour nettoyage périodique avec logging
3. **Monitorer les orphelins** via une vue ou un job périodique

---

## 8. CONCLUSION

**Problèmes identifiés:**
- ⚠️ Aucune contrainte CASCADE confirmée dans les migrations SQL
- ⚠️ `unshareTransaction()` ne nettoie pas les `reimbursement_requests`
- ⚠️ Aucun trigger automatique de nettoyage trouvé
- ⚠️ Risque élevé d'orphelins après suppression de `family_shared_transactions`

**Impact:**
- Les `reimbursement_requests` orphelines polluent les données
- Les calculs de soldes dans `family_member_balances` sont incorrects
- Les requêtes retournent des données invalides

**Solutions:**
- Exécuter les requêtes de diagnostic pour quantifier le problème
- Implémenter le nettoyage selon la stratégie choisie
- Prévenir les futurs orphelins via triggers et modifications de code

---

**AGENT-3-ORPHAN-ANALYSIS-COMPLETE**

