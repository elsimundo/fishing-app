-- Add status and joined_at columns to session_participants for collaboration features

ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('pending', 'active', 'left'));

ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS joined_at timestamptz DEFAULT timezone('utc', now());

-- Update existing rows to have joined_at = created_at (if created_at exists)
-- Otherwise just use current timestamp
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'session_participants' AND column_name = 'created_at'
  ) THEN
    UPDATE session_participants
    SET joined_at = created_at
    WHERE joined_at IS NULL;
  ELSE
    UPDATE session_participants
    SET joined_at = timezone('utc', now())
    WHERE joined_at IS NULL;
  END IF;
END $$;

-- Make joined_at NOT NULL after backfilling
ALTER TABLE session_participants
ALTER COLUMN joined_at SET NOT NULL;

-- Index for querying by status
CREATE INDEX IF NOT EXISTS idx_session_participants_status ON session_participants(status);
