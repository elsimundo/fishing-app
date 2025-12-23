-- Add logged_by_user_id to catches table
-- This allows users to log catches on behalf of other session participants

ALTER TABLE catches ADD COLUMN IF NOT EXISTS logged_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- Create index for queries filtering by who logged the catch
CREATE INDEX IF NOT EXISTS idx_catches_logged_by ON catches(logged_by_user_id);

-- Add comment for documentation
COMMENT ON COLUMN catches.logged_by_user_id IS 'User who logged this catch (may differ from user_id if logging for someone else in a session)';

-- Update RLS policies to allow logging catches for session participants
-- Users can insert catches for any participant in sessions they are part of
CREATE POLICY "users_can_log_catches_for_session_participants"
  ON catches
  FOR INSERT
  WITH CHECK (
    -- Either logging for yourself
    auth.uid() = user_id
    OR
    -- Or logging for someone in a session you're both part of
    EXISTS (
      SELECT 1 FROM session_participants sp1
      INNER JOIN session_participants sp2 
        ON sp1.session_id = sp2.session_id
      WHERE sp1.user_id = auth.uid()
        AND sp2.user_id = catches.user_id
        AND sp1.status IN ('active', 'pending')
        AND sp2.status IN ('active', 'pending')
        AND catches.session_id = sp1.session_id
    )
  );
