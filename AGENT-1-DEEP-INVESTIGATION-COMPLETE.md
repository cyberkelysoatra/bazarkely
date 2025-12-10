# AGENT-1 - DEEP INVESTIGATION REPORT
## FamilyReimbursementsPage Data Source Analysis

**Date:** 2025-01-19  
**Agent:** AGENT01 - FRONTEND/PAGE  
**Issue:** Page shows 6+6 transactions instead of 3 matching dashboard count

---

## 1. DATA SOURCE IDENTIFIED

### Exact Function Called:

**File:** `frontend/src/pages/FamilyReimbursementsPage.tsx`  
**Line 63:**
```typescript
const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
setPendingReimbursements(reimbursements);
```

**Function:** `getPendingReimbursements(groupId: string)`  
**Location:** `frontend/src/services/reimbursementService.ts` lines 218-332

### Data Flow:

1. **Component Mount:** `useEffect` (line 74-76) calls `loadData()`
2. **loadData():** Line 63 calls `getPendingReimbursements(activeFamilyGroup.id)`
3. **Service Function:** Queries `reimbursement_requests` table
4. **State Update:** Line 64 sets `pendingReimbursements` state
5. **Filtering:** Lines 85-91 filter by `currentMemberId`

**No other data sources found:**
- ✅ No direct Supabase queries in the page
- ✅ No useFamily context providing transactions
- ✅ No other hooks fetching data
- ✅ Only `getPendingReimbursements` is used

---

## 2. ACTUAL QUERY

### Supabase Query in `getPendingReimbursements`:

**File:** `frontend/src/services/reimbursementService.ts` lines 248-272

```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')  // ✅ Correct table
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
  .eq('status', 'pending');  // ✅ Filters by status
```

**Key Observations:**
- ✅ Query selects from `reimbursement_requests` (correct table)
- ✅ Filters by `status = 'pending'` (correct)
- ❌ **NO direct filter on `family_group_id` in WHERE clause**
- ⚠️ **JOIN with `family_shared_transactions` uses implicit foreign key**

### Foreign Key Issue:

The JOIN `shared_transaction:family_shared_transactions(...)` relies on an implicit foreign key relationship. Supabase infers this from:
- `reimbursement_requests.shared_transaction_id` → `family_shared_transactions.id`

**Potential Problem:** If the foreign key relationship is not properly defined or if `shared_transaction_id` points to multiple records, Supabase might return an array instead of a single object.

---

## 3. WHY FILTER FAILED

### Previous Fix Applied:

**File:** `frontend/src/services/reimbursementService.ts` lines 288-313

The filter was improved to use `shared_transaction.family_group_id` as the primary source:

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
```

### Why It Still Doesn't Work:

**HYPOTHESIS 1: Supabase Returns Array for JOIN**

If `shared_transaction` is returned as an **array** instead of a single object, then:
- `item.shared_transaction?.family_group_id` would be `undefined`
- The filter would fail and fall back to `directGroupId`
- If `directGroupId` is missing or incorrect, items from other groups pass through

**HYPOTHESIS 2: Multiple Reimbursement Requests Per Transaction**

If one `family_shared_transaction` has **multiple** `reimbursement_requests` entries:
- The JOIN might create duplicate rows
- Each reimbursement request would appear separately
- If 3 transactions have 2 reimbursement requests each = 6 items

**HYPOTHESIS 3: Foreign Key Points to Wrong Table**

If `reimbursement_requests.shared_transaction_id` doesn't properly reference `family_shared_transactions.id`:
- The JOIN might fail or return incorrect data
- Multiple transactions might be joined incorrectly

---

## 4. ROOT CAUSE

### Most Likely Cause: **JOIN Returns Array or Multiple Results**

**Evidence:**
1. Dashboard shows "3 demandes" (counts `family_shared_transactions` with `has_reimbursement_request=true`)
2. Page shows 6+6 transactions (counts `reimbursement_requests` entries)
3. If one transaction has 2 reimbursement requests (e.g., split between 2 members), it would appear twice

**The Real Issue:**

The query structure suggests that:
- `reimbursement_requests` table has entries that reference `family_shared_transactions`
- But the JOIN might be returning **multiple reimbursement_requests per transaction**
- OR the JOIN is returning **multiple transactions per reimbursement_request**

**Code Evidence:**

Line 321-322 handles array case:
```typescript
const transaction = item.shared_transaction?.transactions;
const transactionData = Array.isArray(transaction) ? transaction[0] : transaction;
```

This suggests the developers **expected** arrays, but the filter at line 297 doesn't handle the case where `shared_transaction` itself is an array.

---

## 5. CORRECT FIX

### Fix Required in `reimbursementService.ts`:

**Problem:** The filter assumes `item.shared_transaction` is a single object, but Supabase might return an array.

**Solution 1: Handle Array Case in Filter**

```typescript
const filteredData = data.filter((item: any) => {
  // Handle case where shared_transaction is an array
  const sharedTransaction = Array.isArray(item.shared_transaction) 
    ? item.shared_transaction[0] 
    : item.shared_transaction;
  
  if (!sharedTransaction) {
    return false;
  }
  
  const transactionGroupId = sharedTransaction.family_group_id;
  
  if (transactionGroupId === groupId) {
    return true;
  }
  
  const directGroupId = item.family_group_id;
  if (directGroupId === groupId) {
    return true;
  }
  
  return false;
});
```

**Solution 2: Filter at Database Level (Better)**

Add explicit foreign key in the JOIN and filter by group:

```typescript
shared_transaction:family_shared_transactions!reimbursement_requests_shared_transaction_id_fkey(
  transaction_id,
  family_group_id,
  transactions(...)
)
```

Then add filter in WHERE clause if possible, or ensure the JOIN only returns one-to-one relationships.

**Solution 3: Verify Data Structure**

Add logging to see actual structure:
```typescript
console.log('Sample item:', JSON.stringify(data[0], null, 2));
console.log('shared_transaction type:', Array.isArray(data[0]?.shared_transaction) ? 'array' : 'object');
```

---

## 6. ADDITIONAL INVESTIGATION NEEDED

### Questions to Answer:

1. **Is `shared_transaction` an array or object?**
   - Check actual data returned from Supabase
   - Add console.log in service function

2. **How many `reimbursement_requests` exist per `family_shared_transaction`?**
   - Query: `SELECT shared_transaction_id, COUNT(*) FROM reimbursement_requests WHERE status='pending' GROUP BY shared_transaction_id`
   - If count > 1, that explains duplicates

3. **Is the foreign key relationship correct?**
   - Verify: `reimbursement_requests.shared_transaction_id` → `family_shared_transactions.id`
   - Check if foreign key constraint exists in database

4. **Are there reimbursement_requests from other groups?**
   - Query: Check if `reimbursement_requests` has entries with different `family_group_id` values
   - Or if `shared_transaction.family_group_id` points to different groups

---

## SUMMARY

| Component | Status | Finding |
|-----------|--------|---------|
| Data source | ✅ Correct | Uses `getPendingReimbursements` from `reimbursement_requests` |
| Query table | ✅ Correct | `reimbursement_requests` with `status='pending'` |
| Group filter | ⚠️ **SUSPECT** | Filter assumes `shared_transaction` is object, might be array |
| JOIN structure | ⚠️ **SUSPECT** | Implicit foreign key might return multiple results |
| Page filtering | ✅ Correct | Filters by `currentMemberId` correctly |

**Root Cause Hypothesis:**
The JOIN with `family_shared_transactions` might be returning an array or multiple results, causing the filter to fail. Alternatively, multiple `reimbursement_requests` entries exist for the same transaction, creating duplicates.

**Next Steps:**
1. Add logging to verify data structure
2. Check if `shared_transaction` is array or object
3. Verify foreign key relationship
4. Count reimbursement_requests per transaction
5. Apply fix based on findings

---

**AGENT-1-DEEP-INVESTIGATION-COMPLETE**


