# RAPPORT D'ANALYSE - CALCUL DES BALANCES ET REMBOURSEMENTS EN ATTENTE
**Agent 3 - Analyse du calcul de memberBalances et identification de la cause des données obsolètes**

**Date:** 2025-12-08  
**Objectif:** Investiguer pourquoi `memberBalances` et `pendingReimbursements` affichent 12 remboursements en attente alors qu'il devrait y en avoir 0 après suppression de `shared_with` dans les transactions.

---

## 1. BALANCE CALCULATION

### 1.1 Fonction principale: `getMemberBalances`

**Fichier:** `frontend/src/services/reimbursementService.ts`  
**Lignes:** 165-218

**Code:**
```typescript
export async function getMemberBalances(
  groupId: string
): Promise<FamilyMemberBalance[]> {
  // ... vérifications auth et membership ...
  
  // Récupérer les soldes depuis la vue
  const { data, error } = await supabase
    .from('family_member_balances')
    .select('*')
    .eq('family_group_id', groupId);

  if (!data) {
    return [];
  }

  return data.map(mapRowToFamilyMemberBalance);
}
```

**Source de données:** Vue Supabase `family_member_balances`  
**Pas de calcul côté client:** Les valeurs sont directement lues depuis la vue

### 1.2 Structure de `FamilyMemberBalance`

**Fichier:** `frontend/src/services/reimbursementService.ts` (lignes 49-59)  
**Fichier:** `frontend/src/types/family.ts` (lignes 454-464)

```typescript
export interface FamilyMemberBalance {
  familyGroupId: string;
  memberId: string;
  userId: string | null;
  displayName: string;
  totalPaid: number;        // Total payé par ce membre
  totalOwed: number;        // Total dû par ce membre
  pendingToReceive: number; // ⚠️ Montant en attente de réception
  pendingToPay: number;     // ⚠️ Montant en attente de paiement
  netBalance: number;       // Solde net (totalPaid - totalOwed)
}
```

**Champs critiques pour le problème:**
- `pendingToReceive`: Calculé depuis `reimbursement_requests` avec `status = 'pending'` où le membre est créancier (`to_member_id`)
- `pendingToPay`: Calculé depuis `reimbursement_requests` avec `status = 'pending'` où le membre est débiteur (`from_member_id`)

---

## 2. DATA QUERY

### 2.1 Requête Supabase pour `getMemberBalances`

**Table/Vue:** `family_member_balances`  
**Requête:** 
```sql
SELECT * 
FROM family_member_balances 
WHERE family_group_id = :groupId
```

**Type:** Vue SQL (pas de table physique)  
**Calcul:** La vue agrège les données depuis:
- `family_members` (membres du groupe)
- `family_shared_transactions` (transactions partagées)
- `reimbursement_requests` (demandes de remboursement avec `status = 'pending'`)

### 2.2 Requête Supabase pour `getPendingReimbursements`

**Fichier:** `frontend/src/services/reimbursementService.ts`  
**Lignes:** 256-280

**Requête Supabase:**
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')
  .select(`
    *,
    from_member:family_members!reimbursement_requests_from_member_id_fkey(
      display_name,
      family_group_id
    ),
    to_member:family_members!reimbursement_requests_to_member_id_fkey(
      display_name,
      family_group_id
    ),
    shared_transaction:family_shared_transactions(
      transaction_id,
      family_group_id,
      transactions(
        description,
        amount,
        date
      )
    )
  `)
  .eq('status', 'pending');
```

**Filtre principal:** `.eq('status', 'pending')` (ligne 280)  
**Problème identifié:** ⚠️ **Aucune vérification que la transaction est toujours partagée**

---

## 3. FILTERING LOGIC

### 3.1 Filtrage dans `getPendingReimbursements`

**Fichier:** `frontend/src/services/reimbursementService.ts`  
**Lignes:** 296-321

**Logique de filtrage:**

```typescript
const filteredData = data.filter((item: any) => {
  // Exclure les remboursements sans transaction partagée valide
  if (!item.shared_transaction) {
    return false;
  }
  
  // Source principale: la transaction partagée doit appartenir au groupe
  const transactionGroupId = item.shared_transaction?.family_group_id;
  
  if (transactionGroupId === groupId) {
    return true;
  }
  
  // Fallback: vérifier via family_group_id direct si présent
  const directGroupId = item.family_group_id;
  if (directGroupId === groupId) {
    return true;
  }
  
  return false;
});
```

**Filtres appliqués:**
1. ✅ `status = 'pending'` (dans la requête Supabase)
2. ✅ `shared_transaction` existe (filtre côté client)
3. ✅ `family_group_id` correspond (filtre côté client)
4. ❌ **MANQUE:** Vérification que la transaction existe toujours dans `family_shared_transactions`
5. ❌ **MANQUE:** Vérification que `shared_with` existe toujours dans `transactions`

### 3.2 Calcul dans la vue `family_member_balances`

**Hypothèse sur la structure SQL de la vue** (non trouvée dans le code, mais déduite):

```sql
CREATE OR REPLACE VIEW family_member_balances AS
SELECT 
  fm.family_group_id,
  fm.id AS member_id,
  fm.user_id,
  fm.display_name,
  -- Calcul total_paid depuis family_shared_transactions où paid_by = fm.user_id
  COALESCE(SUM(CASE WHEN fst.paid_by = fm.user_id THEN ... END), 0) AS total_paid,
  -- Calcul total_owed depuis split_details
  COALESCE(SUM(CASE WHEN ... END), 0) AS total_owed,
  -- ⚠️ Calcul pending_to_receive depuis reimbursement_requests
  COALESCE(SUM(CASE 
    WHEN rr.status = 'pending' AND rr.to_member_id = fm.id 
    THEN rr.amount 
  END), 0) AS pending_to_receive,
  -- ⚠️ Calcul pending_to_pay depuis reimbursement_requests
  COALESCE(SUM(CASE 
    WHEN rr.status = 'pending' AND rr.from_member_id = fm.id 
    THEN rr.amount 
  END), 0) AS pending_to_pay,
  -- net_balance = total_paid - total_owed
  ...
FROM family_members fm
LEFT JOIN reimbursement_requests rr ON ...
WHERE fm.is_active = true
GROUP BY fm.id, fm.family_group_id, fm.user_id, fm.display_name;
```

**Problème identifié:** La vue agrège `reimbursement_requests` avec `status = 'pending'` **SANS vérifier** si:
- La transaction associée existe toujours dans `family_shared_transactions`
- La transaction est toujours partagée (`shared_with` dans `transactions`)

---

## 4. SHARED_WITH USAGE

### 4.1 Vérification dans le code

**Recherche effectuée:** Aucune référence à `shared_with` trouvée dans:
- `reimbursementService.ts`
- `familySharingService.ts`
- `FamilyReimbursementsPage.tsx`

**Conclusion:** Le champ `shared_with` dans la table `transactions` **n'est PAS utilisé** pour filtrer les remboursements.

### 4.2 Tables utilisées pour le partage

**Table principale:** `family_shared_transactions`
- Contient les transactions partagées dans un groupe familial
- Colonnes: `id`, `family_group_id`, `transaction_id`, `shared_by`, `paid_by`, `split_type`, `split_details`, `has_reimbursement_request`, etc.

**Table des remboursements:** `reimbursement_requests`
- Contient les demandes de remboursement
- Colonnes: `id`, `shared_transaction_id`, `from_member_id`, `to_member_id`, `amount`, `status`, etc.
- **Lien:** `shared_transaction_id` → `family_shared_transactions.id`

**Problème:** Si une transaction est supprimée de `family_shared_transactions` (via `unshareTransaction`), les `reimbursement_requests` associées **restent** dans la base avec `status = 'pending'`.

---

## 5. STALE CAUSE

### 5.1 Cause racine identifiée

**Problème principal:** Les `reimbursement_requests` avec `status = 'pending'` **ne sont PAS supprimées** quand:
1. Une transaction est retirée du partage (`unshareTransaction`)
2. Une transaction est supprimée (`deleteTransaction`)
3. Le champ `shared_with` est retiré d'une transaction

**Flux problématique:**

```
1. Transaction partagée → reimbursement_requests créées (status = 'pending')
2. Transaction retirée du partage → family_shared_transactions supprimée
3. ❌ reimbursement_requests RESTENT avec status = 'pending'
4. getPendingReimbursements() retourne toujours ces remboursements
5. family_member_balances calcule pending_to_receive/pending_to_pay avec ces données obsolètes
```

### 5.2 Pourquoi les données sont obsolètes

**Dans `getPendingReimbursements` (lignes 296-321):**
- ✅ Vérifie que `shared_transaction` existe (ligne 300)
- ❌ **MAIS** si `shared_transaction` est `null` dans le JOIN, le filtre exclut l'item
- ⚠️ **PROBLÈME:** Si `family_shared_transactions` est supprimée mais que le JOIN retourne quand même un résultat (cache Supabase?), le filtre ne fonctionne pas

**Dans la vue `family_member_balances`:**
- La vue agrège directement depuis `reimbursement_requests` avec `status = 'pending'`
- **Aucune vérification** que `shared_transaction_id` pointe vers une transaction toujours partagée
- **Aucune vérification** que `family_shared_transactions` existe toujours

### 5.3 Scénario exact du problème

**Log utilisateur:** `pendingReimbursementsCount: 12`

**Hypothèse:**
1. 12 `reimbursement_requests` existent avec `status = 'pending'`
2. Les transactions associées ont été retirées du partage (`family_shared_transactions` supprimées)
3. `getPendingReimbursements()` fait un JOIN sur `family_shared_transactions`
4. Si le JOIN retourne `null` pour `shared_transaction`, le filtre côté client devrait exclure ces items (ligne 300)
5. **MAIS** si le JOIN retourne quand même des données (cache, données obsolètes, ou JOIN LEFT qui inclut les nulls), les 12 items apparaissent

**Vérification nécessaire:** Le JOIN dans `getPendingReimbursements` est un JOIN implicite (via `.select()`). Si Supabase fait un LEFT JOIN, les `reimbursement_requests` sans `shared_transaction` correspondante peuvent quand même apparaître.

---

## 6. RECOMMENDED FIX

### 6.1 Fix immédiat: Filtrer les remboursements orphelins

**Fichier:** `frontend/src/services/reimbursementService.ts`  
**Fonction:** `getPendingReimbursements`  
**Ligne:** Après la ligne 321 (dans le filtre)

**Ajout à faire:**

```typescript
// Filtrer par groupe - utiliser shared_transaction.family_group_id comme source de vérité
const filteredData = data.filter((item: any) => {
  // Exclure les remboursements sans transaction partagée valide
  if (!item.shared_transaction) {
    return false;
  }
  
  // ⭐ NOUVEAU: Vérifier que shared_transaction.transaction_id existe
  // (si transaction_id est null, la transaction partagée a été supprimée)
  if (!item.shared_transaction.transaction_id) {
    return false;
  }
  
  // Source principale: la transaction partagée doit appartenir au groupe
  const transactionGroupId = item.shared_transaction?.family_group_id;
  
  if (transactionGroupId === groupId) {
    return true;
  }
  
  // Fallback: vérifier via family_group_id direct si présent
  const directGroupId = item.family_group_id;
  if (directGroupId === groupId) {
    return true;
  }
  
  return false;
});
```

### 6.2 Fix à long terme: Nettoyer les remboursements orphelins

**Option 1: Trigger SQL pour supprimer automatiquement**

Créer un trigger dans Supabase qui supprime les `reimbursement_requests` quand `family_shared_transactions` est supprimée:

```sql
CREATE OR REPLACE FUNCTION cleanup_orphaned_reimbursement_requests()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM reimbursement_requests
  WHERE shared_transaction_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_reimbursement_requests
AFTER DELETE ON family_shared_transactions
FOR EACH ROW
EXECUTE FUNCTION cleanup_orphaned_reimbursement_requests();
```

**Option 2: Nettoyage manuel dans `unshareTransaction`**

**Fichier:** `frontend/src/services/familySharingService.ts`  
**Fonction:** `unshareTransaction` (lignes 243-273)

**Ajout à faire:**

```typescript
export async function unshareTransaction(sharedTransactionId: string): Promise<void> {
  // ... code existant ...
  
  // Supprimer la transaction partagée
  const { error: deleteError } = await supabase
    .from('family_shared_transactions')
    .delete()
    .eq('id', sharedTransactionId);

  if (deleteError) {
    throw new Error(`Erreur lors de la suppression: ${deleteError.message}`);
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
}
```

### 6.3 Fix pour la vue `family_member_balances`

**Option recommandée:** Modifier la vue SQL pour exclure les remboursements orphelins:

```sql
CREATE OR REPLACE VIEW family_member_balances AS
SELECT 
  fm.family_group_id,
  fm.id AS member_id,
  fm.user_id,
  fm.display_name,
  -- ... autres calculs ...
  -- ⭐ MODIFIÉ: Vérifier que shared_transaction existe toujours
  COALESCE(SUM(CASE 
    WHEN rr.status = 'pending' 
      AND rr.to_member_id = fm.id 
      AND EXISTS (
        SELECT 1 FROM family_shared_transactions fst 
        WHERE fst.id = rr.shared_transaction_id
      )
    THEN rr.amount 
  END), 0) AS pending_to_receive,
  COALESCE(SUM(CASE 
    WHEN rr.status = 'pending' 
      AND rr.from_member_id = fm.id 
      AND EXISTS (
        SELECT 1 FROM family_shared_transactions fst 
        WHERE fst.id = rr.shared_transaction_id
      )
    THEN rr.amount 
  END), 0) AS pending_to_pay,
  -- ...
FROM family_members fm
LEFT JOIN reimbursement_requests rr ON (
  rr.status = 'pending' 
  AND (rr.to_member_id = fm.id OR rr.from_member_id = fm.id)
  AND EXISTS (
    SELECT 1 FROM family_shared_transactions fst 
    WHERE fst.id = rr.shared_transaction_id
  )
)
WHERE fm.is_active = true
GROUP BY fm.id, fm.family_group_id, fm.user_id, fm.display_name;
```

### 6.4 Fix immédiat côté client (solution de contournement)

**Fichier:** `frontend/src/pages/FamilyReimbursementsPage.tsx`  
**Fonction:** `loadData` (lignes 43-79)

**Ajout à faire après ligne 72:**

```typescript
// Charger les remboursements en attente
const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);

// ⭐ NOUVEAU: Filtrer les remboursements orphelins (sans transaction partagée valide)
const validReimbursements = reimbursements.filter(r => {
  // Vérifier que la transaction partagée existe toujours
  // (getPendingReimbursements devrait déjà filtrer, mais double vérification)
  return r.familySharedTransactionId && r.familySharedTransactionId.length > 0;
});

setPendingReimbursements(validReimbursements);
```

---

## 7. VERIFICATION ET TESTS

### 7.1 Tests à effectuer

1. **Test 1: Vérifier les remboursements orphelins**
   ```sql
   SELECT rr.*, fst.id AS shared_transaction_exists
   FROM reimbursement_requests rr
   LEFT JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
   WHERE rr.status = 'pending' AND fst.id IS NULL;
   ```
   **Résultat attendu:** Liste des `reimbursement_requests` orphelines

2. **Test 2: Vérifier le JOIN dans `getPendingReimbursements`**
   - Ajouter un log pour voir si `item.shared_transaction` est `null` pour certains items
   - Vérifier si le filtre ligne 300 fonctionne correctement

3. **Test 3: Vérifier la vue `family_member_balances`**
   ```sql
   SELECT * FROM family_member_balances WHERE family_group_id = :groupId;
   ```
   Comparer `pending_to_receive` et `pending_to_pay` avec le résultat de `getPendingReimbursements`

### 7.2 Points de vérification

- ✅ `getPendingReimbursements` filtre par `status = 'pending'`
- ✅ `getPendingReimbursements` vérifie que `shared_transaction` existe
- ❌ **MANQUE:** Vérification que `shared_transaction.transaction_id` existe
- ❌ **MANQUE:** Nettoyage des `reimbursement_requests` lors de `unshareTransaction`
- ❌ **MANQUE:** Vérification dans la vue `family_member_balances` que `shared_transaction` existe

---

## 8. CONCLUSION

**Cause racine:** Les `reimbursement_requests` avec `status = 'pending'` ne sont pas supprimées quand les transactions sont retirées du partage. La vue `family_member_balances` et `getPendingReimbursements` agrègent ces données obsolètes.

**Fix recommandé (priorité):**
1. **Immédiat:** Ajouter un filtre dans `getPendingReimbursements` pour exclure les remboursements sans `shared_transaction.transaction_id`
2. **Court terme:** Nettoyer les `reimbursement_requests` dans `unshareTransaction`
3. **Long terme:** Modifier la vue `family_member_balances` pour exclure les remboursements orphelins

**Impact:** Les 12 remboursements en attente affichés sont probablement des remboursements orphelins (associés à des transactions qui ne sont plus partagées).

---

**AGENT-3-BALANCES-COMPLETE**

