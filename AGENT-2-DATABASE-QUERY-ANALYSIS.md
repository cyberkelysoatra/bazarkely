# AGENT-2-DATABASE-QUERY-ANALYSIS
**Date:** 2026-01-27  
**Agent:** Agent 2 (Database Query & Service Layer Analysis)  
**Objective:** Analyze database queries to identify discrepancy between Family Dashboard (1083241 Ar, 17 items) and Reimbursements page (948241 Ar, 16 items)

---

## 1. REIMBURSEMENT SERVICE FUNCTIONS

### Function 1: getPendingReimbursements
**File:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 322-456  
**Purpose:** Fetch all pending reimbursement requests for a family group

**Function Signature:**
```typescript
export async function getPendingReimbursements(
  groupId: string
): Promise<ReimbursementWithDetails[]>
```

**Supabase Query Structure:**
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')                    // ✅ Queries reimbursement_requests table
  .select(`
    *,
    from_member:family_members!reimbursement_requests_from_member_id_fkey(...),
    to_member:family_members!reimbursement_requests_to_member_id_fkey(...),
    shared_transaction:family_shared_transactions(
      transaction_id,
      family_group_id,
      has_reimbursement_request,                      // ✅ Checks this flag
      transactions(description, amount, date)
    )
  `)
  .eq('status', 'pending');                           // ✅ CRITICAL: Filters by status = 'pending'
```

**Status Filter:** `status = 'pending'` (line 377)

**Post-Query Filtering (Lines 396-427):**
```typescript
const filteredData = data.filter((item: any) => {
  // 1. Exclude if no shared_transaction
  if (!item.shared_transaction) return false;
  
  // 2. CRITICAL: Exclude if has_reimbursement_request = false
  if (item.shared_transaction?.has_reimbursement_request === false) {
    return false;
  }
  
  // 3. Filter by family_group_id
  const transactionGroupId = item.shared_transaction?.family_group_id;
  if (transactionGroupId === groupId) return true;
  
  // 4. Fallback: check direct family_group_id
  if (item.family_group_id === groupId) return true;
  
  return false;
});
```

**Amount Calculation:**
- Uses `reimbursement_requests.amount` (not transaction amount)
- Returned in `ReimbursementWithDetails` interface

**Used By:**
- `FamilyReimbursementsPage.tsx` (line 73)
- Returns array of reimbursement requests with member names and transaction details

---

### Function 2: getMemberBalances
**File:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 177-314  
**Purpose:** Get member balances including pending reimbursement amounts

**Function Signature:**
```typescript
export async function getMemberBalances(
  groupId: string
): Promise<FamilyMemberBalance[]>
```

**Supabase Query Structure:**

**Step 1: Get balances from view (Lines 206-209):**
```typescript
const { data, error } = await supabase
  .from('family_member_balances')                    // ✅ Uses database view
  .select('*')
  .eq('family_group_id', groupId);
```

**Step 2: Recalculate pending amounts (Lines 228-237):**
```typescript
const { data: reimbursementRequests, error: reimbError } = await supabase
  .from('reimbursement_requests')
  .select(`
    *,
    shared_transaction:family_shared_transactions(
      has_reimbursement_request,                      // ✅ Checks this flag
      family_group_id
    )
  `)
  .eq('status', 'pending');                           // ✅ CRITICAL: Filters by status = 'pending'
```

**Post-Query Filtering (Lines 246-264):**
```typescript
const validReimbursements = (reimbursementRequests || []).filter((rr: any) => {
  if (!rr.shared_transaction) return false;
  
  // CRITICAL: Exclude if has_reimbursement_request = false
  if (rr.shared_transaction?.has_reimbursement_request === false) {
    return false;
  }
  
  // Filter by group
  if (rr.shared_transaction?.family_group_id !== groupId) {
    return false;
  }
  
  return true;
});
```

**Amount Calculation (Lines 269-287):**
- Uses `reimbursement_requests.amount` (not transaction amount)
- Calculates `pendingToReceive` and `pendingToPay` per member
- Sums amounts from `validReimbursements` array

**Status Filter:** `status = 'pending'` (line 237)

**Used By:**
- `FamilyReimbursementsPage.tsx` (line 55)
- `TransactionsPage.tsx` (line 468)

---

### Function 3: getReimbursementsByMember
**File:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 1029-1086  
**Purpose:** Get all reimbursement requests for a specific member (as debtor or creditor)

**Function Signature:**
```typescript
export async function getReimbursementsByMember(
  memberId: string
): Promise<ReimbursementRequest[]>
```

**Supabase Query Structure:**
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')
  .select('*')
  .or(`from_member_id.eq.${memberId},to_member_id.eq.${memberId}`)  // ✅ Filters by member
  .order('created_at', { ascending: false });
```

**Status Filter:** ❌ **NO STATUS FILTER** - Returns ALL statuses (pending, settled, cancelled)

**Used By:** Not directly used in Dashboard or Reimbursements page

---

## 2. FAMILY SHARING SERVICE FUNCTIONS

### Function: getFamilySharedTransactions
**File:** `frontend/src/services/familySharingService.ts`  
**Lines:** 765-897  
**Purpose:** Get all shared transactions for a family group

**Function Signature:**
```typescript
export async function getFamilySharedTransactions(
  groupId: string,
  options?: GetSharedTransactionsOptions
): Promise<FamilySharedTransaction[]>
```

**Supabase Query Structure:**
```typescript
let query = supabase
  .from('family_shared_transactions')
  .select(`
    *,
    transactions (id, description, amount, category, date, type)
  `)
  .eq('family_group_id', groupId);                   // ✅ Filters by group
```

**Status Filter:** ❌ **NO REIMBURSEMENT STATUS FILTER** - Returns all shared transactions regardless of reimbursement status

**Used By:**
- `FamilyDashboardPage.tsx` (line 158) - Gets all shared transactions

---

## 3. STATUS FILTER COMPARISON

### Dashboard Calculation (FamilyDashboardPage.tsx)

**Location:** Lines 250-266

**Query:**
```typescript
const { data: rawTransactions } = await supabase
  .from('family_shared_transactions')                // ❌ Queries shared transactions, NOT reimbursement_requests
  .select(`
    id,
    has_reimbursement_request,
    transactions (amount)
  `)
  .eq('family_group_id', selectedGroupId)
  .eq('has_reimbursement_request', true);           // ✅ Filters by flag only
```

**Status Filter:** ❌ **NO STATUS FILTER ON reimbursement_requests**

**Count Calculation:**
```typescript
const pendingCount = rawTransactions?.length || 0;    // ✅ Counts transactions with flag = true
```

**Amount Calculation:**
```typescript
const pendingAmount = rawTransactions?.reduce((sum: number, t: any) => {
  const amount = t.transactions?.amount || 0;         // ❌ Uses TRANSACTION amount, not reimbursement amount
  return sum + Math.abs(amount);
}, 0) || 0;
```

**What Dashboard Counts:**
- ✅ Transactions where `has_reimbursement_request = true`
- ❌ **Does NOT check if reimbursement_request exists**
- ❌ **Does NOT check if reimbursement_request.status = 'pending'**
- ❌ **Uses transaction amount, not reimbursement amount**

---

### Reimbursements Page Calculation (getPendingReimbursements)

**Location:** `reimbursementService.ts` lines 322-456

**Query:**
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')                    // ✅ Queries reimbursement_requests table
  .select(`...`)
  .eq('status', 'pending');                          // ✅ CRITICAL: Filters by status = 'pending'
```

**Post-Filter:**
```typescript
// Exclude if has_reimbursement_request = false
if (item.shared_transaction?.has_reimbursement_request === false) {
  return false;
}
```

**What Reimbursements Page Counts:**
- ✅ Reimbursement requests where `status = 'pending'`
- ✅ AND `has_reimbursement_request = true`
- ✅ AND `family_group_id = groupId`
- ✅ Uses `reimbursement_requests.amount` (not transaction amount)

---

### Status Filter Comparison Table

| Aspect | Dashboard | Reimbursements Page |
|--------|-----------|-------------------|
| **Table Queried** | `family_shared_transactions` | `reimbursement_requests` |
| **Status Filter** | ❌ None | ✅ `status = 'pending'` |
| **has_reimbursement_request Filter** | ✅ `= true` | ✅ `= true` (post-filter) |
| **Counts** | Transactions with flag | Reimbursement requests with status |
| **Amount Source** | `transactions.amount` | `reimbursement_requests.amount` |
| **Includes Settled?** | ✅ Yes (if flag = true) | ❌ No |
| **Includes Missing Requests?** | ✅ Yes (if flag = true) | ❌ No |

---

## 4. MISSING TRANSACTION HYPOTHESIS

### Hypothesis 1: Transaction with has_reimbursement_request = true but NO reimbursement_request row

**Scenario:**
- `family_shared_transactions.has_reimbursement_request = true`
- No corresponding row in `reimbursement_requests` table
- **Dashboard:** ✅ Counts this transaction (17 items)
- **Reimbursements:** ❌ Does NOT count (16 items)
- **Difference:** 1 transaction = 135000 Ar

**Possible Causes:**
1. Toggle was enabled but reimbursement_request creation failed
2. Reimbursement_request was deleted but flag not reset
3. Race condition during toggle operation
4. Database constraint violation prevented insert

**SQL Query to Verify:**
```sql
SELECT 
  fst.id,
  fst.family_group_id,
  fst.has_reimbursement_request,
  t.amount,
  COUNT(rr.id) as reimbursement_count
FROM family_shared_transactions fst
LEFT JOIN transactions t ON t.id = fst.transaction_id
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
GROUP BY fst.id, fst.family_group_id, fst.has_reimbursement_request, t.amount
HAVING COUNT(rr.id) = 0;
```

---

### Hypothesis 2: Transaction with has_reimbursement_request = true but status = 'settled'

**Scenario:**
- `family_shared_transactions.has_reimbursement_request = true`
- `reimbursement_requests.status = 'settled'` (not 'pending')
- **Dashboard:** ✅ Counts this transaction (17 items)
- **Reimbursements:** ❌ Does NOT count (16 items - filters by status = 'pending')
- **Difference:** 1 transaction = 135000 Ar

**Possible Causes:**
1. Reimbursement was marked as settled but flag not reset
2. Flag was re-enabled after settlement
3. Data inconsistency

**SQL Query to Verify:**
```sql
SELECT 
  fst.id,
  fst.family_group_id,
  fst.has_reimbursement_request,
  rr.status,
  rr.amount,
  t.amount as transaction_amount
FROM family_shared_transactions fst
JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
  AND rr.status != 'pending';
```

---

### Hypothesis 3: Transaction with different family_group_id

**Scenario:**
- Transaction belongs to different family group
- **Dashboard:** May incorrectly count if group filter fails
- **Reimbursements:** Should filter correctly

**SQL Query to Verify:**
```sql
SELECT 
  fst.id,
  fst.family_group_id,
  rr.family_group_id as rr_group_id,
  rr.status
FROM family_shared_transactions fst
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
WHERE fst.has_reimbursement_request = true
  AND (fst.family_group_id != rr.family_group_id OR rr.family_group_id IS NULL);
```

---

### Hypothesis 4: Transaction with missing owed_to_member_id or orphaned reference

**Scenario:**
- `reimbursement_requests.to_member_id` is NULL or invalid
- `reimbursement_requests.from_member_id` is NULL or invalid
- **Dashboard:** Counts transaction amount
- **Reimbursements:** May exclude due to missing member references

**SQL Query to Verify:**
```sql
SELECT 
  rr.id,
  rr.shared_transaction_id,
  rr.from_member_id,
  rr.to_member_id,
  rr.status,
  rr.amount
FROM reimbursement_requests rr
JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
WHERE fst.family_group_id = '<groupId>'
  AND rr.status = 'pending'
  AND (rr.from_member_id IS NULL OR rr.to_member_id IS NULL);
```

---

### Hypothesis 5: Amount Mismatch (Transaction Amount vs Reimbursement Amount)

**Scenario:**
- Transaction amount: 135000 Ar
- Reimbursement amount: Different (e.g., 0 Ar, or percentage-based)
- **Dashboard:** Uses `transactions.amount` = 135000 Ar
- **Reimbursements:** Uses `reimbursement_requests.amount` = Different value
- **Difference:** 135000 Ar

**SQL Query to Verify:**
```sql
SELECT 
  fst.id,
  t.amount as transaction_amount,
  rr.amount as reimbursement_amount,
  (t.amount - rr.amount) as difference,
  rr.status
FROM family_shared_transactions fst
JOIN transactions t ON t.id = fst.transaction_id
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
  AND ABS(COALESCE(t.amount, 0) - COALESCE(rr.amount, 0)) > 0;
```

---

## 5. SQL QUERY SAMPLES

### Dashboard Query (Reconstructed from Code)

**File:** `FamilyDashboardPage.tsx` lines 250-266

**Actual Query:**
```sql
SELECT 
  fst.id,
  fst.has_reimbursement_request,
  t.amount
FROM family_shared_transactions fst
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true;
```

**What It Counts:**
- All transactions with `has_reimbursement_request = true`
- **Does NOT check:** `reimbursement_requests.status`
- **Does NOT check:** Existence of `reimbursement_requests` row
- **Uses:** `transactions.amount` for sum

**Count:** 17 transactions  
**Amount:** 1083241 Ar (sum of transaction amounts)

---

### Reimbursements Query (Reconstructed from Code)

**File:** `reimbursementService.ts` lines 352-456

**Actual Query:**
```sql
SELECT 
  rr.*,
  fm_from.display_name as from_member_name,
  fm_to.display_name as to_member_name,
  fst.family_group_id,
  fst.has_reimbursement_request,
  t.description,
  t.amount as transaction_amount,
  t.date
FROM reimbursement_requests rr
LEFT JOIN family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN family_members fm_to ON fm_to.id = rr.to_member_id
JOIN family_shared_transactions fst ON fst.id = rr.shared_transaction_id
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE rr.status = 'pending'                          -- ✅ CRITICAL FILTER
  AND fst.has_reimbursement_request = true           -- ✅ Post-filter in code
  AND fst.family_group_id = '<groupId>';             -- ✅ Post-filter in code
```

**What It Counts:**
- Reimbursement requests where `status = 'pending'`
- AND `has_reimbursement_request = true`
- AND `family_group_id = groupId`
- **Uses:** `reimbursement_requests.amount` for sum

**Count:** 16 reimbursement requests  
**Amount:** 948241 Ar (sum of reimbursement amounts)

---

### Query Differences Summary

| Aspect | Dashboard Query | Reimbursements Query |
|--------|----------------|---------------------|
| **Primary Table** | `family_shared_transactions` | `reimbursement_requests` |
| **JOIN** | `LEFT JOIN transactions` | `JOIN reimbursement_requests` |
| **WHERE Clause** | `has_reimbursement_request = true` | `status = 'pending'` |
| **Post-Filter** | None | `has_reimbursement_request = true` |
| **Amount Field** | `transactions.amount` | `reimbursement_requests.amount` |
| **Includes Settled** | ✅ Yes | ❌ No |
| **Includes Missing Requests** | ✅ Yes | ❌ No |

---

## 6. ROOT CAUSE ANALYSIS

### Primary Root Cause

**Dashboard and Reimbursements use DIFFERENT data sources:**

1. **Dashboard:**
   - Queries `family_shared_transactions` table
   - Filters by `has_reimbursement_request = true` flag only
   - **Does NOT check** `reimbursement_requests.status`
   - **Does NOT verify** existence of `reimbursement_requests` row
   - Uses `transactions.amount` for calculation

2. **Reimbursements:**
   - Queries `reimbursement_requests` table
   - Filters by `status = 'pending'` (CRITICAL)
   - Post-filters by `has_reimbursement_request = true`
   - Uses `reimbursement_requests.amount` for calculation

### Discrepancy Explanation

**135000 Ar difference = 1 transaction**

**Most Likely Scenario:**
- Transaction has `has_reimbursement_request = true`
- BUT either:
  - No `reimbursement_requests` row exists, OR
  - `reimbursement_requests.status != 'pending'` (e.g., 'settled' or 'cancelled')

**Dashboard counts it because:**
- It only checks the flag, not the actual reimbursement request status

**Reimbursements doesn't count it because:**
- It requires `status = 'pending'` AND flag = true

### Amount Difference Explanation

**1083241 Ar (Dashboard) vs 948241 Ar (Reimbursements) = 135000 Ar**

**Possible Causes:**
1. **Transaction amount vs Reimbursement amount:**
   - Dashboard uses `transactions.amount` = 135000 Ar
   - Reimbursement may have different amount (percentage-based, custom rate)
   - If reimbursement amount = 0 or missing → Dashboard counts 135000, Reimbursements counts 0

2. **Missing reimbursement_request:**
   - Transaction has flag = true but no reimbursement_request row
   - Dashboard counts transaction amount (135000 Ar)
   - Reimbursements doesn't count it (0 Ar)
   - Difference = 135000 Ar

---

## 7. RECOMMENDED FIX

### Option 1: Align Dashboard with Reimbursements (RECOMMENDED)

**Modify Dashboard to use same logic as Reimbursements:**

```typescript
// Instead of querying family_shared_transactions
// Query reimbursement_requests with status = 'pending'

const { data: pendingReimbursements } = await getPendingReimbursements(selectedGroupId);

const pendingCount = pendingReimbursements.length;
const pendingAmount = pendingReimbursements.reduce((sum, r) => sum + (r.amount || 0), 0);
```

**Benefits:**
- ✅ Consistent logic between Dashboard and Reimbursements
- ✅ Only counts actual pending reimbursement requests
- ✅ Uses reimbursement amount (not transaction amount)
- ✅ Excludes settled/cancelled requests

---

### Option 2: Reset has_reimbursement_request flag when status changes

**Add trigger or application logic:**
- When `reimbursement_requests.status` changes to 'settled' or 'cancelled'
- Set `family_shared_transactions.has_reimbursement_request = false`

**Benefits:**
- ✅ Flag reflects actual state
- ✅ Dashboard query becomes accurate
- ⚠️ Requires database trigger or application logic

---

### Option 3: Dashboard uses getPendingReimbursements service

**Replace direct query with service call:**

```typescript
// Current (WRONG):
const { data: rawTransactions } = await supabase
  .from('family_shared_transactions')
  .select(`...`)
  .eq('has_reimbursement_request', true);

// Fixed (CORRECT):
const pendingReimbursements = await getPendingReimbursements(selectedGroupId);
const pendingCount = pendingReimbursements.length;
const pendingAmount = pendingReimbursements.reduce((sum, r) => sum + (r.amount || 0), 0);
```

**Benefits:**
- ✅ Single source of truth (service function)
- ✅ Consistent filtering logic
- ✅ Easier to maintain

---

## 8. VERIFICATION QUERIES

### Query 1: Find transactions with flag but no reimbursement_request

```sql
SELECT 
  fst.id as shared_transaction_id,
  fst.family_group_id,
  fst.has_reimbursement_request,
  t.amount as transaction_amount,
  COUNT(rr.id) as reimbursement_count
FROM family_shared_transactions fst
LEFT JOIN transactions t ON t.id = fst.transaction_id
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
GROUP BY fst.id, fst.family_group_id, fst.has_reimbursement_request, t.amount
HAVING COUNT(rr.id) = 0;
```

**Expected Result:** Should find the 1 transaction causing discrepancy

---

### Query 2: Find transactions with flag but status != 'pending'

```sql
SELECT 
  fst.id as shared_transaction_id,
  fst.family_group_id,
  fst.has_reimbursement_request,
  rr.status,
  rr.amount as reimbursement_amount,
  t.amount as transaction_amount,
  (t.amount - COALESCE(rr.amount, 0)) as difference
FROM family_shared_transactions fst
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
LEFT JOIN transactions t ON t.id = fst.transaction_id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
  AND (rr.status IS NULL OR rr.status != 'pending');
```

**Expected Result:** Should find transactions with flag but non-pending status

---

### Query 3: Compare amounts (transaction vs reimbursement)

```sql
SELECT 
  fst.id as shared_transaction_id,
  t.amount as transaction_amount,
  rr.amount as reimbursement_amount,
  (t.amount - COALESCE(rr.amount, 0)) as difference,
  rr.status
FROM family_shared_transactions fst
JOIN transactions t ON t.id = fst.transaction_id
LEFT JOIN reimbursement_requests rr ON rr.shared_transaction_id = fst.id
WHERE fst.family_group_id = '<groupId>'
  AND fst.has_reimbursement_request = true
  AND ABS(COALESCE(t.amount, 0) - COALESCE(rr.amount, 0)) > 0
ORDER BY ABS(COALESCE(t.amount, 0) - COALESCE(rr.amount, 0)) DESC;
```

**Expected Result:** Should find transactions where amounts differ (especially 135000 Ar)

---

## 9. SUMMARY

### Reimbursement Service Functions ✅ DOCUMENTED
- **getPendingReimbursements:** Queries `reimbursement_requests` with `status = 'pending'`
- **getMemberBalances:** Uses same logic, recalculates pending amounts
- **getReimbursementsByMember:** No status filter (returns all statuses)

### Family Sharing Service Functions ✅ DOCUMENTED
- **getFamilySharedTransactions:** No reimbursement status filter
- Returns all shared transactions regardless of reimbursement state

### Status Filter Comparison ✅ IDENTIFIED
- **Dashboard:** ❌ No status filter - counts transactions with flag = true
- **Reimbursements:** ✅ Filters by `status = 'pending'`
- **Critical Difference:** Dashboard includes settled/missing requests

### Missing Transaction Hypothesis ✅ PROVIDED
1. Transaction with flag = true but NO reimbursement_request row
2. Transaction with flag = true but status = 'settled'
3. Transaction with different family_group_id
4. Transaction with missing member references
5. Amount mismatch (transaction amount vs reimbursement amount)

### SQL Query Samples ✅ RECONSTRUCTED
- Dashboard query: `family_shared_transactions` with flag filter only
- Reimbursements query: `reimbursement_requests` with status = 'pending'
- Key difference: Dashboard doesn't check reimbursement status

### Root Cause ✅ IDENTIFIED

**Primary Issue:**
- Dashboard queries `family_shared_transactions` and counts transactions with `has_reimbursement_request = true`
- Reimbursements queries `reimbursement_requests` and counts only `status = 'pending'`
- **Result:** Dashboard counts 17 items (includes settled/missing), Reimbursements counts 16 items (only pending)

**135000 Ar Difference:**
- Likely 1 transaction with flag = true but:
  - No reimbursement_request row exists, OR
  - reimbursement_request.status != 'pending'
- Dashboard counts transaction amount (135000 Ar)
- Reimbursements doesn't count it (0 Ar)
- Difference = 135000 Ar

**Recommended Fix:**
- Modify Dashboard to use `getPendingReimbursements()` service function
- Ensures consistent logic and accurate counts

---

**AGENT-2-DATABASE-QUERY-COMPLETE**
