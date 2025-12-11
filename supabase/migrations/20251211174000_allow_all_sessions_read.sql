-- Allow ALL authenticated users to read ALL sessions for testing
-- This complements the catches policy

-- Drop existing SELECT policies on sessions
DROP POLICY IF EXISTS "Users can view sessions they own or are shared with" ON sessions;
DROP POLICY IF EXISTS "Public sessions are viewable" ON sessions;

-- Create a single permissive policy that allows all authenticated users to read all sessions
CREATE POLICY "All authenticated users can view all sessions"
ON sessions
FOR SELECT
TO authenticated
USING (true);

-- Verify
DO $$
BEGIN
  RAISE NOTICE 'Created permissive policy for all sessions';
END $$;
