-- Get the catch ID so we can manually trigger XP recalculation

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
