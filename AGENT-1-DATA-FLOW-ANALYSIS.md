# AGENT-1-DATA-FLOW-ANALYSIS
**Date:** 2026-01-23  
**Agent:** Agent 1 (Data Flow Identification)  
**Objective:** Trace data flow after successful payment recording to identify stale data issue

---

## 1. CALLBACK DEFINITION

### 1.1 onPaymentRecorded Handler Location

**File:** `frontend/src/pages/FamilyReimbursementsPage.tsx`  
**Lines:** 210-214

**Current Implementation:**
```typescript
const handlePaymentRecorded = () => {
  loadData();
  toast.success('Paiement enregistré');
  handleClosePaymentModal();
};
```

**Function Signature:** No parameters, no return value

**Called From:** Modal component via prop (line 555)

---

## 2. CURRENT IMPLEMENTATION

### 2.1 Payment Recording Flow

**Modal Submit Handler** (`ReimbursementPaymentModal.tsx`, lines 270-330):
```typescript
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError(null);

  if (!validateForm()) {
    return;
  }

  setIsLoading(true);

  try {
    // Validate creditorMemberId is available
    if (!creditorMemberId) {
      throw new Error('Impossible de déterminer votre identité de membre. Veuillez réessayer.');
    }

    // Parse amount (remove spaces and handle decimal)
    const amountValue = parseFloat(paymentAmount.replace(/\s/g, '').replace(',', '.'));

    // Validate amount
    if (isNaN(amountValue) || amountValue <= 0) {
      throw new Error('Le montant doit être supérieur à 0');
    }

    // Call service function to record payment
    const result = await recordReimbursementPayment(
      debtorMemberId,      // fromMemberId (debtor who pays)
      creditorMemberId,    // toMemberId (creditor who receives)
      amountValue,         // amount
      notes.trim() || undefined, // notes (optional)
      familyGroupId        // groupId
    );

    // Log allocation result for debugging
    console.log('[PaymentModal] Payment recorded:', {
      paymentId: result.paymentId,
      totalAmount: result.totalAmount,
      allocatedAmount: result.allocatedAmount,
      surplusAmount: result.surplusAmount,
      allocationsCount: result.allocations.length,
      creditBalanceCreated: result.creditBalanceCreated
    });

    toast.success('Paiement enregistré avec succès', {
      duration: 3000,
      icon: '✅'
    });

    // Call parent callback
    if (onPaymentRecorded) {
      onPaymentRecorded();
    }

    // Close modal
    onClose();
  } catch (err: any) {
    const errorMessage = err?.message || 'Erreur lors de l\'enregistrement du paiement';
    setError(errorMessage);
    toast.error(errorMessage, {
      duration: 4000
    });
  } finally {
    setIsLoading(false);
  }
};
```

**Key Points:**
- Payment is recorded via `recordReimbursementPayment()` service function (line 296)
- `onPaymentRecorded()` callback is called AFTER successful payment (line 318)
- Modal closes AFTER callback is called (line 321)

### 2.2 Data Refresh Flow

**loadData Function** (`FamilyReimbursementsPage.tsx`, lines 52-88):
```typescript
const loadData = async () => {
  if (!isAuthenticated || !user || !activeFamilyGroup || familyLoading) {
    return;
  }

  try {
    setIsLoading(true);
    setError(null);

    // Charger les soldes des membres
    const memberBalances = await getMemberBalances(activeFamilyGroup.id);
    setBalances(memberBalances);

    // Trouver le member_id de l'utilisateur actuel
    const currentMember = memberBalances.find(b => b.userId === user.id);
    if (currentMember) {
      setCurrentMemberId(currentMember.memberId);
    }

    // Charger les remboursements en attente
    const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
    setPendingReimbursements(reimbursements);
  } catch (err: any) {
    console.error('Erreur lors du chargement des remboursements:', err);
    setError(err.message || 'Erreur lors du chargement des remboursements');
  } finally {
    setIsLoading(false);
  }
};
```

**Key Points:**
- Calls `getMemberBalances()` (line 62)
- Calls `getPendingReimbursements()` (line 80)
- Updates `pendingReimbursements` state (line 81)
- Sets `isLoading` to true during fetch (line 58)

---

## 3. STATE MANAGEMENT

### 3.1 pendingReimbursements State

**State Declaration** (`FamilyReimbursementsPage.tsx`, line 36):
```typescript
const [pendingReimbursements, setPendingReimbursements] = useState<ReimbursementWithDetails[]>([]);
```

**State Updates:**
1. **Initial Load:** `useEffect` calls `loadData()` on mount (lines 91-93)
2. **After Payment:** `handlePaymentRecorded()` calls `loadData()` (line 211)
3. **Realtime Updates:** `subscribeToReimbursements` calls `loadData()` on events (line 108)
4. **Manual Mark as Reimbursed:** `handleMarkAsReimbursed()` directly calls `getPendingReimbursements()` (line 231)

**Dependencies:**
- `useEffect` dependencies: `[isAuthenticated, user, activeFamilyGroup, familyLoading]` (line 93)
- `useMemo` dependencies for filtered lists: `[pendingReimbursements, currentMemberId]` (lines 147, 160)

### 3.2 Modal Props Flow

**Modal Receives Props** (`FamilyReimbursementsPage.tsx`, lines 546-556):
```typescript
<ReimbursementPaymentModal
  isOpen={paymentModal.isOpen}
  onClose={handleClosePaymentModal}
  debtorMemberId={paymentModal.debtorMemberId}
  debtorName={paymentModal.debtorName}
  familyGroupId={activeFamilyGroup.id}
  pendingDebts={toPendingDebts(
    uniqueDebtorsOwedToMe.find((d) => d.debtorMemberId === paymentModal.debtorMemberId)?.items ?? []
  )}
  onPaymentRecorded={handlePaymentRecorded}
/>
```

**toPendingDebts Conversion** (lines 183-194):
```typescript
const toPendingDebts = (items: ReimbursementWithDetails[]): PendingDebt[] =>
  items.map((r) => {
    const row = r as ReimbursementWithDetails & { currency?: string; description?: string; familySharedTransactionId?: string };
    return {
      reimbursementId: r.id,
      amount: r.amount,  // ⚠️ Uses r.amount from ReimbursementWithDetails
      currency: row.currency || 'MGA',
      description: r.transactionDescription || row.description || 'Transaction sans description',
      date: r.transactionDate ? new Date(r.transactionDate) : new Date(),
      transactionId: row.familySharedTransactionId || r.id
    };
  });
```

**Key Issue:** `pendingDebts` prop is calculated from `uniqueDebtorsOwedToMe` which depends on `pendingReimbursements` state. When modal is open, it receives a snapshot of the current state, but this snapshot doesn't update when `pendingReimbursements` changes.

---

## 4. DATA FETCH FUNCTIONS

### 4.1 getPendingReimbursements

**Location:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 415-549

**Query Logic:**
```typescript
const { data, error } = await supabase
  .from('reimbursement_requests')
  .select(`
    *,
    from_member:family_members!reimbursement_requests_from_member_id_fkey(...),
    to_member:family_members!reimbursement_requests_to_member_id_fkey(...),
    shared_transaction:family_shared_transactions(...)
  `)
  .eq('status', 'pending');  // ⚠️ Only fetches pending requests
```

**Key Points:**
- Queries `reimbursement_requests` table with `status = 'pending'`
- Returns `ReimbursementWithDetails[]` with `amount` field from `reimbursement_requests.amount`
- **Does NOT account for partial payments:** After `recordReimbursementPayment` updates `reimbursement_requests.amount` for partial payments (line 1379), this query will return the updated amount, BUT:
  - The query happens AFTER payment is recorded
  - Modal preview uses OLD `pendingDebts` prop value
  - Modal doesn't re-fetch or update its internal state when parent state changes

### 4.2 getMemberBalances

**Location:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 270-407

**Query Logic:**
- Queries `family_member_balances` view
- Recalculates `pendingToReceive` and `pendingToPay` from `reimbursement_requests` table
- Filters by `status = 'pending'` and `has_reimbursement_request = true`

**Called From:**
- `loadData()` function (line 62)
- `handleMarkAsReimbursed()` function (line 228)

### 4.3 recordReimbursementPayment

**Location:** `frontend/src/services/reimbursementService.ts`  
**Lines:** 1202-1475

**Update Logic (lines 1366-1391):**
```typescript
// Mettre à jour les statuts des demandes de remboursement
for (const allocation of allocations) {
  const updateData: any = {
    updated_at: new Date().toISOString(),
  };

  if (allocation.isFullyPaid) {
    // Demande complètement payée: marquer comme settled
    updateData.status = 'settled';
    updateData.settled_at = new Date().toISOString();
    updateData.settled_by = user.id;
  } else {
    // Demande partiellement payée: réduire le montant et garder pending
    updateData.amount = allocation.remainingAmount;  // ⚠️ Updates amount to remaining balance
  }

  const { error: updateError } = await supabase
    .from('reimbursement_requests')
    .update(updateData)
    .eq('id', allocation.reimbursementRequestId);
}
```

**Key Points:**
- For fully paid requests: Sets `status = 'settled'` (will not appear in `getPendingReimbursements`)
- For partially paid requests: Updates `amount` to `remainingAmount` but keeps `status = 'pending'`
- **Database is updated BEFORE `onPaymentRecorded()` callback is called**

---

## 5. REFRESH TRIGGERS

### 5.1 Current Refresh Triggers

1. **Component Mount** (`useEffect`, lines 91-93):
   ```typescript
   useEffect(() => {
     loadData();
   }, [isAuthenticated, user, activeFamilyGroup, familyLoading]);
   ```

2. **Realtime Subscription** (`useEffect`, lines 96-116):
   ```typescript
   useEffect(() => {
     if (!activeFamilyGroup?.id) {
       return;
     }

     const unsubscribe = subscribeToReimbursements(
       activeFamilyGroup.id,
       (payload) => {
         const eventType = payload.eventType;
         console.log('[Reimbursements] Realtime event:', eventType);
         
         // Refetch les données pour refléter les changements
         loadData();
       }
     );

     return () => {
       unsubscribe();
     };
   }, [activeFamilyGroup?.id, subscribeToReimbursements]);
   ```

3. **After Payment Recorded** (`handlePaymentRecorded`, line 211):
   ```typescript
   const handlePaymentRecorded = () => {
     loadData();  // ⚠️ Async function, state update happens after modal closes
     toast.success('Paiement enregistré');
     handleClosePaymentModal();
   };
   ```

4. **Manual Mark as Reimbursed** (`handleMarkAsReimbursed`, lines 227-232):
   ```typescript
   if (activeFamilyGroup) {
     const memberBalances = await getMemberBalances(activeFamilyGroup.id);
     setBalances(memberBalances);
     
     const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
     setPendingReimbursements(reimbursements);
   }
   ```

### 5.2 Refresh Timing Issue

**Problem:** `handlePaymentRecorded()` calls `loadData()` which is async, but:
1. Modal closes immediately (line 213)
2. `loadData()` starts fetching data
3. State update happens AFTER modal is already closed
4. If modal is reopened, it receives NEW data, but if user looks at preview BEFORE closing, they see OLD data

**Timeline:**
```
1. User submits payment → recordReimbursementPayment() called
2. Payment recorded in DB → reimbursement_requests.amount updated
3. onPaymentRecorded() callback called
4. handlePaymentRecorded() called → loadData() started (async)
5. Modal closes immediately
6. loadData() completes → setPendingReimbursements() called
7. State updated, but modal is already closed
```

---

## 6. MODAL INTEGRATION

### 6.1 Prop Drilling (Not Context)

**Modal receives props via direct prop passing:**
- `pendingDebts` prop is calculated from `uniqueDebtorsOwedToMe` (line 552)
- `uniqueDebtorsOwedToMe` is computed from `reimbursementsOwedToMe` (line 163)
- `reimbursementsOwedToMe` is computed from `pendingReimbursements` state (line 137)
- **No React Context used for payment data**

### 6.2 Modal State Management

**Modal Internal State** (`ReimbursementPaymentModal.tsx`):
- `paymentAmount` (line 98)
- `notes` (line 99)
- `isLoading` (line 100)
- `error` (line 101)
- `paymentHistory` (line 107)

**Modal Receives Props:**
- `pendingDebts: PendingDebt[]` - **Snapshot at modal open time**
- `onPaymentRecorded?: () => void` - Callback function

**Key Issue:** Modal uses `pendingDebts` prop for allocation preview calculation (line 153-190), but this prop is a snapshot that doesn't update when parent state changes.

### 6.3 Allocation Preview Calculation

**Modal Preview Logic** (lines 152-190):
```typescript
const allocationPreview = useMemo<AllocationPreview[]>(() => {
  if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
    return [];
  }

  const paymentValue = parseFloat(paymentAmount);
  const allocations: AllocationPreview[] = [];
  let remainingPayment = paymentValue;

  // Sort debts by date (oldest first) for FIFO
  const sortedDebts = [...pendingDebts].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  for (const debt of sortedDebts) {
    if (remainingPayment <= 0) break;

    const debtAmount = debt.amount;  // ⚠️ Uses debt.amount from prop snapshot
    const allocatedAmount = Math.min(remainingPayment, debtAmount);
    const remainingBefore = debtAmount - allocatedAmount;
    // ...
  }

  return allocations;
}, [paymentAmount, pendingDebts]);  // ⚠️ Depends on pendingDebts prop
```

**Problem:** `pendingDebts` prop contains OLD `amount` values from when modal was opened. After payment is recorded and `loadData()` updates `pendingReimbursements`, the modal still uses the old prop value because:
1. Props don't update while modal is open (React doesn't re-render modal with new props until next open)
2. Modal doesn't re-fetch data internally
3. `useMemo` dependency on `pendingDebts` doesn't help because prop value doesn't change during modal lifecycle

---

## 7. ROOT CAUSE ANALYSIS

### 7.1 Stale Data Issue

**Problem:** After successful payment recording, modal preview shows stale debt amounts.

**Root Causes:**

1. **Prop Snapshot Issue:**
   - Modal receives `pendingDebts` prop calculated from `pendingReimbursements` state
   - When modal opens, it gets a snapshot of current state
   - After payment, `loadData()` updates `pendingReimbursements` state
   - But modal is already closed, so it never receives updated props
   - If modal is reopened, it gets NEW data, but user sees OLD data in preview before closing

2. **Async Refresh Timing:**
   - `handlePaymentRecorded()` calls `loadData()` which is async
   - Modal closes immediately (line 213)
   - State update happens AFTER modal closes
   - User never sees updated data in the modal they just used

3. **No Real-time Prop Updates:**
   - Modal doesn't subscribe to state changes
   - Modal doesn't re-fetch data when payment succeeds
   - Modal relies entirely on prop values passed at open time

### 7.2 Incoherent Preview Issue

**User Report:** Preview shows "NAYA [Bus Scolaire] 100 Ar" and "84 900 Ar restant 100 Ar alloué" after 100,000 Ar payment.

**Analysis:**
- This suggests the preview is showing:
  - Original debt amount: 85,000 Ar (84,900 + 100)
  - Allocated amount: 100 Ar
  - Remaining: 84,900 Ar
- But user paid 100,000 Ar, which should fully pay the debt
- **This indicates the modal is using OLD `pendingDebts` prop values that don't reflect the payment that was just recorded**

**Possible Causes:**
1. Modal preview calculation uses `debt.amount` from prop snapshot (line 221)
2. After payment, `reimbursement_requests.amount` is updated in DB
3. But modal still uses old prop value
4. If user reopens modal, they should see updated amounts, but preview during payment shows old data

---

## 8. SUMMARY

### 8.1 Data Flow Identified

✅ **Callback Definition:** `handlePaymentRecorded` at lines 210-214  
✅ **Current Implementation:** Calls `loadData()` async, closes modal immediately  
✅ **State Management:** `pendingReimbursements` state updated via `setPendingReimbursements()`  
✅ **Data Fetch Functions:** `getPendingReimbursements()` and `getMemberBalances()` called in `loadData()`  
✅ **Refresh Triggers:** Mount, realtime events, after payment, manual mark  
✅ **Modal Integration:** Prop drilling, no context, snapshot at open time  

### 8.2 Issues Identified

❌ **Stale Data:** Modal uses prop snapshot that doesn't update after payment  
❌ **Async Timing:** State refresh happens after modal closes  
❌ **No Prop Updates:** Modal doesn't receive updated props during its lifecycle  
❌ **Preview Incoherence:** Preview uses old debt amounts from prop snapshot  

### 8.3 Recommended Fixes

1. **Wait for Data Refresh:** Make `handlePaymentRecorded` async and wait for `loadData()` to complete before closing modal
2. **Update Modal Props:** Pass updated `pendingDebts` prop after payment, or make modal re-fetch data
3. **Optimistic Update:** Update modal's internal state optimistically after payment succeeds
4. **Re-fetch in Modal:** Make modal re-fetch `pendingDebts` when payment succeeds, before showing success message

---

**AGENT-1-DATA-FLOW-COMPLETE**
