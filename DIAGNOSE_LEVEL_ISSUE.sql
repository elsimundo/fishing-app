-- Comprehensive diagnosis of level issue
-- Run each query separately and share ALL results

-- 1. Check your current profile data
SELECT id, username, xp, level, created_at, updated_at
FROM profiles 
WHERE id = auth.uid();

-- 2. Check if there's a trigger on profiles table that might be preventing updates
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles';

-- 3. Try updating with RETURNING to see if it actually changes
UPDATE profiles
SET xp = 0, level = 1
WHERE id = auth.uid()
RETURNING id, username, xp, level, updated_at;

-- 4. Check again after update
SELECT id, username, xp, level, updated_at
FROM profiles 
WHERE id = auth.uid();
