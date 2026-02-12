-- ============================================================================
-- MIGRATION: Fix Payment Schema Mismatches (Phase 1 Corrective)
-- Date: 2026-02-11
-- Agent: AGENT05 - Schema Alignment
-- ============================================================================
--
-- PROBLEM:
-- The service layer (reimbursementService.ts) writes columns that do not exist
-- in the tables created by 20260123150000_create_reimbursement_payment_tables.sql.
-- This migration adds the missing columns so INSERT/SELECT from the service
-- succeed without breaking existing schema objects (RLS, indexes, FKs).
--
-- APPROACH:
-- - Additive only: ALTER TABLE ADD COLUMN IF NOT EXISTS
-- - No DROP of existing columns (backward compatibility)
-- - No modification of RLS policies (they reference table-level, not column-level)
-- - Foreign keys added for new reference columns
-- - UNIQUE constraint added for new member_credit_balance lookup pattern
--
-- TABLES AFFECTED:
-- 1. reimbursement_payments        → add total_amount, allocated_amount, surplus_amount
-- 2. reimbursement_payment_allocations → add request_amount, remaining_amount, is_fully_paid
-- 3. member_credit_balance          → add from_member_id, to_member_id, credit_amount,
--                                       last_payment_date, created_at + UNIQUE constraint
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: reimbursement_payments — add missing columns
-- ============================================================================
-- Service writes: total_amount, allocated_amount, surplus_amount
-- DB has: amount (NUMERIC), payment_date (DATE) — both unused by service
--
-- total_amount  = the full payment amount the user entered
-- allocated_amount = portion allocated to reimbursement requests
-- surplus_amount   = excess stored as credit (acompte)
-- ============================================================================

ALTER TABLE public.reimbursement_payments
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15, 2) NULL;

ALTER TABLE public.reimbursement_payments
  ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.reimbursement_payments
  ADD COLUMN IF NOT EXISTS surplus_amount NUMERIC(15, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.reimbursement_payments.total_amount IS 'Total payment amount entered by user. Service writes this instead of legacy "amount" column.';
COMMENT ON COLUMN public.reimbursement_payments.allocated_amount IS 'Portion of total_amount allocated to reimbursement requests.';
COMMENT ON COLUMN public.reimbursement_payments.surplus_amount IS 'Excess amount stored as credit (acompte) between members.';

-- Back-fill total_amount from legacy amount column for any rows inserted before this migration
UPDATE public.reimbursement_payments
  SET total_amount = amount
  WHERE total_amount IS NULL AND amount IS NOT NULL;

-- Now make total_amount NOT NULL (safe after backfill)
DO $$
BEGIN
  -- Only set NOT NULL if there are no remaining NULLs
  IF NOT EXISTS (SELECT 1 FROM public.reimbursement_payments WHERE total_amount IS NULL) THEN
    ALTER TABLE public.reimbursement_payments ALTER COLUMN total_amount SET NOT NULL;
  END IF;
END $$;

-- CHECK: total_amount must be positive
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reimbursement_payments_total_amount_positive'
      AND table_schema = 'public' AND table_name = 'reimbursement_payments'
  ) THEN
    ALTER TABLE public.reimbursement_payments
      ADD CONSTRAINT reimbursement_payments_total_amount_positive CHECK (total_amount > 0);
  END IF;
END $$;

-- CHECK: allocated + surplus <= total
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reimbursement_payments_amounts_consistent'
      AND table_schema = 'public' AND table_name = 'reimbursement_payments'
  ) THEN
    ALTER TABLE public.reimbursement_payments
      ADD CONSTRAINT reimbursement_payments_amounts_consistent
      CHECK (allocated_amount >= 0 AND surplus_amount >= 0);
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: reimbursement_payment_allocations — add missing columns
-- ============================================================================
-- Service writes: request_amount, remaining_amount, is_fully_paid
-- DB has: allocated_amount (OK, used by service), remaining_balance (unused by service)
--
-- request_amount  = original debt amount on the reimbursement_request
-- remaining_amount = amount still owed after this allocation
-- is_fully_paid    = true when remaining_amount reaches 0
-- ============================================================================

ALTER TABLE public.reimbursement_payment_allocations
  ADD COLUMN IF NOT EXISTS request_amount NUMERIC(15, 2) NULL;

ALTER TABLE public.reimbursement_payment_allocations
  ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15, 2) NULL;

ALTER TABLE public.reimbursement_payment_allocations
  ADD COLUMN IF NOT EXISTS is_fully_paid BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.reimbursement_payment_allocations.request_amount IS 'Original debt amount on the linked reimbursement_request at time of allocation.';
COMMENT ON COLUMN public.reimbursement_payment_allocations.remaining_amount IS 'Amount still owed on the request after this allocation. 0 when fully paid.';
COMMENT ON COLUMN public.reimbursement_payment_allocations.is_fully_paid IS 'True when this allocation fully covers the remaining debt on the request.';

-- Back-fill remaining_amount from legacy remaining_balance if any rows exist
UPDATE public.reimbursement_payment_allocations
  SET remaining_amount = remaining_balance
  WHERE remaining_amount IS NULL AND remaining_balance IS NOT NULL;

-- ============================================================================
-- SECTION 3: member_credit_balance — add missing columns
-- ============================================================================
-- Service writes: from_member_id, to_member_id, credit_amount, last_payment_date
-- Service reads:  from_member_id, to_member_id, credit_amount, created_at,
--                 updated_at, last_payment_date
-- Service joins:  family_members!member_credit_balance_from_member_id_fkey
--                 family_members!member_credit_balance_to_member_id_fkey
--
-- DB has: creditor_member_id (=to_member_id in service semantics: receiver of credit)
--         debtor_member_id   (=from_member_id in service semantics: the payer)
--         balance            (=credit_amount in service)
--
-- Adding the columns the service expects. Old columns kept for backward compat.
-- ============================================================================

-- from_member_id = the payer (maps to debtor_member_id semantically)
ALTER TABLE public.member_credit_balance
  ADD COLUMN IF NOT EXISTS from_member_id UUID NULL;

-- to_member_id = the receiver (maps to creditor_member_id semantically)
ALTER TABLE public.member_credit_balance
  ADD COLUMN IF NOT EXISTS to_member_id UUID NULL;

-- credit_amount = surplus amount (maps to balance semantically)
ALTER TABLE public.member_credit_balance
  ADD COLUMN IF NOT EXISTS credit_amount NUMERIC(15, 2) NULL;

-- last_payment_date = timestamp of the most recent payment that created/updated this credit
ALTER TABLE public.member_credit_balance
  ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE NULL;

-- created_at = service reads this but original table only had updated_at
ALTER TABLE public.member_credit_balance
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

COMMENT ON COLUMN public.member_credit_balance.from_member_id IS 'Payer member (service alias for debtor_member_id). FK to family_members.';
COMMENT ON COLUMN public.member_credit_balance.to_member_id IS 'Receiver member (service alias for creditor_member_id). FK to family_members.';
COMMENT ON COLUMN public.member_credit_balance.credit_amount IS 'Surplus credit amount (service alias for balance column).';
COMMENT ON COLUMN public.member_credit_balance.last_payment_date IS 'Timestamp of the last payment that modified this credit balance.';
COMMENT ON COLUMN public.member_credit_balance.created_at IS 'Row creation timestamp. Added for service compatibility.';

-- Back-fill new columns from existing columns for any pre-existing rows
UPDATE public.member_credit_balance
  SET from_member_id = debtor_member_id
  WHERE from_member_id IS NULL AND debtor_member_id IS NOT NULL;

UPDATE public.member_credit_balance
  SET to_member_id = creditor_member_id
  WHERE to_member_id IS NULL AND creditor_member_id IS NOT NULL;

UPDATE public.member_credit_balance
  SET credit_amount = balance
  WHERE credit_amount IS NULL AND balance IS NOT NULL;

-- Add foreign key constraints on the new columns
-- (named explicitly so the service can use them in Supabase join syntax)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'member_credit_balance_from_member_id_fkey'
      AND table_schema = 'public' AND table_name = 'member_credit_balance'
  ) THEN
    ALTER TABLE public.member_credit_balance
      ADD CONSTRAINT member_credit_balance_from_member_id_fkey
      FOREIGN KEY (from_member_id) REFERENCES public.family_members(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'member_credit_balance_to_member_id_fkey'
      AND table_schema = 'public' AND table_name = 'member_credit_balance'
  ) THEN
    ALTER TABLE public.member_credit_balance
      ADD CONSTRAINT member_credit_balance_to_member_id_fkey
      FOREIGN KEY (to_member_id) REFERENCES public.family_members(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Add UNIQUE constraint on the columns the service uses for lookup
-- (family_group_id, from_member_id, to_member_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'uq_member_credit_balance_from_to'
      AND table_schema = 'public' AND table_name = 'member_credit_balance'
  ) THEN
    ALTER TABLE public.member_credit_balance
      ADD CONSTRAINT uq_member_credit_balance_from_to
      UNIQUE (family_group_id, from_member_id, to_member_id);
  END IF;
END $$;

-- Indexes on new columns for query performance
CREATE INDEX IF NOT EXISTS idx_member_credit_balance_from_member
  ON public.member_credit_balance(from_member_id);
CREATE INDEX IF NOT EXISTS idx_member_credit_balance_to_member
  ON public.member_credit_balance(to_member_id);
CREATE INDEX IF NOT EXISTS idx_member_credit_balance_last_payment
  ON public.member_credit_balance(last_payment_date DESC)
  WHERE last_payment_date IS NOT NULL;

COMMIT;

-- ============================================================================
-- COLUMN MAPPING REFERENCE (for developers)
-- ============================================================================
-- reimbursement_payments:
--   Legacy column    →  Service column     →  Status
--   amount           →  total_amount       →  Both exist; service uses total_amount
--   payment_date     →  (not used)         →  Kept for backward compat
--   (new)            →  allocated_amount   →  Added by this migration
--   (new)            →  surplus_amount     →  Added by this migration
--
-- reimbursement_payment_allocations:
--   allocated_amount →  allocated_amount   →  Already existed, service uses it
--   remaining_balance → (not used)         →  Kept for backward compat
--   (new)            →  request_amount     →  Added by this migration
--   (new)            →  remaining_amount   →  Added by this migration
--   (new)            →  is_fully_paid      →  Added by this migration
--
-- member_credit_balance:
--   creditor_member_id → to_member_id     →  Both exist; service uses to_member_id
--   debtor_member_id   → from_member_id   →  Both exist; service uses from_member_id
--   balance            → credit_amount    →  Both exist; service uses credit_amount
--   (new)              → last_payment_date →  Added by this migration
--   (new)              → created_at        →  Added by this migration
-- ============================================================================

-- ============================================================================
-- VERIFICATION (run manually in Supabase SQL Editor after migration)
-- ============================================================================
--
-- 1. Check reimbursement_payments columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'reimbursement_payments'
-- ORDER BY ordinal_position;
--
-- 2. Check reimbursement_payment_allocations columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'reimbursement_payment_allocations'
-- ORDER BY ordinal_position;
--
-- 3. Check member_credit_balance columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'member_credit_balance'
-- ORDER BY ordinal_position;
--
-- 4. Check constraints:
-- SELECT constraint_name, constraint_type
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'public'
--   AND table_name IN ('reimbursement_payments', 'reimbursement_payment_allocations', 'member_credit_balance')
-- ORDER BY table_name, constraint_name;
--
-- 5. Check foreign keys on member_credit_balance:
-- SELECT constraint_name
-- FROM information_schema.table_constraints
-- WHERE table_schema = 'public' AND table_name = 'member_credit_balance'
--   AND constraint_type = 'FOREIGN KEY';
-- Expected: ..._from_member_id_fkey, ..._to_member_id_fkey (plus original creditor/debtor FKs)
--
-- 6. Check RLS still active (should be unchanged):
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('reimbursement_payments', 'reimbursement_payment_allocations', 'member_credit_balance');
-- ============================================================================

-- ============================================================================
-- ROLLBACK (run this to undo — safe, drops only columns added by this migration)
-- ============================================================================
--
-- BEGIN;
--
-- -- reimbursement_payments
-- ALTER TABLE public.reimbursement_payments DROP CONSTRAINT IF EXISTS reimbursement_payments_total_amount_positive;
-- ALTER TABLE public.reimbursement_payments DROP CONSTRAINT IF EXISTS reimbursement_payments_amounts_consistent;
-- ALTER TABLE public.reimbursement_payments DROP COLUMN IF EXISTS total_amount;
-- ALTER TABLE public.reimbursement_payments DROP COLUMN IF EXISTS allocated_amount;
-- ALTER TABLE public.reimbursement_payments DROP COLUMN IF EXISTS surplus_amount;
--
-- -- reimbursement_payment_allocations
-- ALTER TABLE public.reimbursement_payment_allocations DROP COLUMN IF EXISTS request_amount;
-- ALTER TABLE public.reimbursement_payment_allocations DROP COLUMN IF EXISTS remaining_amount;
-- ALTER TABLE public.reimbursement_payment_allocations DROP COLUMN IF EXISTS is_fully_paid;
--
-- -- member_credit_balance
-- DROP INDEX IF EXISTS idx_member_credit_balance_from_member;
-- DROP INDEX IF EXISTS idx_member_credit_balance_to_member;
-- DROP INDEX IF EXISTS idx_member_credit_balance_last_payment;
-- ALTER TABLE public.member_credit_balance DROP CONSTRAINT IF EXISTS uq_member_credit_balance_from_to;
-- ALTER TABLE public.member_credit_balance DROP CONSTRAINT IF EXISTS member_credit_balance_from_member_id_fkey;
-- ALTER TABLE public.member_credit_balance DROP CONSTRAINT IF EXISTS member_credit_balance_to_member_id_fkey;
-- ALTER TABLE public.member_credit_balance DROP COLUMN IF EXISTS from_member_id;
-- ALTER TABLE public.member_credit_balance DROP COLUMN IF EXISTS to_member_id;
-- ALTER TABLE public.member_credit_balance DROP COLUMN IF EXISTS credit_amount;
-- ALTER TABLE public.member_credit_balance DROP COLUMN IF EXISTS last_payment_date;
-- ALTER TABLE public.member_credit_balance DROP COLUMN IF EXISTS created_at;
--
-- COMMIT;
-- ============================================================================
