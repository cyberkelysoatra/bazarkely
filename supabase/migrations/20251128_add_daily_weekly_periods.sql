-- ============================================================================
-- MIGRATION: Add daily and weekly periods to poc_consumption_plans
-- Date: 2025-11-28
-- Agent: AGENT05 - Database Migration
-- ============================================================================
-- 
-- DESCRIPTION:
-- The poc_consumption_plans table currently only supports 'monthly', 
-- 'quarterly', 'yearly' periods. This migration extends the CHECK constraint
-- on planned_period column to include 'daily' and 'weekly' support.
--
-- CHANGES:
-- - Drop existing planned_period CHECK constraint
-- - Add new constraint with all 5 periods: daily, weekly, monthly, quarterly, yearly
-- - Update column comment for documentation
--
-- SAFETY:
-- This is an ADDITIVE change (adding values, not removing).
-- Existing data with 'monthly', 'quarterly', 'yearly' will still be valid.
-- No data migration needed.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop existing constraint
-- ============================================================================
ALTER TABLE public.poc_consumption_plans
  DROP CONSTRAINT IF EXISTS poc_consumption_plans_planned_period_check;

-- ============================================================================
-- STEP 2: Add new constraint with all 5 periods
-- ============================================================================
ALTER TABLE public.poc_consumption_plans
  ADD CONSTRAINT poc_consumption_plans_planned_period_check 
  CHECK (planned_period IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));

-- ============================================================================
-- STEP 3: Add comment for documentation
-- ============================================================================
COMMENT ON COLUMN public.poc_consumption_plans.planned_period IS 
  'Consumption period: daily (quotidien), weekly (hebdomadaire), monthly (mensuel), quarterly (trimestriel), yearly (annuel)';

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify success:
--
-- 1. Verify constraint exists with new values:
-- SELECT 
--   constraint_name, 
--   check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_schema = 'public'
--   AND constraint_name = 'poc_consumption_plans_planned_period_check';
-- Expected: check_clause contains 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'
--
-- 2. Test insert with daily period (should succeed):
-- INSERT INTO public.poc_consumption_plans (
--   company_id,
--   product_id,
--   planned_period,
--   planned_quantity,
--   start_date,
--   created_by
-- ) VALUES (
--   (SELECT id FROM poc_companies WHERE type = 'builder' LIMIT 1),
--   (SELECT id FROM poc_products LIMIT 1),
--   'daily',
--   100,
--   CURRENT_DATE,
--   (SELECT id FROM auth.users LIMIT 1)
-- );
-- Expected: SUCCESS
--
-- 3. Test insert with weekly period (should succeed):
-- INSERT INTO public.poc_consumption_plans (
--   company_id,
--   product_id,
--   planned_period,
--   planned_quantity,
--   start_date,
--   created_by
-- ) VALUES (
--   (SELECT id FROM poc_companies WHERE type = 'builder' LIMIT 1),
--   (SELECT id FROM poc_products LIMIT 1),
--   'weekly',
--   500,
--   CURRENT_DATE,
--   (SELECT id FROM auth.users LIMIT 1)
-- );
-- Expected: SUCCESS
--
-- 4. Test insert with invalid period (should fail):
-- INSERT INTO public.poc_consumption_plans (
--   company_id,
--   product_id,
--   planned_period,
--   planned_quantity,
--   start_date,
--   created_by
-- ) VALUES (
--   (SELECT id FROM poc_companies WHERE type = 'builder' LIMIT 1),
--   (SELECT id FROM poc_products LIMIT 1),
--   'invalid',
--   100,
--   CURRENT_DATE,
--   (SELECT id FROM auth.users LIMIT 1)
-- );
-- Expected: FAIL with CHECK constraint violation
--
-- 5. Verify existing data still valid:
-- SELECT 
--   planned_period,
--   COUNT(*) as count
-- FROM public.poc_consumption_plans
-- GROUP BY planned_period
-- ORDER BY planned_period;
-- Expected: All existing records with 'monthly', 'quarterly', 'yearly' are still present
-- ============================================================================

