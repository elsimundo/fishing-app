-- Reset XP completely and recalculate from current active catches only
-- User has 1 catch, so XP should only reflect that 1 catch + any challenges it completed

-- 1. Check how many active catches user has
SELECT COUNT(*) as active_catches
FROM catches
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 2. Show the active catch details
SELECT 
  id,
  species,
  weight_kg,
  caught_at,
  session_id
FROM catches
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
ORDER BY caught_at DESC;

-- 3. Delete ALL XP transactions for this user (start fresh)
DELETE FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 4. Reset profile to Level 1, 0 XP
UPDATE profiles
SET xp = 0, level = 1, updated_at = NOW()
WHERE id = '3818f158-0511-489b-8335-d55a72952cf2'
RETURNING id, username, xp, level;

-- 5. Verify reset
SELECT 
  p.xp,
  p.level,
  (SELECT COUNT(*) FROM catches WHERE user_id = p.id) as catch_count,
  (SELECT COUNT(*) FROM xp_transactions WHERE user_id = p.id) as transaction_count
FROM profiles p
WHERE p.id = '3818f158-0511-489b-8335-d55a72952cf2';

-- NOTE: After this reset, you need to:
-- 1. Edit your 1 catch and save it again to trigger XP calculation
-- OR
-- 2. Log the catch again from scratch
-- This will properly award XP for the catch + any challenges it completes
