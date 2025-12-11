-- Temporarily allow ALL authenticated users to read ALL catches
-- This is for testing purposes - will add proper privacy controls later

-- Drop all existing SELECT policies on catches
DROP POLICY IF EXISTS "Users can view catches they own or are shared with" ON catches;
DROP POLICY IF EXISTS "Community can view public catches for insights" ON catches;
DROP POLICY IF EXISTS "Anyone can view public catches" ON catches;
DROP POLICY IF EXISTS "Anyone can view catches in zones" ON catches;
DROP POLICY IF EXISTS "Users can view own catches" ON catches;

-- Create a single permissive policy that allows all authenticated users to read all catches
CREATE POLICY "All authenticated users can view all catches"
ON catches
FOR SELECT
TO authenticated
USING (true);

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Created permissive policy for all catches';
END $$;
