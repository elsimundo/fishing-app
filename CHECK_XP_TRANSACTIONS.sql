-- Check user's XP transaction history to diagnose the -5,005 losses issue

-- 1. Show all XP transactions for user 'simon'
SELECT 
  id,
  reason,
  amount,
  reference_type,
  reference_id,
  created_at
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
ORDER BY created_at DESC
LIMIT 50;

-- 2. Sum of all transactions (should match profile.xp)
SELECT 
  SUM(amount) as total_xp,
  SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as total_gains,
  SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) as total_losses,
  COUNT(*) as transaction_count,
  COUNT(CASE WHEN amount > 0 THEN 1 END) as gain_count,
  COUNT(CASE WHEN amount < 0 THEN 1 END) as loss_count
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 3. Check for any transactions with very large negative amounts
SELECT 
  id,
  reason,
  amount,
  reference_type,
  reference_id,
  created_at
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
  AND amount < -100
ORDER BY amount ASC;

-- 4. Check current profile XP vs transaction sum
SELECT 
  p.xp as profile_xp,
  p.level as profile_level,
  (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id) as transactions_sum,
  p.xp - (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id) as difference
FROM profiles p
WHERE p.id = '3818f158-0511-489b-8335-d55a72952cf2';

-- 5. Group transactions by reason to see patterns
SELECT 
  reason,
  COUNT(*) as count,
  SUM(amount) as total_xp,
  AVG(amount) as avg_xp,
  MIN(amount) as min_xp,
  MAX(amount) as max_xp
FROM xp_transactions
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
GROUP BY reason
ORDER BY total_xp DESC;
