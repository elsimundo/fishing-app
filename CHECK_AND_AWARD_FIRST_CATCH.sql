-- Check if First Catch challenge should be awarded

-- 1. Check if user has already completed First Catch
SELECT uc.*, c.title, c.xp_reward
FROM user_challenges uc
JOIN challenges c ON c.id = uc.challenge_id
WHERE uc.user_id = '3818f158-0511-489b-8335-d55a72952cf2'
  AND c.slug = 'first_catch';

-- 2. If query #1 returns NO results, run this to award First Catch (50 XP):
-- Uncomment and run if needed:

/*
-- Insert user_challenge record
INSERT INTO user_challenges (user_id, challenge_id, progress, target, completed_at)
SELECT 
  '3818f158-0511-489b-8335-d55a72952cf2',
  id,
  1,
  1,
  '2025-12-23 16:14:00+00'
FROM challenges
WHERE slug = 'first_catch'
RETURNING *;

-- Insert XP transaction
INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id, created_at)
SELECT
  '3818f158-0511-489b-8335-d55a72952cf2',
  xp_reward,
  'challenge_completed',
  'challenge',
  id::text,
  '2025-12-23 16:14:00+00'
FROM challenges
WHERE slug = 'first_catch'
RETURNING *;

-- Update profile
UPDATE profiles
SET 
  xp = (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'),
  level = CASE
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2') < 50 THEN 1
    WHEN (SELECT COALESCE(SUM(amount), 0) FROM xp_transactions WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2') < 120 THEN 2
    ELSE 3
  END,
  updated_at = NOW()
WHERE id = '3818f158-0511-489b-8335-d55a72952cf2'
RETURNING id, username, xp, level;
*/

-- 3. Final verification
SELECT 
  p.xp,
  p.level,
  (SELECT COUNT(*) FROM xp_transactions WHERE user_id = p.id) as transaction_count,
  (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id) as total_xp
FROM profiles p
WHERE p.id = '3818f158-0511-489b-8335-d55a72952cf2';
