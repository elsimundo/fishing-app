-- Allow ANONYMOUS users to read catches too (not just authenticated)
-- This ensures the zone panel works even if auth state is unclear

DROP POLICY IF EXISTS "All authenticated users can view all catches" ON catches;
DROP POLICY IF EXISTS "Anon can view all catches" ON catches;

-- Allow both authenticated AND anonymous users to read all catches
CREATE POLICY "Anyone can view all catches"
ON catches
FOR SELECT
USING (true);

-- Same for sessions
DROP POLICY IF EXISTS "All authenticated users can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Anon can view all sessions" ON sessions;

CREATE POLICY "Anyone can view all sessions"
ON sessions
FOR SELECT
USING (true);

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Created fully permissive policies for catches and sessions';
END $$;
