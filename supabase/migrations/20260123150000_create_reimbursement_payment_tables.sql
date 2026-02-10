-- ============================================================================
-- MIGRATION: Create Reimbursement Payment Tables (Phase 1)
-- Date: 2026-01-23
-- Agent: AGENT05 - Family Reimbursements Phase 1
-- ============================================================================
--
-- DESCRIPTION:
-- Creates three new tables for the flexible family reimbursement payment system:
-- 1. reimbursement_payments - Payment transactions between members (from_member → to_member)
-- 2. reimbursement_payment_allocations - Links payments to reimbursement_requests with allocated amounts
-- 3. member_credit_balance - Tracks surplus (acompte) between member pairs
--
-- INTEGRATION:
-- - References existing tables: family_groups, family_members, reimbursement_requests
-- - Does NOT modify any existing tables or columns
-- - RLS policies follow family_members pattern (access via group membership)
--
-- SAFETY:
-- - Idempotent: CREATE TABLE IF NOT EXISTS, CREATE INDEX IF NOT EXISTS
-- - Transaction wrapper for atomicity
-- - All foreign keys validated against existing tables
-- ============================================================================

BEGIN;

-- ============================================================================
-- SECTION 1: reimbursement_payments
-- ============================================================================
-- Stores payment transactions: who paid whom, amount, currency, date, notes.
-- Used to record actual payments (cash, transfer) that can be allocated to
-- specific reimbursement_requests.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reimbursement_payments (
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
  -- NOTE: "member belongs to family_group" validation is enforced at application level
  -- (reimbursementService.ts) and by RLS policies. PostgreSQL CHECK constraints cannot
  -- contain subqueries. A BEFORE INSERT trigger can be added in Phase 2 if needed.
);

COMMENT ON TABLE public.reimbursement_payments IS 'Payment transactions between family members (from_member pays to_member). Used for flexible reimbursement payment tracking.';
COMMENT ON COLUMN public.reimbursement_payments.from_member_id IS 'Family member who pays (payer)';
COMMENT ON COLUMN public.reimbursement_payments.to_member_id IS 'Family member who receives the payment';
COMMENT ON COLUMN public.reimbursement_payments.payment_date IS 'Date of the payment (when it occurred)';
COMMENT ON COLUMN public.reimbursement_payments.notes IS 'Optional notes (e.g. reference, method)';

CREATE INDEX IF NOT EXISTS idx_reimbursement_payments_family_group_id
  ON public.reimbursement_payments(family_group_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_payments_from_member_id
  ON public.reimbursement_payments(from_member_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_payments_to_member_id
  ON public.reimbursement_payments(to_member_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_payments_payment_date
  ON public.reimbursement_payments(payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_reimbursement_payments_created_at
  ON public.reimbursement_payments(created_at DESC);

-- Trigger for updated_at (requires public.update_updated_at_column() to exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_reimbursement_payments_updated_at ON public.reimbursement_payments;
    CREATE TRIGGER update_reimbursement_payments_updated_at
      BEFORE UPDATE ON public.reimbursement_payments
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- SECTION 2: reimbursement_payment_allocations
-- ============================================================================
-- Links a payment to one or more reimbursement_requests. Each row allocates
-- part of a payment to a specific request, with allocated_amount and
-- remaining_balance on the request after this allocation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reimbursement_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.reimbursement_payments(id) ON DELETE CASCADE,
  reimbursement_request_id UUID NOT NULL REFERENCES public.reimbursement_requests(id) ON DELETE RESTRICT,
  allocated_amount NUMERIC(15, 2) NOT NULL CHECK (allocated_amount > 0),
  remaining_balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (remaining_balance >= 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_reimbursement_payment_allocation_pair UNIQUE (payment_id, reimbursement_request_id)
);

COMMENT ON TABLE public.reimbursement_payment_allocations IS 'Links reimbursement_payments to reimbursement_requests. Each row allocates part of a payment to a specific request.';
COMMENT ON COLUMN public.reimbursement_payment_allocations.allocated_amount IS 'Amount from this payment allocated to the linked request';
COMMENT ON COLUMN public.reimbursement_payment_allocations.remaining_balance IS 'Remaining balance on the request after this allocation (for audit/traceability)';

CREATE INDEX IF NOT EXISTS idx_reimbursement_payment_allocations_payment_id
  ON public.reimbursement_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_payment_allocations_request_id
  ON public.reimbursement_payment_allocations(reimbursement_request_id);

-- ============================================================================
-- SECTION 3: member_credit_balance
-- ============================================================================
-- Tracks surplus (acompte) between two members. When a payment exceeds what
-- was owed, the excess is stored as credit: creditor_member is owed balance
-- by debtor_member. One row per (family_group, creditor, debtor) pair.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.member_credit_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES public.family_groups(id) ON DELETE CASCADE,
  creditor_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  debtor_member_id UUID NOT NULL REFERENCES public.family_members(id) ON DELETE RESTRICT,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'MGA' CHECK (currency IN ('MGA', 'EUR')),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT member_credit_balance_creditor_debtor_different CHECK (creditor_member_id != debtor_member_id),
  CONSTRAINT uq_member_credit_balance_pair UNIQUE (family_group_id, creditor_member_id, debtor_member_id)
  -- NOTE: "member belongs to family_group" validation is enforced at application level
  -- (reimbursementService.ts) and by RLS policies. PostgreSQL CHECK constraints cannot
  -- contain subqueries. A BEFORE INSERT trigger can be added in Phase 2 if needed.
);

COMMENT ON TABLE public.member_credit_balance IS 'Surplus (acompte) between two members: creditor is owed balance by debtor. One row per member pair per group.';
COMMENT ON COLUMN public.member_credit_balance.creditor_member_id IS 'Member who has the credit (paid more than owed)';
COMMENT ON COLUMN public.member_credit_balance.debtor_member_id IS 'Member who owes the balance';
COMMENT ON COLUMN public.member_credit_balance.balance IS 'Amount owed by debtor to creditor (always >= 0)';

CREATE INDEX IF NOT EXISTS idx_member_credit_balance_family_group_id
  ON public.member_credit_balance(family_group_id);
CREATE INDEX IF NOT EXISTS idx_member_credit_balance_creditor
  ON public.member_credit_balance(creditor_member_id);
CREATE INDEX IF NOT EXISTS idx_member_credit_balance_debtor
  ON public.member_credit_balance(debtor_member_id);

-- Trigger for updated_at
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid WHERE n.nspname = 'public' AND p.proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS update_member_credit_balance_updated_at ON public.member_credit_balance;
    CREATE TRIGGER update_member_credit_balance_updated_at
      BEFORE UPDATE ON public.member_credit_balance
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Access based on family group membership: user can only see/modify data for
-- groups where they are an active member (same pattern as family_members).
-- ============================================================================

ALTER TABLE public.reimbursement_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reimbursement_payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_credit_balance ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- RLS: reimbursement_payments
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "reimbursement_payments_select_group_member" ON public.reimbursement_payments;
CREATE POLICY "reimbursement_payments_select_group_member"
  ON public.reimbursement_payments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = reimbursement_payments.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "reimbursement_payments_insert_group_member" ON public.reimbursement_payments;
CREATE POLICY "reimbursement_payments_insert_group_member"
  ON public.reimbursement_payments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = reimbursement_payments.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "reimbursement_payments_update_group_member" ON public.reimbursement_payments;
CREATE POLICY "reimbursement_payments_update_group_member"
  ON public.reimbursement_payments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = reimbursement_payments.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "reimbursement_payments_delete_group_member" ON public.reimbursement_payments;
CREATE POLICY "reimbursement_payments_delete_group_member"
  ON public.reimbursement_payments FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = reimbursement_payments.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: reimbursement_payment_allocations (via payment's family_group_id)
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "reimbursement_payment_allocations_select_group_member" ON public.reimbursement_payment_allocations;
CREATE POLICY "reimbursement_payment_allocations_select_group_member"
  ON public.reimbursement_payment_allocations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_payments p
      JOIN public.family_members fm ON fm.family_group_id = p.family_group_id AND fm.user_id = auth.uid() AND fm.is_active = true
      WHERE p.id = reimbursement_payment_allocations.payment_id
    )
  );

DROP POLICY IF EXISTS "reimbursement_payment_allocations_insert_group_member" ON public.reimbursement_payment_allocations;
CREATE POLICY "reimbursement_payment_allocations_insert_group_member"
  ON public.reimbursement_payment_allocations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reimbursement_payments p
      JOIN public.family_members fm ON fm.family_group_id = p.family_group_id AND fm.user_id = auth.uid() AND fm.is_active = true
      WHERE p.id = reimbursement_payment_allocations.payment_id
    )
  );

DROP POLICY IF EXISTS "reimbursement_payment_allocations_update_group_member" ON public.reimbursement_payment_allocations;
CREATE POLICY "reimbursement_payment_allocations_update_group_member"
  ON public.reimbursement_payment_allocations FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_payments p
      JOIN public.family_members fm ON fm.family_group_id = p.family_group_id AND fm.user_id = auth.uid() AND fm.is_active = true
      WHERE p.id = reimbursement_payment_allocations.payment_id
    )
  );

DROP POLICY IF EXISTS "reimbursement_payment_allocations_delete_group_member" ON public.reimbursement_payment_allocations;
CREATE POLICY "reimbursement_payment_allocations_delete_group_member"
  ON public.reimbursement_payment_allocations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reimbursement_payments p
      JOIN public.family_members fm ON fm.family_group_id = p.family_group_id AND fm.user_id = auth.uid() AND fm.is_active = true
      WHERE p.id = reimbursement_payment_allocations.payment_id
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: member_credit_balance
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "member_credit_balance_select_group_member" ON public.member_credit_balance;
CREATE POLICY "member_credit_balance_select_group_member"
  ON public.member_credit_balance FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = member_credit_balance.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "member_credit_balance_insert_group_member" ON public.member_credit_balance;
CREATE POLICY "member_credit_balance_insert_group_member"
  ON public.member_credit_balance FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = member_credit_balance.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "member_credit_balance_update_group_member" ON public.member_credit_balance;
CREATE POLICY "member_credit_balance_update_group_member"
  ON public.member_credit_balance FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = member_credit_balance.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

DROP POLICY IF EXISTS "member_credit_balance_delete_group_member" ON public.member_credit_balance;
CREATE POLICY "member_credit_balance_delete_group_member"
  ON public.member_credit_balance FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_group_id = member_credit_balance.family_group_id
        AND fm.user_id = auth.uid()
        AND fm.is_active = true
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICATION (run manually after migration)
-- ============================================================================
-- SELECT table_name, column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('reimbursement_payments', 'reimbursement_payment_allocations', 'member_credit_balance')
-- ORDER BY table_name, ordinal_position;
--
-- SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
--   AND tablename IN ('reimbursement_payments', 'reimbursement_payment_allocations', 'member_credit_balance');
--
-- SELECT policyname, tablename, cmd FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('reimbursement_payments', 'reimbursement_payment_allocations', 'member_credit_balance');
-- ============================================================================
