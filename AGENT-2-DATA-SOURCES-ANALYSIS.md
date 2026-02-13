# AGENT-2-DATA-SOURCES-ANALYSIS
**Date:** 2026-02-10  
**Agent:** Agent 2 (Data Sources Analysis for Phase 2 Dashboard Charts)  
**Objective:** Analyze available data sources for 3 target charts in reimbursement dashboard

---

## 1. EXISTING FUNCTIONS

### Available Service Functions in reimbursementService.ts

#### **Function 1: getMemberBalances**
**Signature:**
```typescript
export async function getMemberBalances(
  groupId: string
): Promise<FamilyMemberBalance[]>
```

**Return Type:** `FamilyMemberBalance[]`
```typescript
interface FamilyMemberBalance {
  familyGroupId: string;
  memberId: string;
  userId: string | null;
  displayName: string;
  totalPaid: number;
  totalOwed: number;
  pendingToReceive: number;  // ✅ Useful for Chart 1
  pendingToPay: number;        // ✅ Useful for Chart 1
  netBalance: number;
}
```

**Data Source:** `family_member_balances` view + `reimbursement_requests` table  
**Filters:** `status = 'pending'`, `has_reimbursement_request = true`  
**Location:** Lines 270-407

---

#### **Function 2: getPendingReimbursements**
**Signature:**
```typescript
export async function getPendingReimbursements(
  groupId: string
): Promise<ReimbursementWithDetails[]>
```

**Return Type:** `ReimbursementWithDetails[]`
```typescript
interface ReimbursementWithDetails extends ReimbursementRequest {
  fromMemberName: string;           // ✅ Useful for Chart 1
  toMemberName: string;            // ✅ Useful for Chart 1
  transactionDescription: string | null;
  transactionAmount: number | null;
  transactionDate: Date | null;    // ✅ Useful for Chart 3
  reimbursementRate: number | null;
  // From ReimbursementRequest:
  id: string;
  requestedBy: string;             // to_member_id (creditor)
  requestedFrom: string;           // from_member_id (debtor)
  amount: number;                  // ✅ Useful for all charts
  status: 'pending' | 'settled' | 'cancelled';
  createdAt: Date;                  // ✅ Useful for Chart 3
}
```

**Data Source:** `reimbursement_requests` table  
**Joins:** 
- `family_members` (from_member, to_member)
- `family_shared_transactions` → `transactions` (description, amount, date)
- **⚠️ MISSING:** `transactions.category` not selected

**Filters:** `status = 'pending'`, `has_reimbursement_request = true`  
**Location:** Lines 415-549

**Query Structure (Lines 445-469):**
```typescript
.from('reimbursement_requests')
.select(`
  *,
  from_member:family_members(...),
  to_member:family_members(...),
  shared_transaction:family_shared_transactions(
    transaction_id,
    family_group_id,
    has_reimbursement_request,
    transactions(
      description,    // ✅ Selected
      amount,         // ✅ Selected
      date            // ✅ Selected
      // ❌ category NOT selected
    )
  )
`)
.eq('status', 'pending')
```

---

#### **Function 3: getPaymentHistory**
**Signature:**
```typescript
export async function getPaymentHistory(
  groupId: string,
  options?: {
    fromMemberId?: string;
    toMemberId?: string;
    startDate?: Date;      // ✅ Useful for Chart 3
    endDate?: Date;        // ✅ Useful for Chart 3
    limit?: number;
    offset?: number;
  }
): Promise<PaymentHistoryEntry[]>
```

**Return Type:** `PaymentHistoryEntry[]`
```typescript
interface PaymentHistoryEntry {
  paymentId: string;
  fromMemberId: string;           // ✅ Useful for Chart 1
  fromMemberName: string;         // ✅ Useful for Chart 1
  toMemberId: string;             // ✅ Useful for Chart 1
  toMemberName: string;           // ✅ Useful for Chart 1
  totalAmount: number;             // ✅ Useful for Chart 3
  allocatedAmount: number;
  surplusAmount: number;
  notes?: string;
  createdAt: Date;                 // ✅ Useful for Chart 3 (monthly aggregation)
  allocations: PaymentAllocationDetail[];
}
```

**Data Source:** `reimbursement_payments` table  
**Joins:** 
- `family_members` (from_member, to_member)
- `reimbursement_payment_allocations` → `reimbursement_requests` → `family_shared_transactions` → `transactions` (description only)

**Filters:** `family_group_id`, optional `fromMemberId`, `toMemberId`, date range  
**Location:** Lines 1483-1640

---

#### **Function 4: getReimbursementsByMember**
**Signature:**
```typescript
export async function getReimbursementsByMember(
  memberId: string
): Promise<ReimbursementRequest[]>
```

**Return Type:** `ReimbursementRequest[]` (basic structure, no details)  
**Data Source:** `reimbursement_requests` table  
**Filters:** `from_member_id` OR `to_member_id` = memberId  
**Location:** Lines 1122-1179

**Limitation:** Returns basic `ReimbursementRequest` without member names or transaction details

---

#### **Function 5: getMemberCreditBalance**
**Signature:**
```typescript
export async function getMemberCreditBalance(
  fromMemberId: string,
  toMemberId: string,
  groupId: string
): Promise<MemberCreditBalance | null>
```

**Return Type:** `MemberCreditBalance | null`  
**Purpose:** Get credit balance (surplus) between two members  
**Location:** Lines 1651-1729

**Not directly useful for charts** (credit balances are separate from pending debts)

---

#### **Function 6: getAllocationDetails**
**Signature:**
```typescript
export async function getAllocationDetails(
  paymentId: string
): Promise<PaymentAllocationDetails | null>
```

**Return Type:** `PaymentAllocationDetails | null`  
**Purpose:** Get detailed allocation for a specific payment  
**Location:** Lines 1736-1876

**Not directly useful for charts** (single payment detail, not aggregated)

---

## 2. DATA ALREADY IN PAGE STATE

### FamilyReimbursementsPage.tsx Current State

**File:** `frontend/src/pages/FamilyReimbursementsPage.tsx`

#### **State Variables (Lines 35-49):**
```typescript
const [balances, setBalances] = useState<FamilyMemberBalance[]>([]);
const [pendingReimbursements, setPendingReimbursements] = useState<ReimbursementWithDetails[]>([]);
const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
```

#### **Data Loading (Lines 52-79):**
```typescript
const loadData = async () => {
  // Line 62: Load member balances
  const memberBalances = await getMemberBalances(activeFamilyGroup.id);
  setBalances(memberBalances);
  
  // Line 72: Load pending reimbursements
  const reimbursements = await getPendingReimbursements(activeFamilyGroup.id);
  setPendingReimbursements(reimbursements);
};
```

#### **Computed Values (Lines 107-152):**
```typescript
// Line 107: Current member balance
const currentMemberBalance = balances.find(b => b.memberId === currentMemberId);

// Line 113-121: Filtered reimbursements owed to me
const reimbursementsOwedToMe = useMemo(() => {
  return pendingReimbursements.filter(
    r => r.toMemberName && r.requestedBy === currentMemberId
  );
}, [pendingReimbursements, currentMemberId]);

// Line 124-132: Filtered reimbursements I owe
const reimbursementsIOwe = useMemo(() => {
  return pendingReimbursements.filter(
    r => r.fromMemberName && r.requestedFrom === currentMemberId
  );
}, [pendingReimbursements, currentMemberId]);

// Line 135-152: Grouped by debtor
const uniqueDebtorsOwedToMe = useMemo(() => {
  // Groups reimbursementsOwedToMe by requestedFrom (debtor)
}, [reimbursementsOwedToMe]);
```

#### **Available Data Summary:**

**✅ Available:**
- `balances`: Array of `FamilyMemberBalance` with `pendingToReceive`, `pendingToPay` per member
- `pendingReimbursements`: Array of `ReimbursementWithDetails` with:
  - `fromMemberName`, `toMemberName` (member names)
  - `amount` (reimbursement amount)
  - `transactionDate` (date of transaction)
  - `createdAt` (date reimbursement request created)
  - `transactionDescription` (transaction description)
  - `transactionAmount` (original transaction amount)

**❌ Missing:**
- `category` (transaction category) - **NOT in query**
- Historical data (settled reimbursements)
- Monthly aggregated payment history
- Category breakdown data

---

## 3. GAPS FOR CHART 1 (MEMBER SUMMARY)

### Chart Requirement: "Who owes whom" - Member Summary

**Visualization Type:** Matrix/Heatmap or Network diagram showing debt relationships

**Required Data:**
- Debtor → Creditor pairs
- Amount owed per pair
- Member names for display

#### **Available Data:**

**✅ From `getMemberBalances()`:**
- `pendingToReceive` per member (creditor perspective)
- `pendingToPay` per member (debtor perspective)
- `displayName` per member
- **Limitation:** Aggregated totals, not per-pair breakdown

**✅ From `getPendingReimbursements()`:**
- `fromMemberName` (debtor)
- `toMemberName` (creditor)
- `amount` (debt amount)
- `requestedFrom` (debtor memberId)
- `requestedBy` (creditor memberId)

**Data Structure Available:**
```typescript
pendingReimbursements: [
  {
    fromMemberName: "Alice",
    toMemberName: "Bob",
    amount: 50000,
    requestedFrom: "member-uuid-1",
    requestedBy: "member-uuid-2"
  },
  // ... more pairs
]
```

#### **Gaps Identified:**

**Gap 1.1: Per-Pair Aggregation**
- **Issue:** `getMemberBalances()` returns totals per member, not per member-pair
- **Required:** Aggregate `pendingReimbursements` by `(fromMemberId, toMemberId)` pairs
- **Solution:** ✅ **Can be done in frontend** - Group `pendingReimbursements` by pair and sum amounts

**Gap 1.2: Credit Balances Integration**
- **Issue:** Credit balances (surplus) not included in member summary
- **Required:** Show both debts and credits in same view
- **Solution:** ⚠️ **Requires new query** - Fetch all `member_credit_balance` records for group

**Gap 1.3: Historical Settled Data**
- **Issue:** Only pending reimbursements available
- **Required:** May want to show settled debts for context
- **Solution:** ⚠️ **Requires new query** - Query `reimbursement_requests` with `status = 'settled'`

#### **Recommended Approach:**

**✅ REUSE EXISTING DATA:**
- Use `pendingReimbursements` from page state
- Group by `(requestedFrom, requestedBy)` pairs
- Sum `amount` per pair
- Create matrix: `Map<debtorId, Map<creditorId, amount>>`

**⚠️ NEW QUERY NEEDED:**
- `getMemberCreditBalances(groupId)` - Fetch all credit balances for group
- Merge credit balances with debt data for complete picture

---

## 4. GAPS FOR CHART 2 (CATEGORY BREAKDOWN)

### Chart Requirement: Category Breakdown (Pie/Bar Chart)

**Visualization Type:** Pie chart or bar chart showing reimbursement amounts by category

**Required Data:**
- Category name
- Total amount per category
- Count of reimbursements per category

#### **Available Data:**

**✅ From `getPendingReimbursements()`:**
- `transactionDescription` (has category info in description text, but not structured)
- `amount` (reimbursement amount)
- `transactionAmount` (original transaction amount)

**❌ MISSING:**
- `category` field from `transactions` table
- **Root Cause:** Query at line 462-466 selects `transactions(description, amount, date)` but **NOT** `category`

**Query Gap (Line 462-466):**
```typescript
transactions(
  description,    // ✅ Selected
  amount,        // ✅ Selected
  date           // ✅ Selected
  // ❌ category NOT selected
)
```

#### **Gaps Identified:**

**Gap 2.1: Category Field Missing**
- **Issue:** `getPendingReimbursements()` doesn't select `transactions.category`
- **Required:** Category field from transactions table
- **Solution:** 🔴 **REQUIRES CODE CHANGE** - Add `category` to SELECT query

**Gap 2.2: Category Aggregation**
- **Issue:** No aggregation by category exists
- **Required:** Sum amounts and count reimbursements per category
- **Solution:** ✅ **Can be done in frontend** - Group by category and aggregate

**Gap 2.3: Category Display Names**
- **Issue:** Category stored as key (e.g., `'vetements'`), need display name (e.g., `'Vêtements'`)
- **Required:** Map category keys to display names
- **Solution:** ✅ **Can use existing constants** - `TRANSACTION_CATEGORIES` from `frontend/src/constants/index.ts`

#### **Recommended Approach:**

**🔴 REQUIRES CODE CHANGE:**
1. **Modify `getPendingReimbursements()` query** (Line 462-466):
   ```typescript
   transactions(
     description,
     amount,
     date,
     category  // ✅ ADD THIS
   )
   ```

2. **Update `ReimbursementWithDetails` interface** (Line 65-72):
   ```typescript
   export interface ReimbursementWithDetails extends ReimbursementRequest {
     // ... existing fields ...
     transactionCategory: string | null;  // ✅ ADD THIS
   }
   ```

3. **Map category in return** (Line 531-543):
   ```typescript
   return {
     ...baseRequest,
     // ... existing fields ...
     transactionCategory: transactionData?.category || null,  // ✅ ADD THIS
   };
   ```

**✅ THEN REUSE DATA:**
- Use `pendingReimbursements` from page state
- Group by `transactionCategory`
- Sum `amount` per category
- Map category keys to display names using `TRANSACTION_CATEGORIES`

---

## 5. GAPS FOR CHART 3 (MONTHLY EVOLUTION)

### Chart Requirement: Debt Evolution Over Time (Line Chart)

**Visualization Type:** Line chart showing total pending debt amount per month

**Required Data:**
- Month/Year (x-axis)
- Total pending amount (y-axis)
- Optional: Count of pending reimbursements

#### **Available Data:**

**✅ From `getPendingReimbursements()`:**
- `createdAt` (date reimbursement request created)
- `amount` (reimbursement amount)
- `transactionDate` (date of original transaction)

**✅ From `getPaymentHistory()`:**
- `createdAt` (date payment recorded)
- `totalAmount` (payment amount)
- `fromMemberId`, `toMemberId` (member pair)
- **Filters:** `startDate`, `endDate` (can filter by date range)

#### **Gaps Identified:**

**Gap 3.1: Historical Pending Debt Snapshot**
- **Issue:** Only current pending reimbursements available
- **Required:** Historical snapshots of pending debt amounts per month
- **Solution:** 🔴 **REQUIRES NEW QUERY** - Need to reconstruct historical state

**Gap 3.2: Monthly Aggregation**
- **Issue:** No monthly aggregation exists
- **Required:** Group reimbursements by month and sum amounts
- **Solution:** ✅ **Can be done in frontend** - Group `pendingReimbursements` by month of `createdAt`

**Gap 3.3: Historical Data Reconstruction**
- **Issue:** Can't determine what pending debt was at past dates
- **Required:** Need to know:
  - When each reimbursement was created (`createdAt` ✅ available)
  - When each reimbursement was settled (`settled_at` ❌ not in current query)
  - Payment history to track when debts were paid
- **Solution:** 🔴 **REQUIRES NEW QUERY** - Query `reimbursement_requests` with date filters and `settled_at`

**Gap 3.4: Payment History Aggregation**
- **Issue:** `getPaymentHistory()` returns individual payments, not monthly totals
- **Required:** Monthly aggregated payment amounts
- **Solution:** ✅ **Can be done in frontend** - Group `getPaymentHistory()` results by month of `createdAt`

#### **Recommended Approach:**

**Option A: Current State Only (Simpler)**
- ✅ **REUSE EXISTING DATA:**
  - Use `pendingReimbursements` from page state
  - Group by month of `createdAt`
  - Sum `amount` per month
  - **Limitation:** Only shows current pending debts, not historical evolution

**Option B: Historical Evolution (More Complex)**
- 🔴 **REQUIRES NEW QUERY:**
  ```typescript
  // New function needed
  export async function getReimbursementHistory(
    groupId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ReimbursementHistoryEntry[]>
  ```
  
  **Query Structure:**
  ```sql
  SELECT 
    reimbursement_requests.*,
    reimbursement_requests.created_at as request_created_at,
    reimbursement_requests.settled_at,
    reimbursement_requests.amount,
    -- Group by month
    DATE_TRUNC('month', reimbursement_requests.created_at) as month
  FROM reimbursement_requests
  WHERE family_group_id = groupId
    AND created_at >= startDate
    AND created_at <= endDate
  ORDER BY created_at ASC
  ```
  
  **Then aggregate in frontend:**
  - Group by month
  - For each month, calculate:
    - Total pending at start of month (sum of requests created before month)
    - Minus payments made during month (from `getPaymentHistory()`)
    - Plus new requests created during month

**Recommended:** Start with **Option A** (current state), add **Option B** if historical evolution needed

---

## 6. RECOMMENDED APPROACH

### Summary: Reuse Existing Data vs New Queries

#### **Chart 1: Member Summary (Who Owes Whom)**

**✅ REUSE EXISTING DATA:**
- Use `pendingReimbursements` from page state
- Group by `(requestedFrom, requestedBy)` pairs
- Sum `amount` per pair
- **Additional:** Fetch `member_credit_balance` records for complete picture

**New Query Needed:** ⚠️ **OPTIONAL**
- `getAllMemberCreditBalances(groupId)` - Fetch all credit balances for group

**Implementation:**
```typescript
// In component
const memberDebtMatrix = useMemo(() => {
  const matrix = new Map<string, Map<string, number>>();
  
  pendingReimbursements.forEach(r => {
    const debtorId = r.requestedFrom;
    const creditorId = r.requestedBy;
    const amount = r.amount;
    
    if (!matrix.has(debtorId)) {
      matrix.set(debtorId, new Map());
    }
    const creditorMap = matrix.get(debtorId)!;
    creditorMap.set(creditorId, (creditorMap.get(creditorId) || 0) + amount);
  });
  
  return matrix;
}, [pendingReimbursements]);
```

---

#### **Chart 2: Category Breakdown**

**🔴 REQUIRES CODE CHANGE:**
1. **Modify `getPendingReimbursements()` query** to include `category`
2. **Update `ReimbursementWithDetails` interface** to include `transactionCategory`
3. **Map category in return value**

**✅ THEN REUSE DATA:**
- Use `pendingReimbursements` from page state
- Group by `transactionCategory`
- Sum `amount` per category
- Map keys to display names

**Implementation:**
```typescript
// After code change
const categoryBreakdown = useMemo(() => {
  const byCategory = new Map<string, { amount: number; count: number }>();
  
  pendingReimbursements.forEach(r => {
    const category = r.transactionCategory || 'autre';
    const existing = byCategory.get(category) || { amount: 0, count: 0 };
    existing.amount += r.amount;
    existing.count += 1;
    byCategory.set(category, existing);
  });
  
  return Array.from(byCategory.entries()).map(([key, data]) => ({
    category: TRANSACTION_CATEGORIES[key]?.name || key,
    amount: data.amount,
    count: data.count
  }));
}, [pendingReimbursements]);
```

---

#### **Chart 3: Monthly Evolution**

**Option A: Current State (Simpler)**
**✅ REUSE EXISTING DATA:**
- Use `pendingReimbursements` from page state
- Group by month of `createdAt`
- Sum `amount` per month
- **Limitation:** Only shows when requests were created, not historical debt levels

**Option B: Historical Evolution (More Complex)**
**🔴 REQUIRES NEW QUERY:**
- New function: `getReimbursementHistory(groupId, startDate, endDate)`
- Query `reimbursement_requests` with date range
- Include `settled_at` to track when debts were paid
- Combine with `getPaymentHistory()` to reconstruct monthly snapshots

**Implementation (Option A):**
```typescript
// Current state only
const monthlyEvolution = useMemo(() => {
  const byMonth = new Map<string, { amount: number; count: number }>();
  
  pendingReimbursements.forEach(r => {
    const month = r.createdAt.toISOString().slice(0, 7); // YYYY-MM
    const existing = byMonth.get(month) || { amount: 0, count: 0 };
    existing.amount += r.amount;
    existing.count += 1;
    byMonth.set(month, existing);
  });
  
  return Array.from(byMonth.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month.localeCompare(b.month));
}, [pendingReimbursements]);
```

---

## 7. NEW SERVICE FUNCTIONS NEEDED

### Function 1: getAllMemberCreditBalances (OPTIONAL for Chart 1)

**Purpose:** Fetch all credit balances for a group (for complete member summary)

**Signature:**
```typescript
export async function getAllMemberCreditBalances(
  groupId: string
): Promise<MemberCreditBalance[]>
```

**Query:**
```typescript
.from('member_credit_balance')
.select(`
  *,
  from_member:family_members(...),
  to_member:family_members(...)
`)
.eq('family_group_id', groupId)
```

**Priority:** ⚠️ **LOW** - Can show debts without credits initially

---

### Function 2: getReimbursementHistory (REQUIRED for Chart 3 Option B)

**Purpose:** Get historical reimbursement data for evolution chart

**Signature:**
```typescript
export async function getReimbursementHistory(
  groupId: string,
  startDate: Date,
  endDate: Date
): Promise<ReimbursementHistoryEntry[]>
```

**Return Type:**
```typescript
interface ReimbursementHistoryEntry {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  createdAt: Date;
  settledAt: Date | null;  // When debt was paid
  status: 'pending' | 'settled' | 'cancelled';
}
```

**Query:**
```typescript
.from('reimbursement_requests')
.select('*')
.eq('family_group_id', groupId)
.gte('created_at', startDate.toISOString())
.lte('created_at', endDate.toISOString())
.order('created_at', { ascending: true })
```

**Priority:** ⚠️ **MEDIUM** - Only needed if historical evolution required

---

## 8. CODE CHANGES REQUIRED

### Change 1: Add Category to getPendingReimbursements Query (REQUIRED for Chart 2)

**File:** `frontend/src/services/reimbursementService.ts`  
**Line:** 462-466

**Current:**
```typescript
transactions(
  description,
  amount,
  date
)
```

**Change to:**
```typescript
transactions(
  description,
  amount,
  date,
  category  // ✅ ADD
)
```

**Also update interface (Line 65-72):**
```typescript
export interface ReimbursementWithDetails extends ReimbursementRequest {
  // ... existing ...
  transactionCategory: string | null;  // ✅ ADD
}
```

**And mapping (Line 531-543):**
```typescript
return {
  ...baseRequest,
  // ... existing ...
  transactionCategory: transactionData?.category || null,  // ✅ ADD
};
```

**Priority:** 🔴 **HIGH** - Required for Chart 2

---

## 9. SUMMARY

### Data Availability Matrix

| Chart | Data Source | Available? | Gaps | Solution |
|-------|-------------|------------|------|----------|
| **Chart 1: Member Summary** | `pendingReimbursements` | ✅ Yes | Per-pair aggregation | Frontend grouping |
| **Chart 1: Member Summary** | Credit balances | ⚠️ Partial | All balances for group | New query (optional) |
| **Chart 2: Category Breakdown** | Category field | ❌ No | `category` not in query | **Code change required** |
| **Chart 2: Category Breakdown** | Amount per category | ✅ Yes | Aggregation | Frontend grouping |
| **Chart 3: Monthly Evolution** | Current pending | ✅ Yes | Historical data | New query (optional) |
| **Chart 3: Monthly Evolution** | Payment history | ✅ Yes | Monthly aggregation | Frontend grouping |

### Recommended Implementation Order

**Phase 1: Quick Wins (Reuse Existing Data)**
1. ✅ **Chart 1:** Implement with `pendingReimbursements` grouping
2. ✅ **Chart 3:** Implement current state monthly view

**Phase 2: Code Changes**
3. 🔴 **Chart 2:** Add `category` to `getPendingReimbursements()` query
4. ✅ **Chart 2:** Implement category breakdown with new data

**Phase 3: Enhanced Features (Optional)**
5. ⚠️ **Chart 1:** Add credit balances query
6. ⚠️ **Chart 3:** Add historical evolution query

---

**AGENT-2-DEPENDENCIES-COMPLETE**
