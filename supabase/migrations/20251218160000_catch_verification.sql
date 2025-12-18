-- Catch Verification System
-- Adds verification scoring and levels to catches

-- Add verification fields to catches table
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verification_score INTEGER DEFAULT 0;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verification_level TEXT DEFAULT 'pending';
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verification_details JSONB DEFAULT '{}';
ALTER TABLE catches ADD COLUMN IF NOT EXISTS ai_species_match BOOLEAN DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS ai_confidence DECIMAL(3,2) DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS photo_hash TEXT DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id) DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS verification_override TEXT DEFAULT NULL;

-- Add competition-specific approval fields
ALTER TABLE catches ADD COLUMN IF NOT EXISTS competition_approved BOOLEAN DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS competition_approved_by UUID REFERENCES profiles(id) DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS competition_approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS competition_rejection_reason TEXT DEFAULT NULL;

-- Create index for verification queries
CREATE INDEX IF NOT EXISTS idx_catches_verification_level ON catches(verification_level);
CREATE INDEX IF NOT EXISTS idx_catches_verification_score ON catches(verification_score);
CREATE INDEX IF NOT EXISTS idx_catches_photo_hash ON catches(photo_hash);

-- Verification level enum check
ALTER TABLE catches DROP CONSTRAINT IF EXISTS catches_verification_level_check;
ALTER TABLE catches ADD CONSTRAINT catches_verification_level_check 
  CHECK (verification_level IN ('pending', 'unverified', 'bronze', 'silver', 'gold', 'platinum', 'rejected'));

-- Function to calculate verification score for a catch
CREATE OR REPLACE FUNCTION calculate_catch_verification(p_catch_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catch RECORD;
  v_session RECORD;
  v_score INTEGER := 0;
  v_details JSONB := '{"signals": [], "penalties": []}';
  v_level TEXT;
  v_distance_m FLOAT;
  v_time_diff_hours FLOAT;
  v_photo_time_diff_hours FLOAT;
BEGIN
  -- Get catch data
  SELECT * INTO v_catch FROM catches WHERE id = p_catch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Catch not found');
  END IF;
  
  -- Backlog catches are automatically unverified (no XP)
  IF v_catch.is_backlog = TRUE THEN
    UPDATE catches SET 
      verification_score = 0,
      verification_level = 'unverified',
      verification_details = jsonb_build_object(
        'signals', ARRAY['backlog_catch'],
        'penalties', ARRAY[]::TEXT[],
        'reason', 'Backlog catches are not eligible for verification'
      ),
      verified_at = NOW()
    WHERE id = p_catch_id;
    
    RETURN jsonb_build_object(
      'score', 0,
      'level', 'unverified',
      'reason', 'Backlog catch'
    );
  END IF;
  
  -- Get session data if exists
  IF v_catch.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM sessions WHERE id = v_catch.session_id;
  END IF;
  
  -- ==================
  -- POSITIVE SIGNALS
  -- ==================
  
  -- Has photo (+15)
  IF v_catch.photo_url IS NOT NULL THEN
    v_score := v_score + 15;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["has_photo:15"]'::jsonb);
  END IF;
  
  -- Photo has EXIF GPS (+20)
  IF v_catch.photo_exif_latitude IS NOT NULL AND v_catch.photo_exif_longitude IS NOT NULL THEN
    v_score := v_score + 20;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["exif_gps:20"]'::jsonb);
    
    -- Check GPS proximity to catch location
    IF v_catch.latitude IS NOT NULL AND v_catch.longitude IS NOT NULL THEN
      -- Calculate distance using Haversine approximation
      v_distance_m := ST_DistanceSphere(
        ST_MakePoint(v_catch.longitude, v_catch.latitude),
        ST_MakePoint(v_catch.photo_exif_longitude, v_catch.photo_exif_latitude)
      );
      
      IF v_distance_m <= 100 THEN
        v_score := v_score + 25; -- Within 100m: +15 base + 10 bonus
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["gps_match_100m:25"]'::jsonb);
      ELSIF v_distance_m <= 500 THEN
        v_score := v_score + 15;
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["gps_match_500m:15"]'::jsonb);
      ELSIF v_distance_m > 5000 THEN
        v_score := v_score - 20; -- Penalty: GPS too far
        v_details := jsonb_set(v_details, '{penalties}', 
          (v_details->'penalties') || '["gps_too_far:-20"]'::jsonb);
      END IF;
    END IF;
  END IF;
  
  -- Photo has EXIF timestamp (+15)
  IF v_catch.photo_exif_timestamp IS NOT NULL THEN
    v_score := v_score + 15;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["exif_timestamp:15"]'::jsonb);
    
    -- Check timestamp proximity
    v_photo_time_diff_hours := EXTRACT(EPOCH FROM (v_catch.caught_at - v_catch.photo_exif_timestamp)) / 3600.0;
    v_photo_time_diff_hours := ABS(v_photo_time_diff_hours);
    
    IF v_photo_time_diff_hours <= 0.25 THEN -- Within 15 mins
      v_score := v_score + 15; -- +10 base + 5 bonus
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["time_match_15min:15"]'::jsonb);
    ELSIF v_photo_time_diff_hours <= 1 THEN -- Within 1 hour
      v_score := v_score + 10;
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["time_match_1hr:10"]'::jsonb);
    ELSIF v_photo_time_diff_hours > 24 THEN -- More than 24 hours
      v_score := v_score - 15;
      v_details := jsonb_set(v_details, '{penalties}', 
        (v_details->'penalties') || '["time_too_far:-15"]'::jsonb);
    END IF;
  END IF;
  
  -- Logged during active session (+10)
  IF v_session.id IS NOT NULL THEN
    IF v_catch.caught_at >= v_session.started_at AND 
       (v_session.ended_at IS NULL OR v_catch.caught_at <= v_session.ended_at) THEN
      v_score := v_score + 10;
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["in_session:10"]'::jsonb);
    END IF;
    
    -- Catch location near session location (+10)
    IF v_catch.latitude IS NOT NULL AND v_session.latitude IS NOT NULL THEN
      v_distance_m := ST_DistanceSphere(
        ST_MakePoint(v_catch.longitude, v_catch.latitude),
        ST_MakePoint(v_session.longitude, v_session.latitude)
      );
      
      IF v_distance_m <= 1000 THEN
        v_score := v_score + 10;
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["near_session:10"]'::jsonb);
      END IF;
    END IF;
  END IF;
  
  -- AI species match (+10)
  IF v_catch.ai_species_match = TRUE THEN
    v_score := v_score + 10;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["ai_species_match:10"]'::jsonb);
  END IF;
  
  -- Has camera info (not screenshot) (+5)
  IF v_catch.photo_camera_make IS NOT NULL OR v_catch.photo_camera_model IS NOT NULL THEN
    v_score := v_score + 5;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["camera_info:5"]'::jsonb);
  END IF;
  
  -- Weather data present (+5)
  IF v_catch.weather_temp IS NOT NULL AND v_catch.weather_condition IS NOT NULL THEN
    v_score := v_score + 5;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["weather_data:5"]'::jsonb);
  END IF;
  
  -- ==================
  -- DUPLICATE CHECK
  -- ==================
  IF v_catch.photo_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM catches 
      WHERE photo_hash = v_catch.photo_hash 
      AND id != p_catch_id
      AND user_id != v_catch.user_id
    ) THEN
      v_score := v_score - 30;
      v_details := jsonb_set(v_details, '{penalties}', 
        (v_details->'penalties') || '["duplicate_photo:-30"]'::jsonb);
    END IF;
  END IF;
  
  -- ==================
  -- DETERMINE LEVEL
  -- ==================
  v_score := GREATEST(0, v_score); -- Don't go below 0
  
  IF v_score >= 85 THEN
    v_level := 'platinum';
  ELSIF v_score >= 70 THEN
    v_level := 'gold';
  ELSIF v_score >= 50 THEN
    v_level := 'silver';
  ELSIF v_score >= 30 THEN
    v_level := 'bronze';
  ELSE
    v_level := 'unverified';
  END IF;
  
  -- Update catch record
  UPDATE catches SET 
    verification_score = v_score,
    verification_level = v_level,
    verification_details = v_details,
    verified_at = NOW()
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'score', v_score,
    'level', v_level,
    'details', v_details
  );
END;
$$;

-- Function to get XP multiplier based on verification level
CREATE OR REPLACE FUNCTION get_verification_xp_multiplier(p_level TEXT)
RETURNS DECIMAL(3,2)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN CASE p_level
    WHEN 'platinum' THEN 1.00
    WHEN 'gold' THEN 1.00
    WHEN 'silver' THEN 1.00
    WHEN 'bronze' THEN 0.50
    WHEN 'unverified' THEN 0.00
    WHEN 'rejected' THEN 0.00
    WHEN 'pending' THEN 0.00
    ELSE 0.00
  END;
END;
$$;

-- Function for competition host to approve/reject a catch
CREATE OR REPLACE FUNCTION approve_competition_catch(
  p_catch_id UUID,
  p_approved BOOLEAN,
  p_approver_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catch RECORD;
  v_competition RECORD;
BEGIN
  -- Get catch and verify it's in a competition
  SELECT c.*, s.competition_id 
  INTO v_catch 
  FROM catches c
  LEFT JOIN sessions s ON c.session_id = s.id
  WHERE c.id = p_catch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Catch not found');
  END IF;
  
  IF v_catch.competition_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Catch is not in a competition');
  END IF;
  
  -- Verify approver is the competition host
  SELECT * INTO v_competition FROM competitions WHERE id = v_catch.competition_id;
  
  IF v_competition.host_id != p_approver_id THEN
    -- Check if approver is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_approver_id AND role = 'admin') THEN
      RETURN jsonb_build_object('error', 'Only the competition host or admin can approve catches');
    END IF;
  END IF;
  
  -- Update catch
  UPDATE catches SET
    competition_approved = p_approved,
    competition_approved_by = p_approver_id,
    competition_approved_at = NOW(),
    competition_rejection_reason = CASE WHEN p_approved THEN NULL ELSE p_rejection_reason END
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'approved', p_approved,
    'catch_id', p_catch_id
  );
END;
$$;

-- Admin function to manually override verification
CREATE OR REPLACE FUNCTION admin_verify_catch(
  p_catch_id UUID,
  p_admin_id UUID,
  p_level TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Only admins can manually verify catches');
  END IF;
  
  -- Validate level
  IF p_level NOT IN ('unverified', 'bronze', 'silver', 'gold', 'platinum', 'rejected') THEN
    RETURN jsonb_build_object('error', 'Invalid verification level');
  END IF;
  
  UPDATE catches SET
    verification_level = p_level,
    verification_override = p_reason,
    verified_by = p_admin_id,
    verified_at = NOW()
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'level', p_level,
    'catch_id', p_catch_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_catch_verification(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_verification_xp_multiplier(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION approve_competition_catch(UUID, BOOLEAN, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_verify_catch(UUID, UUID, TEXT, TEXT) TO authenticated;

COMMENT ON FUNCTION calculate_catch_verification IS 'Calculate verification score and level for a catch based on photo metadata, location, timing, and AI confirmation';
COMMENT ON FUNCTION approve_competition_catch IS 'Allow competition host to approve or reject catches for their competition';
COMMENT ON FUNCTION admin_verify_catch IS 'Allow admins to manually override verification level';
