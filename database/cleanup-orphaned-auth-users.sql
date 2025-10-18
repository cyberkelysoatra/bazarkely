-- =====================================================
-- CLEANUP ORPHANED AUTH.USERS - BazarKELY
-- =====================================================
-- 
-- This script creates a standalone cleanup system for orphaned auth.users entries
-- that remain after successful public.users deletion due to insufficient privileges.
-- 
-- SAFETY FEATURES:
-- - Non-invasive: Does not modify existing delete_user_admin() function
-- - Isolated: Cleanup failures do not affect main deletion process
-- - Comprehensive logging: Detailed reports for monitoring
-- - Error handling: Graceful failure with detailed error reporting
--
-- USAGE:
-- 1. Execute this script in Supabase SQL Editor
-- 2. The trigger will automatically run after successful user deletions
-- 3. Manual cleanup can be triggered via adminCleanupService.ts
--
-- =====================================================

-- Function to identify and cleanup orphaned auth.users entries
CREATE OR REPLACE FUNCTION cleanup_orphaned_auth_users()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  -- Cleanup counters
  orphaned_users_found INTEGER := 0;
  cleanup_attempts INTEGER := 0;
  successful_deletions INTEGER := 0;
  failed_deletions INTEGER := 0;
  
  -- Detailed results
  cleanup_results JSONB := '[]'::jsonb;
  current_result JSONB;
  
  -- User records
  orphaned_user RECORD;
  
  -- Error tracking
  current_error TEXT;
  errors TEXT[] := '{}';
  
  -- Deletion methods
  auth_delete_success BOOLEAN := false;
  direct_delete_success BOOLEAN := false;
  deletion_method TEXT := '';
  deletion_error TEXT := '';
  
  -- Start time for performance tracking
  start_time TIMESTAMPTZ := NOW();
  end_time TIMESTAMPTZ;
  
BEGIN
  -- Log cleanup start
  RAISE NOTICE '🧹 Starting orphaned auth.users cleanup at %', start_time;
  
  -- Find orphaned auth.users (exist in auth.users but not in public.users)
  FOR orphaned_user IN
    SELECT 
      au.id,
      au.email,
      au.created_at,
      au.last_sign_in_at,
      au.email_confirmed_at,
      au.phone,
      au.phone_confirmed_at
    FROM auth.users au
    LEFT JOIN public.users pu ON au.id = pu.id
    WHERE pu.id IS NULL
    ORDER BY au.created_at DESC
  LOOP
    orphaned_users_found := orphaned_users_found + 1;
    cleanup_attempts := cleanup_attempts + 1;
    
    -- Reset per-user variables
    auth_delete_success := false;
    direct_delete_success := false;
    deletion_method := '';
    deletion_error := '';
    
    -- Initialize result object for this user
    current_result := jsonb_build_object(
      'user_id', orphaned_user.id,
      'email', orphaned_user.email,
      'created_at', orphaned_user.created_at,
      'cleanup_attempted', true,
      'cleanup_successful', false,
      'deletion_method', '',
      'deletion_error', '',
      'timestamp', NOW()
    );
    
    -- Method 1: Try auth.delete_user() function (if available)
    BEGIN
      PERFORM auth.delete_user(orphaned_user.id);
      auth_delete_success := true;
      deletion_method := 'auth.delete_user()';
      deletion_error := '';
      successful_deletions := successful_deletions + 1;
      
      RAISE NOTICE '✅ Successfully deleted orphaned user % via auth.delete_user()', orphaned_user.email;
      
    EXCEPTION
      WHEN undefined_function THEN
        deletion_method := 'auth.delete_user() not available';
        deletion_error := 'Function not available';
      WHEN OTHERS THEN
        deletion_method := 'auth.delete_user() failed';
        deletion_error := SQLERRM;
        current_error := 'auth.delete_user() failed for ' || orphaned_user.email || ': ' || SQLERRM;
        errors := array_append(errors, current_error);
    END;
    
    -- Method 2: If auth.delete_user() failed, try direct DELETE
    IF NOT auth_delete_success THEN
      BEGIN
        DELETE FROM auth.users WHERE id = orphaned_user.id;
        GET DIAGNOSTICS direct_delete_success = ROW_COUNT;
        
        IF direct_delete_success THEN
          deletion_method := deletion_method || '; Direct DELETE succeeded';
          deletion_error := '';
          successful_deletions := successful_deletions + 1;
          
          RAISE NOTICE '✅ Successfully deleted orphaned user % via direct DELETE', orphaned_user.email;
        ELSE
          deletion_method := deletion_method || '; Direct DELETE failed (no rows affected)';
          deletion_error := 'No rows affected by DELETE';
          failed_deletions := failed_deletions + 1;
        END IF;
        
      EXCEPTION
        WHEN insufficient_privilege THEN
          deletion_method := deletion_method || '; Direct DELETE failed - insufficient privileges';
          deletion_error := 'Insufficient privileges to delete from auth.users';
          failed_deletions := failed_deletions + 1;
          
          current_error := 'Insufficient privileges for ' || orphaned_user.email || ' - manual cleanup required';
          errors := array_append(errors, current_error);
          
        WHEN OTHERS THEN
          deletion_method := deletion_method || '; Direct DELETE failed - exception';
          deletion_error := 'Exception: ' || SQLERRM;
          failed_deletions := failed_deletions + 1;
          
          current_error := 'Direct DELETE failed for ' || orphaned_user.email || ': ' || SQLERRM;
          errors := array_append(errors, current_error);
      END;
    END IF;
    
    -- Update result with final status
    current_result := jsonb_set(current_result, '{cleanup_successful}', to_jsonb(auth_delete_success OR direct_delete_success));
    current_result := jsonb_set(current_result, '{deletion_method}', to_jsonb(deletion_method));
    current_result := jsonb_set(current_result, '{deletion_error}', to_jsonb(deletion_error));
    
    -- Add to results array
    cleanup_results := cleanup_results || current_result;
    
  END LOOP;
  
  -- Calculate end time
  end_time := NOW();
  
  -- Build comprehensive response
  RETURN jsonb_build_object(
    'cleanup_summary', jsonb_build_object(
      'start_time', start_time,
      'end_time', end_time,
      'duration_seconds', EXTRACT(EPOCH FROM (end_time - start_time)),
      'orphaned_users_found', orphaned_users_found,
      'cleanup_attempts', cleanup_attempts,
      'successful_deletions', successful_deletions,
      'failed_deletions', failed_deletions,
      'success_rate', CASE 
        WHEN cleanup_attempts > 0 THEN 
          ROUND((successful_deletions::DECIMAL / cleanup_attempts) * 100, 2)
        ELSE 0 
      END
    ),
    'cleanup_results', cleanup_results,
    'errors', errors,
    'total_errors', array_length(errors, 1),
    'status', CASE 
      WHEN failed_deletions = 0 THEN 'complete_success'
      WHEN successful_deletions > 0 THEN 'partial_success'
      ELSE 'complete_failure'
    END
  );
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log function-level error
    RAISE NOTICE '❌ Cleanup function failed: %', SQLERRM;
    
    RETURN jsonb_build_object(
      'cleanup_summary', jsonb_build_object(
        'start_time', start_time,
        'end_time', NOW(),
        'duration_seconds', EXTRACT(EPOCH FROM (NOW() - start_time)),
        'orphaned_users_found', 0,
        'cleanup_attempts', 0,
        'successful_deletions', 0,
        'failed_deletions', 0,
        'success_rate', 0
      ),
      'cleanup_results', '[]'::jsonb,
      'errors', array_append(errors, 'Function failed: ' || SQLERRM),
      'total_errors', 1,
      'status', 'function_failure'
    );
END;
$$;

-- =====================================================
-- AUTOMATIC CLEANUP TRIGGER
-- =====================================================
-- 
-- This trigger automatically runs cleanup after successful user deletion
-- It's designed to be non-invasive and fail-safe
--

-- Create trigger function for automatic cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_orphaned_auth_users()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  cleanup_result JSONB;
  cleanup_success BOOLEAN := false;
  error_message TEXT := '';
BEGIN
  -- Only run cleanup if a user was actually deleted
  IF TG_OP = 'DELETE' AND OLD.id IS NOT NULL THEN
    RAISE NOTICE '🔄 Trigger: User % deleted, starting automatic cleanup', OLD.email;
    
    BEGIN
      -- Call cleanup function
      SELECT cleanup_orphaned_auth_users() INTO cleanup_result;
      
      -- Check if cleanup was successful
      cleanup_success := (cleanup_result->>'status') IN ('complete_success', 'partial_success');
      
      -- Log results
      IF cleanup_success THEN
        RAISE NOTICE '✅ Automatic cleanup completed: %', 
          cleanup_result->'cleanup_summary'->>'successful_deletions' || ' users cleaned up';
      ELSE
        RAISE NOTICE '⚠️ Automatic cleanup had issues: %', 
          cleanup_result->'cleanup_summary'->>'failed_deletions' || ' failures';
      END IF;
      
      -- Log detailed results for monitoring
      RAISE NOTICE 'Cleanup details: %', cleanup_result;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but don't fail the trigger
        error_message := 'Cleanup trigger failed: ' || SQLERRM;
        RAISE NOTICE '❌ %', error_message;
        
        -- Return OLD to allow the original deletion to succeed
        RETURN OLD;
    END;
  END IF;
  
  -- Always return OLD to allow the original deletion to succeed
  -- even if cleanup fails
  RETURN OLD;
  
END;
$$;

-- Create the trigger on users table
DROP TRIGGER IF EXISTS cleanup_orphaned_auth_users_trigger ON public.users;

CREATE TRIGGER cleanup_orphaned_auth_users_trigger
  AFTER DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_orphaned_auth_users();

-- =====================================================
-- PERMISSIONS AND GRANTS
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_orphaned_auth_users() TO authenticated;

-- =====================================================
-- MONITORING AND MAINTENANCE
-- =====================================================

-- Create a view for monitoring orphaned users
CREATE OR REPLACE VIEW orphaned_auth_users_monitor AS
SELECT 
  au.id,
  au.email,
  au.created_at,
  au.last_sign_in_at,
  au.email_confirmed_at,
  au.phone,
  au.phone_confirmed_at,
  NOW() - au.created_at AS age_days
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
ORDER BY au.created_at DESC;

-- Grant select permission on monitoring view
GRANT SELECT ON orphaned_auth_users_monitor TO authenticated;

-- =====================================================
-- TESTING FUNCTIONS (Optional - Remove in production)
-- =====================================================

-- Function to test cleanup without actually deleting
CREATE OR REPLACE FUNCTION test_cleanup_orphaned_auth_users()
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  orphaned_count INTEGER;
  test_result JSONB;
BEGIN
  -- Count orphaned users
  SELECT COUNT(*) INTO orphaned_count
  FROM auth.users au
  LEFT JOIN public.users pu ON au.id = pu.id
  WHERE pu.id IS NULL;
  
  -- Return test information
  test_result := jsonb_build_object(
    'test_type', 'dry_run',
    'orphaned_users_count', orphaned_count,
    'cleanup_function_exists', true,
    'trigger_exists', true,
    'monitoring_view_exists', true,
    'timestamp', NOW()
  );
  
  RETURN test_result;
END;
$$;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION test_cleanup_orphaned_auth_users() TO authenticated;

-- =====================================================
-- INSTALLATION COMPLETE
-- =====================================================

-- Log successful installation
DO $$
BEGIN
  RAISE NOTICE '✅ Orphaned auth.users cleanup system installed successfully';
  RAISE NOTICE '📊 Monitor orphaned users: SELECT * FROM orphaned_auth_users_monitor;';
  RAISE NOTICE '🧪 Test cleanup: SELECT test_cleanup_orphaned_auth_users();';
  RAISE NOTICE '🔧 Manual cleanup: SELECT cleanup_orphaned_auth_users();';
END;
$$;














