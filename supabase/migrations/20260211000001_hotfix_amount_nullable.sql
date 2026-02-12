-- ============================================================================
-- HOTFIX: Make legacy columns nullable on reimbursement_payments
-- Date: 2026-02-11
-- Agent: AGENT05 - Immediate Hotfix
-- ============================================================================
--
-- PROBLEM:
-- The service (reimbursementService.ts) writes total_amount, allocated_amount,
-- surplus_amount but does NOT write the legacy columns "amount" or
-- "payment_date". Both are NOT NULL without defaults, so INSERT fails with:
--   "null value in column amount violates not-null constraint"
--
-- ROOT CAUSE:
-- Migration 20260123150000 created "amount NUMERIC NOT NULL CHECK(amount > 0)"
-- and "payment_date DATE NOT NULL". Migration 20260211000000 added the new
-- columns the service actually uses, but did not relax the old constraints.
--
-- FIX:
-- 1. Drop the CHECK (amount > 0) constraint — it blocks NULL values
-- 2. ALTER COLUMN amount DROP NOT NULL — allow service to omit it
-- 3. ALTER COLUMN payment_date DROP NOT NULL — same issue, service never writes it
-- 4. Backfill any future NULLs via a trigger that copies total_amount → amount
--    and created_at::date → payment_date for backward compatibility
--
-- APPROACH CHOSEN: Allow NULL (Option A)
-- Reason: Setting a default of 0 would violate the semantic meaning of "amount"
-- (a payment amount should never be 0). Allowing NULL clearly indicates the
-- column is deprecated in favor of total_amount.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop CHECK constraint on amount (blocks NULL and 0)
-- ============================================================================
-- The constraint name is auto-generated as "reimbursement_payments_amount_check"
-- by PostgreSQL from the inline CHECK (amount > 0) syntax.
ALTER TABLE public.reimbursement_payments
  DROP CONSTRAINT IF EXISTS reimbursement_payments_amount_check;

-- ============================================================================
-- STEP 2: Make "amount" nullable
-- ============================================================================
ALTER TABLE public.reimbursement_payments
  ALTER COLUMN amount DROP NOT NULL;

COMMENT ON COLUMN public.reimbursement_payments.amount IS
  'DEPRECATED: Legacy column kept for backward compatibility. '
  'Service now writes total_amount instead. '
  'May be NULL for rows created after 2026-02-11. '
  'Will be removed in a future migration after full transition.';

-- ============================================================================
-- STEP 3: Make "payment_date" nullable
-- ============================================================================
-- Service never writes this column; it uses created_at timestamp instead.
ALTER TABLE public.reimbursement_payments
  ALTER COLUMN payment_date DROP NOT NULL;

COMMENT ON COLUMN public.reimbursement_payments.payment_date IS
  'DEPRECATED: Legacy column kept for backward compatibility. '
  'Service uses created_at instead. '
  'May be NULL for rows created after 2026-02-11.';

-- ============================================================================
-- STEP 4: Backfill trigger (keeps legacy columns in sync automatically)
-- ============================================================================
-- When total_amount is written but amount is NULL, copy total_amount → amount
-- and created_at::date → payment_date. This ensures any code still reading
-- the old columns gets valid data.
CREATE OR REPLACE FUNCTION public.sync_reimbursement_payment_legacy_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Sync amount from total_amount if amount is NULL
  IF NEW.amount IS NULL AND NEW.total_amount IS NOT NULL THEN
    NEW.amount := NEW.total_amount;
  END IF;

  -- Sync payment_date from created_at if payment_date is NULL
  IF NEW.payment_date IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.payment_date := NEW.created_at::date;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_reimbursement_payment_legacy_trigger
  ON public.reimbursement_payments;

CREATE TRIGGER sync_reimbursement_payment_legacy_trigger
  BEFORE INSERT OR UPDATE ON public.reimbursement_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_reimbursement_payment_legacy_columns();

COMMENT ON FUNCTION public.sync_reimbursement_payment_legacy_columns IS
  'Backfill trigger: copies total_amount → amount and created_at → payment_date '
  'when legacy columns are NULL. Ensures backward compatibility during transition.';

-- ============================================================================
-- STEP 5: Backfill existing rows (if any were inserted between migrations)
-- ============================================================================
UPDATE public.reimbursement_payments
  SET amount = total_amount
  WHERE amount IS NULL AND total_amount IS NOT NULL;

UPDATE public.reimbursement_payments
  SET payment_date = created_at::date
  WHERE payment_date IS NULL AND created_at IS NOT NULL;

COMMIT;

-- ============================================================================
-- VERIFICATION (run in Supabase SQL Editor after migration)
-- ============================================================================
--
-- 1. Confirm amount is nullable:
-- SELECT column_name, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'reimbursement_payments'
--   AND column_name IN ('amount', 'payment_date', 'total_amount');
-- Expected: amount → YES, payment_date → YES, total_amount → NO
--
-- 2. Confirm CHECK constraint removed:
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_schema = 'public' AND table_name = 'reimbursement_payments'
--   AND constraint_type = 'CHECK';
-- Expected: reimbursement_payments_amount_check should NOT appear
--
-- 3. Confirm trigger exists:
-- SELECT trigger_name FROM information_schema.triggers
-- WHERE event_object_table = 'reimbursement_payments'
--   AND trigger_name = 'sync_reimbursement_payment_legacy_trigger';
-- Expected: 1 row
--
-- 4. Test INSERT (should succeed):
-- INSERT INTO reimbursement_payments (
--   family_group_id, from_member_id, to_member_id,
--   total_amount, allocated_amount, surplus_amount, currency, notes
-- ) VALUES (
--   'test-group-id', 'test-from-id', 'test-to-id',
--   50000, 40000, 10000, 'MGA', 'Test hotfix'
-- );
-- Expected: SUCCESS, amount auto-filled by trigger
-- ============================================================================

-- ============================================================================
-- ROLLBACK (undo this hotfix — only if needed)
-- ============================================================================
--
-- BEGIN;
-- DROP TRIGGER IF EXISTS sync_reimbursement_payment_legacy_trigger ON public.reimbursement_payments;
-- DROP FUNCTION IF EXISTS public.sync_reimbursement_payment_legacy_columns;
-- UPDATE public.reimbursement_payments SET amount = total_amount WHERE amount IS NULL;
-- UPDATE public.reimbursement_payments SET payment_date = created_at::date WHERE payment_date IS NULL;
-- ALTER TABLE public.reimbursement_payments ALTER COLUMN amount SET NOT NULL;
-- ALTER TABLE public.reimbursement_payments ALTER COLUMN payment_date SET NOT NULL;
-- ALTER TABLE public.reimbursement_payments ADD CONSTRAINT reimbursement_payments_amount_check CHECK (amount > 0);
-- COMMIT;
-- ============================================================================
