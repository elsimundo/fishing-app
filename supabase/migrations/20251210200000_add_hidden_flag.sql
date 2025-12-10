-- Add is_hidden flag to lakes for admin soft-hide functionality
-- This allows admins to hide non-fishing lakes (park ponds, ornamental lakes)
-- or venues that request removal, without deleting the data

ALTER TABLE lakes
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Add audit fields to track who hid it and when
ALTER TABLE lakes
ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES auth.users(id);

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_lakes_is_hidden ON lakes(is_hidden) WHERE is_hidden = false;

-- Add same fields to businesses table for future use
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
ADD COLUMN IF NOT EXISTS hidden_by uuid REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_businesses_is_hidden ON businesses(is_hidden) WHERE is_hidden = false;

-- Comment for documentation
COMMENT ON COLUMN lakes.is_hidden IS 'Admin soft-hide: hides from Explore map without deleting';
COMMENT ON COLUMN businesses.is_hidden IS 'Admin soft-hide: hides from Explore map without deleting';
