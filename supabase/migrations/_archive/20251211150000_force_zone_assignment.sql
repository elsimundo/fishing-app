-- Force zone assignment for ALL existing catches and sessions
-- This ensures catches appear on the map and in Local Intel

-- Step 1: Assign zones to all sessions with coordinates
UPDATE sessions 
SET zone_id = get_or_create_zone(latitude, longitude)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
  AND latitude != 0 
  AND longitude != 0
  AND zone_id IS NULL;

-- Step 2: Assign zones to all catches with coordinates
UPDATE catches c
SET zone_id = get_or_create_zone(c.latitude, c.longitude)
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
  AND c.latitude != 0 
  AND c.longitude != 0
  AND c.zone_id IS NULL;

-- Step 3: Update stats for ALL zones
DO $$
DECLARE
  zone_record RECORD;
  total_zones integer := 0;
  zones_with_data integer := 0;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
    total_zones := total_zones + 1;
  END LOOP;
  
  SELECT COUNT(*) INTO zones_with_data FROM fishing_zones WHERE total_catches > 0;
  
  RAISE NOTICE 'Zone assignment complete:';
  RAISE NOTICE '  Total zones: %', total_zones;
  RAISE NOTICE '  Zones with catches: %', zones_with_data;
  RAISE NOTICE '  Sessions with zones: %', (SELECT COUNT(*) FROM sessions WHERE zone_id IS NOT NULL);
  RAISE NOTICE '  Catches with zones: %', (SELECT COUNT(*) FROM catches WHERE zone_id IS NOT NULL);
END $$;
