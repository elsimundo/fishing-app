-- CATCH PRIVACY
-- Add is_public column to catches for feed visibility control

-- Add is_public column (default true - catches show in feed by default)
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true;

-- Add hide_exact_location for spot privacy (shows region only)
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS hide_exact_location boolean DEFAULT false;

-- Index for feed queries
CREATE INDEX IF NOT EXISTS idx_catches_is_public ON catches(is_public) WHERE is_public = true;

-- Comment for documentation
COMMENT ON COLUMN catches.is_public IS 'Whether this catch appears in the public feed. Default true.';
COMMENT ON COLUMN catches.hide_exact_location IS 'If true, only show general area (e.g. Cornwall) not exact coordinates.';
