-- ============================================================================
-- ROLLBACK: Make supplier_company_id nullable for BCI orders
-- Date: 2025-11-15
-- Description: Revert migration 20251115120000_make_supplier_company_id_nullable.sql
-- ============================================================================
-- 
-- WARNING: This rollback will fail if there are any BCI orders with 
-- supplier_company_id = NULL in the database. You must delete or update 
-- those orders first.
--
-- STEPS:
-- 1. Delete or update all BCI orders (set supplier_company_id or convert to BCE)
-- 2. Drop the CHECK constraint
-- 3. Drop the trigger
-- 4. Make supplier_company_id NOT NULL again
-- 5. Re-add the check_supplier_is_supplier constraint
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Check for BCI orders that would violate NOT NULL constraint
-- ============================================================================
DO $$
DECLARE
  bci_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO bci_count
  FROM public.poc_purchase_orders
  WHERE order_type = 'BCI' 
    AND supplier_company_id IS NULL;
  
  IF bci_count > 0 THEN
    RAISE EXCEPTION 
      'Cannot rollback: % BCI orders exist with supplier_company_id = NULL. '
      'Please delete or update these orders first.',
      bci_count;
  END IF;
  
  RAISE NOTICE 'Aucune commande BCI avec supplier_company_id NULL trouvée, rollback peut continuer';
END $$;

-- ============================================================================
-- STEP 2: Drop CHECK constraint
-- ============================================================================
ALTER TABLE public.poc_purchase_orders 
  DROP CONSTRAINT IF EXISTS check_supplier_by_order_type;

-- ============================================================================
-- STEP 3: Drop trigger and function
-- ============================================================================
DROP TRIGGER IF EXISTS validate_poc_purchase_order_supplier_type_trigger 
  ON public.poc_purchase_orders;

DROP FUNCTION IF EXISTS public.validate_poc_purchase_order_supplier_type();

-- ============================================================================
-- STEP 4: Make supplier_company_id NOT NULL again
-- ============================================================================
-- This will fail if any NULL values exist
ALTER TABLE public.poc_purchase_orders 
  ALTER COLUMN supplier_company_id SET NOT NULL;

-- ============================================================================
-- STEP 5: Re-add check_supplier_is_supplier constraint
-- ============================================================================
-- Note: This constraint uses a subquery which is less efficient than a trigger,
-- but we restore it for backward compatibility
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public'
      AND table_name = 'poc_purchase_orders'
      AND constraint_name = 'check_supplier_is_supplier'
  ) THEN
    ALTER TABLE public.poc_purchase_orders
      ADD CONSTRAINT check_supplier_is_supplier 
      CHECK (
        EXISTS (
          SELECT 1 
          FROM public.poc_companies
          WHERE id = supplier_company_id 
            AND type = 'supplier'
        )
      );
    
    RAISE NOTICE 'Contrainte check_supplier_is_supplier restaurée';
  ELSE
    RAISE NOTICE 'Contrainte check_supplier_is_supplier existe déjà';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-ROLLBACK
-- ============================================================================
-- Run these queries to verify rollback success:
--
-- 1. Verify column is NOT NULL again:
-- SELECT column_name, is_nullable, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
--   AND table_name = 'poc_purchase_orders' 
--   AND column_name = 'supplier_company_id';
-- Expected: is_nullable = 'NO'
--
-- 2. Verify CHECK constraint exists:
-- SELECT constraint_name, check_clause
-- FROM information_schema.check_constraints
-- WHERE constraint_schema = 'public'
--   AND constraint_name = 'check_supplier_is_supplier';
-- Expected: constraint exists
--
-- 3. Verify trigger is removed:
-- SELECT trigger_name
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
--   AND trigger_name = 'validate_poc_purchase_order_supplier_type_trigger';
-- Expected: no rows returned
-- ============================================================================




