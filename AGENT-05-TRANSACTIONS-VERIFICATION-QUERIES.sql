-- ============================================
-- AGENT-05 - TRANSACTIONS TABLE VERIFICATION QUERIES
-- Date: 2025-01-19
-- Purpose: Verify exact schema before adding ownership transfer columns
-- ============================================
-- 
-- INSTRUCTIONS:
-- Execute these queries in Supabase SQL Editor
-- Copy results to AGENT-05-TRANSACTIONS-SCHEMA-INVESTIGATION.md
--
-- ============================================

-- ============================================
-- QUERY 1: Get all columns with types, nullability, defaults
-- ============================================
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

-- ============================================
-- QUERY 2: Get all constraints (CHECK, FK, PK, UNIQUE)
-- ============================================
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule,
    rc.update_rule,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name 
    AND tc.table_schema = kcu.table_schema
    AND tc.table_name = kcu.table_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name 
    AND tc.table_schema = ccu.constraint_schema
LEFT JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name 
    AND tc.constraint_schema = cc.constraint_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'transactions'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ============================================
-- QUERY 3: Get all indexes
-- ============================================
SELECT 
    indexname, 
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
  AND tablename = 'transactions'
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
  AND tablename = 'transactions'
ORDER BY policyname, cmd;

-- ============================================
-- QUERY 5: Verify ownership transfer columns do NOT exist
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
  AND column_name IN ('current_owner_id', 'original_owner_id', 'transferred_at', 'transferred_from', 'transferred_by');

-- Expected result: 0 rows (columns should NOT exist)

-- ============================================
-- QUERY 6: Get triggers on transactions table
-- ============================================
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing,
    action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'transactions'
ORDER BY trigger_name;

-- ============================================
-- QUERY 7: Verify user_id column details
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
  AND table_name = 'transactions'
  AND column_name = 'user_id';

-- ============================================
-- QUERY 8: Get foreign key details for user_id
-- ============================================
SELECT 
    tc.constraint_name,
    kcu.column_name,
    ccu.table_schema AS foreign_schema,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu 
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.constraint_schema
JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name
    AND tc.table_schema = rc.constraint_schema
WHERE tc.table_schema = 'public' 
  AND tc.table_name = 'transactions'
  AND kcu.column_name = 'user_id'
  AND tc.constraint_type = 'FOREIGN KEY';

-- ============================================
-- QUERY 9: Check if is_recurring and recurring_transaction_id exist
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
  AND column_name IN ('is_recurring', 'recurring_transaction_id');

-- Expected: 0 or 2 rows (depending on if recurring transactions migration was applied)

-- ============================================
-- QUERY 10: Get table comments and column comments
-- ============================================
SELECT 
    obj_description('public.transactions'::regclass, 'pg_class') AS table_comment;

SELECT 
    column_name,
    col_description('public.transactions'::regclass::oid, ordinal_position) AS column_comment
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'transactions'
ORDER BY ordinal_position;

