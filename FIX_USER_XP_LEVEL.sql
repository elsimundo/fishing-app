-- Fix: Reset XP and level to correct values for user with 0 catches
-- Run this to fix your XP and level

-- First, check current state
SELECT id, username, xp, level 
FROM profiles 
WHERE id = auth.uid();

-- Reset XP to 0 and level to 1 (since you have 0 catches and 0 XP transactions)
UPDATE profiles
SET 
  xp = 0,
  level = 1,
  updated_at = NOW()
WHERE id = auth.uid();

-- Verify the fix
SELECT id, username, xp, level 
FROM profiles 
WHERE id = auth.uid();

-- Expected result: xp = 0, level = 1
