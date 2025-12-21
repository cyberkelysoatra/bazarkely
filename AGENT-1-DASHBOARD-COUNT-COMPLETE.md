# AGENT-1 - DASHBOARD COUNT INVESTIGATION REPORT
## Family Dashboard "3 demandes" Count Analysis

**Date:** 2025-01-19  
**Agent:** AGENT01 - FRONTEND/PAGE  
**Issue:** Dashboard shows "3 demandes" but reimbursement_requests has 12 pending entries

---

## 1. FILE AND LINE

**File:** `frontend/src/pages/FamilyDashboardPage.tsx`  
**Display Location:** Lines 467-482

**Code snippet:**
```typescript
{/* Demandes en attente */}
<button
  onClick={() => navigate('/family/reimbursements')}
  className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 hover:shadow-lg transition-shadow cursor-pointer"
>
  <div className="flex items-center justify-between">
    <div>
      <p className="text-xs text-gray-600 mb-1">En attente</p>
      <p className="text-lg font-bold text-gray-900">
        {stats.pendingAmount.toLocaleString('fr-FR')} {currencySymbol}
      </p>
      {stats.pendingRequestsCount > 0 && (
        <p className="text-xs text-gray-500 mt-0.5">
          {stats.pendingRequestsCount} demande{stats.pendingRequestsCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
    <Clock className="w-8 h-8 text-yellow-600" />
  </div>
</button>
```

---

## 2. VARIABLE NAME

**Variable:** `stats.pendingRequestsCount`  
**State Definition:** Line 42 in `stats` state object  
**Type:** `number`

**State initialization:**
```typescript
const [stats, setStats] = useState({
  totalExpensesThisMonth: 0,
  memberCount: 0,
  pendingRequestsCount: 0,  // ← This variable
  pendingAmount: 0,
  netBalance: 0
});
```

---

## 3. CALCULATION CODE

**Location:** `frontend/src/pages/FamilyDashboardPage.tsx` lines 134-168

**Exact calculation code:**
```typescript
// Calculer les demandes de remboursement en attente depuis les transactions partagées
// Le montant est dans la table transactions liée
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

if (rawError) {
  console.error('Erreur lors de la récupération des transactions avec demande:', rawError);
}

// Calculer le nombre et le montant total des demandes en attente
const pendingCount = rawTransactions?.length || 0;
const pendingAmount = rawTransactions?.reduce((sum: number, t: any) => {
  const amount = t.transactions?.amount || 0;
  return sum + Math.abs(amount);
}, 0) || 0;

// ... other calculations ...

setStats({
  totalExpensesThisMonth: totalExpenses,
  memberCount: groupMembers.length,
  pendingRequestsCount: pendingCount,  // ← Set here
  pendingAmount: pendingAmount,
  netBalance
});
```

**Key calculation:**
```typescript
const pendingCount = rawTransactions?.length || 0;
```

This counts the **number of rows** returned from the query, which is the number of `family_shared_transactions` with `has_reimbursement_request = true`.

---

## 4. DATA SOURCE

### Table Used:
**`family_shared_transactions`** (NOT `reimbursement_requests`)

### Query Details:
```typescript
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
```

### What It Counts:
- **Counts:** Number of `family_shared_transactions` rows where `has_reimbursement_request = true`
- **Does NOT count:** Number of entries in `reimbursement_requests` table

---

## 5. ROOT CAUSE OF DISCREPANCY

### Why Dashboard Shows 3 but reimbursement_requests Has 12:

**Dashboard Logic:**
- Counts `family_shared_transactions` with `has_reimbursement_request = true`
- Result: **3 transactions** have the flag set

**Reimbursement Requests Table:**
- Contains **12 entries** with `status = 'pending'`
- These are actual reimbursement request records

### The Mismatch:

**Scenario:** One `family_shared_transaction` can have **multiple** `reimbursement_requests` entries.

For example:
- Transaction A: 1 reimbursement request → Dashboard counts 1
- Transaction B: 4 reimbursement requests → Dashboard counts 1 (not 4)
- Transaction C: 7 reimbursement requests → Dashboard counts 1 (not 7)
- **Total:** Dashboard = 3 transactions, reimbursement_requests = 12 entries

**OR:**

**Scenario:** Some transactions have `has_reimbursement_request = true` but no actual `reimbursement_requests` entry:
- 3 transactions have flag = true
- But only some of them have corresponding `reimbursement_requests` entries
- Dashboard counts the flags, not the actual requests

---

## 6. SUMMARY

| Component | Value | Source |
|-----------|-------|--------|
| **Dashboard Count** | 3 | `family_shared_transactions` with `has_reimbursement_request = true` |
| **Reimbursement Requests** | 12 | `reimbursement_requests` table with `status = 'pending'` |
| **Calculation Method** | `rawTransactions?.length` | Counts rows from query |
| **Query Table** | `family_shared_transactions` | NOT `reimbursement_requests` |

**Key Finding:**
The dashboard counts **transactions with the flag**, not **actual reimbursement request entries**. This explains why:
- Dashboard: 3 demandes (3 transactions with flag)
- reimbursement_requests: 12 entries (actual request records)

**The discrepancy is expected** if:
1. Multiple reimbursement requests exist per transaction, OR
2. Some transactions have the flag but no request entry, OR
3. Some requests exist without the flag being set

---

**AGENT-1-DASHBOARD-COUNT-COMPLETE**








