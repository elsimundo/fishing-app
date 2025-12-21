-- Fix session_participants table - add missing columns that triggers expect

-- Add updated_at column if it doesn't exist
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now());

-- Add created_at column if it doesn't exist  
ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc', now());

-- Update any NULL values
UPDATE session_participants
SET updated_at = timezone('utc', now())
WHERE updated_at IS NULL;

UPDATE session_participants
SET created_at = timezone('utc', now())
WHERE created_at IS NULL;

-- Make sure the set_updated_at function exists
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS set_session_participants_updated_at ON session_participants;
CREATE TRIGGER set_session_participants_updated_at
  BEFORE UPDATE ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
