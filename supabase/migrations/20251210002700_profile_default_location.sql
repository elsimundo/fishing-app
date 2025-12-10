-- ============================================================================
-- Profile Default Location: Add default map center for users
-- ============================================================================

-- Add default location fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_latitude DOUBLE PRECISION;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_longitude DOUBLE PRECISION;

-- Index for potential geo queries
CREATE INDEX IF NOT EXISTS idx_profiles_default_location 
  ON profiles(default_latitude, default_longitude) 
  WHERE default_latitude IS NOT NULL AND default_longitude IS NOT NULL;
