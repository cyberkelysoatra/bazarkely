# AGENT-01-DATABASE-SCHEMA-REIMBURSEMENT-PAYMENTS-PHASE1
**Date:** 2026-01-23  
**Agent:** Agent 01 (Database Schema Design)  
**Objective:** Design complete database schema for Phase 1 reimbursement payment system with multi-debt support, partial payments, overpayments, and payment history

---

## 1. EXISTING SCHEMA ANALYSIS

### 1.1 Current `reimbursement_requests` Table Structure

Based on TypeScript interfaces and service code analysis:

```sql
-- Current reimbursement_requests table (inferred from code)
CREATE TABLE public.reimbursement_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_transaction_id UUID NOT NULL REFERENCES public.family_shared_transactions(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,  -- Debtor (who owes)
  to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE CASCADE,    -- Creditor (who is owed)
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MGA',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'settled', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  settled_at TIMESTAMP WITH TIME ZONE,
  settled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT
);

-- Indexes (inferred)
CREATE INDEX idx_reimbursement_requests_from_member ON public.reimbursement_requests(from_member_id);
CREATE INDEX idx_reimbursement_requests_to_member ON public.reimbursement_requests(to_member_id);
CREATE INDEX idx_reimbursement_requests_status ON public.reimbursement_requests(status);
CREATE INDEX idx_reimbursement_requests_shared_transaction ON public.reimbursement_requests(shared_transaction_id);
```

**Key Characteristics:**
- Links to `family_shared_transactions` via `shared_transaction_id`
- Uses `family_members.id` (not `auth.users.id`) for member references
- Status: `pending`, `settled`, `cancelled`
- Current limitation: Only supports full settlement at exact amount

### 1.2 Current `family_members` Table Structure

```sql
-- Current family_members table (from TypeScript interfaces)
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  CONSTRAINT unique_family_user UNIQUE (family_group_id, user_id) WHERE user_id IS NOT NULL
);

-- Indexes
CREATE INDEX idx_family_members_group ON public.family_members(family_group_id);
CREATE INDEX idx_family_members_user ON public.family_members(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_family_members_active ON public.family_members(is_active) WHERE is_active = true;
```

**Key Characteristics:**
- Links to `family_groups` and `auth.users`
- Supports guest members (`user_id` can be NULL)
- `is_active` flag for soft deletion

### 1.3 Current `family_groups` Table Structure

```sql
-- Current family_groups table (from TypeScript interfaces)
CREATE TABLE public.family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_family_groups_created_by ON public.family_groups(created_by);
```

### 1.4 Existing Foreign Key Relationships

**Current Relationships:**
- `reimbursement_requests.shared_transaction_id` → `family_shared_transactions.id` (CASCADE DELETE)
- `reimbursement_requests.from_member_id` → `family_members.id` (CASCADE DELETE)
- `reimbursement_requests.to_member_id` → `family_members.id` (CASCADE DELETE)
- `family_members.family_group_id` → `family_groups.id` (CASCADE DELETE)
- `family_members.user_id` → `auth.users.id` (SET NULL)

### 1.5 Current RLS Policies Pattern

**Pattern Observed:**
- Uses `EXISTS` subqueries to check membership
- Checks if user is active member of the same `family_group_id`
- Pattern: `EXISTS (SELECT 1 FROM family_members WHERE user_id = auth.uid() AND family_group_id = ... AND is_active = true)`

**Example from `family_members` RLS:**
```sql
CREATE POLICY "family_members_select_group_members"
ON public.family_members
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.family_members AS user_membership
        WHERE user_membership.user_id = auth.uid()
          AND user_membership.family_group_id = family_members.family_group_id
          AND user_membership.is_active = true
    )
    AND is_active = true
);
```

**RLS Pattern for Family-Related Tables:**
- **SELECT:** User must be active member of the same `family_group_id`
- **INSERT:** User must be active member of the target `family_group_id`
- **UPDATE:** User must be active member AND (be the record owner OR be admin)
- **DELETE:** User must be active member AND (be the record owner OR be admin)

---

## 2. NEW TABLES DESIGN

### 2.1 Table: `reimbursement_payments`

**Purpose:** Stores each payment transaction between members. A single payment can be allocated to multiple reimbursement requests (multi-debt support).

```sql
CREATE TABLE public.reimbursement_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,  -- Payer
  to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,    -- Payee
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'MGA',
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'transfer', 'mobile_money', 'other')),
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure payer and payee are different
  CONSTRAINT check_different_members CHECK (from_member_id != to_member_id),
  -- Ensure both members belong to the same family group
  CONSTRAINT check_same_group CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_group_id = fm2.family_group_id
      WHERE fm1.id = from_member_id AND fm2.id = to_member_id
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_reimbursement_payments_family_group ON public.reimbursement_payments(family_group_id);
CREATE INDEX idx_reimbursement_payments_from_member ON public.reimbursement_payments(from_member_id);
CREATE INDEX idx_reimbursement_payments_to_member ON public.reimbursement_payments(to_member_id);
CREATE INDEX idx_reimbursement_payments_date ON public.reimbursement_payments(payment_date DESC);
CREATE INDEX idx_reimbursement_payments_created_at ON public.reimbursement_payments(created_at DESC);

-- Composite index for common queries (payment history between two members)
CREATE INDEX idx_reimbursement_payments_members ON public.reimbursement_payments(from_member_id, to_member_id, payment_date DESC);

COMMENT ON TABLE public.reimbursement_payments IS 'Payment transactions between family members. Supports multi-debt allocation and surplus handling.';
COMMENT ON COLUMN public.reimbursement_payments.from_member_id IS 'Member who made the payment (payer)';
COMMENT ON COLUMN public.reimbursement_payments.to_member_id IS 'Member who received the payment (payee/creditor)';
COMMENT ON COLUMN public.reimbursement_payments.amount IS 'Total payment amount (can exceed total debt, creating surplus)';
COMMENT ON COLUMN public.reimbursement_payments.payment_method IS 'Method used: cash, transfer, mobile_money, other';
COMMENT ON COLUMN public.reimbursement_payments.payment_date IS 'Date when payment was made (can be in the past for historical entries)';
```

**Design Justification:**
- **`family_group_id`:** Direct reference for RLS policies and group-level queries
- **`from_member_id` / `to_member_id`:** Uses `family_members.id` (not `auth.users.id`) for consistency with existing schema
- **`amount`:** Total payment amount (can exceed debt, creating surplus)
- **`payment_method`:** Enum for common payment types
- **`payment_date`:** Separate from `created_at` to allow historical entries
- **`created_by`:** Tracks who recorded the payment (may differ from payer)
- **Constraints:** Ensure data integrity (different members, same group)

### 2.2 Table: `reimbursement_allocations`

**Purpose:** Links payments to specific reimbursement requests. Enables multi-debt allocation (FIFO logic) and partial payment tracking.

```sql
CREATE TABLE public.reimbursement_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.reimbursement_payments(id) ON DELETE CASCADE,
  reimbursement_request_id UUID NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE RESTRICT,
  allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure allocation doesn't exceed payment amount
  -- Note: This is enforced at application level via transaction logic
  -- Database constraint would require complex subquery
  
  -- Ensure allocation doesn't exceed remaining request amount
  -- Note: This is enforced at application level via transaction logic
  
  -- Prevent duplicate allocations for same payment+request
  CONSTRAINT unique_payment_request UNIQUE (payment_id, reimbursement_request_id)
);

-- Indexes for performance
CREATE INDEX idx_reimbursement_allocations_payment ON public.reimbursement_allocations(payment_id);
CREATE INDEX idx_reimbursement_allocations_request ON public.reimbursement_allocations(reimbursement_request_id);
CREATE INDEX idx_reimbursement_allocations_payment_request ON public.reimbursement_allocations(payment_id, reimbursement_request_id);

-- Composite index for common queries (all allocations for a request)
CREATE INDEX idx_reimbursement_allocations_by_request ON public.reimbursement_allocations(reimbursement_request_id, created_at DESC);

COMMENT ON TABLE public.reimbursement_allocations IS 'Links payments to reimbursement requests. Enables multi-debt allocation and partial payment tracking.';
COMMENT ON COLUMN public.reimbursement_allocations.allocated_amount IS 'Amount allocated from payment to this specific reimbursement request';
COMMENT ON COLUMN public.reimbursement_allocations.payment_id IS 'Payment transaction this allocation belongs to';
COMMENT ON COLUMN public.reimbursement_allocations.reimbursement_request_id IS 'Reimbursement request this allocation applies to';
```

**Design Justification:**
- **`payment_id`:** CASCADE DELETE ensures allocations are removed if payment is deleted
- **`reimbursement_request_id`:** RESTRICT DELETE prevents deletion of requests with allocations (must settle first)
- **`allocated_amount`:** Amount from payment applied to this specific request
- **Unique constraint:** Prevents double-allocation of same payment to same request
- **No amount constraints at DB level:** Application-level transaction logic ensures:
  - Sum of allocations ≤ payment amount
  - Sum of allocations ≤ remaining request amount

### 2.3 Table: `member_credit_balance`

**Purpose:** Tracks surplus amounts (acompte) between members when payment exceeds total debt. Used for future debt offset.

```sql
CREATE TABLE public.member_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  from_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,  -- Member who has credit
  to_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,  -- Member who owes credit
  credit_amount NUMERIC(15, 2) NOT NULL CHECK (credit_amount > 0),
  currency TEXT NOT NULL DEFAULT 'MGA',
  source_payment_id UUID REFERENCES public.reimbursement_payments(id) ON DELETE SET NULL,  -- Payment that created this credit
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Ensure credit holder and debtor are different
  CONSTRAINT check_different_members CHECK (from_member_id != to_member_id),
  -- Ensure both members belong to the same family group
  CONSTRAINT check_same_group CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members fm1
      JOIN public.family_members fm2 ON fm1.family_group_id = fm2.family_group_id
      WHERE fm1.id = from_member_id AND fm2.id = to_member_id
    )
  )
);

-- Indexes for performance
CREATE INDEX idx_member_credit_balance_family_group ON public.member_credit_balance(family_group_id);
CREATE INDEX idx_member_credit_balance_from_member ON public.member_credit_balance(from_member_id);
CREATE INDEX idx_member_credit_balance_to_member ON public.member_credit_balance(to_member_id);
CREATE INDEX idx_member_credit_balance_source_payment ON public.member_credit_balance(source_payment_id) WHERE source_payment_id IS NOT NULL;

-- Composite index for common queries (credit balance between two members)
CREATE INDEX idx_member_credit_balance_members ON public.member_credit_balance(from_member_id, to_member_id);

-- Unique constraint: One credit balance record per member pair per group
-- Note: Application logic aggregates multiple payments into single balance
-- If multiple records exist, they should be aggregated in queries
-- For simplicity, we allow multiple records but recommend aggregation at application level
-- Alternative: Use UPSERT logic to maintain single record per member pair

COMMENT ON TABLE public.member_credit_balance IS 'Tracks surplus amounts (acompte) between members when payment exceeds debt. Used for future debt offset.';
COMMENT ON COLUMN public.member_credit_balance.from_member_id IS 'Member who has credit (overpaid)';
COMMENT ON COLUMN public.member_credit_balance.to_member_id IS 'Member who owes credit (will use credit for future debt)';
COMMENT ON COLUMN public.member_credit_balance.credit_amount IS 'Amount of credit available';
COMMENT ON COLUMN public.member_credit_balance.source_payment_id IS 'Payment transaction that created this credit (for audit trail)';
```

**Design Justification:**
- **`family_group_id`:** Direct reference for RLS policies
- **`from_member_id`:** Member who has credit (overpaid)
- **`to_member_id`:** Member who owes credit (can use it for future debt)
- **`credit_amount`:** Positive amount representing surplus
- **`source_payment_id`:** Links credit to originating payment (audit trail)
- **SET NULL on payment delete:** Credit remains even if source payment is deleted (historical record)
- **Multiple records allowed:** Application can aggregate or maintain single record per member pair

---

## 3. RELATIONSHIPS MAPPING

### 3.1 Entity Relationship Diagram (Text)

```
family_groups (1) ──< (N) family_members
                         │
                         │ (N)
                         │
reimbursement_requests (N) ──< (1) family_shared_transactions
      │
      │ (1)
      │
      └──< (N) reimbursement_allocations (N) ──> (1) reimbursement_payments
                                                         │
                                                         │ (1)
                                                         │
                                                         └──> (0..1) member_credit_balance
```

### 3.2 Foreign Key Relationships

**New Relationships:**
1. **`reimbursement_payments.family_group_id`** → `family_groups.id` (CASCADE DELETE)
   - If group is deleted, all payments are deleted
   
2. **`reimbursement_payments.from_member_id`** → `family_members.id` (RESTRICT DELETE)
   - Prevents deletion of member with payment history
   
3. **`reimbursement_payments.to_member_id`** → `family_members.id` (RESTRICT DELETE)
   - Prevents deletion of member with payment history
   
4. **`reimbursement_allocations.payment_id`** → `reimbursement_payments.id` (CASCADE DELETE)
   - If payment is deleted, all allocations are deleted
   
5. **`reimbursement_allocations.reimbursement_request_id`** → `reimbursement_requests.id` (RESTRICT DELETE)
   - Prevents deletion of request with allocations (must settle first)
   
6. **`member_credit_balance.family_group_id`** → `family_groups.id` (CASCADE DELETE)
   - If group is deleted, all credit balances are deleted
   
7. **`member_credit_balance.from_member_id`** → `family_members.id` (RESTRICT DELETE)
   - Prevents deletion of member with credit balance
   
8. **`member_credit_balance.to_member_id`** → `family_members.id` (RESTRICT DELETE)
   - Prevents deletion of member with credit balance
   
9. **`member_credit_balance.source_payment_id`** → `reimbursement_payments.id` (SET NULL)
   - Credit remains even if source payment is deleted (audit trail)

### 3.3 Cascade Delete Behavior

**Cascade Delete Chain:**
```
family_groups (DELETE)
  └─> family_members (CASCADE)
  └─> reimbursement_payments (CASCADE)
      └─> reimbursement_allocations (CASCADE)
      └─> member_credit_balance.source_payment_id (SET NULL)
```

**Restrict Delete (Prevents Deletion):**
- `family_members` cannot be deleted if referenced by `reimbursement_payments`
- `reimbursement_requests` cannot be deleted if referenced by `reimbursement_allocations`

---

## 4. RLS POLICIES DESIGN

### 4.1 RLS Policy Pattern (Based on Existing Pattern)

**Common Pattern:**
```sql
-- Check if user is active member of the same family_group_id
EXISTS (
  SELECT 1
  FROM public.family_members AS user_membership
  WHERE user_membership.user_id = auth.uid()
    AND user_membership.family_group_id = <table>.family_group_id
    AND user_membership.is_active = true
)
```

### 4.2 RLS Policies for `reimbursement_payments`

```sql
-- Enable RLS
ALTER TABLE public.reimbursement_payments ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can see payments in their groups
CREATE POLICY "reimbursement_payments_select_group_members"
ON public.reimbursement_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = reimbursement_payments.family_group_id
      AND user_membership.is_active = true
  )
);

-- INSERT: Members can create payments in their groups
CREATE POLICY "reimbursement_payments_insert_group_members"
ON public.reimbursement_payments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = reimbursement_payments.family_group_id
      AND user_membership.is_active = true
  )
  -- Ensure user is either payer or payee (or admin)
  AND (
    EXISTS (
      SELECT 1 FROM public.family_members
      WHERE id = reimbursement_payments.from_member_id
        AND user_id = auth.uid()
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.family_members
      WHERE id = reimbursement_payments.to_member_id
        AND user_id = auth.uid()
        AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_group_id = reimbursement_payments.family_group_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  )
);

-- UPDATE: Only creator or admin can update payments
CREATE POLICY "reimbursement_payments_update_creator_or_admin"
ON public.reimbursement_payments
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = reimbursement_payments.family_group_id
      AND user_membership.is_active = true
  )
  AND (
    reimbursement_payments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_group_id = reimbursement_payments.family_group_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  )
);

-- DELETE: Only creator or admin can delete payments
CREATE POLICY "reimbursement_payments_delete_creator_or_admin"
ON public.reimbursement_payments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = reimbursement_payments.family_group_id
      AND user_membership.is_active = true
  )
  AND (
    reimbursement_payments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.family_members
      WHERE family_group_id = reimbursement_payments.family_group_id
        AND user_id = auth.uid()
        AND role = 'admin'
        AND is_active = true
    )
  )
);
```

### 4.3 RLS Policies for `reimbursement_allocations`

```sql
-- Enable RLS
ALTER TABLE public.reimbursement_allocations ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can see allocations for payments in their groups
CREATE POLICY "reimbursement_allocations_select_group_members"
ON public.reimbursement_allocations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reimbursement_payments AS rp
    JOIN public.family_members AS user_membership
      ON user_membership.family_group_id = rp.family_group_id
    WHERE rp.id = reimbursement_allocations.payment_id
      AND user_membership.user_id = auth.uid()
      AND user_membership.is_active = true
  )
);

-- INSERT: Members can create allocations for payments they created or are involved in
CREATE POLICY "reimbursement_allocations_insert_group_members"
ON public.reimbursement_allocations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.reimbursement_payments AS rp
    JOIN public.family_members AS user_membership
      ON user_membership.family_group_id = rp.family_group_id
    WHERE rp.id = reimbursement_allocations.payment_id
      AND user_membership.user_id = auth.uid()
      AND user_membership.is_active = true
      AND (
        rp.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_group_id = rp.family_group_id
            AND user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
      )
  )
);

-- UPDATE: Only payment creator or admin can update allocations
CREATE POLICY "reimbursement_allocations_update_creator_or_admin"
ON public.reimbursement_allocations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reimbursement_payments AS rp
    JOIN public.family_members AS user_membership
      ON user_membership.family_group_id = rp.family_group_id
    WHERE rp.id = reimbursement_allocations.payment_id
      AND user_membership.user_id = auth.uid()
      AND user_membership.is_active = true
      AND (
        rp.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_group_id = rp.family_group_id
            AND user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
      )
  )
);

-- DELETE: Only payment creator or admin can delete allocations
CREATE POLICY "reimbursement_allocations_delete_creator_or_admin"
ON public.reimbursement_allocations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.reimbursement_payments AS rp
    JOIN public.family_members AS user_membership
      ON user_membership.family_group_id = rp.family_group_id
    WHERE rp.id = reimbursement_allocations.payment_id
      AND user_membership.user_id = auth.uid()
      AND user_membership.is_active = true
      AND (
        rp.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.family_members
          WHERE family_group_id = rp.family_group_id
            AND user_id = auth.uid()
            AND role = 'admin'
            AND is_active = true
        )
      )
  )
);
```

### 4.4 RLS Policies for `member_credit_balance`

```sql
-- Enable RLS
ALTER TABLE public.member_credit_balance ENABLE ROW LEVEL SECURITY;

-- SELECT: Members can see credit balances in their groups
CREATE POLICY "member_credit_balance_select_group_members"
ON public.member_credit_balance
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = member_credit_balance.family_group_id
      AND user_membership.is_active = true
  )
);

-- INSERT: System creates credit balance automatically (via trigger or application logic)
-- Members cannot directly insert credit balances
CREATE POLICY "member_credit_balance_insert_system_only"
ON public.member_credit_balance
FOR INSERT
TO authenticated
WITH CHECK (false);  -- Disable direct inserts, use application logic or triggers

-- UPDATE: Only admin can update credit balances (for corrections)
CREATE POLICY "member_credit_balance_update_admin_only"
ON public.member_credit_balance
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = member_credit_balance.family_group_id
      AND user_membership.role = 'admin'
      AND user_membership.is_active = true
  )
);

-- DELETE: Only admin can delete credit balances
CREATE POLICY "member_credit_balance_delete_admin_only"
ON public.member_credit_balance
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.family_members AS user_membership
    WHERE user_membership.user_id = auth.uid()
      AND user_membership.family_group_id = member_credit_balance.family_group_id
      AND user_membership.role = 'admin'
      AND user_membership.is_active = true
  )
);
```

**Note:** Credit balance creation should be handled via database triggers or application logic when payment surplus is detected, not via direct INSERT.

---

## 5. MIGRATION STRATEGY

### 5.1 Order of Table Creation

**Phase 1 Migration Order:**
1. Create `reimbursement_payments` table
2. Create `reimbursement_allocations` table
3. Create `member_credit_balance` table
4. Create indexes
5. Create RLS policies
6. Create triggers (if needed for credit balance)

**Rationale:**
- `reimbursement_payments` is independent (no dependencies on new tables)
- `reimbursement_allocations` depends on `reimbursement_payments`
- `member_credit_balance` depends on `reimbursement_payments`
- Indexes created after tables for performance
- RLS policies created last to ensure tables exist

### 5.2 Data Integrity Constraints

**Application-Level Constraints (Enforced in Transaction Logic):**
1. **Payment Allocation Sum:** `SUM(allocated_amount) ≤ payment.amount`
2. **Request Allocation Sum:** `SUM(allocated_amount) ≤ remaining_request_amount`
3. **Credit Balance Creation:** Created automatically when `payment.amount > SUM(allocated_amount)`
4. **FIFO Allocation:** Allocations applied to oldest pending requests first

**Database-Level Constraints:**
- Foreign keys ensure referential integrity
- CHECK constraints ensure positive amounts
- UNIQUE constraints prevent duplicate allocations

### 5.3 Rollback Plan

**Rollback Steps:**
1. Drop RLS policies
2. Drop indexes
3. Drop tables in reverse order:
   - `member_credit_balance`
   - `reimbursement_allocations`
   - `reimbursement_payments`
4. Verify existing `reimbursement_requests` table is unchanged

**Rollback SQL:**
```sql
-- Drop RLS policies
DROP POLICY IF EXISTS "member_credit_balance_delete_admin_only" ON public.member_credit_balance;
DROP POLICY IF EXISTS "member_credit_balance_update_admin_only" ON public.member_credit_balance;
DROP POLICY IF EXISTS "member_credit_balance_insert_system_only" ON public.member_credit_balance;
DROP POLICY IF EXISTS "member_credit_balance_select_group_members" ON public.member_credit_balance;

DROP POLICY IF EXISTS "reimbursement_allocations_delete_creator_or_admin" ON public.reimbursement_allocations;
DROP POLICY IF EXISTS "reimbursement_allocations_update_creator_or_admin" ON public.reimbursement_allocations;
DROP POLICY IF EXISTS "reimbursement_allocations_insert_group_members" ON public.reimbursement_allocations;
DROP POLICY IF EXISTS "reimbursement_allocations_select_group_members" ON public.reimbursement_allocations;

DROP POLICY IF EXISTS "reimbursement_payments_delete_creator_or_admin" ON public.reimbursement_payments;
DROP POLICY IF EXISTS "reimbursement_payments_update_creator_or_admin" ON public.reimbursement_payments;
DROP POLICY IF EXISTS "reimbursement_payments_insert_group_members" ON public.reimbursement_payments;
DROP POLICY IF EXISTS "reimbursement_payments_select_group_members" ON public.reimbursement_payments;

-- Drop indexes
DROP INDEX IF EXISTS idx_member_credit_balance_members;
DROP INDEX IF EXISTS idx_member_credit_balance_source_payment;
DROP INDEX IF EXISTS idx_member_credit_balance_to_member;
DROP INDEX IF EXISTS idx_member_credit_balance_from_member;
DROP INDEX IF EXISTS idx_member_credit_balance_family_group;

DROP INDEX IF EXISTS idx_reimbursement_allocations_by_request;
DROP INDEX IF EXISTS idx_reimbursement_allocations_payment_request;
DROP INDEX IF EXISTS idx_reimbursement_allocations_request;
DROP INDEX IF EXISTS idx_reimbursement_allocations_payment;

DROP INDEX IF EXISTS idx_reimbursement_payments_members;
DROP INDEX IF EXISTS idx_reimbursement_payments_created_at;
DROP INDEX IF EXISTS idx_reimbursement_payments_date;
DROP INDEX IF EXISTS idx_reimbursement_payments_to_member;
DROP INDEX IF EXISTS idx_reimbursement_payments_from_member;
DROP INDEX IF EXISTS idx_reimbursement_payments_family_group;

-- Drop tables (in reverse order)
DROP TABLE IF EXISTS public.member_credit_balance;
DROP TABLE IF EXISTS public.reimbursement_allocations;
DROP TABLE IF EXISTS public.reimbursement_payments;
```

### 5.4 Impact on Existing `reimbursement_requests` Table

**No Breaking Changes:**
- Existing `reimbursement_requests` table remains unchanged
- Existing queries continue to work
- New payment system is additive (does not modify existing structure)

**Backward Compatibility:**
- Old settlement logic (direct status update) still works
- New payment system can coexist with old settlement method
- Migration path: Gradually migrate to payment system, old requests remain valid

---

## 6. QUERY PATTERNS

### 6.1 Get Payment History for Member

**Query:** Get all payments where member is payer or payee, ordered by date.

```sql
-- Payments where member is payer (from_member_id)
SELECT 
  rp.id,
  rp.amount,
  rp.currency,
  rp.payment_method,
  rp.payment_date,
  rp.notes,
  rp.created_at,
  fm_to.display_name AS payee_name,
  'paid' AS payment_direction
FROM public.reimbursement_payments rp
JOIN public.family_members fm_from ON fm_from.id = rp.from_member_id
JOIN public.family_members fm_to ON fm_to.id = rp.to_member_id
WHERE rp.from_member_id = :member_id
  AND rp.family_group_id = :group_id

UNION ALL

-- Payments where member is payee (to_member_id)
SELECT 
  rp.id,
  rp.amount,
  rp.currency,
  rp.payment_method,
  rp.payment_date,
  rp.notes,
  rp.created_at,
  fm_from.display_name AS payer_name,
  'received' AS payment_direction
FROM public.reimbursement_payments rp
JOIN public.family_members fm_from ON fm_from.id = rp.from_member_id
JOIN public.family_members fm_to ON fm_to.id = rp.to_member_id
WHERE rp.to_member_id = :member_id
  AND rp.family_group_id = :group_id

ORDER BY payment_date DESC, created_at DESC;
```

**Optimization:** Uses composite index `idx_reimbursement_payments_members`.

### 6.2 Get Allocations for Specific Payment

**Query:** Get all reimbursement requests allocated to a payment.

```sql
SELECT 
  ra.id AS allocation_id,
  ra.allocated_amount,
  rr.id AS request_id,
  rr.amount AS request_amount,
  rr.status AS request_status,
  rr.note AS request_note,
  fm_from.display_name AS debtor_name,
  fm_to.display_name AS creditor_name
FROM public.reimbursement_allocations ra
JOIN public.reimbursement_requests rr ON rr.id = ra.reimbursement_request_id
JOIN public.family_members fm_from ON fm_from.id = rr.from_member_id
JOIN public.family_members fm_to ON fm_to.id = rr.to_member_id
WHERE ra.payment_id = :payment_id
ORDER BY ra.created_at ASC;
```

**Optimization:** Uses index `idx_reimbursement_allocations_payment`.

### 6.3 Get Credit Balance Between Two Members

**Query:** Get total credit balance from member A to member B.

```sql
SELECT 
  COALESCE(SUM(credit_amount), 0) AS total_credit
FROM public.member_credit_balance
WHERE from_member_id = :creditor_member_id
  AND to_member_id = :debtor_member_id
  AND family_group_id = :group_id;
```

**Optimization:** Uses composite index `idx_member_credit_balance_members`.

**Alternative (Aggregated View):**
```sql
-- If multiple credit records exist, aggregate them
SELECT 
  from_member_id,
  to_member_id,
  SUM(credit_amount) AS total_credit,
  currency
FROM public.member_credit_balance
WHERE family_group_id = :group_id
GROUP BY from_member_id, to_member_id, currency;
```

### 6.4 Get Remaining Balance for Reimbursement Request

**Query:** Calculate remaining unpaid amount for a reimbursement request.

```sql
SELECT 
  rr.id,
  rr.amount AS total_amount,
  COALESCE(SUM(ra.allocated_amount), 0) AS paid_amount,
  (rr.amount - COALESCE(SUM(ra.allocated_amount), 0)) AS remaining_amount,
  CASE 
    WHEN COALESCE(SUM(ra.allocated_amount), 0) >= rr.amount THEN 'fully_paid'
    WHEN COALESCE(SUM(ra.allocated_amount), 0) > 0 THEN 'partially_paid'
    ELSE 'unpaid'
  END AS payment_status
FROM public.reimbursement_requests rr
LEFT JOIN public.reimbursement_allocations ra ON ra.reimbursement_request_id = rr.id
WHERE rr.id = :request_id
GROUP BY rr.id, rr.amount;
```

**Optimization:** Uses index `idx_reimbursement_allocations_by_request`.

### 6.5 Performance Considerations and Indexes

**Critical Indexes (Already Defined):**
1. **`idx_reimbursement_payments_members`:** Payment history queries
2. **`idx_reimbursement_allocations_by_request`:** Remaining balance calculations
3. **`idx_member_credit_balance_members`:** Credit balance lookups

**Additional Indexes (If Needed):**
```sql
-- If querying by payment date range frequently
CREATE INDEX idx_reimbursement_payments_date_range 
ON public.reimbursement_payments(family_group_id, payment_date DESC);

-- If querying allocations by request status
CREATE INDEX idx_reimbursement_allocations_request_status
ON public.reimbursement_allocations(reimbursement_request_id)
INCLUDE (allocated_amount)
WHERE EXISTS (
  SELECT 1 FROM public.reimbursement_requests 
  WHERE id = reimbursement_allocations.reimbursement_request_id 
    AND status = 'pending'
);
```

**Query Performance Tips:**
- Use `EXPLAIN ANALYZE` to verify index usage
- Filter by `family_group_id` first (most selective)
- Use `LIMIT` for pagination in payment history queries
- Consider materialized views for aggregated credit balances if needed

---

## 7. SUMMARY

### 7.1 Schema Design Complete

**New Tables Created:**
1. ✅ `reimbursement_payments` - Payment transactions between members
2. ✅ `reimbursement_allocations` - Links payments to reimbursement requests
3. ✅ `member_credit_balance` - Tracks surplus amounts (acompte)

**Key Features Supported:**
- ✅ Partial payments with remaining balance tracking
- ✅ Overpayments creating credit balance
- ✅ Multi-debt allocation (FIFO logic)
- ✅ Payment history queries
- ✅ RLS policies based on existing pattern
- ✅ Foreign key relationships with proper cascade behavior

### 7.2 Integration Points

**Existing Tables (No Changes):**
- `reimbursement_requests` - Remains unchanged, backward compatible
- `family_members` - Referenced by new tables
- `family_groups` - Referenced by new tables

**Application Logic Required:**
- FIFO allocation algorithm (oldest requests first)
- Surplus detection and credit balance creation
- Transaction-level validation (allocation sums)
- Credit balance aggregation (if multiple records exist)

### 7.3 Next Steps

1. **Review Schema Design:** Verify all requirements met
2. **Create Migration SQL:** Generate actual migration file
3. **Test RLS Policies:** Verify access control works correctly
4. **Implement Application Logic:** FIFO allocation, surplus handling
5. **Create Service Functions:** Payment creation, allocation, credit balance management

---

**AGENT-01-DATABASE-SCHEMA-COMPLETE**
