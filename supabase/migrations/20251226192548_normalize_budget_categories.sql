-- ============================================================================
-- MIGRATION: Normalize budget categories to match TransactionCategory type
-- Date: 2025-12-26
-- Agent: AGENT05 - Database Migration
-- ============================================================================
-- 
-- DESCRIPTION:
-- Existing budgets in database have category values with inconsistent casing
-- and accents (e.g., "habillement", "Habillement", "Santé", "Éducation").
-- This migration normalizes all category values to match the TransactionCategory
-- type definition: lowercase, no accents.
--
-- VALID CATEGORIES (after migration):
-- - alimentation
-- - logement
-- - transport
-- - sante
-- - education
-- - communication
-- - vetements
-- - loisirs
-- - famille
-- - solidarite
-- - autres
--
-- CHANGES:
-- - Normalize all category values to lowercase, no accents
-- - Map "habillement" → "vetements"
-- - Map "Santé" → "sante"
-- - Map "Éducation" → "education"
-- - Map "Solidarité" → "solidarite"
-- - Map "Épargne" → "epargne" (if exists, though not in TransactionCategory)
-- - Preserve all other columns unchanged
--
-- SAFETY:
-- - Uses transaction wrapper (BEGIN/COMMIT) for atomicity
-- - Idempotent: can be run multiple times safely
-- - No data deletion
-- - No table structure changes
-- - All other columns preserved
-- ============================================================================

BEGIN;

-- ============================================================================
-- STEP 1: Normalize "habillement" / "Habillement" → "vetements"
-- ============================================================================
-- Map all variants of habillement/vetements to "vetements"
UPDATE public.budgets
SET category = 'vetements'
WHERE LOWER(TRIM(category)) IN ('habillement', 'vetements', 'vêtements', 'vêtement')
  AND category != 'vetements';

-- ============================================================================
-- STEP 2: Normalize "santé" / "Santé" → "sante"
-- ============================================================================
UPDATE public.budgets
SET category = 'sante'
WHERE LOWER(TRIM(category)) IN ('santé', 'sante')
  AND category != 'sante';

-- ============================================================================
-- STEP 3: Normalize "éducation" / "Éducation" → "education"
-- ============================================================================
UPDATE public.budgets
SET category = 'education'
WHERE LOWER(TRIM(category)) IN ('éducation', 'education')
  AND category != 'education';

-- ============================================================================
-- STEP 4: Normalize "solidarité" / "Solidarité" → "solidarite"
-- ============================================================================
UPDATE public.budgets
SET category = 'solidarite'
WHERE LOWER(TRIM(category)) IN ('solidarité', 'solidarite')
  AND category != 'solidarite';

-- ============================================================================
-- STEP 5: Normalize "épargne" / "Épargne" → "epargne"
-- ============================================================================
-- Note: "epargne" is not in TransactionCategory type, but we normalize it
-- in case it exists in the database. This should be reviewed and possibly
-- mapped to "autres" or a new category added to the type.
UPDATE public.budgets
SET category = 'epargne'
WHERE LOWER(TRIM(category)) IN ('épargne', 'epargne')
  AND category != 'epargne';

-- ============================================================================
-- STEP 6: Normalize other categories to lowercase (already correct format)
-- ============================================================================
-- Ensure all remaining categories are lowercase
UPDATE public.budgets
SET category = LOWER(TRIM(category))
WHERE category != LOWER(TRIM(category));

-- ============================================================================
-- STEP 7: Normalize "famille" variants
-- ============================================================================
UPDATE public.budgets
SET category = 'famille'
WHERE LOWER(TRIM(category)) IN ('famille', 'famille/enfants', 'famille-enfants')
  AND category != 'famille';

-- ============================================================================
-- STEP 8: Normalize standard categories (ensure lowercase)
-- ============================================================================
UPDATE public.budgets
SET category = 'alimentation'
WHERE LOWER(TRIM(category)) = 'alimentation'
  AND category != 'alimentation';

UPDATE public.budgets
SET category = 'logement'
WHERE LOWER(TRIM(category)) = 'logement'
  AND category != 'logement';

UPDATE public.budgets
SET category = 'transport'
WHERE LOWER(TRIM(category)) = 'transport'
  AND category != 'transport';

UPDATE public.budgets
SET category = 'communication'
WHERE LOWER(TRIM(category)) = 'communication'
  AND category != 'communication';

UPDATE public.budgets
SET category = 'loisirs'
WHERE LOWER(TRIM(category)) = 'loisirs'
  AND category != 'loisirs';

UPDATE public.budgets
SET category = 'autres'
WHERE LOWER(TRIM(category)) = 'autres'
  AND category != 'autres';

COMMIT;

-- ============================================================================
-- VÉRIFICATION POST-MIGRATION
-- ============================================================================
-- Run this query in Supabase SQL Editor to verify migration success:
--
-- SELECT 
--   category, 
--   COUNT(*) as count
-- FROM public.budgets
-- GROUP BY category
-- ORDER BY category;
--
-- Expected result: All categories should be lowercase, no accents
-- Valid categories: alimentation, logement, transport, sante, education,
--                   communication, vetements, loisirs, famille, solidarite, autres
--
-- ============================================================================
-- VERIFICATION QUERY (uncomment to run after migration)
-- ============================================================================
-- SELECT 
--   category, 
--   COUNT(*) as count,
--   CASE 
--     WHEN category IN ('alimentation', 'logement', 'transport', 'sante', 
--                       'education', 'communication', 'vetements', 'loisirs', 
--                       'famille', 'solidarite', 'autres') 
--     THEN '✅ Valid'
--     ELSE '⚠️ Invalid'
--   END as status
-- FROM public.budgets
-- GROUP BY category
-- ORDER BY category;
--
-- ============================================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================================
-- If you need to rollback this migration, you would need to restore from a backup
-- as we don't store the original category values. However, this migration is
-- idempotent and safe to run multiple times.
--
-- To check for any issues before committing, you can run:
--
-- BEGIN;
-- -- Run all UPDATE statements above
-- -- Check results with verification query
-- -- If satisfied: COMMIT;
-- -- If not satisfied: ROLLBACK;
--
-- ============================================================================






