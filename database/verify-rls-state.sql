-- ============================================================================
-- RLS VERIFICATION SCRIPT - BazarKELY Construction POC
-- ============================================================================
-- Date: 2025-01-21
-- Purpose: Verify existence of SECURITY DEFINER functions and RLS policies
-- Execute this script in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- QUERY 1: Check if is_admin() function exists
-- ============================================================================
SELECT 
  proname as function_name,
  proowner::regrole as owner,
  prosecdef as security_definer,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'is_admin'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- QUERY 2: Check if is_joel() function exists
-- ============================================================================
SELECT 
  proname as function_name,
  proowner::regrole as owner,
  prosecdef as security_definer,
  pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'is_joel'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================================================
-- QUERY 3: List ALL RLS policies on poc_companies table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'poc_companies'
ORDER BY policyname;

-- ============================================================================
-- QUERY 4: List ALL RLS policies on poc_company_members table
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'poc_company_members'
ORDER BY policyname;

-- ============================================================================
-- QUERY 5: Check Joel's user record and role
-- ============================================================================
SELECT 
  id,
  email,
  role,
  username,
  created_at,
  last_sync
FROM public.users 
WHERE email = 'joelsoatra@gmail.com';

-- ============================================================================
-- ADDITIONAL QUERIES: Identify policies referencing users table
-- ============================================================================

-- Find all policies that reference 'users' in their USING or WITH CHECK expressions
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%users%' OR qual::text LIKE '%public.users%' THEN 'YES'
    ELSE 'NO'
  END as references_users_in_using,
  CASE 
    WHEN with_check::text LIKE '%users%' OR with_check::text LIKE '%public.users%' THEN 'YES'
    ELSE 'NO'
  END as references_users_in_with_check
FROM pg_policies 
WHERE tablename IN ('poc_companies', 'poc_company_members')
  AND (
    qual::text LIKE '%users%' 
    OR qual::text LIKE '%public.users%'
    OR with_check::text LIKE '%users%'
    OR with_check::text LIKE '%public.users%'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- QUERY: Check if public.users table has RLS enabled
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'users';

-- ============================================================================
-- QUERY: Check RLS policies on public.users table (if any)
-- ============================================================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'users'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================================================
-- QUERY: List all SECURITY DEFINER functions in public schema
-- ============================================================================
SELECT 
  proname as function_name,
  proowner::regrole as owner,
  prosecdef as security_definer,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc 
WHERE pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND prosecdef = true
ORDER BY proname;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================











