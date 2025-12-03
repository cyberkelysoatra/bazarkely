-- ============================================================================
-- ROLLBACK: Add company_id column to poc_org_unit_members
-- Date: 2025-11-15
-- Description: Revert migration 20251115130000_add_company_id_to_org_unit_members.sql
-- ============================================================================
-- 
-- WARNING: This rollback will remove the company_id column and all related
-- indexes. Make sure no code depends on this column before rolling back.
--
-- STEPS:
-- 1. Drop indexes that depend on company_id
-- 2. Drop foreign key constraint
-- 3. Drop the company_id column
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Drop indexes that depend on company_id
-- ============================================================================
DROP INDEX IF EXISTS public.idx_poc_org_unit_members_company_id;
DROP INDEX IF EXISTS public.idx_poc_org_unit_members_company_user_status;
DROP INDEX IF EXISTS public.idx_poc_org_unit_members_company_org_unit;
DROP INDEX IF EXISTS public.idx_poc_org_unit_members_company_active;

-- ============================================================================
-- STEP 2: Drop trigger and function
-- ============================================================================
DROP TRIGGER IF EXISTS sync_org_unit_member_company_id_trigger 
  ON public.poc_org_unit_members;

DROP FUNCTION IF EXISTS public.sync_org_unit_member_company_id();

-- ============================================================================
-- STEP 3: Drop foreign key constraint
-- ============================================================================
ALTER TABLE public.poc_org_unit_members 
  DROP CONSTRAINT IF EXISTS fk_org_unit_members_company;

-- ============================================================================
-- STEP 4: Drop the company_id column
-- ============================================================================
ALTER TABLE public.poc_org_unit_members 
  DROP COLUMN IF EXISTS company_id;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-ROLLBACK
-- ============================================================================
-- Run these queries to verify rollback success:
--
-- 1. Verify column is removed:
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'poc_org_unit_members' 
--   AND column_name = 'company_id';
-- Expected: no rows returned
--
-- 2. Verify constraint is removed:
-- SELECT constraint_name
-- FROM information_schema.table_constraints
-- WHERE constraint_schema = 'public'
--   AND table_name = 'poc_org_unit_members'
--   AND constraint_name = 'fk_org_unit_members_company';
-- Expected: no rows returned
--
-- 3. Verify indexes are removed:
-- SELECT indexname
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'poc_org_unit_members'
--   AND indexname LIKE '%company%';
-- Expected: no rows returned
-- ============================================================================

