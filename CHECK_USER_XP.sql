-- Check user's current XP, level, and XP transactions
-- Run this to see if XP/level are correct

-- 1. Check your profile XP and level
SELECT id, username, xp, level, created_at
FROM profiles
WHERE id = auth.uid();

-- 2. Check all your XP transactions
SELECT 
  reason,
  amount,
  reference_type,
  created_at
FROM xp_transactions
WHERE user_id = auth.uid()
ORDER BY created_at DESC
LIMIT 20;

-- 3. Sum of all XP transactions (should match profile.xp)
SELECT 
  SUM(amount) as total_xp_from_transactions,
  COUNT(*) as transaction_count
FROM xp_transactions
WHERE user_id = auth.uid();

-- 4. Check your catches count
SELECT COUNT(*) as total_catches
FROM catches
WHERE user_id = auth.uid();

-- 5. Expected level based on XP
-- Level 1: 0-49 XP
-- Level 2: 50-119 XP
-- Level 3: 120-219 XP
-- Level 4: 220-349 XP
-- Level 5: 350-519 XP
