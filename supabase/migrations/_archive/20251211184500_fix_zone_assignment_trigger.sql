-- Fix zone assignment trigger to include 'public' privacy level
-- The original trigger only checked for 'general' and 'exact', missing 'public'

-- Fix the catch zone assignment function
CREATE OR REPLACE FUNCTION assign_catch_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  session_privacy text;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT location_privacy INTO session_privacy FROM sessions WHERE id = NEW.session_id;
  END IF;
  
  -- Assign zone if catch has coordinates and session privacy allows it
  -- Include 'public' in the allowed privacy levels
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND (session_privacy IS NULL OR session_privacy IN ('general', 'exact', 'public')) THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Fix the session zone assignment function too
CREATE OR REPLACE FUNCTION assign_session_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND NEW.location_privacy IN ('general', 'exact', 'public') THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Backfill zone_id for all catches that have coordinates but no zone
UPDATE catches c
SET zone_id = get_or_create_zone(c.latitude, c.longitude)
WHERE c.latitude IS NOT NULL 
  AND c.longitude IS NOT NULL
  AND c.latitude != 0 
  AND c.longitude != 0
  AND c.zone_id IS NULL;

-- Update zone stats for all zones
DO $$
DECLARE
  zone_record RECORD;
  updated_count integer := 0;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
    updated_count := updated_count + 1;
  END LOOP;
  
  RAISE NOTICE 'Updated stats for % zones', updated_count;
  RAISE NOTICE 'Catches with zone_id: %', (SELECT COUNT(*) FROM catches WHERE zone_id IS NOT NULL);
  RAISE NOTICE 'Catches without zone_id: %', (SELECT COUNT(*) FROM catches WHERE zone_id IS NULL);
END $$;
