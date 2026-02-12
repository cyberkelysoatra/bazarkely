# AGENT-2-DEPENDENCIES-PAYMENT-SYSTEM
**Date:** 2026-02-10  
**Agent:** Agent 2 (Dependency Mapping & Database Schema Verification)  
**Objective:** Map comprehensive dependency tree for payment system and verify database schema

---

## 1. DIRECT DEPENDENCIES

### Files Directly Importing Payment Components

#### **FamilyReimbursementsPage.tsx**
**File:** `frontend/src/pages/FamilyReimbursementsPage.tsx`  
**Line 26:** `import ReimbursementPaymentModal, { type PendingDebt } from '../components/Family/ReimbursementPaymentModal';`

**Usage:**
- Lines 45-49: Payment modal state management
- Lines 196-214: Handlers (`handleOpenPaymentModal`, `handleClosePaymentModal`, `handlePaymentRecorded`)
- Lines 545-557: Modal component rendering with props

**Integration Points:**
- Modal opened via "Enregistrer paiement" button (line 411)
- Receives `pendingDebts` from `uniqueDebtorsOwedToMe` (line 552-554)
- Calls `onPaymentRecorded` callback to refresh data (line 210-214)

#### **reimbursementService.ts**
**File:** `frontend/src/services/reimbursementService.ts`  
**Payment Functions:**
- `recordReimbursementPayment()` (lines 1202-1475)
- `getPaymentHistory()` (lines 1485-1642)
- `getMemberCreditBalance()` (lines 1653-1729)
- `getAllocationDetails()` (lines 1738-1876)

**Database Tables Used:**
- `reimbursement_payments` (lines 1322, 1521, 1753)
- `reimbursement_payment_allocations` (lines 1356, 1572, 1793)
- `member_credit_balance` (lines 1401, 1417, 1437, 1683)

**Type Exports:**
- `PaymentAllocationResult` (line 104)
- `PaymentAllocation` (line 118)
- `PaymentHistoryEntry` (line 138)
- `PaymentAllocationDetail` (line 155)
- `MemberCreditBalance` (line 167)
- `PaymentAllocationDetails` (line 182)

#### **components/Family/index.ts**
**File:** `frontend/src/components/Family/index.ts`  
**Line 12:** `export { default as ReimbursementPaymentModal } from './ReimbursementPaymentModal';`  
**Lines 16-18:** Type exports (`ReimbursementPaymentModalProps`, `PendingDebt`)

**Purpose:** Central export point for Family components

---

## 2. INDIRECT DEPENDENCIES

### Components Depending on Payment State/Context

**Result:** ✅ **NO INDIRECT DEPENDENCIES FOUND**

**Analysis:**
- Payment system is **isolated** to `FamilyReimbursementsPage`
- No global state management (Zustand stores) used for payments
- No context providers for payment data
- No shared hooks consuming payment functions
- Payment functions are called directly from modal component

**Components Using Payment-Related Data (Read-Only):**
- `FamilyDashboardPage.tsx`: Displays pending reimbursement counts (uses `getPendingReimbursements()` - **NOT payment functions**)
- `FamilyBalancePage.tsx`: Shows member balances (uses `getMemberBalances()` - **NOT payment functions**)

**Conclusion:** Payment system modifications have **zero impact** on other components.

---

## 3. DATABASE SCHEMA VERIFICATION

### Actual vs Documented Schema

#### **Table 1: reimbursement_payments**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 34-78

**Actual Schema:**
```sql
CREATE TABLE public.reimbursement_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MGA' CHECK (currency IN ('MGA', 'EUR')),
  notes TEXT NULL,
  payment_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT reimbursement_payments_from_to_different CHECK (from_member_id != to_member_id)
);
```

**Documented Schema (RESUME-SESSION-2026-02-10-S45):**
- ✅ Matches: 12 columns mentioned
- ✅ Matches: Foreign keys to `family_groups`, `family_members`
- ✅ Matches: Currency constraint ('MGA', 'EUR')
- ✅ Matches: Amount > 0 constraint
- ✅ Matches: Different members constraint

**Discrepancy Found:**
- ❌ **Service code expects:** `total_amount`, `allocated_amount`, `surplus_amount` (lines 1327-1329)
- ✅ **Actual schema has:** `amount` only
- ⚠️ **Issue:** Service function `recordReimbursementPayment()` inserts columns that don't exist in schema

**Indexes:**
- ✅ `idx_reimbursement_payments_family_group_id` (line 58)
- ✅ `idx_reimbursement_payments_from_member_id` (line 60)
- ✅ `idx_reimbursement_payments_to_member_id` (line 62)
- ✅ `idx_reimbursement_payments_payment_date` (line 64)
- ✅ `idx_reimbursement_payments_created_at` (line 66)

#### **Table 2: reimbursement_payment_allocations**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 88-106

**Actual Schema:**
```sql
CREATE TABLE public.reimbursement_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.reimbursement_payments(id) ON DELETE CASCADE,
  reimbursement_request_id UUID NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE RESTRICT,
  allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
  remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reimbursement_payment_allocation_pair UNIQUE (payment_id, reimbursement_request_id)
);
```

**Documented Schema (RESUME-SESSION-2026-02-10-S45):**
- ✅ Matches: 6 columns mentioned
- ✅ Matches: Foreign keys to `reimbursement_payments`, `reimbursement_requests`
- ✅ Matches: Unique constraint on (payment_id, reimbursement_request_id)

**Discrepancy Found:**
- ❌ **Service code expects:** `request_amount`, `remaining_amount`, `is_fully_paid` (lines 1350-1352)
- ✅ **Actual schema has:** `allocated_amount`, `remaining_balance` only
- ⚠️ **Issue:** Service function inserts columns that don't exist in schema

**Indexes:**
- ✅ `idx_reimbursement_payment_allocations_payment_id` (line 102)
- ✅ `idx_reimbursement_payment_allocations_request_id` (line 104)

#### **Table 3: member_credit_balance**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 115-151

**Actual Schema:**
```sql
CREATE TABLE public.member_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  creditor_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  debtor_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'MGA' CHECK (currency IN ('MGA', 'EUR')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT member_credit_balance_creditor_debtor_different CHECK (creditor_member_id != debtor_member_id),
  CONSTRAINT uq_member_credit_balance_pair UNIQUE (family_group_id, creditor_member_id, debtor_member_id)
);
```

**Documented Schema (RESUME-SESSION-2026-02-10-S45):**
- ✅ Matches: 8 columns mentioned
- ✅ Matches: Foreign keys to `family_groups`, `family_members`
- ✅ Matches: Unique constraint on (family_group_id, creditor_member_id, debtor_member_id)

**Discrepancy Found:**
- ❌ **Service code expects:** `from_member_id`, `to_member_id`, `credit_amount`, `last_payment_date` (lines 1404-1405, 1419-1421, 1440-1444)
- ✅ **Actual schema has:** `creditor_member_id`, `debtor_member_id`, `balance` only
- ⚠️ **Issue:** Service function uses column names that don't match schema

**Indexes:**
- ✅ `idx_member_credit_balance_family_group_id` (line 135)
- ✅ `idx_member_credit_balance_creditor` (line 137)
- ✅ `idx_member_credit_balance_debtor` (line 139)

---

## 4. FIFO ALLOCATION LOGIC

### Implementation Location

#### **Application Layer (Frontend Service)**
**File:** `frontend/src/services/reimbursementService.ts`  
**Function:** `recordReimbursementPayment()`  
**Lines:** 1269-1315

**FIFO Algorithm:**
```typescript
// 1. Fetch pending requests ordered by creation date (oldest first)
const { data: pendingRequests } = await supabase
  .from('reimbursement_requests')
  .select('*')
  .eq('from_member_id', fromMemberId)
  .eq('to_member_id', toMemberId)
  .eq('status', 'pending')
  .order('created_at', { ascending: true }); // FIFO: oldest first

// 2. Allocate payment sequentially
let remainingPayment = amount;
for (const request of requests) {
  if (remainingPayment <= 0) break;
  
  const allocatedToThisRequest = Math.min(remainingPayment, requestAmount);
  remainingPayment -= allocatedToThisRequest;
  // ... create allocation record
}
```

**Preview Logic (UI):**
**File:** `frontend/src/components/Family/ReimbursementPaymentModal.tsx`  
**Lines:** 152-190

**FIFO Preview:**
```typescript
// Sort debts by date (oldest first) for FIFO
const sortedDebts = [...pendingDebts].sort(
  (a, b) => a.date.getTime() - b.date.getTime()
);

// Allocate sequentially
for (const debt of sortedDebts) {
  if (remainingPayment <= 0) break;
  const allocatedAmount = Math.min(remainingPayment, debtAmount);
  remainingPayment -= allocatedAmount;
}
```

#### **Database Layer**
**Result:** ❌ **NO DATABASE TRIGGERS OR STORED PROCEDURES**

**Analysis:**
- No PostgreSQL triggers for FIFO allocation
- No stored procedures for payment allocation
- No database-level FIFO enforcement
- All logic is **application-level** in TypeScript service functions

**Conclusion:** FIFO logic is **entirely frontend-controlled**. Database only stores results.

---

## 5. RLS POLICIES

### Row Level Security Configuration

#### **reimbursement_payments Table**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 168-214

**Policies:**
1. ✅ `reimbursement_payments_select_group_member` (SELECT) - Line 169
2. ✅ `reimbursement_payments_insert_group_member` (INSERT) - Line 181
3. ✅ `reimbursement_payments_update_group_member` (UPDATE) - Line 193
4. ✅ `reimbursement_payments_delete_group_member` (DELETE) - Line 205

**Access Pattern:**
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_group_id = reimbursement_payments.family_group_id
      AND fm.user_id = auth.uid()
      AND fm.is_active = true
  )
)
```

#### **reimbursement_payment_allocations Table**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 220-262

**Policies:**
1. ✅ `reimbursement_payment_allocations_select_group_member` (SELECT) - Line 221
2. ✅ `reimbursement_payment_allocations_insert_group_member` (INSERT) - Line 231
3. ✅ `reimbursement_payment_allocations_update_group_member` (UPDATE) - Line 243
4. ✅ `reimbursement_payment_allocations_delete_group_member` (DELETE) - Line 254

**Access Pattern:**
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.reimbursement_payments p
    JOIN public.family_members fm ON fm.family_group_id = p.family_group_id 
      AND fm.user_id = auth.uid() 
      AND fm.is_active = true
    WHERE p.id = reimbursement_payment_allocations.payment_id
  )
)
```

#### **member_credit_balance Table**
**Migration File:** `supabase/migrations/20260123150000_create_reimbursement_payment_tables.sql`  
**Lines:** 268-314

**Policies:**
1. ✅ `member_credit_balance_select_group_member` (SELECT) - Line 269
2. ✅ `member_credit_balance_insert_group_member` (INSERT) - Line 281
3. ✅ `member_credit_balance_update_group_member` (UPDATE) - Line 293
4. ✅ `member_credit_balance_delete_group_member` (DELETE) - Line 305

**Access Pattern:**
```sql
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_group_id = member_credit_balance.family_group_id
      AND fm.user_id = auth.uid()
      AND fm.is_active = true
  )
)
```

**Total RLS Policies:** ✅ **12 policies** (4 per table × 3 tables)

**Security Model:**
- ✅ Based on family group membership (same pattern as `family_members` table)
- ✅ Requires `is_active = true` membership
- ✅ Uses `auth.uid()` for user identification
- ✅ Consistent across all 3 tables

---

## 6. IMPACT ZONES

### Areas Affected by Payment System Modifications

#### **HIGH IMPACT ZONES**

**1. FamilyReimbursementsPage.tsx**
- **Impact:** Direct integration point
- **Risk:** HIGH if payment modal breaks
- **Dependencies:** `ReimbursementPaymentModal`, `reimbursementService`
- **Modifications:** Payment button, modal state, data refresh

**2. reimbursementService.ts**
- **Impact:** Core payment logic
- **Risk:** HIGH if service functions break
- **Dependencies:** Supabase client, database tables
- **Modifications:** Payment recording, allocation, history, credit balance

**3. Database Tables (3 tables)**
- **Impact:** Data persistence layer
- **Risk:** HIGH if schema changes break queries
- **Dependencies:** Foreign keys to `family_groups`, `family_members`, `reimbursement_requests`
- **Modifications:** Schema changes require migration

#### **MEDIUM IMPACT ZONES**

**4. ReimbursementPaymentModal.tsx**
- **Impact:** UI component for payment entry
- **Risk:** MEDIUM if UI breaks (isolated to Family module)
- **Dependencies:** Modal, Input, Button components, CurrencyDisplay
- **Modifications:** Form validation, FIFO preview, surplus detection

**5. RLS Policies**
- **Impact:** Security and access control
- **Risk:** MEDIUM if policies misconfigured (data leakage)
- **Dependencies:** `family_members` table for membership checks
- **Modifications:** Policy changes affect all payment queries

#### **LOW IMPACT ZONES**

**6. Type Definitions**
- **Impact:** TypeScript type safety
- **Risk:** LOW if types mismatch (compile-time errors)
- **Dependencies:** Service functions, component props
- **Modifications:** Type changes affect IDE autocomplete

**7. Indexes**
- **Impact:** Query performance
- **Risk:** LOW if indexes missing (slower queries)
- **Dependencies:** Table columns
- **Modifications:** Index changes affect query speed

---

## 7. RISK ASSESSMENT

### Risk Zones by Modification Type

#### **LOW RISK ZONES** ✅

**1. UI Component Modifications**
- **Files:** `ReimbursementPaymentModal.tsx`
- **Risk Level:** LOW
- **Reason:** Isolated component, no shared state
- **Blast Radius:** FamilyReimbursementsPage only
- **Mitigation:** Component tests, visual regression tests

**2. Type Definition Changes**
- **Files:** `reimbursementService.ts` (interfaces)
- **Risk Level:** LOW
- **Reason:** TypeScript compile-time checks catch errors
- **Blast Radius:** Files importing types
- **Mitigation:** TypeScript strict mode, IDE checks

**3. Read-Only Service Functions**
- **Files:** `getPaymentHistory()`, `getAllocationDetails()`, `getMemberCreditBalance()`
- **Risk Level:** LOW
- **Reason:** No data mutation, only queries
- **Blast Radius:** Components displaying payment history
- **Mitigation:** Error handling, fallback UI

#### **MEDIUM RISK ZONES** ⚠️

**4. Payment Recording Logic**
- **Files:** `recordReimbursementPayment()` in `reimbursementService.ts`
- **Risk Level:** MEDIUM
- **Reason:** Creates database records, affects reimbursement status
- **Blast Radius:** Payment flow, reimbursement status updates
- **Mitigation:** Transaction wrapping, rollback on error, validation

**5. Database Schema Changes**
- **Files:** Migration SQL files
- **Risk Level:** MEDIUM
- **Reason:** Schema changes affect all queries
- **Blast Radius:** All payment-related queries
- **Mitigation:** Migration testing, backward compatibility, gradual rollout

**6. RLS Policy Changes**
- **Files:** Migration SQL files (RLS policies)
- **Risk Level:** MEDIUM
- **Reason:** Security implications, access control
- **Blast Radius:** All payment data access
- **Mitigation:** Policy testing, access audits, gradual rollout

#### **HIGH RISK ZONES** 🔴

**7. FIFO Allocation Algorithm**
- **Files:** `recordReimbursementPayment()` lines 1285-1315
- **Risk Level:** HIGH
- **Reason:** Core business logic, affects payment distribution
- **Blast Radius:** All payment allocations, reimbursement statuses
- **Mitigation:** Unit tests, integration tests, manual verification

**8. Surplus/Credit Balance Logic**
- **Files:** `recordReimbursementPayment()` lines 1394-1457
- **Risk Level:** HIGH
- **Reason:** Creates credit balances, affects future payments
- **Blast Radius:** Credit balance calculations, future allocations
- **Mitigation:** Edge case testing, balance verification, audit logs

**9. Database Foreign Key Relationships**
- **Files:** Migration SQL files (foreign keys)
- **Risk Level:** HIGH
- **Reason:** Data integrity, cascade behavior
- **Blast Radius:** All related tables (family_groups, family_members, reimbursement_requests)
- **Mitigation:** Foreign key testing, cascade behavior verification

---

## 8. CRITICAL ISSUES IDENTIFIED

### Schema vs Service Code Mismatch

#### **Issue 1: reimbursement_payments Column Mismatch**
**Location:** `reimbursementService.ts` lines 1327-1329  
**Problem:** Service code inserts columns that don't exist in schema

**Service Code Expects:**
```typescript
{
  total_amount: amount,
  allocated_amount: allocatedAmount,
  surplus_amount: surplusAmount,
  // ...
}
```

**Actual Schema Has:**
```sql
amount NUMERIC(15, 2) NOT NULL
-- No total_amount, allocated_amount, surplus_amount columns
```

**Impact:** 🔴 **CRITICAL** - Payment recording will fail  
**Fix Required:** Either:
1. Add missing columns to schema (migration)
2. Remove column references from service code
3. Calculate values in application layer

#### **Issue 2: reimbursement_payment_allocations Column Mismatch**
**Location:** `reimbursementService.ts` lines 1350-1352  
**Problem:** Service code inserts columns that don't exist in schema

**Service Code Expects:**
```typescript
{
  request_amount: allocation.requestAmount,
  remaining_amount: allocation.remainingAmount,
  is_fully_paid: allocation.isFullyPaid,
  // ...
}
```

**Actual Schema Has:**
```sql
allocated_amount NUMERIC(15, 2) NOT NULL,
remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0
-- No request_amount, remaining_amount, is_fully_paid columns
```

**Impact:** 🔴 **CRITICAL** - Allocation recording will fail  
**Fix Required:** Either:
1. Add missing columns to schema (migration)
2. Remove column references from service code
3. Store only `allocated_amount` and `remaining_balance`

#### **Issue 3: member_credit_balance Column Mismatch**
**Location:** `reimbursementService.ts` lines 1404-1405, 1419-1421, 1440-1444  
**Problem:** Service code uses column names that don't match schema

**Service Code Expects:**
```typescript
{
  from_member_id: fromMemberId,
  to_member_id: toMemberId,
  credit_amount: surplusAmount,
  last_payment_date: new Date().toISOString(),
  // ...
}
```

**Actual Schema Has:**
```sql
creditor_member_id UUID NOT NULL,
debtor_member_id UUID NOT NULL,
balance NUMERIC(15, 2) NOT NULL DEFAULT 0
-- No from_member_id, to_member_id, credit_amount, last_payment_date columns
```

**Impact:** 🔴 **CRITICAL** - Credit balance creation/update will fail  
**Fix Required:** Either:
1. Rename columns in schema to match service code (migration)
2. Update service code to use correct column names
3. Map column names in service layer

---

## 9. SUMMARY

### Dependency Tree

```
Payment System
├── Direct Dependencies
│   ├── FamilyReimbursementsPage.tsx
│   │   └── ReimbursementPaymentModal.tsx
│   └── reimbursementService.ts
│       ├── recordReimbursementPayment()
│       ├── getPaymentHistory()
│       ├── getMemberCreditBalance()
│       └── getAllocationDetails()
│
├── Database Tables
│   ├── reimbursement_payments (12 columns, 5 indexes, 4 RLS policies)
│   ├── reimbursement_payment_allocations (6 columns, 2 indexes, 4 RLS policies)
│   └── member_credit_balance (8 columns, 3 indexes, 4 RLS policies)
│
└── Indirect Dependencies
    └── NONE (isolated system)
```

### Schema Verification Status

**Tables Created:** ✅ 3/3  
**Indexes Created:** ✅ 10/10  
**RLS Policies:** ✅ 12/12  
**Foreign Keys:** ✅ All validated  
**Schema vs Code Match:** ❌ **3 CRITICAL MISMATCHES**

### FIFO Logic Location

**Implementation:** ✅ Application layer (TypeScript)  
**Database Triggers:** ❌ None  
**Stored Procedures:** ❌ None  
**Preview Logic:** ✅ UI component (ReimbursementPaymentModal)

### Blast Radius

**High Impact:** 3 files (FamilyReimbursementsPage, reimbursementService, database schema)  
**Medium Impact:** 1 file (ReimbursementPaymentModal)  
**Low Impact:** Type definitions, indexes  
**Zero Impact:** All other application files

### Risk Assessment

**Low Risk:** UI components, type definitions, read-only queries  
**Medium Risk:** Payment recording, schema changes, RLS policies  
**High Risk:** FIFO algorithm, credit balance logic, foreign keys

---

## 10. RECOMMENDATIONS

### Immediate Actions Required

1. **🔴 CRITICAL: Fix Schema Mismatches**
   - Resolve column name mismatches between service code and database schema
   - Choose approach: Update schema OR update service code
   - Test payment recording end-to-end after fix

2. **⚠️ HIGH PRIORITY: Add Integration Tests**
   - Test FIFO allocation algorithm with multiple scenarios
   - Test surplus detection and credit balance creation
   - Test payment history retrieval

3. **⚠️ MEDIUM PRIORITY: Add Error Handling**
   - Wrap payment operations in database transactions
   - Add rollback logic for failed allocations
   - Add validation for payment amounts and member IDs

4. **✅ LOW PRIORITY: Performance Optimization**
   - Add database indexes for common query patterns
   - Consider materialized views for credit balance aggregation
   - Add pagination for payment history queries

---

**AGENT-2-DEPENDENCIES-COMPLETE**
