-- Force zone assignment for ALL catches that don't have a zone_id yet
-- This ensures catches appear when clicking on zones

-- Assign zones to all catches with coordinates that don't have a zone yet
UPDATE catches c
SET zone_id = get_or_create_zone(c.latitude, c.longitude)
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
  AND c.latitude != 0 
  AND c.longitude != 0
  AND c.zone_id IS NULL;

-- Also assign zones to catches that might have been missed
UPDATE catches c
SET zone_id = get_or_create_zone(c.latitude, c.longitude)
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
  AND c.latitude != 0 
  AND c.longitude != 0;

-- Update stats for ALL zones to ensure counts are accurate
DO $$
DECLARE
  zone_record RECORD;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
  END LOOP;
  
  RAISE NOTICE 'Catches with zones: %', (SELECT COUNT(*) FROM catches WHERE zone_id IS NOT NULL);
  RAISE NOTICE 'Total catches: %', (SELECT COUNT(*) FROM catches);
END $$;
