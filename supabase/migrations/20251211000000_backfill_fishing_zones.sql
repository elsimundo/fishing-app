-- Backfill existing sessions and catches into fishing zones
-- This migration assigns zone_id to existing records that have public location_privacy

-- First, ensure all public sessions have zones assigned
DO $$
DECLARE
  session_record RECORD;
BEGIN
  FOR session_record IN 
    SELECT id, latitude, longitude, location_privacy
    FROM sessions
    WHERE latitude IS NOT NULL 
      AND longitude IS NOT NULL
      AND latitude != 0 
      AND longitude != 0
      AND location_privacy IN ('general', 'exact')
      AND zone_id IS NULL
  LOOP
    UPDATE sessions 
    SET zone_id = get_or_create_zone(session_record.latitude, session_record.longitude)
    WHERE id = session_record.id;
  END LOOP;
END $$;

-- Then, ensure all catches from public sessions have zones assigned
DO $$
DECLARE
  catch_record RECORD;
  session_privacy text;
BEGIN
  FOR catch_record IN 
    SELECT c.id, c.latitude, c.longitude, c.session_id
    FROM catches c
    WHERE c.latitude IS NOT NULL 
      AND c.longitude IS NOT NULL
      AND c.latitude != 0 
      AND c.longitude != 0
      AND c.zone_id IS NULL
  LOOP
    -- Check session privacy
    IF catch_record.session_id IS NOT NULL THEN
      SELECT location_privacy INTO session_privacy 
      FROM sessions 
      WHERE id = catch_record.session_id;
      
      -- Only assign zone if session is public
      IF session_privacy IN ('general', 'exact') THEN
        UPDATE catches 
        SET zone_id = get_or_create_zone(catch_record.latitude, catch_record.longitude)
        WHERE id = catch_record.id;
      END IF;
    ELSE
      -- Standalone catch without session - assign zone
      UPDATE catches 
      SET zone_id = get_or_create_zone(catch_record.latitude, catch_record.longitude)
      WHERE id = catch_record.id;
    END IF;
  END LOOP;
END $$;

-- Update stats for all zones that now have data
DO $$
DECLARE
  zone_record RECORD;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
  END LOOP;
END $$;

-- Log completion
DO $$
DECLARE
  zone_count integer;
  session_count integer;
  catch_count integer;
BEGIN
  SELECT COUNT(*) INTO zone_count FROM fishing_zones WHERE total_catches > 0;
  SELECT COUNT(*) INTO session_count FROM sessions WHERE zone_id IS NOT NULL;
  SELECT COUNT(*) INTO catch_count FROM catches WHERE zone_id IS NOT NULL;
  
  RAISE NOTICE 'Backfill complete: % zones with data, % sessions assigned, % catches assigned', 
    zone_count, session_count, catch_count;
END $$;
