-- Add claimed_at timestamp for tracking early adopters
-- Run this in Supabase SQL Editor

-- Add claimed_at column if it doesn't exist
ALTER TABLE lakes 
ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

-- Add is_founding_venue for early adopter badge
ALTER TABLE lakes 
ADD COLUMN IF NOT EXISTS is_founding_venue boolean DEFAULT false;

-- Update existing claimed lakes to have claimed_at set to now
-- (They'll be founding venues since they're pre-launch)
UPDATE lakes 
SET 
  claimed_at = COALESCE(claimed_at, updated_at, created_at),
  is_founding_venue = true
WHERE claimed_by IS NOT NULL AND claimed_at IS NULL;

-- Create a trigger to auto-set claimed_at when claimed_by is set
CREATE OR REPLACE FUNCTION set_lake_claimed_at()
RETURNS TRIGGER AS $$
BEGIN
  -- If claimed_by is being set (was null, now has value)
  IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
    NEW.claimed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS lake_claimed_at_trigger ON lakes;

-- Create the trigger
CREATE TRIGGER lake_claimed_at_trigger
  BEFORE UPDATE ON lakes
  FOR EACH ROW
  EXECUTE FUNCTION set_lake_claimed_at();

-- Index for querying founding venues
CREATE INDEX IF NOT EXISTS idx_lakes_founding_venue ON lakes(is_founding_venue) WHERE is_founding_venue = true;
