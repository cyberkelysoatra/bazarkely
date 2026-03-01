-- ============================================================================
-- AGENT 01 - DATABASE INVESTIGATION - REIMBURSEMENTS IVANA
-- Date: 2026-02-13
-- Context: BazarKELY v2.9.0, Supabase database, production data
-- Purpose: Find all reimbursement-related data linked to Ivana before deletion
-- ============================================================================
-- 
-- IMPORTANT: These queries are READ-ONLY. DO NOT execute DELETE statements.
-- Run these queries in Supabase SQL Editor to investigate Ivana's data.
--
-- Schema Reference:
-- - reimbursement_requests: from_member_id (debtor), to_member_id (creditor)
-- - reimbursement_payments: from_member_id (payer), to_member_id (payee)
-- - reimbursement_payment_allocations: payment_id → reimbursement_request_id
-- - member_credit_balance: creditor_member_id, debtor_member_id
-- ============================================================================

-- ============================================================================
-- STEP 1: Find Ivana's user ID
-- ============================================================================
-- Search auth.users table for Ivana by email or full_name
-- ============================================================================

SELECT 
  id AS user_id,
  email,
  raw_user_meta_data->>'full_name' AS full_name,
  created_at
FROM auth.users 
WHERE 
  email ILIKE '%ivana%' 
  OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
  OR raw_user_meta_data->>'name' ILIKE '%ivana%';

-- Expected result: User ID(s) for Ivana
-- Store the user_id(s) for next queries


-- ============================================================================
-- STEP 2: Check family_members table
-- ============================================================================
-- Find all family_member records for Ivana
-- ============================================================================

SELECT 
  fm.id AS member_id,
  fm.user_id,
  fm.family_group_id,
  fm.display_name,
  fm.role,
  fm.is_active,
  fm.joined_at,
  fg.name AS group_name
FROM public.family_members fm
LEFT JOIN public.family_groups fg ON fg.id = fm.family_group_id
WHERE 
  fm.display_name ILIKE '%ivana%'
  OR fm.user_id IN (
    SELECT id FROM auth.users 
    WHERE email ILIKE '%ivana%' 
    OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
  );

-- Expected result: All family_member records for Ivana
-- Store the member_id(s) for next queries


-- ============================================================================
-- STEP 3: Find all reimbursement requests involving Ivana
-- ============================================================================
-- Ivana can be debtor (from_member_id) or creditor (to_member_id)
-- ============================================================================

SELECT 
  rr.id AS reimbursement_request_id,
  rr.shared_transaction_id,
  rr.from_member_id AS debtor_member_id,
  fm_from.display_name AS debtor_name,
  rr.to_member_id AS creditor_member_id,
  fm_to.display_name AS creditor_name,
  rr.amount,
  rr.currency,
  rr.status,
  rr.note,
  rr.created_at,
  rr.updated_at,
  rr.settled_at,
  rr.settled_by
FROM public.reimbursement_requests rr
LEFT JOIN public.family_members fm_from ON fm_from.id = rr.from_member_id
LEFT JOIN public.family_members fm_to ON fm_to.id = rr.to_member_id
WHERE 
  rr.from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR rr.to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
ORDER BY rr.created_at DESC;

-- Expected result: All reimbursement requests where Ivana is debtor or creditor
-- Count: Number of reimbursement requests


-- ============================================================================
-- STEP 4: Find all payments involving Ivana
-- ============================================================================
-- Ivana can be payer (from_member_id) or payee (to_member_id)
-- ============================================================================

SELECT 
  rp.id AS payment_id,
  rp.family_group_id,
  rp.from_member_id AS payer_member_id,
  fm_from.display_name AS payer_name,
  rp.to_member_id AS payee_member_id,
  fm_to.display_name AS payee_name,
  rp.total_amount,
  rp.allocated_amount,
  rp.surplus_amount,
  rp.currency,
  rp.payment_date,
  rp.notes,
  rp.created_at,
  rp.created_by,
  au.email AS created_by_email
FROM public.reimbursement_payments rp
LEFT JOIN public.family_members fm_from ON fm_from.id = rp.from_member_id
LEFT JOIN public.family_members fm_to ON fm_to.id = rp.to_member_id
LEFT JOIN auth.users au ON au.id = rp.created_by
WHERE 
  rp.from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR rp.to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
ORDER BY rp.created_at DESC;

-- Expected result: All payments where Ivana is payer or payee
-- Count: Number of payments


-- ============================================================================
-- STEP 5: Find payment allocations linked to those payments
-- ============================================================================
-- Get all allocations for payments involving Ivana
-- ============================================================================

SELECT 
  rpa.id AS allocation_id,
  rpa.payment_id,
  rp.total_amount AS payment_total_amount,
  rpa.reimbursement_request_id,
  rr.amount AS request_amount,
  rpa.allocated_amount,
  rpa.request_amount AS allocation_request_amount,
  rpa.remaining_amount,
  rpa.is_fully_paid,
  rpa.created_at,
  -- Payer/Payee info
  fm_payer.display_name AS payer_name,
  fm_payee.display_name AS payee_name
FROM public.reimbursement_payment_allocations rpa
INNER JOIN public.reimbursement_payments rp ON rp.id = rpa.payment_id
LEFT JOIN public.reimbursement_requests rr ON rr.id = rpa.reimbursement_request_id
LEFT JOIN public.family_members fm_payer ON fm_payer.id = rp.from_member_id
LEFT JOIN public.family_members fm_payee ON fm_payee.id = rp.to_member_id
WHERE 
  rpa.payment_id IN (
    SELECT rp2.id FROM public.reimbursement_payments rp2
    WHERE 
      rp2.from_member_id IN (
        SELECT id FROM public.family_members 
        WHERE display_name ILIKE '%ivana%'
        OR user_id IN (
          SELECT id FROM auth.users 
          WHERE email ILIKE '%ivana%' 
          OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
        )
      )
      OR rp2.to_member_id IN (
        SELECT id FROM public.family_members 
        WHERE display_name ILIKE '%ivana%'
        OR user_id IN (
          SELECT id FROM auth.users 
          WHERE email ILIKE '%ivana%' 
          OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
        )
      )
  )
ORDER BY rpa.created_at DESC;

-- Expected result: All allocations for payments involving Ivana
-- Count: Number of allocations


-- ============================================================================
-- STEP 6: Find credit balances involving Ivana
-- ============================================================================
-- Ivana can be creditor (creditor_member_id) or debtor (debtor_member_id)
-- ============================================================================

SELECT 
  mcb.id AS credit_balance_id,
  mcb.family_group_id,
  fg.name AS group_name,
  mcb.creditor_member_id,
  fm_creditor.display_name AS creditor_name,
  mcb.debtor_member_id,
  fm_debtor.display_name AS debtor_name,
  mcb.balance,
  mcb.currency,
  mcb.updated_at
FROM public.member_credit_balance mcb
LEFT JOIN public.family_groups fg ON fg.id = mcb.family_group_id
LEFT JOIN public.family_members fm_creditor ON fm_creditor.id = mcb.creditor_member_id
LEFT JOIN public.family_members fm_debtor ON fm_debtor.id = mcb.debtor_member_id
WHERE 
  mcb.creditor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR mcb.debtor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
ORDER BY mcb.updated_at DESC;

-- Expected result: All credit balances where Ivana is creditor or debtor
-- Count: Number of credit balance records


-- ============================================================================
-- SUMMARY QUERIES - Count records per table
-- ============================================================================
-- Run these to get total counts before deletion
-- ============================================================================

-- Count reimbursement requests
SELECT 
  COUNT(*) AS total_reimbursement_requests,
  COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_count,
  COUNT(CASE WHEN status = 'settled' THEN 1 END) AS settled_count,
  COUNT(CASE WHEN status = 'cancelled' THEN 1 END) AS cancelled_count,
  SUM(amount) AS total_amount_mga
FROM public.reimbursement_requests
WHERE 
  from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  );

-- Count payments
SELECT 
  COUNT(*) AS total_payments,
  SUM(total_amount) AS total_payment_amount,
  SUM(allocated_amount) AS total_allocated_amount,
  SUM(surplus_amount) AS total_surplus_amount
FROM public.reimbursement_payments
WHERE 
  from_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR to_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  );

-- Count allocations
SELECT 
  COUNT(*) AS total_allocations,
  SUM(allocated_amount) AS total_allocated_amount
FROM public.reimbursement_payment_allocations
WHERE payment_id IN (
  SELECT id FROM public.reimbursement_payments
  WHERE 
    from_member_id IN (
      SELECT id FROM public.family_members 
      WHERE display_name ILIKE '%ivana%'
      OR user_id IN (
        SELECT id FROM auth.users 
        WHERE email ILIKE '%ivana%' 
        OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
      )
    )
    OR to_member_id IN (
      SELECT id FROM public.family_members 
      WHERE display_name ILIKE '%ivana%'
      OR user_id IN (
        SELECT id FROM auth.users 
        WHERE email ILIKE '%ivana%' 
        OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
      )
    )
);

-- Count credit balances
SELECT 
  COUNT(*) AS total_credit_balances,
  SUM(balance) AS total_credit_amount
FROM public.member_credit_balance
WHERE 
  creditor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  )
  OR debtor_member_id IN (
    SELECT id FROM public.family_members 
    WHERE display_name ILIKE '%ivana%'
    OR user_id IN (
      SELECT id FROM auth.users 
      WHERE email ILIKE '%ivana%' 
      OR raw_user_meta_data->>'full_name' ILIKE '%ivana%'
    )
  );

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. All queries use ILIKE for case-insensitive matching
-- 2. Queries search both display_name and user_id (via auth.users)
-- 3. Results include both directions (Ivana as debtor/creditor, payer/payee)
-- 4. Run queries in order: Step 1 → Step 2 → Steps 3-6 → Summary
-- 5. Store all IDs returned for deletion planning
-- 6. Verify foreign key relationships before deletion
-- ============================================================================
