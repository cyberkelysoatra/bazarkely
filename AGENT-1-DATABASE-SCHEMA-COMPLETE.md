# AGENT-1 - DATABASE SCHEMA ANALYSIS REPORT
## Pending Reimbursements Feature Investigation

**Date:** 2025-01-19  
**Agent:** AGENT01 - DATABASE/SCHEMA  
**Objective:** Investigate database schema for reimbursement tracking fields in Family Space feature

---

## 1. FAMILY_SHARED_TRANSACTIONS SCHEMA

### Table: `family_shared_transactions`

**Complete Column List with Types:**

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | PRIMARY KEY - Identifiant unique |
| `family_group_id` | UUID | NO | FOREIGN KEY → `family_groups.id` |
| `transaction_id` | UUID | YES | FOREIGN KEY → `transactions.id` (nullable for virtual transactions) |
| `shared_by` | UUID | NO | FOREIGN KEY → `auth.users(id)` - User who shared the transaction |
| `paid_by` | UUID | YES | FOREIGN KEY → `auth.users(id)` - User who actually paid (added 2025-12-08) |
| `is_private` | BOOLEAN | NO | Default: false - Indicates if transaction is private |
| `split_type` | TEXT | YES | Type of cost split: 'paid_by_one', 'split_equal', 'split_custom' |
| `split_details` | JSONB | YES | Custom split details (array of SplitDetail objects) |
| `has_reimbursement_request` | BOOLEAN | NO | **KEY FIELD** - Default: false - Indicates if reimbursement request is pending |
| `shared_at` | TIMESTAMP | NO | Default: CURRENT_TIMESTAMP - Date/time of sharing |
| `created_at` | TIMESTAMP | NO | Default: CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | NO | Default: CURRENT_TIMESTAMP |

**Indexes:**
- PRIMARY KEY on `id`
- `idx_family_shared_transactions_paid_by` on `paid_by` (for optimization)

**Foreign Keys:**
- `family_group_id` → `family_groups.id`
- `transaction_id` → `transactions.id`
- `shared_by` → `auth.users(id)`
- `paid_by` → `auth.users(id)`

**Source:** `DATABASE-SCHEMA-FAMILY-SHARED-TRANSACTIONS.md` (lines 9-29)

---

## 2. REIMBURSEMENT FIELDS FOUND

### In `family_shared_transactions` table:

1. **`has_reimbursement_request`** (BOOLEAN)
   - **Type:** BOOLEAN NOT NULL
   - **Default:** false
   - **Purpose:** Indicates if a reimbursement request is pending for this shared transaction
   - **Usage:** 
     - Set to `true` when user requests reimbursement
     - Used in `FamilyDashboardPage.tsx` to filter pending requests (line 140-146)
     - Updated via RPC function `update_reimbursement_request` (bypasses RLS)
   - **Location in code:**
     - `familySharingService.ts` line 172: Default value on insert
     - `familySharingService.ts` lines 340-353: Update logic via RPC
     - `TransactionDetailPage.tsx` lines 39-177: UI toggle for reimbursement request
     - `FamilyDashboardPage.tsx` lines 134-154: Query for pending requests

2. **`paid_by`** (UUID, nullable)
   - **Type:** UUID NULLABLE
   - **Purpose:** Tracks who actually paid for the shared transaction
   - **Added:** 2025-12-08
   - **Usage:** Essential for calculating reimbursement balances
   - **Fallback:** If NULL, use `shared_by` for backward compatibility

### In TypeScript Types (`frontend/src/types/family.ts`):

1. **`ReimbursementStatus`** (Type Union)
   - Values: `'pending' | 'accepted' | 'declined' | 'settled' | 'cancelled'`
   - Location: Line 29-34

2. **`ReimbursementRequest`** (Interface)
   - Complete interface defined at lines 152-168
   - Fields:
     - `id`, `familyGroupId`, `requestedBy`, `requestedFrom`
     - `familySharedTransactionId`, `amount`, `description`
     - `status: ReimbursementStatus`
     - `statusChangedAt`, `statusChangedBy`, `notes`
     - `createdAt`, `updatedAt`, `sharedTransaction?`

3. **`ReimbursementRequestRow`** (Supabase format)
   - Snake_case format for database rows
   - Location: Lines 396-410

---

## 3. RELATED TABLES

### Table: `reimbursement_requests` (Expected but NOT FOUND in migrations)

**Status:** ⚠️ **TABLE NOT FOUND IN MIGRATIONS**

**Expected Structure (from TypeScript types):**
Based on `ReimbursementRequestRow` interface (lines 396-410):

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | NO | PRIMARY KEY |
| `family_group_id` | UUID | NO | FOREIGN KEY → `family_groups.id` |
| `requested_by` | UUID | NO | FOREIGN KEY → `auth.users(id)` - Requester |
| `requested_from` | UUID | NO | FOREIGN KEY → `auth.users(id)` - Person who should reimburse |
| `family_shared_transaction_id` | UUID | NO | FOREIGN KEY → `family_shared_transactions.id` |
| `amount` | NUMERIC | NO | Reimbursement amount |
| `description` | TEXT | NO | Description of request |
| `status` | TEXT | NO | 'pending' | 'accepted' | 'declined' | 'settled' | 'cancelled' |
| `status_changed_at` | TIMESTAMP | NO | When status was last changed |
| `status_changed_by` | UUID | YES | FOREIGN KEY → `auth.users(id)` - Who changed status |
| `notes` | TEXT | YES | Optional notes |
| `created_at` | TIMESTAMP | NO | Default: CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | NO | Default: CURRENT_TIMESTAMP |

**Evidence:**
- TypeScript types exist (`ReimbursementRequestRow` interface)
- Service methods expected but NOT found in `familyGroupService.ts`
- No migration file found creating this table
- No SQL CREATE TABLE statement found in codebase

### Other Related Tables:

1. **`family_balances`** (Expected)
   - For tracking balances between family members
   - TypeScript interface exists: `FamilyBalance` (lines 173-186)
   - TypeScript row format: `FamilyBalanceRow` (lines 415-428)
   - **Status:** ⚠️ **NOT FOUND IN MIGRATIONS**

2. **`family_sharing_rules`** (Expected)
   - For automatic sharing rules
   - TypeScript interface exists: `FamilySharingRule` (lines 134-147)
   - TypeScript row format: `FamilySharingRuleRow` (lines 378-391)
   - **Status:** ⚠️ **NOT FOUND IN MIGRATIONS**

---

## 4. SERVICE METHODS

### In `familyGroupService.ts`:

**Result:** ❌ **NO REIMBURSEMENT METHODS FOUND**

The service contains only:
- `createFamilyGroup()`
- `getUserFamilyGroups()`
- `getFamilyGroupByCode()`
- `joinFamilyGroup()`
- `getFamilyGroupMembers()`
- `updateMemberSettings()`
- `leaveFamilyGroup()`
- `removeMember()`
- `regenerateInviteCode()`

**Missing Methods (Expected from types):**
- `createReimbursementRequest()`
- `getReimbursementRequests()`
- `updateReimbursementRequest()`
- `getPendingReimbursements()`
- `settleReimbursement()`

### In `familySharingService.ts`:

**Reimbursement-related code found:**

1. **`has_reimbursement_request` field handling:**
   - Line 172: Default value `false` on insert
   - Lines 340-353: Update via RPC function `update_reimbursement_request`
   - Lines 432-435: Exclusion from regular update operations

2. **RPC Function Usage:**
   - `update_reimbursement_request` RPC function called when updating `hasReimbursementRequest`
   - Bypasses RLS for this specific field update
   - Parameters: `p_family_shared_transaction_id`, `p_has_reimbursement_request`

**Note:** The RPC function `update_reimbursement_request` is referenced but its definition was not found in migrations.

---

## 5. RECOMMENDATION

### Current State:

✅ **EXISTING FIELDS:**
- `has_reimbursement_request` (BOOLEAN) in `family_shared_transactions` - **EXISTS**
- `paid_by` (UUID) in `family_shared_transactions` - **EXISTS**

❌ **MISSING TABLE:**
- `reimbursement_requests` table - **DOES NOT EXIST** (types defined but no migration)

❌ **MISSING SERVICE METHODS:**
- Reimbursement CRUD operations - **NOT IMPLEMENTED**

### Recommendation:

**OPTION 1: Use Existing `has_reimbursement_request` Field (Quick Solution)**

**Pros:**
- Field already exists in database
- Already used in `FamilyDashboardPage.tsx` for filtering
- RPC function `update_reimbursement_request` exists (referenced in code)

**Cons:**
- Limited tracking (only boolean flag)
- No status tracking (pending/accepted/declined/settled)
- No amount tracking (uses transaction amount)
- No audit trail (who changed status, when)

**Implementation:**
- Create "Pending Reimbursements" page that queries `family_shared_transactions` WHERE `has_reimbursement_request = true`
- Display transactions with reimbursement flag
- Allow users to mark as settled (set `has_reimbursement_request = false`)

**SQL Query Example:**
```sql
SELECT 
  fst.*,
  t.description,
  t.amount,
  t.category,
  t.date,
  u_paid.email as paid_by_email,
  u_shared.email as shared_by_email
FROM family_shared_transactions fst
LEFT JOIN transactions t ON fst.transaction_id = t.id
LEFT JOIN auth.users u_paid ON fst.paid_by = u_paid.id
LEFT JOIN auth.users u_shared ON fst.shared_by = u_shared.id
WHERE fst.family_group_id = $1
  AND fst.has_reimbursement_request = true
ORDER BY fst.shared_at DESC;
```

**OPTION 2: Create Full `reimbursement_requests` Table (Complete Solution)**

**Pros:**
- Full status tracking (pending/accepted/declined/settled/cancelled)
- Audit trail (statusChangedAt, statusChangedBy)
- Separate amount tracking (can differ from transaction amount)
- Better data model for complex reimbursement workflows

**Cons:**
- Requires new migration
- More complex implementation
- Need to sync with `has_reimbursement_request` flag

**Required Migration:**
```sql
CREATE TABLE IF NOT EXISTS reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  requested_from UUID NOT NULL REFERENCES auth.users(id),
  family_shared_transaction_id UUID NOT NULL REFERENCES family_shared_transactions(id) ON DELETE CASCADE,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined', 'settled', 'cancelled')) DEFAULT 'pending',
  status_changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status_changed_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraint: requested_from must be different from requested_by
  CONSTRAINT check_different_users CHECK (requested_by != requested_from),
  
  -- Unique: one pending request per shared transaction
  CONSTRAINT unique_pending_per_transaction UNIQUE (family_shared_transaction_id, status) 
    WHERE status = 'pending'
);

CREATE INDEX idx_reimbursement_requests_family_group ON reimbursement_requests(family_group_id);
CREATE INDEX idx_reimbursement_requests_status ON reimbursement_requests(status);
CREATE INDEX idx_reimbursement_requests_requested_by ON reimbursement_requests(requested_by);
CREATE INDEX idx_reimbursement_requests_requested_from ON reimbursement_requests(requested_from);
CREATE INDEX idx_reimbursement_requests_transaction ON reimbursement_requests(family_shared_transaction_id);
```

### Final Recommendation:

**For "Pending Reimbursements" page implementation:**

1. **Short-term (Quick MVP):** Use existing `has_reimbursement_request` field
   - Query `family_shared_transactions` WHERE `has_reimbursement_request = true`
   - Display list with transaction details
   - Allow marking as settled (toggle flag to false)

2. **Long-term (Full Feature):** Create `reimbursement_requests` table
   - Implement full status workflow
   - Add service methods in `familyGroupService.ts` or new `reimbursementService.ts`
   - Sync with `has_reimbursement_request` flag via triggers or application logic

**Current Implementation Status:**
- ✅ Database field exists: `has_reimbursement_request`
- ✅ UI toggle exists: `TransactionDetailPage.tsx`
- ✅ Dashboard filtering exists: `FamilyDashboardPage.tsx`
- ❌ Dedicated page missing: "Pending Reimbursements" page
- ❌ Service methods missing: CRUD operations for reimbursements
- ❌ Full table missing: `reimbursement_requests` table

---

## SUMMARY

| Component | Status | Location |
|-----------|--------|----------|
| `has_reimbursement_request` field | ✅ EXISTS | `family_shared_transactions` table |
| `paid_by` field | ✅ EXISTS | `family_shared_transactions` table |
| `reimbursement_requests` table | ❌ MISSING | Types defined but no migration |
| Reimbursement service methods | ❌ MISSING | Not in `familyGroupService.ts` |
| RPC function `update_reimbursement_request` | ⚠️ REFERENCED | Used in code but definition not found |
| TypeScript types | ✅ EXISTS | `frontend/src/types/family.ts` |

**Conclusion:** The basic infrastructure exists (`has_reimbursement_request` flag), but the full reimbursement tracking system (`reimbursement_requests` table) is not implemented in the database despite having TypeScript type definitions.

---

**AGENT-1-DATABASE-SCHEMA-COMPLETE**








