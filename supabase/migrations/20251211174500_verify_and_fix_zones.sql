-- Verify and fix zone assignments
-- Check current state and ensure all catches have zone_id

-- First, let's see what we have
DO $$
DECLARE
  catches_total integer;
  catches_with_zone integer;
  catches_with_coords integer;
  zones_total integer;
BEGIN
  SELECT COUNT(*) INTO catches_total FROM catches;
  SELECT COUNT(*) INTO catches_with_zone FROM catches WHERE zone_id IS NOT NULL;
  SELECT COUNT(*) INTO catches_with_coords FROM catches WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
  SELECT COUNT(*) INTO zones_total FROM fishing_zones;
  
  RAISE NOTICE 'Current state:';
  RAISE NOTICE '  Total catches: %', catches_total;
  RAISE NOTICE '  Catches with zone_id: %', catches_with_zone;
  RAISE NOTICE '  Catches with coordinates: %', catches_with_coords;
  RAISE NOTICE '  Total zones: %', zones_total;
END $$;

-- Force assign zones to ALL catches with coordinates
UPDATE catches c
SET zone_id = get_or_create_zone(c.latitude, c.longitude)
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
  AND c.latitude != 0 
  AND c.longitude != 0;

-- Update zone stats
DO $$
DECLARE
  zone_record RECORD;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
  END LOOP;
END $$;

-- Verify after fix
DO $$
DECLARE
  catches_with_zone integer;
  sample_catch RECORD;
BEGIN
  SELECT COUNT(*) INTO catches_with_zone FROM catches WHERE zone_id IS NOT NULL;
  RAISE NOTICE 'After fix: Catches with zone_id: %', catches_with_zone;
  
  -- Show a sample catch with its zone
  FOR sample_catch IN 
    SELECT c.id, c.species, c.zone_id, fz.total_catches as zone_total
    FROM catches c
    LEFT JOIN fishing_zones fz ON c.zone_id = fz.id
    LIMIT 3
  LOOP
    RAISE NOTICE 'Sample: catch=%, species=%, zone_id=%, zone_total=%', 
      sample_catch.id, sample_catch.species, sample_catch.zone_id, sample_catch.zone_total;
  END LOOP;
END $$;
