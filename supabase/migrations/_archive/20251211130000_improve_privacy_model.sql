-- Improve privacy model: public-by-default with anonymized data sharing
-- Add data sharing opt-out field to profiles
-- Update default location_privacy to 'general'

-- Add data sharing preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS share_data_for_insights boolean DEFAULT true;

COMMENT ON COLUMN profiles.share_data_for_insights IS 'Allow anonymized catch data to contribute to community insights (Local Intel, fishing zones). Even when false, location privacy is still respected.';

-- Update existing sessions with 'private' location_privacy to 'general' (opt-in to new default)
-- This is optional - you may want to keep existing private sessions as-is
-- UPDATE sessions SET location_privacy = 'general' WHERE location_privacy = 'private';

-- Update fishing zones to include ALL catches (even private ones) in anonymized stats
-- The zone assignment triggers already handle this, but we need to update the stats function
-- to respect the new share_data_for_insights preference

CREATE OR REPLACE FUNCTION update_zone_stats(target_zone_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  stats RECORD;
  species_json jsonb;
  top_sp text;
BEGIN
  -- Only include catches from users who have share_data_for_insights = true
  SELECT 
    COUNT(DISTINCT c.id) as total_catches,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT c.user_id) as unique_anglers,
    MAX(c.caught_at) as last_activity
  INTO stats
  FROM catches c
  LEFT JOIN sessions s ON c.session_id = s.id
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.zone_id = target_zone_id
    AND (p.share_data_for_insights IS NULL OR p.share_data_for_insights = true);
  
  SELECT jsonb_object_agg(species, cnt) INTO species_json
  FROM (
    SELECT c.species, COUNT(*) as cnt
    FROM catches c
    LEFT JOIN profiles p ON c.user_id = p.id
    WHERE c.zone_id = target_zone_id 
      AND c.species IS NOT NULL
      AND (p.share_data_for_insights IS NULL OR p.share_data_for_insights = true)
    GROUP BY c.species
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;
  
  SELECT c.species INTO top_sp
  FROM catches c
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.zone_id = target_zone_id 
    AND c.species IS NOT NULL
    AND (p.share_data_for_insights IS NULL OR p.share_data_for_insights = true)
  GROUP BY c.species
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

-- Update zone assignment for catches to ALWAYS assign zones (even for private sessions)
-- This allows anonymized data collection while respecting location privacy for display
CREATE OR REPLACE FUNCTION assign_catch_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  session_privacy text;
  user_shares_data boolean;
BEGIN
  -- Check if user has opted out of data sharing
  SELECT share_data_for_insights INTO user_shares_data 
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- If user has opted out, don't assign zone
  IF user_shares_data = false THEN
    NEW.zone_id := NULL;
    RETURN NEW;
  END IF;
  
  -- Get session privacy if catch is part of a session
  IF NEW.session_id IS NOT NULL THEN
    SELECT location_privacy INTO session_privacy FROM sessions WHERE id = NEW.session_id;
  END IF;
  
  -- Assign zone for ALL catches with valid coordinates (regardless of privacy)
  -- This enables anonymized data collection
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0 THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update session zone assignment to always assign zones
CREATE OR REPLACE FUNCTION assign_session_zone()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  user_shares_data boolean;
BEGIN
  -- Check if user has opted out of data sharing
  SELECT share_data_for_insights INTO user_shares_data 
  FROM profiles 
  WHERE id = NEW.user_id;
  
  -- If user has opted out, don't assign zone
  IF user_shares_data = false THEN
    NEW.zone_id := NULL;
    RETURN NEW;
  END IF;
  
  -- Assign zone for ALL sessions with valid coordinates (regardless of privacy)
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0 THEN
    NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
  ELSE
    NEW.zone_id := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Refresh all zone stats to include private catches
DO $$
DECLARE
  zone_record RECORD;
BEGIN
  FOR zone_record IN SELECT DISTINCT id FROM fishing_zones
  LOOP
    PERFORM update_zone_stats(zone_record.id);
  END LOOP;
END $$;

COMMENT ON TABLE fishing_zones IS 'Aggregated fishing activity by ~1km grid cells. Includes ALL catches (even private ones) for anonymized community insights. Location privacy only affects map display, not data contribution.';
