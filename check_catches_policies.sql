-- Check current RLS policies on catches table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'catches'
ORDER BY cmd, policyname;
