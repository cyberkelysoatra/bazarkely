-- ============================================
-- AGENT05 - SQL SCHEMA INVESTIGATION
-- Table: recurring_transactions
-- Date: 2025-01-19
-- ============================================
-- 
-- INSTRUCTIONS:
-- Execute these queries in Supabase SQL Editor
-- Copy results to AGENT05-SCHEMA-INVESTIGATION-REPORT.md
--
-- ============================================

-- ============================================
-- QUERY 1: Get all columns with types
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'recurring_transactions'
ORDER BY ordinal_position;

-- ============================================
-- QUERY 2: Get all constraints (CHECK, FK, PK, UNIQUE)
-- ============================================
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name 
    AND tc.table_schema = ccu.constraint_schema
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name 
    AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'recurring_transactions'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================
-- QUERY 3: Get indexes
-- ============================================
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'recurring_transactions'
ORDER BY indexname;

-- ============================================
-- QUERY 4: Get RLS policies
-- ============================================
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual, 
    with_check
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'recurring_transactions'
ORDER BY policyname;

-- ============================================
-- QUERY 5: Verify accounts table structure for FK reference
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'accounts'
ORDER BY ordinal_position;

-- ============================================
-- QUERY 6: Get triggers on recurring_transactions
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'recurring_transactions'
ORDER BY trigger_name;

-- ============================================
-- QUERY 7: Check if target_account_id already exists
-- ============================================
SELECT 
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'recurring_transactions'
  AND column_name = 'target_account_id';

-- ============================================
-- QUERY 8: Get exact CHECK constraint for 'type' column
-- ============================================
SELECT 
    cc.constraint_name,
    cc.check_clause
FROM information_schema.check_constraints cc
JOIN information_schema.constraint_column_usage ccu
    ON cc.constraint_name = ccu.constraint_name
    AND cc.constraint_schema = ccu.constraint_schema
WHERE ccu.table_schema = 'public'
  AND ccu.table_name = 'recurring_transactions'
  AND ccu.column_name = 'type';





