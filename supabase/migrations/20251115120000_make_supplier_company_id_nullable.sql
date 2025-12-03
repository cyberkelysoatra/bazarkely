-- ============================================================================
-- MIGRATION: Make supplier_company_id nullable for BCI orders
-- Date: 2025-11-15
-- Description: Support BCI (internal) orders without supplier
-- ============================================================================
-- 
-- CONTEXT:
-- Purchase orders table poc_purchase_orders currently requires 
-- supplier_company_id to be NOT NULL, preventing creation of BCI (internal) 
-- orders which don't have suppliers. This migration makes supplier_company_id 
-- nullable to support both BCI (internal to org_unit) and BCE (external to 
-- supplier) order types.
--
-- CHANGES:
-- 1. Make supplier_company_id nullable
-- 2. Drop/modify check_supplier_is_supplier constraint (doesn't work with NULL)
-- 3. Add CHECK constraint to ensure data integrity:
--    - BCE orders MUST have supplier_company_id
--    - BCI orders MUST NOT have supplier_company_id
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Make supplier_company_id nullable
-- ============================================================================
ALTER TABLE public.poc_purchase_orders 
  ALTER COLUMN supplier_company_id DROP NOT NULL;

-- ============================================================================
-- STEP 2: Drop existing check_supplier_is_supplier constraint
-- ============================================================================
-- This constraint uses a subquery that doesn't work well with NULL values
-- We'll replace it with a better constraint that handles NULLs
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
      AND table_name = 'poc_purchase_orders'
      AND constraint_name = 'check_supplier_is_supplier'
  ) THEN
    ALTER TABLE public.poc_purchase_orders
      DROP CONSTRAINT check_supplier_is_supplier;
    
    RAISE NOTICE 'Contrainte check_supplier_is_supplier supprimée';
  ELSE
    RAISE NOTICE 'Contrainte check_supplier_is_supplier n''existe pas, aucune action nécessaire';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Add CHECK constraint for data integrity by order_type
-- ============================================================================
-- Ensure BCE orders have supplier, BCI orders don't
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
      AND table_name = 'poc_purchase_orders'
      AND constraint_name = 'check_supplier_by_order_type'
  ) THEN
    ALTER TABLE public.poc_purchase_orders
      ADD CONSTRAINT check_supplier_by_order_type 
      CHECK (
        -- BCE orders MUST have supplier_company_id
        (order_type = 'BCE' AND supplier_company_id IS NOT NULL) OR
        -- BCI orders MUST NOT have supplier_company_id
        (order_type = 'BCI' AND supplier_company_id IS NULL) OR
        -- Allow NULL order_type for backward compatibility (will be set to BCE by default)
        (order_type IS NULL)
      );
    
    RAISE NOTICE 'Contrainte check_supplier_by_order_type ajoutée';
  ELSE
    RAISE NOTICE 'Contrainte check_supplier_by_order_type existe déjà';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Add trigger to validate supplier type when supplier_company_id is set
-- ============================================================================
-- This replaces the dropped check_supplier_is_supplier constraint
-- but only validates when supplier_company_id is NOT NULL
CREATE OR REPLACE FUNCTION public.validate_poc_purchase_order_supplier_type()
RETURNS TRIGGER AS $$
BEGIN
  -- Only validate if supplier_company_id is provided (BCE orders)
  IF NEW.supplier_company_id IS NOT NULL THEN
    -- Verify the supplier is actually a supplier company
    IF NOT EXISTS (
      SELECT 1 
      FROM public.poc_companies 
      WHERE id = NEW.supplier_company_id 
        AND type = 'supplier'
    ) THEN
      RAISE EXCEPTION 'supplier_company_id must reference a company of type ''supplier''';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists and recreate it
DROP TRIGGER IF EXISTS validate_poc_purchase_order_supplier_type_trigger ON public.poc_purchase_orders;

CREATE TRIGGER validate_poc_purchase_order_supplier_type_trigger
  BEFORE INSERT OR UPDATE OF supplier_company_id ON public.poc_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_poc_purchase_order_supplier_type();

-- ============================================================================
-- STEP 5: Update existing orders without order_type (backward compatibility)
-- ============================================================================
-- Set order_type to 'BCE' for existing orders that don't have order_type
-- and have a supplier_company_id (they are external orders)
DO $$
DECLARE
  rows_updated INTEGER;
BEGIN
  UPDATE public.poc_purchase_orders
  SET order_type = 'BCE'
  WHERE order_type IS NULL 
    AND supplier_company_id IS NOT NULL;
  
  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  
  IF rows_updated > 0 THEN
    RAISE NOTICE 'Mise à jour de % commandes existantes avec order_type = ''BCE''', rows_updated;
  END IF;
END $$;

-- ============================================================================
-- STEP 6: Verify foreign key constraint is preserved
-- ============================================================================
-- The foreign key constraint on supplier_company_id remains valid
-- It will allow NULL values now (since we made it nullable)
-- No action needed here, PostgreSQL handles this automatically

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify success:
--
-- 1. Verify column is now nullable:
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'poc_purchase_orders' 
--   AND column_name = 'supplier_company_id';
-- Expected: is_nullable = 'YES'
--
-- 2. Verify CHECK constraint exists:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_schema = 'public'
--   AND constraint_name = 'check_supplier_by_order_type';
-- Expected: constraint exists with correct logic
--
-- 3. Verify trigger exists:
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND trigger_name = 'validate_poc_purchase_order_supplier_type_trigger';
-- Expected: trigger exists
--
-- 4. Test BCI insert (should succeed):
-- INSERT INTO poc_purchase_orders (
--   order_number, 
--   buyer_company_id, 
--   order_type, 
--   org_unit_id, 
--   created_by
-- ) VALUES (
--   'TEST-BCI-001',
--   'valid-builder-company-id',
--   'BCI',
--   'valid-org-unit-id',
--   'valid-user-id'
-- );
-- Expected: SUCCESS (supplier_company_id is NULL)
--
-- 5. Test BCE insert without supplier (should fail):
-- INSERT INTO poc_purchase_orders (
--   order_number, 
--   buyer_company_id, 
--   order_type, 
--   project_id, 
--   created_by
-- ) VALUES (
--   'TEST-BCE-001',
--   'valid-builder-company-id',
--   'BCE',
--   'valid-project-id',
--   'valid-user-id'
-- );
-- Expected: FAIL with CHECK constraint violation
--
-- 6. Test BCE insert with supplier (should succeed):
-- INSERT INTO poc_purchase_orders (
--   order_number, 
--   buyer_company_id, 
--   supplier_company_id,
--   order_type, 
--   project_id, 
--   created_by
-- ) VALUES (
--   'TEST-BCE-002',
--   'valid-builder-company-id',
--   'valid-supplier-company-id',
--   'BCE',
--   'valid-project-id',
--   'valid-user-id'
-- );
-- Expected: SUCCESS
-- ============================================================================




