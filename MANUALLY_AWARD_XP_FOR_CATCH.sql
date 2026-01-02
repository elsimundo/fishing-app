-- Manually award XP for the existing catch since editing doesn't trigger XP calculation
-- This simulates what useCatchXP would do

-- 1. Get the catch details
SELECT 
  id,
  species,
  weight_kg,
  length_cm,
  caught_at,
  session_id,
  photo_url
FROM catches
WHERE user_id = '3818f158-0511-489b-8335-d55a72952cf2'
ORDER BY caught_at DESC
LIMIT 1;

-- 2. After you share the catch details above, I'll calculate the correct XP and create the transactions
-- The XP will be based on:
-- - Base catch XP (7-20 depending on species/weight)
-- - Photo bonus (+5 XP if photo exists)
-- - Any challenges completed by this catch

-- Example transaction insert (will customize based on your catch):
-- INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id)
-- VALUES 
--   ('3818f158-0511-489b-8335-d55a72952cf2', 20, 'catch_logged', 'catch', 'catch-id-here'),
--   ('3818f158-0511-489b-8335-d55a72952cf2', 50, 'challenge_completed', 'challenge', 'challenge-slug-here');

-- Then update profile XP and level based on total
