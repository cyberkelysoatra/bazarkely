# AGENT-3 - SHARED TRANSACTIONS & REIMBURSEMENT REQUESTS ANALYSIS
## Documentation READ-ONLY - Analyse Modèle de Données

**Date:** 2025-12-08  
**Agent:** Agent 3 - Data Model Analysis  
**Mission:** READ-ONLY - Analyse et documentation uniquement  
**Objectif:** Comprendre la relation entre `family_shared_transactions` et `reimbursement_requests`

---

## ⛔ CONFIRMATION READ-ONLY

**STATUT:** ✅ **READ-ONLY CONFIRMÉ**  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement  
**MODIFICATIONS SUGGÉRÉES:** Documentation uniquement

---

## 1. DATA MODEL

### **1.1 Structure de `family_shared_transactions`**

**Fichier:** `frontend/src/types/family.ts`  
**Lignes:** 96-118, 357-373

**Interface TypeScript:**
```typescript
export interface FamilySharedTransaction {
  id: string;
  familyGroupId: string;
  transactionId: string | null; // null si transaction virtuelle
  sharedBy: string; // userId
  description: string;
  amount: number;
  category: string;
  date: Date;
  splitType: SplitType;
  paidBy: string; // userId de la personne qui a payé
  splitDetails: SplitDetail[]; // Détails de la répartition
  isSettled: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relation optionnelle avec Transaction
  transaction?: {
    id: string;
    accountId: string;
    type: 'income' | 'expense' | 'transfer';
  };
}
```

**⚠️ NOTE IMPORTANTE:** L'interface TypeScript `FamilySharedTransaction` **ne contient PAS** le champ `has_reimbursement_request`, mais ce champ existe dans la table Supabase.

**Format Supabase (snake_case):**
```typescript
export interface FamilySharedTransactionRow {
  id: string;
  family_group_id: string;
  transaction_id: string | null;
  shared_by: string;
  description: string;
  amount: number;
  category: string;
  date: string; // ISO date string
  split_type: SplitType;
  paid_by: string;
  split_details: SplitDetail[]; // JSONB
  is_settled: boolean;
  notes: string | null;
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
  // has_reimbursement_request existe dans la DB mais pas dans le type
}
```

### **1.2 Structure de `reimbursement_requests`**

**Fichier:** `frontend/src/types/family.ts`  
**Lignes:** 152-168

**Interface TypeScript:**
```typescript
export interface ReimbursementRequest {
  id: string;
  familyGroupId: string;
  requestedBy: string; // userId du demandeur (créancier)
  requestedFrom: string; // userId de la personne qui doit rembourser (débiteur)
  familySharedTransactionId: string; // Transaction partagée liée
  amount: number;
  description: string;
  status: ReimbursementStatus; // 'pending' | 'settled' | 'cancelled'
  statusChangedAt: Date;
  statusChangedBy?: string; // userId qui a changé le statut
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
  // Relation optionnelle avec FamilySharedTransaction
  sharedTransaction?: FamilySharedTransaction;
}
```

**Format Supabase (dans `reimbursementService.ts`):**
```typescript
interface ReimbursementRequestTableRow {
  id: string;
  shared_transaction_id: string; // FK vers family_shared_transactions.id
  from_member_id: string; // Membre qui doit rembourser (débiteur)
  to_member_id: string; // Membre qui doit recevoir (créancier)
  amount: number;
  currency: string;
  status: 'pending' | 'settled' | 'cancelled';
  created_at: string;
  updated_at: string;
  settled_at?: string | null;
  settled_by?: string | null;
  note?: string | null;
  family_group_id?: string;
}
```

### **1.3 Relation entre les Tables**

**Relation:** **1:N (One-to-Many)**

- **1** `family_shared_transaction` peut avoir **N** `reimbursement_requests`
- Chaque `reimbursement_request` référence **1** `family_shared_transaction` via `shared_transaction_id`

**Schéma de relation:**
```
family_shared_transactions (1)
  ├── id
  ├── has_reimbursement_request (boolean flag)
  └── ...
       │
       └── reimbursement_requests (N)
            ├── id
            ├── shared_transaction_id (FK)
            ├── from_member_id (débiteur)
            ├── to_member_id (créancier)
            └── ...
```

**Exemple concret:**
- Transaction partagée: 1000 Ar payés par Alice, partagés entre Alice, Bob, et Charlie (split_equal)
- Résultat: **2** `reimbursement_requests` créés:
  1. `from_member_id: Bob` → `to_member_id: Alice` (montant: 333.33 Ar)
  2. `from_member_id: Charlie` → `to_member_id: Alice` (montant: 333.33 Ar)
- `has_reimbursement_request` sur la transaction partagée = `true`

---

## 2. HAS_REIMBURSEMENT_REQUEST

### **2.1 Définition et Usage**

**Champ:** `has_reimbursement_request` (boolean)  
**Table:** `family_shared_transactions`  
**Type:** `boolean` (dans Supabase)

**⚠️ NOTE:** Ce champ n'est **PAS** dans l'interface TypeScript `FamilySharedTransaction`, mais il existe dans la base de données et est utilisé dans le code.

### **2.2 Quand est-il défini à `false`?**

**Fichier:** `frontend/src/services/familySharingService.ts`  
**Ligne:** 172

**Lors de la création d'une transaction partagée:**
```typescript
const { data: sharedTransaction, error: insertError } = await supabase
  .from('family_shared_transactions')
  .insert({
    family_group_id: input.familyGroupId,
    transaction_id: input.transactionId || null,
    shared_by: user.id,
    paid_by: input.paidBy || user.id,
    is_private: false,
    split_type: input.splitType,
    split_details: input.splitDetails && input.splitDetails.length > 0 
      ? (input.splitDetails as any) // JSONB
      : null,
    has_reimbursement_request: false, // Par défaut, pas de demande de remboursement
  } as any)
  .select()
  .single();
```

**✅ Par défaut:** `has_reimbursement_request = false` lors de la création

### **2.3 Quand est-il défini à `true`?**

**Fichier:** `frontend/src/services/familySharingService.ts`  
**Lignes:** 340-354

**Mise à jour via RPC function:**
```typescript
// If updating hasReimbursementRequest, use the RPC function (bypasses RLS)
if (updatesAny.hasReimbursementRequest !== undefined) {
  const { error: rpcError } = await (supabase.rpc as any)('update_reimbursement_request', {
    p_shared_transaction_id: id,
    p_has_reimbursement_request: updatesAny.hasReimbursementRequest
  });

  if (rpcError) {
    throw new Error(`Erreur lors de la mise à jour: ${rpcError.message}`);
  }
}
```

**Utilisation dans `TransactionDetailPage.tsx` (lignes 339-342):**
```typescript
// If shared and reimbursement request changed
if (hasReimbursementRequest !== initialHasReimbursementRequest) {
  await updateSharedTransaction(sharedTransaction.id, {
    hasReimbursementRequest: hasReimbursementRequest
  } as any);
  toast.success('Demande de remboursement mise à jour');
}
```

**✅ Défini à `true`:** Quand l'utilisateur coche la case "Demander remboursement" dans l'interface

### **2.4 Où est-il lu/utilisé?**

**Fichier:** `frontend/src/pages/FamilyDashboardPage.tsx`  
**Lignes:** 136-146

**Comptage des demandes en attente:**
```typescript
// Calculer les demandes de remboursement en attente depuis les transactions partagées
const { data: rawTransactions, error: rawError } = await supabase
  .from('family_shared_transactions')
  .select(`
    id,
    has_reimbursement_request,
    transactions (
      amount
    )
  `)
  .eq('family_group_id', selectedGroupId)
  .eq('has_reimbursement_request', true);

// Calculer le nombre et le montant total des demandes en attente
const pendingCount = rawTransactions?.length || 0;
const pendingAmount = rawTransactions?.reduce((sum: number, t: any) => {
  const amount = t.transactions?.amount || 0;
  return sum + Math.abs(amount);
}, 0) || 0;
```

**✅ Utilisé pour:** Compter le nombre de transactions avec demande de remboursement (pas le nombre de `reimbursement_requests`)

**Fichier:** `frontend/src/pages/TransactionDetailPage.tsx`  
**Lignes:** 162-177

**Lecture du statut:**
```typescript
// Get has_reimbursement_request from the raw row data
const { data: rawData } = await supabase
  .from('family_shared_transactions')
  .select('has_reimbursement_request')
  .eq('id', shared.id)
  .single();

const reimbursementStatus = (rawData as any)?.has_reimbursement_request || false;
setHasReimbursementRequest(reimbursementStatus);
setInitialHasReimbursementRequest(reimbursementStatus);
```

**✅ Utilisé pour:** Afficher l'état de la checkbox "Demander remboursement"

---

## 3. REIMBURSEMENT CREATION

### **3.1 Fonction de Création**

**Fichier:** `frontend/src/services/reimbursementService.ts`  
**Lignes:** 453-556

**Fonction `createReimbursementRequest`:**
```typescript
export async function createReimbursementRequest(
  data: CreateReimbursementData
): Promise<ReimbursementRequest> {
  // ... vérifications d'authentification et de membership ...
  
  // Créer la demande de remboursement
  const { data: created, error: createError } = await supabase
    .from('reimbursement_requests')
    .insert({
      shared_transaction_id: data.sharedTransactionId,
      from_member_id: data.fromMemberId, // Membre qui doit rembourser (débiteur)
      to_member_id: data.toMemberId,     // Membre qui doit recevoir (créancier)
      amount: data.amount,
      currency: data.currency,
      status: 'pending',
      notes: data.note || null,
      ...(sharedTransaction.family_group_id && {
        family_group_id: sharedTransaction.family_group_id,
      }),
    } as any)
    .select()
    .single();

  return mapRowToReimbursementRequest(created);
}
```

**Interface `CreateReimbursementData`:**
```typescript
export interface CreateReimbursementData {
  sharedTransactionId: string;
  fromMemberId: string; // Membre qui doit rembourser (débiteur)
  toMemberId: string;   // Membre qui doit recevoir (créancier)
  amount: number;
  currency: string;
  note?: string;
}
```

### **3.2 Relation 1:N Confirmée**

**✅ CONFIRMATION:** Une transaction partagée crée **N** `reimbursement_requests`, où **N = nombre de membres qui doivent rembourser**

**Exemple détaillé:**

**Scénario:**
- Transaction: 1000 Ar payés par Alice
- Split: `split_equal` entre Alice, Bob, Charlie, David (4 membres)
- Résultat: Chaque membre doit 250 Ar

**Création des remboursements:**
1. `createReimbursementRequest({ fromMemberId: Bob, toMemberId: Alice, amount: 250 })`
2. `createReimbursementRequest({ fromMemberId: Charlie, toMemberId: Alice, amount: 250 })`
3. `createReimbursementRequest({ fromMemberId: David, toMemberId: Alice, amount: 250 })`

**Résultat:**
- **1** `family_shared_transaction` avec `has_reimbursement_request = true`
- **3** `reimbursement_requests` créés (un par débiteur)

**⚠️ NOTE IMPORTANTE:** Le code actuel ne crée **PAS automatiquement** les `reimbursement_requests` lorsque `has_reimbursement_request` est mis à `true`. La création doit être faite manuellement via `createReimbursementRequest()`.

### **3.3 Processus de Création**

**Étapes observées:**

1. **Création de la transaction partagée:**
   - `shareTransaction()` crée l'entrée dans `family_shared_transactions`
   - `has_reimbursement_request = false` par défaut

2. **Activation de la demande de remboursement:**
   - L'utilisateur coche "Demander remboursement" dans l'UI
   - `updateSharedTransaction()` met à jour `has_reimbursement_request = true` via RPC

3. **Création des remboursements (manuelle):**
   - Pour chaque membre qui doit rembourser:
     - Appel à `createReimbursementRequest()` avec `fromMemberId` et `toMemberId`
     - Création d'une entrée dans `reimbursement_requests`

**⚠️ GAP IDENTIFIÉ:** Il n'y a **pas de code automatique** qui crée les `reimbursement_requests` lorsque `has_reimbursement_request` passe à `true`. La création doit être faite manuellement ou via une fonction batch.

---

## 4. COUNT LOGIC

### **4.1 Logique de Comptage Actuelle**

**Fichier:** `frontend/src/pages/FamilyDashboardPage.tsx`  
**Lignes:** 136-157

**Code actuel:**
```typescript
// Calculer les demandes de remboursement en attente depuis les transactions partagées
const { data: rawTransactions, error: rawError } = await supabase
  .from('family_shared_transactions')
  .select(`
    id,
    has_reimbursement_request,
    transactions (
      amount
    )
  `)
  .eq('family_group_id', selectedGroupId)
  .eq('has_reimbursement_request', true);

// Calculer le nombre et le montant total des demandes en attente
const pendingCount = rawTransactions?.length || 0;
const pendingAmount = rawTransactions?.reduce((sum: number, t: any) => {
  const amount = t.transactions?.amount || 0;
  return sum + Math.abs(amount);
}, 0) || 0;
```

### **4.2 Réponse à la Question**

**Question:** "Si 3 transactions ont `has_reimbursement_request = true`, combien d'entrées `reimbursement_requests` sont créées?"

**Réponse:** **Le comptage actuel compte les TRANSACTIONS, pas les `reimbursement_requests`**

**Exemple:**
- **3 transactions** avec `has_reimbursement_request = true`
- Transaction 1: Split entre 2 membres → **1** `reimbursement_request` créé
- Transaction 2: Split entre 3 membres → **2** `reimbursement_requests` créés
- Transaction 3: Split entre 4 membres → **3** `reimbursement_requests` créés

**Résultat:**
- `pendingCount` = **3** (nombre de transactions avec demande)
- Nombre réel de `reimbursement_requests` = **6** (1 + 2 + 3)

**⚠️ INCOHÉRENCE:** Le comptage actuel ne reflète **PAS** le nombre réel de remboursements en attente, mais seulement le nombre de transactions avec demande de remboursement.

### **4.3 Comptage Correct Suggéré**

**Pour compter le nombre réel de remboursements en attente:**

```typescript
// Option 1: Compter depuis reimbursement_requests
const { data: reimbursementRequests, error: reqError } = await supabase
  .from('reimbursement_requests')
  .select('id, amount, status')
  .eq('status', 'pending')
  .eq('family_group_id', selectedGroupId);

const pendingCount = reimbursementRequests?.length || 0;
const pendingAmount = reimbursementRequests?.reduce((sum, r) => sum + r.amount, 0) || 0;

// Option 2: Utiliser la fonction getPendingReimbursements existante
const reimbursements = await getPendingReimbursements(selectedGroupId);
const pendingCount = reimbursements.length;
const pendingAmount = reimbursements.reduce((sum, r) => sum + r.amount, 0);
```

**✅ RECOMMANDÉ:** Utiliser `getPendingReimbursements()` qui compte depuis `reimbursement_requests` plutôt que depuis `family_shared_transactions`

---

## 5. SUMMARY

### **5.1 Modèle de Données**

**Relation:** **1:N (One-to-Many)**
- **1** `family_shared_transaction` → **N** `reimbursement_requests`
- Chaque `reimbursement_request` référence **1** `family_shared_transaction` via `shared_transaction_id`

**Champ `has_reimbursement_request`:**
- Boolean flag sur `family_shared_transactions`
- Indique si la transaction a des demandes de remboursement
- **NON** dans l'interface TypeScript mais existe dans la DB
- Mis à jour via RPC function `update_reimbursement_request`

### **5.2 Création des Remboursements**

**Processus:**
1. Transaction partagée créée avec `has_reimbursement_request = false`
2. Utilisateur active la demande → `has_reimbursement_request = true` (via RPC)
3. **Création manuelle** des `reimbursement_requests` via `createReimbursementRequest()`
   - **1 appel** = **1** `reimbursement_request` créé
   - **N appels** nécessaires pour **N** membres débiteurs

**⚠️ GAP:** Pas de création automatique des `reimbursement_requests` lorsque `has_reimbursement_request` passe à `true`

### **5.3 Comptage**

**Logique actuelle:**
- Compte les **transactions** avec `has_reimbursement_request = true`
- **NON** le nombre réel de `reimbursement_requests`

**Exemple:**
- 3 transactions avec demande → `pendingCount = 3`
- Mais si ces 3 transactions ont 6 remboursements au total → Le comptage est incorrect

**✅ RECOMMANDATION:** Utiliser `getPendingReimbursements()` pour compter depuis `reimbursement_requests` plutôt que depuis `family_shared_transactions`

### **5.4 Réponse aux Questions**

**Q1: Relation 1:1 ou 1:N?**  
**R:** **1:N** - Une transaction partagée peut avoir plusieurs remboursements (un par membre débiteur)

**Q2: Quand `has_reimbursement_request` est défini à `true`?**  
**R:** Quand l'utilisateur coche "Demander remboursement" dans l'UI, via `updateSharedTransaction()` qui appelle la RPC `update_reimbursement_request`

**Q3: Création de 1 ou N entrées?**  
**R:** **N entrées** - Chaque appel à `createReimbursementRequest()` crée **1** entrée. Pour une transaction avec N débiteurs, il faut **N appels** (ou une fonction batch)

**Q4: Si 3 transactions ont demande, combien de `reimbursement_requests`?**  
**R:** **Dépend du nombre de débiteurs par transaction.** Le comptage actuel retourne **3** (nombre de transactions), mais le nombre réel de `reimbursement_requests` peut être différent (ex: 6 si chaque transaction a 2 débiteurs)

---

**AGENT-3-SHARED-TRANSACTIONS-COMPLETE**

**Résumé:**
- ✅ Relation 1:N identifiée (1 transaction → N remboursements)
- ✅ `has_reimbursement_request` documenté (défini à false par défaut, true via RPC)
- ✅ Création des remboursements documentée (1 appel = 1 entrée)
- ✅ Logique de comptage analysée (compte transactions, pas remboursements)
- ⚠️ Gaps identifiés (pas de création automatique, comptage incorrect)

**FICHIERS ANALYSÉS:** 5+  
**FICHIERS MODIFIÉS:** 0  
**OPÉRATIONS:** Lecture et analyse uniquement



