-- Admin Functions for BazarKELY
-- These functions bypass RLS policies to provide admin access to all data
-- Execute these in Supabase SQL Editor

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  username VARCHAR(50),
  email VARCHAR(100),
  role VARCHAR(20),
  created_at TIMESTAMPTZ,
  last_sync TIMESTAMPTZ
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check if the current user is admin
  IF (SELECT auth.jwt()->>'email') != 'joelsoatra@gmail.com' THEN
    RAISE EXCEPTION 'Access denied - Admin only';
  END IF;
  
  -- Return all users without RLS filtering
  RETURN QUERY
  SELECT u.id, u.username, u.email, u.role, u.created_at, u.last_sync
  FROM users u
  ORDER BY u.created_at DESC;
END;
$$;

-- Function to get application-wide statistics (admin only)
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Check if the current user is admin
  IF (SELECT auth.jwt()->>'email') != 'joelsoatra@gmail.com' THEN
    RAISE EXCEPTION 'Access denied - Admin only';
  END IF;
  
  -- Get aggregated statistics from all users
  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM users),
    'total_transactions', (SELECT COUNT(*) FROM transactions),
    'total_accounts', (SELECT COUNT(*) FROM accounts),
    'total_budgets', (SELECT COUNT(*) FROM budgets),
    'total_goals', (SELECT COUNT(*) FROM goals)
  ) INTO stats;
  
  RETURN stats;
END;
$$;

-- Function to delete user completely (admin only) - Enhanced with auth.users deletion
CREATE OR REPLACE FUNCTION delete_user_admin(target_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  -- Deletion counters
  transactions_deleted INTEGER := 0;
  accounts_deleted INTEGER := 0;
  budgets_deleted INTEGER := 0;
  goals_deleted INTEGER := 0;
  mobile_money_rates_deleted INTEGER := 0;
  sync_queue_deleted INTEGER := 0;
  fee_configurations_deleted INTEGER := 0;
  users_deleted INTEGER := 0;
  auth_users_deleted INTEGER := 0;
  
  -- Status flags
  auth_user_deleted BOOLEAN := false;
  auth_deletion_method TEXT := '';
  auth_deletion_error TEXT := '';
  
  -- User info
  user_info RECORD;
  
  -- Error tracking
  errors TEXT[] := '{}';
  current_error TEXT;
  
  -- Auth deletion attempts
  auth_deletion_attempted BOOLEAN := false;
BEGIN
  -- Check if the current user is admin
  IF (SELECT auth.jwt()->>'email') != 'joelsoatra@gmail.com' THEN
    RAISE EXCEPTION 'Access denied - Admin only';
  END IF;
  
  -- Prevent admin from deleting their own account
  IF target_user_id = (SELECT auth.uid()) THEN
    RAISE EXCEPTION 'Cannot delete your own account';
  END IF;
  
  -- Get user info for logging
  SELECT username, email INTO user_info FROM users WHERE id = target_user_id;
  
  -- Delete from public tables in correct order to avoid foreign key violations
  -- 1. Delete transactions
  BEGIN
    DELETE FROM transactions WHERE user_id = target_user_id;
    GET DIAGNOSTICS transactions_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete transactions: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 2. Delete accounts
  BEGIN
    DELETE FROM accounts WHERE user_id = target_user_id;
    GET DIAGNOSTICS accounts_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete accounts: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 3. Delete budgets
  BEGIN
    DELETE FROM budgets WHERE user_id = target_user_id;
    GET DIAGNOSTICS budgets_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete budgets: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 4. Delete goals
  BEGIN
    DELETE FROM goals WHERE user_id = target_user_id;
    GET DIAGNOSTICS goals_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete goals: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 5. Delete from mobile_money_rates if exists
  BEGIN
    DELETE FROM mobile_money_rates WHERE user_id = target_user_id;
    GET DIAGNOSTICS mobile_money_rates_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete mobile_money_rates: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 6. Delete from sync_queue if exists
  BEGIN
    DELETE FROM sync_queue WHERE user_id = target_user_id;
    GET DIAGNOSTICS sync_queue_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete sync_queue: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 7. Delete from fee_configurations if exists
  BEGIN
    DELETE FROM fee_configurations WHERE user_id = target_user_id;
    GET DIAGNOSTICS fee_configurations_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete fee_configurations: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 8. Delete from public.users
  BEGIN
    DELETE FROM users WHERE id = target_user_id;
    GET DIAGNOSTICS users_deleted = ROW_COUNT;
  EXCEPTION
    WHEN OTHERS THEN
      current_error := 'Failed to delete from public.users: ' || SQLERRM;
      errors := array_append(errors, current_error);
  END;
  
  -- 9. Attempt to delete from auth.users using multiple methods
  auth_deletion_attempted := true;
  
  -- Method 1: Try using auth.delete_user() function (if available)
  BEGIN
    PERFORM auth.delete_user(target_user_id);
    auth_user_deleted := true;
    auth_deletion_method := 'auth.delete_user()';
    auth_deletion_error := '';
  EXCEPTION
    WHEN undefined_function THEN
      -- auth.delete_user() not available, try direct DELETE
      auth_deletion_method := 'auth.delete_user() not available, trying direct DELETE';
    WHEN OTHERS THEN
      auth_deletion_method := 'auth.delete_user() failed: ' || SQLERRM;
  END;
  
  -- Method 2: If auth.delete_user() failed, try direct DELETE from auth.users
  IF NOT auth_user_deleted THEN
    BEGIN
      DELETE FROM auth.users WHERE id = target_user_id;
      GET DIAGNOSTICS auth_users_deleted = ROW_COUNT;
      auth_user_deleted := (auth_users_deleted > 0);
      auth_deletion_method := auth_deletion_method || '; Direct DELETE ' || 
        CASE WHEN auth_user_deleted THEN 'succeeded' ELSE 'failed' END;
      auth_deletion_error := CASE WHEN auth_user_deleted THEN '' ELSE 'Direct DELETE failed: ' || SQLERRM END;
    EXCEPTION
      WHEN insufficient_privilege THEN
        auth_user_deleted := false;
        auth_deletion_error := 'Insufficient privileges to delete from auth.users - requires manual cleanup via Supabase Dashboard';
        auth_deletion_method := auth_deletion_method || '; Insufficient privileges';
      WHEN OTHERS THEN
        auth_user_deleted := false;
        auth_deletion_error := 'Failed to delete from auth.users: ' || SQLERRM;
        auth_deletion_method := auth_deletion_method || '; Exception: ' || SQLERRM;
    END;
  END IF;
  
  -- Build comprehensive response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deletion completed' || 
               CASE WHEN auth_user_deleted THEN ' (including auth.users)' ELSE ' (auth.users requires manual cleanup)' END,
    'user_info', jsonb_build_object(
      'id', target_user_id,
      'username', user_info.username,
      'email', user_info.email
    ),
    'deletion_results', jsonb_build_object(
      'transactions_deleted', transactions_deleted,
      'accounts_deleted', accounts_deleted,
      'budgets_deleted', budgets_deleted,
      'goals_deleted', goals_deleted,
      'mobile_money_rates_deleted', mobile_money_rates_deleted,
      'sync_queue_deleted', sync_queue_deleted,
      'fee_configurations_deleted', fee_configurations_deleted,
      'users_deleted', users_deleted,
      'auth_users_deleted', auth_users_deleted
    ),
    'auth_deletion', jsonb_build_object(
      'attempted', auth_deletion_attempted,
      'successful', auth_user_deleted,
      'method', auth_deletion_method,
      'error', auth_deletion_error
    ),
    'errors', errors,
    'total_errors', array_length(errors, 1)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Function failed: ' || SQLERRM,
      'user_id', target_user_id,
      'auth_deletion', jsonb_build_object(
        'attempted', false,
        'successful', false,
        'method', 'Function failed before auth deletion attempt',
        'error', 'Function exception: ' || SQLERRM
      ),
      'errors', array_append(errors, 'Function failed: ' || SQLERRM),
      'total_errors', array_length(array_append(errors, 'Function failed: ' || SQLERRM), 1)
    );
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_all_users_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION delete_user_admin(UUID) TO authenticated;

-- Test the functions (optional - remove after testing)
-- SELECT * FROM get_all_users_admin();
-- SELECT get_admin_stats();
-- SELECT delete_user_admin('user-uuid-here');

-- Test procedure for delete_user_admin function
-- This procedure helps verify the function works correctly
CREATE OR REPLACE FUNCTION test_delete_user_admin(test_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  result JSONB;
  user_exists BOOLEAN;
  auth_user_exists BOOLEAN;
BEGIN
  -- Check if user exists in public.users
  SELECT EXISTS(SELECT 1 FROM users WHERE id = test_user_id) INTO user_exists;
  
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO auth_user_exists;
  
  -- Call the delete function
  SELECT delete_user_admin(test_user_id) INTO result;
  
  -- Add test results
  result := result || jsonb_build_object(
    'test_info', jsonb_build_object(
      'user_existed_in_public', user_exists,
      'user_existed_in_auth', auth_user_exists,
      'test_timestamp', NOW()
    )
  );
  
  RETURN result;
END;
$$;

-- Grant execute permission for test function
GRANT EXECUTE ON FUNCTION test_delete_user_admin(UUID) TO authenticated;

-- Documentation for delete_user_admin function
/*
ENHANCED DELETE_USER_ADMIN FUNCTION

This function provides comprehensive user deletion with detailed status reporting.

AUTH DELETION METHODS:
1. auth.delete_user(user_id) - Supabase's built-in auth deletion function
2. Direct DELETE FROM auth.users - Fallback method if auth.delete_user() unavailable

ERROR HANDLING STRATEGY:
- Each deletion step is wrapped in individual BEGIN/EXCEPTION blocks
- Errors are collected in an errors array without stopping execution
- Auth deletion attempts multiple methods gracefully
- Detailed error messages for each failure point

JSON RESPONSE STRUCTURE:
{
  "success": boolean,
  "message": string,
  "user_info": {
    "id": uuid,
    "username": string,
    "email": string
  },
  "deletion_results": {
    "transactions_deleted": integer,
    "accounts_deleted": integer,
    "budgets_deleted": integer,
    "goals_deleted": integer,
    "mobile_money_rates_deleted": integer,
    "sync_queue_deleted": integer,
    "fee_configurations_deleted": integer,
    "users_deleted": integer,
    "auth_users_deleted": integer
  },
  "auth_deletion": {
    "attempted": boolean,
    "successful": boolean,
    "method": string,
    "error": string
  },
  "errors": string[],
  "total_errors": integer
}

USAGE:
SELECT delete_user_admin('user-uuid-here');

TESTING:
SELECT test_delete_user_admin('user-uuid-here');
*/
