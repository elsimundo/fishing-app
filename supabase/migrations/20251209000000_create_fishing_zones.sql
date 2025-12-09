-- FISHING ZONES: Aggregated public catch data without exposing exact locations
-- Zones are ~1km grid cells that cluster catches for public display

CREATE TABLE IF NOT EXISTS fishing_zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Grid cell identifier (~1km resolution)
  grid_lat integer NOT NULL,
  grid_lng integer NOT NULL,
  
  -- Center point of the zone (for display)
  center_lat double precision NOT NULL,
  center_lng double precision NOT NULL,
  
  -- Aggregated stats
  total_catches integer DEFAULT 0,
  total_sessions integer DEFAULT 0,
  unique_anglers integer DEFAULT 0,
  species_counts jsonb DEFAULT '{}',
  top_species text,
  water_type text,
  display_name text,
  
  last_activity_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(grid_lat, grid_lng)
);

CREATE INDEX IF NOT EXISTS idx_fishing_zones_location ON fishing_zones(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_fishing_zones_grid ON fishing_zones(grid_lat, grid_lng);

-- Add zone_id to sessions and catches
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES fishing_zones(id);
ALTER TABLE catches ADD COLUMN IF NOT EXISTS zone_id uuid REFERENCES fishing_zones(id);

CREATE INDEX IF NOT EXISTS idx_sessions_zone_id ON sessions(zone_id);
CREATE INDEX IF NOT EXISTS idx_catches_zone_id ON catches(zone_id);

-- Function to get or create zone
CREATE OR REPLACE FUNCTION get_or_create_zone(lat double precision, lng double precision)
RETURNS uuid
LANGUAGE plpgsql AS $$
DECLARE
  zone_uuid uuid;
  g_lat integer := FLOOR(lat * 100)::integer;
  g_lng integer := FLOOR(lng * 100)::integer;
  c_lat double precision := (FLOOR(lat * 100) + 0.5) / 100;
  c_lng double precision := (FLOOR(lng * 100) + 0.5) / 100;
BEGIN
  SELECT id INTO zone_uuid FROM fishing_zones WHERE grid_lat = g_lat AND grid_lng = g_lng;
  
  IF zone_uuid IS NULL THEN
    INSERT INTO fishing_zones (grid_lat, grid_lng, center_lat, center_lng)
    VALUES (g_lat, g_lng, c_lat, c_lng)
    ON CONFLICT (grid_lat, grid_lng) DO NOTHING
    RETURNING id INTO zone_uuid;
    
    IF zone_uuid IS NULL THEN
      SELECT id INTO zone_uuid FROM fishing_zones WHERE grid_lat = g_lat AND grid_lng = g_lng;
    END IF;
  END IF;
  
  RETURN zone_uuid;
END;
$$;

-- Auto-assign zone on session insert/update
CREATE OR REPLACE FUNCTION assign_session_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND NEW.location_privacy IN ('general', 'exact') THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_session_zone ON sessions;
CREATE TRIGGER trigger_assign_session_zone
  BEFORE INSERT OR UPDATE OF latitude, longitude, location_privacy ON sessions
  FOR EACH ROW EXECUTE FUNCTION assign_session_zone();

-- Auto-assign zone on catch insert/update
CREATE OR REPLACE FUNCTION assign_catch_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  session_privacy text;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT location_privacy INTO session_privacy FROM sessions WHERE id = NEW.session_id;
  END IF;
  
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND (session_privacy IS NULL OR session_privacy IN ('general', 'exact')) THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_assign_catch_zone ON catches;
CREATE TRIGGER trigger_assign_catch_zone
  BEFORE INSERT OR UPDATE OF latitude, longitude, session_id ON catches
  FOR EACH ROW EXECUTE FUNCTION assign_catch_zone();

-- Function to update zone stats
CREATE OR REPLACE FUNCTION update_zone_stats(target_zone_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  stats RECORD;
  species_json jsonb;
  top_sp text;
BEGIN
  SELECT 
    COUNT(DISTINCT c.id) as total_catches,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT c.user_id) as unique_anglers,
    MAX(c.caught_at) as last_activity
  INTO stats
  FROM catches c
  LEFT JOIN sessions s ON c.session_id = s.id
  WHERE c.zone_id = target_zone_id;
  
  SELECT jsonb_object_agg(species, cnt) INTO species_json
  FROM (
    SELECT species, COUNT(*) as cnt
    FROM catches
    WHERE zone_id = target_zone_id AND species IS NOT NULL
    GROUP BY species
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;
  
  SELECT species INTO top_sp
  FROM catches
  WHERE zone_id = target_zone_id AND species IS NOT NULL
  GROUP BY species
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  UPDATE fishing_zones SET
    total_catches = COALESCE(stats.total_catches, 0),
    total_sessions = COALESCE(stats.total_sessions, 0),
    unique_anglers = COALESCE(stats.unique_anglers, 0),
    species_counts = COALESCE(species_json, '{}'),
    top_species = top_sp,
    last_activity_at = stats.last_activity,
    updated_at = now()
  WHERE id = target_zone_id;
END;
$$;

-- Trigger to update zone stats when catch is added
CREATE OR REPLACE FUNCTION trigger_update_zone_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.zone_id IS NOT NULL THEN
    PERFORM update_zone_stats(NEW.zone_id);
  END IF;
  IF OLD IS NOT NULL AND OLD.zone_id IS NOT NULL AND OLD.zone_id != NEW.zone_id THEN
    PERFORM update_zone_stats(OLD.zone_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_catch_zone_stats ON catches;
CREATE TRIGGER trigger_catch_zone_stats
  AFTER INSERT OR UPDATE OF zone_id, species ON catches
  FOR EACH ROW EXECUTE FUNCTION trigger_update_zone_stats();

-- RLS
ALTER TABLE fishing_zones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view fishing zones" ON fishing_zones;
CREATE POLICY "Anyone can view fishing zones"
  ON fishing_zones FOR SELECT USING (true);

COMMENT ON TABLE fishing_zones IS 'Aggregated fishing activity by ~1km grid cells. Protects exact locations while showing community data.';
