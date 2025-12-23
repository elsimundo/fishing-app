-- Make all existing data public for testing purposes
-- This allows all users to see all catches, sessions, and competition entries
-- Privacy restrictions can be added later

-- Make all catches public
UPDATE catches SET is_public = true WHERE is_public = false OR is_public IS NULL;

-- Make all sessions public (set location_privacy to 'public' if it exists)
UPDATE sessions SET location_privacy = 'public' WHERE location_privacy != 'public' OR location_privacy IS NULL;

-- Make all competition entries public (if there's a visibility field)
-- Competition entries are typically public by nature of being in a competition

-- Ensure the catches RLS policy allows reading all public catches
DROP POLICY IF EXISTS "Community can view public catches for insights" ON catches;

CREATE POLICY "Community can view public catches for insights"
ON catches
FOR SELECT
USING (
  is_public = true
);

-- Also ensure users can always see their own catches
DROP POLICY IF EXISTS "Users can view own catches" ON catches;

CREATE POLICY "Users can view own catches"
ON catches
FOR SELECT
USING (
  auth.uid() = user_id
);
