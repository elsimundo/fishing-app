-- Fix zone stats to accurately reflect catch counts
-- The issue is that zone stats may be stale

-- Recalculate stats for ALL zones from scratch
UPDATE fishing_zones fz
SET 
  total_catches = (SELECT COUNT(*) FROM catches c WHERE c.zone_id = fz.id),
  total_sessions = (SELECT COUNT(DISTINCT session_id) FROM catches c WHERE c.zone_id = fz.id),
  unique_anglers = (SELECT COUNT(DISTINCT user_id) FROM catches c WHERE c.zone_id = fz.id),
  last_activity_at = (SELECT MAX(caught_at) FROM catches c WHERE c.zone_id = fz.id),
  updated_at = now();

-- Show updated zone stats
DO $$
DECLARE
  zone_record RECORD;
BEGIN
  RAISE NOTICE 'Updated zone stats:';
  FOR zone_record IN 
    SELECT id, total_catches, center_lat, center_lng 
    FROM fishing_zones 
    WHERE total_catches > 0
    ORDER BY total_catches DESC
    LIMIT 10
  LOOP
    RAISE NOTICE '  Zone %: % catches at (%, %)', 
      zone_record.id, zone_record.total_catches, zone_record.center_lat, zone_record.center_lng;
  END LOOP;
END $$;

-- Also show catches and their zones
DO $$
DECLARE
  catch_record RECORD;
BEGIN
  RAISE NOTICE 'Catches with zones:';
  FOR catch_record IN 
    SELECT c.id, c.species, c.zone_id, fz.total_catches as zone_total
    FROM catches c
    JOIN fishing_zones fz ON c.zone_id = fz.id
    LIMIT 10
  LOOP
    RAISE NOTICE '  Catch %: % in zone % (zone has % catches)', 
      catch_record.id, catch_record.species, catch_record.zone_id, catch_record.zone_total;
  END LOOP;
END $$;
