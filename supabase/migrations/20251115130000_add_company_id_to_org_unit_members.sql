-- ============================================================================
-- MIGRATION: Add company_id column to poc_org_unit_members
-- Date: 2025-11-15
-- Agent: AGENT05 - Schema Fix
-- ============================================================================
-- 
-- CONTEXT:
-- Table poc_org_unit_members is missing company_id column. Code in 
-- PurchaseOrderForm.tsx line 252 attempts to query poc_org_unit_members 
-- with company_id filter but column does not exist in table schema. This 
-- causes org unit loading to fail.
--
-- SOLUTION:
-- Add company_id column to poc_org_unit_members with foreign key to 
-- poc_companies. Populate existing data from related org_unit.company_id.
-- Create indexes for query performance.
--
-- RELATIONSHIP:
-- poc_org_unit_members.org_unit_id → poc_org_units.id → poc_org_units.company_id
-- Therefore company_id can be derived from org_unit relationship.
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: INVESTIGATION - Check current schema state
-- ============================================================================
-- Run these queries first to understand current state (commented out for production)
/*
-- Check current columns
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'poc_org_unit_members'
ORDER BY ordinal_position;

-- Count existing records
SELECT COUNT(*) as total_records
FROM public.poc_org_unit_members;

-- Check if org_unit_id references exist
SELECT 
  COUNT(*) as total_members,
  COUNT(DISTINCT org_unit_id) as unique_org_units,
  COUNT(CASE WHEN org_unit_id IS NULL THEN 1 END) as null_org_units
FROM public.poc_org_unit_members;

-- Verify relationship path exists
SELECT 
  COUNT(*) as members_with_valid_org_unit
FROM public.poc_org_unit_members m
INNER JOIN public.poc_org_units u ON m.org_unit_id = u.id
WHERE u.company_id IS NOT NULL;
*/

-- ============================================================================
-- STEP 2: Add company_id column (nullable initially to allow data backfill)
-- ============================================================================
DO $$
BEGIN
  -- Check if column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'poc_org_unit_members' 
      AND column_name = 'company_id'
  ) THEN
    -- Add column as nullable first
    ALTER TABLE public.poc_org_unit_members 
      ADD COLUMN company_id UUID;
    
    RAISE NOTICE 'Colonne company_id ajoutée à poc_org_unit_members';
  ELSE
    RAISE NOTICE 'Colonne company_id existe déjà, aucune action nécessaire';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Backfill existing data from related org_unit
-- ============================================================================
-- Populate company_id from related org_unit.company_id
DO $$
DECLARE
  rows_updated INTEGER;
  rows_with_null_org_unit INTEGER;
BEGIN
  -- Update company_id from org_unit relationship
  UPDATE public.poc_org_unit_members m
  SET company_id = u.company_id
  FROM public.poc_org_units u
  WHERE m.org_unit_id = u.id
    AND m.company_id IS NULL
    AND u.company_id IS NOT NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Mise à jour de % enregistrements avec company_id depuis org_unit', rows_updated;
  END IF;
  
  -- Check for orphaned records (members with invalid org_unit_id)
  SELECT COUNT(*) INTO rows_with_null_org_unit
  FROM public.poc_org_unit_members
  WHERE company_id IS NULL;
  
  IF rows_with_null_org_unit > 0 THEN
    RAISE WARNING 'ATTENTION: % enregistrements ont company_id NULL (org_unit_id invalide ou NULL)', rows_with_null_org_unit;
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add foreign key constraint to poc_companies
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
      AND table_name = 'poc_org_unit_members'
      AND constraint_name = 'fk_org_unit_members_company'
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE public.poc_org_unit_members
      ADD CONSTRAINT fk_org_unit_members_company
      FOREIGN KEY (company_id) 
      REFERENCES public.poc_companies(id)
      ON DELETE CASCADE;
    
    RAISE NOTICE 'Contrainte de clé étrangère fk_org_unit_members_company ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte fk_org_unit_members_company existe déjà';
  END IF;
END $$;

-- ============================================================================
-- STEP 5: Make column NOT NULL after backfill (only if all records have company_id)
-- ============================================================================
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check if any records still have NULL company_id
  SELECT COUNT(*) INTO null_count
  FROM public.poc_org_unit_members
  WHERE company_id IS NULL;
  
  IF null_count = 0 THEN
    -- All records have company_id, make column NOT NULL
    ALTER TABLE public.poc_org_unit_members
      ALTER COLUMN company_id SET NOT NULL;
    
    RAISE NOTICE 'Colonne company_id rendue NOT NULL (tous les enregistrements ont une valeur)';
  ELSE
    RAISE WARNING 'Colonne company_id reste nullable: % enregistrements ont company_id NULL', null_count;
    RAISE WARNING 'Veuillez corriger les données avant de rendre la colonne NOT NULL';
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Create indexes for query performance
-- ============================================================================
-- Index on company_id for filtering performance
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_company_id 
  ON public.poc_org_unit_members(company_id);

-- Composite index for common query pattern (company_id + user_id + status)
-- This matches the query pattern in PurchaseOrderForm.tsx line 252
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_company_user_status
  ON public.poc_org_unit_members(company_id, user_id, status);

-- Composite index for filtering by company and org_unit
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_company_org_unit
  ON public.poc_org_unit_members(company_id, org_unit_id);

-- Partial index for active members by company (common query pattern)
CREATE INDEX IF NOT EXISTS idx_poc_org_unit_members_company_active
  ON public.poc_org_unit_members(company_id, status) 
  WHERE status = 'active';

-- ============================================================================
-- STEP 7: Add comment to document the column
-- ============================================================================
COMMENT ON COLUMN public.poc_org_unit_members.company_id IS 
  'Compagnie à laquelle appartient l''unité organisationnelle (dérivé de org_unit.company_id)';

-- ============================================================================
-- STEP 8: Create trigger to automatically maintain company_id
-- ============================================================================
-- This trigger ensures company_id is always set from org_unit_id
-- when inserting or updating records
CREATE OR REPLACE FUNCTION public.sync_org_unit_member_company_id()
RETURNS TRIGGER AS $$
BEGIN
  -- If company_id is not provided, derive it from org_unit_id
  IF NEW.company_id IS NULL AND NEW.org_unit_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.poc_org_units
    WHERE id = NEW.org_unit_id;
    
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'org_unit_id % does not exist or has no company_id', NEW.org_unit_id;
    END IF;
  END IF;
  
  -- If org_unit_id changes, update company_id accordingly
  IF OLD.org_unit_id IS DISTINCT FROM NEW.org_unit_id AND NEW.org_unit_id IS NOT NULL THEN
    SELECT company_id INTO NEW.company_id
    FROM public.poc_org_units
    WHERE id = NEW.org_unit_id;
    
    IF NEW.company_id IS NULL THEN
      RAISE EXCEPTION 'org_unit_id % does not exist or has no company_id', NEW.org_unit_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS sync_org_unit_member_company_id_trigger 
  ON public.poc_org_unit_members;

CREATE TRIGGER sync_org_unit_member_company_id_trigger
  BEFORE INSERT OR UPDATE OF org_unit_id ON public.poc_org_unit_members
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_org_unit_member_company_id();

-- ============================================================================
-- STEP 9: Verify RLS policies work correctly
-- ============================================================================
-- Note: Existing RLS policies should continue to work because they filter
-- through org_unit_id → org_unit → company_id relationship.
-- However, we can now add direct company_id filters for better performance.
-- 
-- Check existing policies (commented out for reference):
/*
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'poc_org_unit_members';
*/

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify success:
--
-- 1. Verify column exists and is correct type:
-- SELECT 
--   column_name, 
--   data_type, 
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'poc_org_unit_members' 
--   AND column_name = 'company_id';
-- Expected: data_type = 'uuid', is_nullable = 'NO' (or 'YES' if some records still NULL)
--
-- 2. Verify foreign key constraint exists:
-- SELECT 
--   constraint_name, 
--   table_name,
--   constraint_type
-- FROM information_schema.table_constraints
-- WHERE constraint_schema = 'public'
--   AND table_name = 'poc_org_unit_members'
--   AND constraint_name = 'fk_org_unit_members_company';
-- Expected: constraint exists
--
-- 3. Verify indexes created:
-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'poc_org_unit_members'
--   AND indexname LIKE '%company%';
-- Expected: 4 indexes with 'company' in name
--
-- 4. Test query from PurchaseOrderForm (replace with actual values):
-- SELECT org_unit_id 
-- FROM public.poc_org_unit_members 
-- WHERE user_id = 'user-uuid-here'
--   AND status = 'active'
--   AND company_id = 'company-uuid-here';
-- Expected: Returns org_unit_id values without errors
--
-- 5. Verify data integrity (all members should have company_id):
-- SELECT 
--   COUNT(*) as total_members,
--   COUNT(company_id) as members_with_company_id,
--   COUNT(*) - COUNT(company_id) as members_without_company_id
-- FROM public.poc_org_unit_members;
-- Expected: members_without_company_id = 0 (or handle orphaned records)
--
-- 6. Verify company_id matches org_unit.company_id:
-- SELECT 
--   COUNT(*) as mismatched_records
-- FROM public.poc_org_unit_members m
-- INNER JOIN public.poc_org_units u ON m.org_unit_id = u.id
-- WHERE m.company_id != u.company_id;
-- Expected: mismatched_records = 0
-- ============================================================================

