-- Add mark_id to sessions and catches for location linking
-- This allows sessions and catches to reference saved marks

-- Add mark_id to sessions
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS mark_id uuid REFERENCES saved_marks(id) ON DELETE SET NULL;

-- Add mark_id to catches
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS mark_id uuid REFERENCES saved_marks(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_mark_id ON sessions(mark_id) WHERE mark_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catches_mark_id ON catches(mark_id) WHERE mark_id IS NOT NULL;

-- Comment explaining the relationship
COMMENT ON COLUMN sessions.mark_id IS 'Optional link to a saved mark where the session started';
COMMENT ON COLUMN catches.mark_id IS 'Optional link to a saved mark where the catch was made (can differ from session mark if angler moved)';
