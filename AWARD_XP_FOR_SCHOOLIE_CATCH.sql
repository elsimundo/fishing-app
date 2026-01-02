-- Award XP for the Schoolie Bass catch
-- Catch ID: 72bb217a-2f4e-4dd5-88a2-564ff2574ecf
-- Species: Bass (Under 25cm / Schoolie)
-- Has photo: Yes
-- Caught: Dec 23, 2025 at 16:14

-- XP Calculation:
-- Base catch XP: 7 XP (small fish, no weight)
-- Photo bonus: +5 XP
-- Total catch XP: 12 XP

-- Challenges this catch would complete:
-- 1. First Catch (if not already completed) - 50 XP
-- 2. Photo Proof (if not already completed) - 25 XP
-- 3. Possibly others depending on session/conditions

-- For now, let's award the basic XP (catch + photo)
-- We'll check challenges separately

-- 1. Insert catch logged transaction
INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id, created_at)
VALUES (
  '3818f158-0511-489b-8335-d55a72952cf2',
  12,
  'catch_logged',
  'catch',
  '72bb217a-2f4e-4dd5-88a2-564ff2574ecf',
  '2025-12-23 16:14:00+00'
);

-- 2. Check if user has completed "First Catch" challenge
SELECT *
FROM user_challenges
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
  AND challenge_id IN (
    SELECT id FROM challenges WHERE slug = 'first_catch'
  );

-- 3. If no result above, award First Catch challenge (50 XP)
-- Run this only if query #2 returns no results:
/*
INSERT INTO user_challenges (user_id, challenge_id, progress, target, completed_at)
SELECT 
  '3818f158-0511-489b-8335-d55a72952cf2',
  id,
  1,
  1,
  '2025-12-23 16:14:00+00'
FROM challenges
WHERE slug = 'first_catch';

INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id, created_at)
SELECT
  '3818f158-0511-489b-8335-d55a72952cf2',
  50,
  'challenge_completed',
  'challenge',
  id::text,
  '2025-12-23 16:14:00+00'
FROM challenges
WHERE slug = 'first_catch';
*/

-- 4. Update profile with total XP
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

-- 5. Verify final state
SELECT 
  p.xp,
  p.level,
  (SELECT COUNT(*) FROM xp_transactions WHERE user_id = p.id) as transaction_count,
  (SELECT SUM(amount) FROM xp_transactions WHERE user_id = p.id) as total_xp
FROM profiles p
WHERE p.id = '3818f158-0511-489b-8335-d55a72952cf2';
