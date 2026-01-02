-- Fix v2: Reset XP and level with verification
-- This version checks if the update actually worked

-- Step 1: Check current state BEFORE update
SELECT 'BEFORE UPDATE:' as status, id, username, xp, level 
FROM profiles 
WHERE id = auth.uid();

-- Step 2: Perform the update and show affected rows
UPDATE profiles
SET 
  xp = 0,
  level = 1,
  updated_at = NOW()
WHERE id = auth.uid()
RETURNING id, username, xp, level;

-- Step 3: Verify AFTER update
SELECT 'AFTER UPDATE:' as status, id, username, xp, level 
FROM profiles 
WHERE id = auth.uid();

-- If this still shows level 3, there might be:
-- 1. RLS policy preventing updates
-- 2. Trigger overriding the update
-- 3. Browser cache showing old data
