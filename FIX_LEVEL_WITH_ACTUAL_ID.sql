-- Fix: The issue is auth.uid() is not working in SQL Editor
-- We need to find your actual user ID and update directly

-- Step 1: Find your user ID by username
-- Replace 'YOUR_USERNAME' with your actual username
SELECT id, username, xp, level
FROM profiles
WHERE username = 'YOUR_USERNAME';  -- <-- CHANGE THIS

-- Step 2: Once you have your ID, update using it directly
-- Replace 'your-user-id-here' with the ID from step 1
UPDATE profiles
SET xp = 0, level = 1, updated_at = NOW()
WHERE id = 'your-user-id-here'  -- <-- CHANGE THIS
RETURNING id, username, xp, level;

-- Alternative: Update ALL profiles to fix everyone (if you're the only user)
-- Only run this if you're sure you're the only user in the database
-- UPDATE profiles SET xp = 0, level = 1 WHERE xp > 0 AND id IN (SELECT user_id FROM catches GROUP BY user_id HAVING COUNT(*) = 0);
