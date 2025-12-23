-- Ensure ALL catches are public for testing
-- This migration forces is_public = true on all catches

-- First, make sure the column exists and has a default
ALTER TABLE catches ALTER COLUMN is_public SET DEFAULT true;

-- Force ALL catches to be public
UPDATE catches SET is_public = true;

-- Verify the update
DO $$
DECLARE
  public_count integer;
  total_count integer;
BEGIN
  SELECT COUNT(*) INTO total_count FROM catches;
  SELECT COUNT(*) INTO public_count FROM catches WHERE is_public = true;
  RAISE NOTICE 'Total catches: %, Public catches: %', total_count, public_count;
END $$;

-- Make sure sessions are also public
UPDATE sessions SET location_privacy = 'public' WHERE location_privacy IS NULL OR location_privacy != 'public';

-- Verify sessions
DO $$
DECLARE
  public_sessions integer;
  total_sessions integer;
BEGIN
  SELECT COUNT(*) INTO total_sessions FROM sessions;
  SELECT COUNT(*) INTO public_sessions FROM sessions WHERE location_privacy = 'public';
  RAISE NOTICE 'Total sessions: %, Public sessions: %', total_sessions, public_sessions;
END $$;

-- Ensure the RLS policy for public catches exists and is correct
DROP POLICY IF EXISTS "Community can view public catches for insights" ON catches;
DROP POLICY IF EXISTS "Anyone can view public catches" ON catches;

CREATE POLICY "Anyone can view public catches"
ON catches
FOR SELECT
USING (is_public = true);

-- Also add a policy that allows viewing catches in zones (for the zone panel)
DROP POLICY IF EXISTS "Anyone can view catches in zones" ON catches;

CREATE POLICY "Anyone can view catches in zones"
ON catches
FOR SELECT
USING (zone_id IS NOT NULL);
