-- Fix status constraint - ensure it's properly defined

-- Drop any existing constraints on status column
DO $$
BEGIN
  -- Drop all check constraints on session_participants that might be related to status
  EXECUTE (
    SELECT string_agg('ALTER TABLE session_participants DROP CONSTRAINT IF EXISTS ' || constraint_name || ';', ' ')
    FROM information_schema.constraint_column_usage
    WHERE table_name = 'session_participants' 
    AND column_name = 'status'
    AND constraint_name LIKE '%check%'
  );
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Add the correct constraint with a specific name
ALTER TABLE session_participants
DROP CONSTRAINT IF EXISTS session_participants_status_check;

ALTER TABLE session_participants
ADD CONSTRAINT session_participants_status_check 
CHECK (status IN ('pending', 'active', 'left'));

-- Ensure status column has a default
ALTER TABLE session_participants
ALTER COLUMN status SET DEFAULT 'active';

-- Update any NULL status values to 'active'
UPDATE session_participants
SET status = 'active'
WHERE status IS NULL;
