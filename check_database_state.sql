-- Run this to check current database state
-- Copy the results and share them

-- 1. Check if logged_by_user_id column exists
SELECT 
  'logged_by_user_id exists in catches' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'catches' 
    AND column_name = 'logged_by_user_id'
  ) as result;

-- 2. Check if joined_at is nullable
SELECT 
  'joined_at is nullable' as check_name,
  is_nullable = 'YES' as result
FROM information_schema.columns 
WHERE table_name = 'session_participants' 
AND column_name = 'joined_at';

-- 3. Check current RLS policies on user_weekly_stats
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
WHERE tablename = 'user_weekly_stats'
ORDER BY policyname;
