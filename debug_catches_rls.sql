-- Debug script to check catches RLS policies and data

-- 1. Check what RLS policies exist on catches
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'catches'
ORDER BY cmd, policyname;

-- 2. Check if approval columns exist
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'catches' 
AND column_name IN ('approval_status', 'approval_requested_at', 'approved_at', 'logged_by_user_id')
ORDER BY column_name;

-- 3. Check a recent catch you logged for someone else
-- Replace with actual catch ID if you know it
SELECT 
  id,
  user_id,
  logged_by_user_id,
  approval_status,
  approval_requested_at,
  species,
  created_at
FROM catches
WHERE logged_by_user_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
