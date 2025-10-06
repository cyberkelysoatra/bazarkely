-- Admin Functions for BazarKELY
-- These functions bypass RLS policies to provide admin access to all data
-- Execute these in Supabase SQL Editor

-- Function to get all users (admin only)
CREATE OR REPLACE FUNCTION get_all_users_admin()
RETURNS TABLE (
  id UUID,
  username TEXT,
  email TEXT,
  role TEXT,
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

-- Function to delete user completely (admin only) - Bypass RLS
CREATE OR REPLACE FUNCTION delete_user_admin(target_user_id UUID)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count INTEGER;
  user_info RECORD;
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
  
  -- Delete in correct order to avoid foreign key violations
  -- 1. Delete transactions
  DELETE FROM transactions WHERE user_id = target_user_id;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- 2. Delete accounts
  DELETE FROM accounts WHERE user_id = target_user_id;
  
  -- 3. Delete budgets
  DELETE FROM budgets WHERE user_id = target_user_id;
  
  -- 4. Delete goals
  DELETE FROM goals WHERE user_id = target_user_id;
  
  -- 5. Delete from mobile_money_rates if exists
  DELETE FROM mobile_money_rates WHERE user_id = target_user_id;
  
  -- 6. Delete from sync_queue if exists
  DELETE FROM sync_queue WHERE user_id = target_user_id;
  
  -- 7. Delete from fee_configurations if exists
  DELETE FROM fee_configurations WHERE user_id = target_user_id;
  
  -- 8. Delete from public.users
  DELETE FROM users WHERE id = target_user_id;
  
  -- Note: auth.users deletion requires admin privileges
  -- This will be handled by the frontend using supabase.auth.admin.deleteUser()
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'User deleted successfully from public tables',
    'user_deleted', user_info.username || ' (' || user_info.email || ')',
    'transactions_deleted', deleted_count
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'user_id', target_user_id
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
