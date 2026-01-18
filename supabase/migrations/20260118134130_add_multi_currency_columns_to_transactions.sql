-- ============================================================================
-- MIGRATION: Add multi-currency columns to transactions table
-- Date: 2026-01-18
-- Agent: AGENT05 - Database Migration
-- ============================================================================
-- 
-- DESCRIPTION:
-- Fix EUR transfer bug by adding missing multi-currency columns to preserve
-- original currency information. These columns exist in TypeScript interface
-- but were missing in Supabase schema, causing data loss after sync.
--
-- PROBLEM:
-- When a transaction is created with a currency different from the account
-- currency, the frontend converts the amount and stores:
-- - amount: converted amount (in account currency)
-- - originalCurrency: original currency code (EUR, MGA, etc.)
-- - originalAmount: original amount before conversion
-- - exchangeRateUsed: exchange rate used for conversion
--
-- However, these last 3 fields were not persisted in Supabase, causing data
-- loss when transactions are synced from IndexedDB to Supabase.
--
-- SOLUTION:
-- Add 3 nullable columns to preserve original currency information:
-- 1. original_currency: Currency code of original transaction
-- 2. original_amount: Original amount before conversion
-- 3. exchange_rate_used: Exchange rate used for conversion
--
-- CHANGES:
-- 1. Add original_currency TEXT column (nullable, CHECK for valid codes)
-- 2. Add original_amount NUMERIC column (nullable, CHECK for positive)
-- 3. Add exchange_rate_used NUMERIC column (nullable, CHECK for positive)
-- 4. Create index on original_currency for faster queries
-- 5. Add descriptive comments on each column
--
-- SAFETY:
-- - Uses transaction wrapper (BEGIN/COMMIT) for atomicity
-- - Idempotent: uses IF NOT EXISTS to allow multiple executions
-- - No data deletion or modification
-- - All columns nullable for backward compatibility
-- - All existing columns preserved
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Add original_currency column
-- ============================================================================
-- Column type: TEXT allows currency codes like 'EUR', 'MGA', etc.
-- NULL constraint: Allows existing transactions without this field (backward compatible)
-- CHECK constraint: Validates currency codes (MGA, EUR, or NULL)
-- IF NOT EXISTS: Makes script idempotent (safe to run multiple times)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS original_currency TEXT NULL;

-- Add CHECK constraint for valid currency codes
-- Only allow 'MGA' and 'EUR' for now (can be extended later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_original_currency_check'
    AND table_schema = 'public'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_original_currency_check
    CHECK (original_currency IN ('MGA', 'EUR') OR original_currency IS NULL);
  END IF;
END $$;

-- Add descriptive comment
COMMENT ON COLUMN public.transactions.original_currency IS 
'Currency code of the original transaction amount before conversion to account currency. NULL for transactions created before this feature or transactions without currency conversion. Valid values: MGA, EUR.';

-- ============================================================================
-- STEP 2: Add original_amount column
-- ============================================================================
-- Column type: NUMERIC allows decimal amounts with precision
-- NULL constraint: Allows existing transactions without this field
-- CHECK constraint: Validates positive values (or NULL)
-- IF NOT EXISTS: Makes script idempotent
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(15, 2) NULL;

-- Add CHECK constraint for positive values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_original_amount_check'
    AND table_schema = 'public'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_original_amount_check
    CHECK (original_amount > 0 OR original_amount IS NULL);
  END IF;
END $$;

-- Add descriptive comment
COMMENT ON COLUMN public.transactions.original_amount IS 
'Original transaction amount in original_currency before conversion to account currency. NULL for transactions created before this feature or transactions without currency conversion. Must be positive if not NULL.';

-- ============================================================================
-- STEP 3: Add exchange_rate_used column
-- ============================================================================
-- Column type: NUMERIC allows decimal exchange rates with precision
-- NULL constraint: Allows existing transactions without this field
-- CHECK constraint: Validates positive values (or NULL)
-- IF NOT EXISTS: Makes script idempotent
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS exchange_rate_used NUMERIC(10, 4) NULL;

-- Add CHECK constraint for positive values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_exchange_rate_used_check'
    AND table_schema = 'public'
    AND table_name = 'transactions'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_exchange_rate_used_check
    CHECK (exchange_rate_used > 0 OR exchange_rate_used IS NULL);
  END IF;
END $$;

-- Add descriptive comment
COMMENT ON COLUMN public.transactions.exchange_rate_used IS 
'Exchange rate used to convert original_amount from original_currency to account currency. NULL for transactions created before this feature or transactions without currency conversion. Must be positive if not NULL.';

-- ============================================================================
-- STEP 4: Create index for performance
-- ============================================================================
-- Partial index (WHERE NOT NULL) is more efficient because:
-- 1. Smaller index size (only indexes non-NULL values)
-- 2. Faster queries when filtering/sorting by original_currency
-- 3. Better performance for transactions with currency conversion data
-- IF NOT EXISTS: Makes script idempotent
CREATE INDEX IF NOT EXISTS idx_transactions_original_currency 
ON public.transactions(original_currency) 
WHERE original_currency IS NOT NULL;

COMMENT ON INDEX idx_transactions_original_currency IS 
'Partial index on original_currency for faster queries on transactions with currency conversion. Only indexes non-NULL values.';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (for emergency use only)
-- ============================================================================
-- Uncomment and execute if you need to rollback this migration:
--
-- BEGIN;
-- DROP INDEX IF EXISTS public.idx_transactions_original_currency;
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_exchange_rate_used_check;
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_amount_check;
-- ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_original_currency_check;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS exchange_rate_used;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_amount;
-- ALTER TABLE public.transactions DROP COLUMN IF EXISTS original_currency;
-- COMMIT;
--
-- WARNING: Rolling back will permanently delete the columns and all data in them.
-- Make sure you have a backup before executing rollback.
-- ============================================================================

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Run these queries in Supabase SQL Editor to verify migration success:
--
-- 1. Verify columns exist:
-- SELECT 
--   column_name, 
--   data_type, 
--   numeric_precision, 
--   numeric_scale,
--   is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name = 'transactions'
--   AND column_name IN ('original_currency', 'original_amount', 'exchange_rate_used')
-- ORDER BY column_name;
--
-- Expected result:
-- column_name           | data_type | numeric_precision | numeric_scale | is_nullable
-- ----------------------|-----------|-------------------|---------------|------------
-- exchange_rate_used    | numeric   | 10                | 4             | YES
-- original_amount       | numeric   | 15                | 2             | YES
-- original_currency     | text      | NULL              | NULL          | YES
--
-- 2. Verify constraints exist:
-- SELECT 
--   constraint_name,
--   constraint_type,
--   check_clause
-- FROM information_schema.table_constraints tc
-- JOIN information_schema.check_constraints cc 
--   ON tc.constraint_name = cc.constraint_name
-- WHERE tc.table_schema = 'public'
--   AND tc.table_name = 'transactions'
--   AND tc.constraint_type = 'CHECK'
--   AND constraint_name LIKE '%original%' OR constraint_name LIKE '%exchange%'
-- ORDER BY constraint_name;
--
-- Expected result: 3 CHECK constraints should exist
--
-- 3. Verify index exists:
-- SELECT 
--   indexname, 
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'public'
--   AND tablename = 'transactions'
--   AND indexname = 'idx_transactions_original_currency';
--
-- Expected result: Index should exist with WHERE clause
--
-- 4. Count transactions with NULL vs non-NULL values:
-- SELECT 
--   COUNT(*) as total_transactions,
--   COUNT(original_currency) as transactions_with_currency,
--   COUNT(original_amount) as transactions_with_original_amount,
--   COUNT(exchange_rate_used) as transactions_with_rate,
--   COUNT(*) - COUNT(original_currency) as transactions_without_currency
-- FROM public.transactions;
--
-- Expected result: All existing transactions should have NULL (backward compatible)
-- ============================================================================

-- ============================================================================
-- SAMPLE QUERIES: How to use the new columns
-- ============================================================================
--
-- 1. Get all transactions with currency conversion:
-- SELECT 
--   id,
--   description,
--   amount,
--   original_currency,
--   original_amount,
--   exchange_rate_used,
--   (amount / exchange_rate_used) as calculated_original_amount
-- FROM public.transactions
-- WHERE original_currency IS NOT NULL
-- ORDER BY created_at DESC;
--
-- 2. Find EUR transactions:
-- SELECT 
--   id,
--   description,
--   original_amount,
--   original_currency,
--   amount as converted_amount_mga
-- FROM public.transactions
-- WHERE original_currency = 'EUR'
-- ORDER BY created_at DESC;
--
-- 3. Calculate conversion accuracy:
-- SELECT 
--   id,
--   original_amount,
--   amount,
--   exchange_rate_used,
--   (amount / exchange_rate_used) as calculated_original,
--   ABS(original_amount - (amount / exchange_rate_used)) as difference
-- FROM public.transactions
-- WHERE original_currency IS NOT NULL
--   AND exchange_rate_used IS NOT NULL
--   AND original_amount IS NOT NULL;
--
-- 4. Update existing transaction with currency info (example):
-- UPDATE public.transactions
-- SET 
--   original_currency = 'EUR',
--   original_amount = 100.00,
--   exchange_rate_used = 4950.00
-- WHERE id = 'transaction-uuid-here';
--
-- ============================================================================
