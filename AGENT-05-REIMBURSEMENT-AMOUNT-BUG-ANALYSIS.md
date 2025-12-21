# AGENT-05 - REIMBURSEMENT AMOUNT BUG ANALYSIS

**Date:** 2025-01-19  
**Investigator:** AGENT-05  
**Bug:** User created transaction of 10,000 Ar, requested 100% reimbursement, but FamilyReimbursementsPage shows only 5,000 Ar (50% instead of 100%)

**Status:** ✅ **ROOT CAUSE IDENTIFIED**

---

## 1. CREATION FLOW: How amount is calculated when creating request

### Flow Analysis

**File:** `frontend/src/services/familySharingService.ts`  
**Function:** `updateSharedTransaction` (toggle reimbursement)  
**Lines:** 450-478

```typescript
// Line 451: Get transaction amount
const transactionAmount = Math.abs(((sharedTx as any).transactions as any)?.amount || 0);

// Line 454-466: Calculate rate (default 100% = 1.0)
let rate = 1.0; // Default 100%
if (updatesAny.customReimbursementRate !== undefined && updatesAny.customReimbursementRate !== null) {
  rate = Math.min(100, Math.max(1, updatesAny.customReimbursementRate)) / 100;
} else {
  const defaultRate = groupId ? localStorage.getItem(`bazarkely_family_${groupId}_reimbursement_rate`) : null;
  rate = defaultRate ? parseInt(defaultRate, 10) / 100 : 1.0; // Default 100%
}

// Line 468: Calculate reimbursement amount
let reimbursementAmount = transactionAmount * rate; // Use configured rate

// Line 471-478: OVERRIDE with split_details if exists
if ((sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
  const debtorSplit = ((sharedTx as any).split_details as any[]).find(
    (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
  );
  if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
    reimbursementAmount = Math.abs(debtorSplit.amount); // ⚠️ BUG LOCATION
  }
}
```

**File:** `frontend/src/pages/TransactionsPage.tsx`  
**Function:** `handleRequestReimbursement`  
**Lines:** 480-484

```typescript
.map(split => createReimbursementRequest({
  sharedTransactionId: sharedTransaction.id,
  fromMemberId: split.memberId,
  toMemberId: creditorMember.memberId,
  amount: Math.abs(split.amount), // ⚠️ Uses split.amount directly
  currency: 'MGA',
  note: `Remboursement pour: ${sharedTransaction.description || 'Transaction partagée'}`,
}));
```

### Key Finding: split_details Calculation

**Problem:** When a transaction is shared with `splitType: 'paid_by_one'`, the `splitDetails` array is **empty** (line 383 in TransactionsPage.tsx):

```typescript
splitDetails: [], // Empty for paid_by_one
```

However, when the reimbursement toggle is activated in `familySharingService.ts`, the code checks for `split_details` and uses `debtorSplit.amount` if it exists. 

**CRITICAL ISSUE:** If `split_details` is populated later (possibly by another process or default calculation), and it contains amounts that are **half of the transaction amount** (e.g., 5,000 for a 10,000 transaction), then the reimbursement amount will be incorrectly set to 5,000 instead of 10,000.

---

## 2. STORAGE: What value is stored in database

**File:** `frontend/src/services/reimbursementService.ts`  
**Function:** `createReimbursementRequest`  
**Lines:** 839-855

```typescript
const { data: created, error: createError } = await supabase
  .from('reimbursement_requests')
  .insert({
    shared_transaction_id: data.sharedTransactionId,
    from_member_id: data.fromMemberId,
    to_member_id: data.toMemberId,
    amount: data.amount, // ⚠️ Directly uses data.amount from parameter
    currency: data.currency,
    status: 'pending',
    notes: data.note || null,
    // ...
  } as any)
  .select()
  .single();
```

**Storage:** The `amount` field in `reimbursement_requests` table stores **exactly** what is passed in `data.amount`.

**If the bug occurs:**
- Transaction amount: 10,000 Ar
- User requests: 100% reimbursement
- **Stored in DB:** 5,000 Ar (incorrect)
- **Expected in DB:** 10,000 Ar

---

## 3. DISPLAY FLOW: How amount is displayed in FamilyReimbursementsPage

**File:** `frontend/src/pages/FamilyReimbursementsPage.tsx`  
**Lines:** 346-354 (for "On me doit") and 407-415 (for "Je dois")

```typescript
<div className="text-lg font-bold text-green-600 mb-1">
  <CurrencyDisplay
    amount={reimbursement.amount} // ⚠️ Directly displays reimbursement.amount
    originalCurrency={reimbursement.currency || 'MGA'}
    displayCurrency={displayCurrency}
    showConversion={true}
    size="md"
  />
</div>
```

**Display:** The page displays `reimbursement.amount` **directly** without any transformation.

**File:** `frontend/src/services/reimbursementService.ts`  
**Function:** `getPendingReimbursements`  
**Lines:** 419-440

```typescript
return filteredData.map((item: any) => {
  const baseRequest = mapRowToReimbursementRequest(item);
  
  return {
    ...baseRequest,
    fromMemberName: item.from_member?.display_name || 'Membre inconnu',
    toMemberName: item.to_member?.display_name || 'Membre inconnu',
    transactionDescription: transactionData?.description || null,
    transactionAmount: transactionData?.amount || null, // ⚠️ Original transaction amount
    transactionDate: transactionData?.date ? new Date(transactionData.date) : null,
    reimbursementRate: item.percentage ?? 100, // ⚠️ Note: percentage field may not exist
  };
});
```

**Key Observation:** 
- `reimbursement.amount` is displayed (the stored amount in DB)
- `transactionAmount` is also available (the original transaction amount)
- `reimbursementRate` defaults to 100 if `item.percentage` is null/undefined

**The display is correct** - it shows what's stored in the database. The bug is in the **calculation/storage phase**, not the display phase.

---

## 4. BUG LOCATION: Exact file, function, and line number

### Primary Bug Location

**File:** `frontend/src/services/familySharingService.ts`  
**Function:** `updateSharedTransaction`  
**Lines:** 471-478

```typescript
// ⚠️ BUG: If split_details exists and contains amounts, it overrides the calculated reimbursementAmount
if ((sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
  const debtorSplit = ((sharedTx as any).split_details as any[]).find(
    (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
  );
  if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
    reimbursementAmount = Math.abs(debtorSplit.amount); // ⚠️ LINE 476: Overrides correct calculation
  }
}
```

### Secondary Bug Location (Potential)

**File:** `frontend/src/pages/TransactionsPage.tsx`  
**Function:** `handleRequestReimbursement`  
**Line:** 484

```typescript
amount: Math.abs(split.amount), // ⚠️ LINE 484: Uses split.amount from splitDetails
```

**If `splitDetails` contains incorrect amounts (e.g., 5,000 instead of 10,000), this will create a reimbursement request with the wrong amount.**

---

## 5. ROOT CAUSE: Why 100% of 10000 becomes 5000

### Hypothesis 1: split_details Contains Half Amount

**Most Likely Cause:** When a transaction is shared with `splitType: 'paid_by_one'`, the `splitDetails` array should be empty. However, if `splitDetails` is populated later (possibly by a default calculation or another process), and it contains amounts that are **half of the transaction amount**, then:

1. User creates transaction: 10,000 Ar
2. Transaction is shared with `splitType: 'paid_by_one'` and `splitDetails: []`
3. **Later, splitDetails is populated with:** `[{ memberId: '...', amount: 5000 }]` (half amount)
4. User toggles reimbursement to 100%
5. Code calculates: `reimbursementAmount = transactionAmount * rate = 10000 * 1.0 = 10000` ✅
6. **BUT THEN:** Code checks `split_details` and finds `debtorSplit.amount = 5000`
7. **Code overrides:** `reimbursementAmount = Math.abs(5000) = 5000` ❌
8. Reimbursement request is created with amount: 5,000 Ar
9. Database stores: 5,000 Ar
10. Display shows: 5,000 Ar

### Hypothesis 2: splitDetails Calculated Incorrectly

**Alternative Cause:** If `splitDetails` is calculated when the transaction is shared, and the calculation divides the amount by the number of members (e.g., 2 members = 10,000 / 2 = 5,000), then:

1. Transaction: 10,000 Ar
2. Shared with 2 members (payer + 1 debtor)
3. `splitDetails` calculated as: `[{ memberId: debtor, amount: 10000 / 2 = 5000 }]`
4. Reimbursement request uses `split.amount = 5000` instead of full amount

### Hypothesis 3: Percentage Field Confusion

**Less Likely:** If there's a `percentage` field in `reimbursement_requests` that is set to 50%, and the amount is calculated as `transactionAmount * (percentage / 100)`, but the percentage is incorrectly stored or retrieved.

**However:** The code in `familySharingService.ts` line 468 uses `rate` (which defaults to 1.0 = 100%), not a percentage field from the database.

---

## 6. FIX RECOMMENDATION: How to correct the calculation

### Fix Option 1: Remove split_details Override (Recommended)

**File:** `frontend/src/services/familySharingService.ts`  
**Function:** `updateSharedTransaction`  
**Lines:** 470-478

**Current Code:**
```typescript
let reimbursementAmount = transactionAmount * rate; // Use configured rate

// Si split_details existe, utiliser le montant spécifique
if ((sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
  const debtorSplit = ((sharedTx as any).split_details as any[]).find(
    (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
  );
  if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
    reimbursementAmount = Math.abs(debtorSplit.amount);
  }
}
```

**Fixed Code:**
```typescript
let reimbursementAmount = transactionAmount * rate; // Use configured rate

// ⚠️ REMOVED: Do not override with split_details amount
// For 'paid_by_one' split type, the full transaction amount should be reimbursed
// split_details is only relevant for 'split_equal' or 'split_custom' types
// where the amount is already correctly calculated per member

// If splitType is 'paid_by_one', always use the full transaction amount with rate
// If splitType is 'split_equal' or 'split_custom', use split_details amount
if (sharedTx.splitType !== 'paid_by_one' && (sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
  const debtorSplit = ((sharedTx as any).split_details as any[]).find(
    (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
  );
  if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
    // For split types, use the split amount but still apply the rate
    reimbursementAmount = Math.abs(debtorSplit.amount) * rate;
  }
}
```

### Fix Option 2: Verify split_details Calculation

**Investigation Needed:** Check where `splitDetails` is calculated/populated for `paid_by_one` transactions. If it's being populated with incorrect amounts, fix the calculation logic.

**File to Check:** 
- `frontend/src/services/familySharingService.ts` - `shareTransaction` function
- Any code that updates `split_details` after initial creation

### Fix Option 3: Use transactionAmount Directly for paid_by_one

**File:** `frontend/src/services/familySharingService.ts`  
**Function:** `updateSharedTransaction`  
**Lines:** 468-478

**Fixed Code:**
```typescript
// For 'paid_by_one', always use full transaction amount
if (sharedTx.splitType === 'paid_by_one') {
  reimbursementAmount = transactionAmount * rate;
} else {
  // For other split types, use split_details if available
  let reimbursementAmount = transactionAmount * rate;
  if ((sharedTx as any).split_details && Array.isArray((sharedTx as any).split_details)) {
    const debtorSplit = ((sharedTx as any).split_details as any[]).find(
      (s: any) => s.memberId === debtorMember.id || s.member_id === debtorMember.id
    );
    if (debtorSplit && (debtorSplit.amount !== undefined && debtorSplit.amount !== null)) {
      reimbursementAmount = Math.abs(debtorSplit.amount) * rate;
    }
  }
}
```

---

## 7. VERIFICATION QUERIES

### Database Query to Verify Bug

```sql
-- Check reimbursement_requests amounts vs transaction amounts
SELECT 
  rr.id,
  rr.amount AS reimbursement_amount,
  rr.currency,
  fst.id AS shared_transaction_id,
  t.amount AS transaction_amount,
  t.description,
  (rr.amount::numeric / NULLIF(t.amount::numeric, 0) * 100) AS percentage_calculated,
  fst.split_type,
  fst.split_details
FROM reimbursement_requests rr
JOIN family_shared_transactions fst ON rr.shared_transaction_id = fst.id
LEFT JOIN transactions t ON fst.transaction_id = t.id
WHERE rr.status = 'pending'
ORDER BY rr.created_at DESC
LIMIT 10;
```

**Expected Result:**
- If bug exists: `reimbursement_amount` = 5,000 and `transaction_amount` = 10,000 (50% instead of 100%)
- If fixed: `reimbursement_amount` = 10,000 and `transaction_amount` = 10,000 (100%)

### Check split_details Content

```sql
-- Check split_details for paid_by_one transactions
SELECT 
  id,
  split_type,
  split_details,
  amount,
  (SELECT amount FROM transactions WHERE id = transaction_id) AS transaction_amount
FROM family_shared_transactions
WHERE split_type = 'paid_by_one'
  AND split_details IS NOT NULL
  AND split_details != '[]'::jsonb
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- For `paid_by_one`: `split_details` should be `null` or `[]`
- If `split_details` contains amounts, they should match the full transaction amount (not half)

---

## 8. TESTING CHECKLIST

- [ ] Run database query to verify reimbursement_amount vs transaction_amount
- [ ] Check if split_details is populated for paid_by_one transactions
- [ ] Verify that 100% reimbursement rate creates 10,000 Ar request for 10,000 Ar transaction
- [ ] Test with different reimbursement rates (25%, 50%, 75%, 100%)
- [ ] Test with different split types (paid_by_one, split_equal, split_custom)
- [ ] Verify display in FamilyReimbursementsPage shows correct amount
- [ ] Check console logs for reimbursement amount calculation

---

## SUMMARY

**Root Cause:** The code in `familySharingService.ts` line 476 overrides the correctly calculated `reimbursementAmount` (transactionAmount * rate) with `debtorSplit.amount` from `split_details`. If `split_details` contains incorrect amounts (e.g., half the transaction amount for a 2-member group), the reimbursement request will be created with the wrong amount.

**Fix:** Remove or conditionally apply the `split_details` override for `paid_by_one` split type, or ensure that `split_details` is never populated with incorrect amounts for `paid_by_one` transactions.

**AGENT 05 SIGNATURE:** AGENT-05-REIMBURSEMENT-BUG-ANALYSIS-COMPLETE






