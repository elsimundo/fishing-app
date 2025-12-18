-- Prevent fishing zones from being created/used for catches near lakes
-- Lakes handle their own catch aggregation separately

-- Add lake_id column to fishing_zones to mark zones that overlap with lakes
ALTER TABLE fishing_zones ADD COLUMN IF NOT EXISTS lake_id uuid REFERENCES lakes(id);

CREATE INDEX IF NOT EXISTS idx_fishing_zones_lake_id ON fishing_zones(lake_id);

-- Helper function to check if a location is within a lake's radius (~500m)
CREATE OR REPLACE FUNCTION is_near_lake(lat double precision, lng double precision, radius_km double precision DEFAULT 0.5)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  found_lake_id uuid;
BEGIN
  -- Find the closest lake within radius using Haversine approximation
  -- At UK latitudes, 1 degree lat ≈ 111km, 1 degree lng ≈ 70km
  SELECT id INTO found_lake_id
  FROM lakes
  WHERE 
    latitude IS NOT NULL AND longitude IS NOT NULL
    AND ABS(latitude - lat) < (radius_km / 111.0)
    AND ABS(longitude - lng) < (radius_km / 70.0)
    AND (
      -- Haversine distance approximation
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat - latitude) / 2), 2) +
        COS(RADIANS(latitude)) * COS(RADIANS(lat)) *
        POWER(SIN(RADIANS(lng - longitude) / 2), 2)
      )) < radius_km
    )
  ORDER BY 
    POWER(latitude - lat, 2) + POWER(longitude - lng, 2)
  LIMIT 1;
  
  RETURN found_lake_id;
END;
$$;

-- Update the assign_catch_zone function to skip zones for catches near lakes
CREATE OR REPLACE FUNCTION assign_catch_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  session_privacy text;
  nearby_lake_id uuid;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT location_privacy INTO session_privacy FROM sessions WHERE id = NEW.session_id;
  END IF;
  
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND (session_privacy IS NULL OR session_privacy IN ('general', 'exact')) THEN
    
    -- Check if catch is near a lake - if so, don't assign to a zone
    nearby_lake_id := is_near_lake(NEW.latitude, NEW.longitude);
    
    IF nearby_lake_id IS NOT NULL THEN
      -- Catch is near a lake, don't create/assign zone
      NEW.zone_id := NULL;
    ELSE
      NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
    END IF;
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Update the assign_session_zone function similarly
CREATE OR REPLACE FUNCTION assign_session_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  nearby_lake_id uuid;
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND NEW.location_privacy IN ('general', 'exact') THEN
    
    -- Check if session is near a lake - if so, don't assign to a zone
    nearby_lake_id := is_near_lake(NEW.latitude, NEW.longitude);
    
    IF nearby_lake_id IS NOT NULL THEN
      NEW.zone_id := NULL;
    ELSE
      NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
    END IF;
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

-- Mark existing zones that overlap with lakes
UPDATE fishing_zones fz
SET lake_id = (
  SELECT l.id
  FROM lakes l
  WHERE 
    l.latitude IS NOT NULL AND l.longitude IS NOT NULL
    AND ABS(l.latitude - fz.center_lat) < (0.5 / 111.0)
    AND ABS(l.longitude - fz.center_lng) < (0.5 / 70.0)
    AND (
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(fz.center_lat - l.latitude) / 2), 2) +
        COS(RADIANS(l.latitude)) * COS(RADIANS(fz.center_lat)) *
        POWER(SIN(RADIANS(fz.center_lng - l.longitude) / 2), 2)
      )) < 0.5
    )
  ORDER BY 
    POWER(l.latitude - fz.center_lat, 2) + POWER(l.longitude - fz.center_lng, 2)
  LIMIT 1
)
WHERE fz.lake_id IS NULL;

-- Clear zone_id from catches that are near lakes
UPDATE catches c
SET zone_id = NULL
WHERE zone_id IS NOT NULL
  AND is_near_lake(c.latitude, c.longitude) IS NOT NULL;

-- Clear zone_id from sessions that are near lakes  
UPDATE sessions s
SET zone_id = NULL
WHERE zone_id IS NOT NULL
  AND is_near_lake(s.latitude, s.longitude) IS NOT NULL;

-- Recalculate zone stats for affected zones
DO $$
DECLARE
  zone_rec RECORD;
BEGIN
  FOR zone_rec IN SELECT id FROM fishing_zones WHERE lake_id IS NOT NULL OR total_catches > 0 LOOP
    PERFORM update_zone_stats(zone_rec.id);
  END LOOP;
END $$;

COMMENT ON COLUMN fishing_zones.lake_id IS 'If set, this zone overlaps with a lake and should not be displayed (lake handles its own stats)';
