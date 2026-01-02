-- Fix XP transaction history by removing incorrect challenge_reconciled transactions
-- These are from a bug in the XP reversal system

-- 1. First, check current state
SELECT 
  p.xp as current_xp,
  p.level as current_level,
  (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id) as transactions_sum
FROM profiles p
WHERE p.id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 2. Calculate what XP SHOULD be (without the bad challenge_reconciled transactions)
SELECT 
  SUM(amount) as correct_xp
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
  AND reason != 'challenge_reconciled';

-- 3. Delete all challenge_reconciled transactions (these are incorrect)
DELETE FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
  AND reason = 'challenge_reconciled';

-- 4. Calculate correct XP after cleanup
SELECT 
  SUM(amount) as new_total_xp,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_gains,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_losses,
  COUNT(*) as transaction_count
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 5. Update profile with correct XP and level
-- Level calculation:
-- Level 1: 0-49 XP
-- Level 2: 50-119 XP
-- Level 3: 120-219 XP
-- Level 4: 220-349 XP
-- Level 5: 350-519 XP
-- Level 6: 520-719 XP
-- Level 7: 720-949 XP
-- Level 8: 950-1209 XP
-- Level 9: 1210-1499 XP
-- Level 10: 1500-1819 XP
-- Level 11: 1820-2169 XP
-- Level 12: 2170-2549 XP

WITH correct_xp AS (
  SELECT SUM(amount) as xp
  FROM xp_transactions
  WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
)
UPDATE profiles
SET 
  xp = (SELECT xp FROM correct_xp),
  level = CASE
    WHEN (SELECT xp FROM correct_xp) < 50 THEN 1
    WHEN (SELECT xp FROM correct_xp) < 120 THEN 2
    WHEN (SELECT xp FROM correct_xp) < 220 THEN 3
    WHEN (SELECT xp FROM correct_xp) < 350 THEN 4
    WHEN (SELECT xp FROM correct_xp) < 520 THEN 5
    WHEN (SELECT xp FROM correct_xp) < 720 THEN 6
    WHEN (SELECT xp FROM correct_xp) < 950 THEN 7
    WHEN (SELECT xp FROM correct_xp) < 1210 THEN 8
    WHEN (SELECT xp FROM correct_xp) < 1500 THEN 9
    WHEN (SELECT xp FROM correct_xp) < 1820 THEN 10
    WHEN (SELECT xp FROM correct_xp) < 2170 THEN 11
    WHEN (SELECT xp FROM correct_xp) < 2550 THEN 12
    ELSE 13
  END,
  updated_at = NOW()
WHERE id = '3818f158-0511-489b-8335-d55a72952cf2'
RETURNING id, username, xp, level;
