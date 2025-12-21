# RAPPORT D'ANALYSE DU FLUX DE DONNÉES - REMBOURSEMENTS OBSOLÈTES

**Date:** 2025-01-19  
**Agent:** Agent 1 - Data Flow Analysis  
**Objectif:** Tracer le flux complet des données de remboursement pour identifier l'origine des données obsolètes

---

## 1. DATA SOURCE

### `FamilyReimbursementsPage` charge les données depuis:

#### A. `memberBalances` (ligne 53)
- **Service:** `getMemberBalances(activeFamilyGroup.id)`
- **Source:** Vue Supabase `family_member_balances`
- **Stockage:** `useState<FamilyMemberBalance[]>([])` (ligne 32)
- **Rafraîchissement:** Seulement lors du montage du composant (ligne 82-84) et après `markAsReimbursed` (ligne 142)

#### B. `pendingReimbursements` (ligne 71)
- **Service:** `getPendingReimbursements(activeFamilyGroup.id)`
- **Source:** Table Supabase `reimbursement_requests` avec JOIN sur `family_shared_transactions` et `transactions`
- **Stockage:** `useState<ReimbursementWithDetails[]>([])` (ligne 33)
- **Rafraîchissement:** Seulement lors du montage du composant (ligne 82-84) et après `markAsReimbursed` (ligne 145)

---

## 2. SERVICE CHAIN

### Chaîne d'appel complète: `FamilyReimbursementsPage` → Database

```
FamilyReimbursementsPage.tsx (ligne 71)
  ↓
getPendingReimbursements(groupId) - reimbursementService.ts (ligne 226)
  ↓
1. Vérification authentification: supabase.auth.getUser()
  ↓
2. Vérification membership: supabase.from('family_members').select().eq('family_group_id', groupId)
  ↓
3. Requête principale: supabase.from('reimbursement_requests')
    .select(`
      *,
      from_member:family_members(...),
      to_member:family_members(...),
      shared_transaction:family_shared_transactions(
        transaction_id,
        family_group_id,
        transactions(description, amount, date)
      )
    `)
    .eq('status', 'pending')
  ↓
4. Filtrage client-side (lignes 298-321):
    - Filtre par shared_transaction.family_group_id === groupId
    - Fallback sur item.family_group_id === groupId
  ↓
5. Mapping (lignes 324-344):
    - mapRowToReimbursementRequest(item)
    - Extraction des données de transaction jointes
    - Retour de ReimbursementWithDetails[]
```

### Points critiques dans la chaîne:

1. **Requête Supabase (ligne 256-280):**
   - Filtre uniquement sur `status = 'pending'`
   - **NE vérifie PAS** si `has_reimbursement_request = true` dans `family_shared_transactions`
   - **NE supprime PAS** les `reimbursement_requests` même si le flag est false

2. **Filtrage client-side (lignes 298-321):**
   - Filtre uniquement par `family_group_id`
   - **N'exclut PAS** les remboursements où `has_reimbursement_request = false`

3. **Pas de jointure avec `has_reimbursement_request`:**
   - La requête ne joint PAS le champ `has_reimbursement_request` de `family_shared_transactions`
   - Donc même si le flag est false, les `reimbursement_requests` avec `status = 'pending'` sont toujours retournés

---

## 3. CACHE POINTS

### Mécanismes de cache identifiés:

#### A. **React State (useState)**
- **`pendingReimbursements`** (ligne 33): Cache en mémoire React
- **`balances`** (ligne 32): Cache en mémoire React
- **Durée:** Persiste jusqu'au démontage du composant ou mise à jour manuelle

#### B. **useMemo (lignes 105-128)**
- **`reimbursementsOwedToMe`**: Mémoïsation basée sur `pendingReimbursements` et `currentMemberId`
- **`reimbursementsIOwe`**: Mémoïsation basée sur `pendingReimbursements` et `currentMemberId`
- **Durée:** Recalcul uniquement si `pendingReimbursements` ou `currentMemberId` changent

#### C. **Aucun cache externe**
- ❌ Pas de React Query / TanStack Query
- ❌ Pas de localStorage / sessionStorage
- ❌ Pas de cache global (Zustand store pour remboursements)
- ❌ Pas de Service Worker cache

### Problème de cache:
Les données sont mises en cache dans le state React et **ne sont PAS rafraîchies automatiquement** quand:
- L'utilisateur modifie le toggle dans `TransactionDetailPage`
- L'utilisateur revient sur `FamilyReimbursementsPage` depuis une autre page
- Les données changent dans la base de données

---

## 4. REFRESH TRIGGERS

### Déclencheurs de rafraîchissement identifiés:

#### A. **Montage du composant (ligne 82-84)**
```typescript
useEffect(() => {
  loadData();
}, [isAuthenticated, user, activeFamilyGroup, familyLoading]);
```
- Se déclenche quand:
  - Le composant est monté
  - `isAuthenticated` change
  - `user` change
  - `activeFamilyGroup` change
  - `familyLoading` change

#### B. **Après marquage comme remboursé (lignes 141-146)**
```typescript
const memberBalances = await getMemberBalances(activeFamilyGroup.id);
setBalances(memberBalances);

const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
setPendingReimbursements(reimbursements);
```
- Se déclenche uniquement après `handleMarkAsReimbursed`
- **NE se déclenche PAS** après modification du toggle dans `TransactionDetailPage`

#### C. **Bouton "Réessayer" en cas d'erreur (ligne 180)**
```typescript
onClick={loadData}
```
- Rafraîchissement manuel uniquement

### Déclencheurs manquants:

❌ **Pas de rafraîchissement automatique:**
- Quand l'utilisateur revient sur la page (pas de `useEffect` avec `window.focus` ou `visibilitychange`)
- Quand les données changent dans la base (pas de subscription Supabase Realtime)
- Quand le toggle est modifié dans `TransactionDetailPage` (pas de communication entre pages)

❌ **Pas de mécanisme de synchronisation:**
- Pas de polling automatique
- Pas d'écoute des événements de navigation
- Pas de rafraîchissement au focus de la fenêtre

---

## 5. STALE DATA CAUSE

### Cause racine identifiée:

#### Problème principal: **Incohérence entre `has_reimbursement_request` et `reimbursement_requests`**

1. **Quand le toggle est désactivé dans `TransactionDetailPage`:**
   - La fonction RPC `update_reimbursement_request` est appelée avec `p_has_reimbursement_request = false` (ligne 351 de `familySharingService.ts`)
   - **Cette fonction met à jour SEULEMENT le flag `has_reimbursement_request` dans `family_shared_transactions`**
   - **Elle NE supprime PAS les lignes dans `reimbursement_requests` avec `status = 'pending'`**

2. **Quand `getPendingReimbursements` est appelé:**
   - La requête filtre uniquement sur `status = 'pending'` (ligne 280 de `reimbursementService.ts`)
   - **Elle NE vérifie PAS** si `has_reimbursement_request = true` dans `family_shared_transactions`
   - **Elle retourne TOUS les `reimbursement_requests` avec `status = 'pending'`, même si le flag est false**

3. **Résultat:**
   - Les `reimbursement_requests` restent dans la base avec `status = 'pending'`
   - Le flag `has_reimbursement_request` est mis à `false`
   - `getPendingReimbursements` retourne toujours ces remboursements car il ne vérifie pas le flag
   - Les données apparaissent obsolètes dans l'UI

### Problème secondaire: **Pas de rafraîchissement automatique**

Même si les données étaient correctement supprimées dans la base:
- `FamilyReimbursementsPage` ne se rafraîchit pas automatiquement quand l'utilisateur revient depuis `TransactionDetailPage`
- Les données restent en cache dans le state React
- L'utilisateur voit toujours les anciennes données jusqu'à un rechargement manuel de la page

---

## 6. CODE SNIPPETS

### Snippet 1: Requête principale dans `getPendingReimbursements` (lignes 256-280)
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')
  .select(`
    *,
    from_member:family_members!reimbursement_requests_from_member_id_fkey(...),
    to_member:family_members!reimbursement_requests_to_member_id_fkey(...),
    shared_transaction:family_shared_transactions(
      transaction_id,
      family_group_id,
      transactions(description, amount, date)
    )
  `)
  .eq('status', 'pending');
// ❌ PROBLÈME: Ne filtre PAS sur has_reimbursement_request
```

### Snippet 2: Filtrage client-side (lignes 298-321)
```typescript
const filteredData = data.filter((item: any) => {
  if (!item.shared_transaction) {
    return false;
  }
  const transactionGroupId = item.shared_transaction?.family_group_id;
  if (transactionGroupId === groupId) {
    return true;
  }
  const directGroupId = item.family_group_id;
  if (directGroupId === groupId) {
    return true;
  }
  return false;
});
// ❌ PROBLÈME: Ne vérifie PAS has_reimbursement_request
```

### Snippet 3: useEffect de chargement (lignes 82-84)
```typescript
useEffect(() => {
  loadData();
}, [isAuthenticated, user, activeFamilyGroup, familyLoading]);
// ❌ PROBLÈME: Ne se déclenche PAS quand on revient sur la page
```

### Snippet 4: Toggle dans TransactionDetailPage (lignes 339-346)
```typescript
if (hasReimbursementRequest !== initialHasReimbursementRequest) {
  await updateSharedTransaction(sharedTransaction.id, {
    hasReimbursementRequest: hasReimbursementRequest
  } as any);
  toast.success('Demande de remboursement mise à jour');
  setInitialHasReimbursementRequest(hasReimbursementRequest);
}
// ❌ PROBLÈME: Ne notifie PAS FamilyReimbursementsPage du changement
```

---

## RÉSUMÉ DES PROBLÈMES IDENTIFIÉS

### Problème 1: Incohérence de données
- **Cause:** `getPendingReimbursements` ne vérifie pas `has_reimbursement_request`
- **Impact:** Retourne des remboursements même quand le flag est false
- **Solution requise:** Ajouter un filtre sur `has_reimbursement_request = true` dans la requête ou le filtrage client

### Problème 2: Pas de suppression des `reimbursement_requests`
- **Cause:** La fonction RPC `update_reimbursement_request` ne supprime pas les lignes quand le flag est false
- **Impact:** Les `reimbursement_requests` restent dans la base avec `status = 'pending'`
- **Solution requise:** Modifier la fonction RPC pour supprimer les `reimbursement_requests` quand `has_reimbursement_request = false`

### Problème 3: Pas de rafraîchissement automatique
- **Cause:** `FamilyReimbursementsPage` ne se rafraîchit pas quand on revient depuis `TransactionDetailPage`
- **Impact:** Les données obsolètes restent affichées
- **Solution requise:** Ajouter un rafraîchissement au focus/navigation ou utiliser un mécanisme de synchronisation

### Problème 4: Pas de communication entre pages
- **Cause:** `TransactionDetailPage` et `FamilyReimbursementsPage` ne communiquent pas
- **Impact:** Les changements dans une page ne sont pas reflétés dans l'autre
- **Solution requise:** Utiliser un store global, des événements, ou un rafraîchissement au focus

---

**AGENT-1-DATAFLOW-COMPLETE**







