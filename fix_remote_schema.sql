-- Comprehensive schema fix for remote database
-- Run this in Supabase Dashboard SQL Editor

-- 1. Add logged_by_user_id to catches table
ALTER TABLE catches ADD COLUMN IF NOT EXISTS logged_by_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_catches_logged_by ON catches(logged_by_user_id);

-- 2. Make joined_at nullable in session_participants
ALTER TABLE session_participants ALTER COLUMN joined_at DROP NOT NULL;

-- 3. Fix user_weekly_stats RLS policies
-- The trigger needs to be able to insert/update weekly stats for any user
DROP POLICY IF EXISTS "Users can view weekly stats" ON user_weekly_stats;
DROP POLICY IF EXISTS "Users can manage own weekly stats" ON user_weekly_stats;
DROP POLICY IF EXISTS "Users can view own weekly stats" ON user_weekly_stats;
DROP POLICY IF EXISTS "Users can insert own weekly stats" ON user_weekly_stats;
DROP POLICY IF EXISTS "Users can update own weekly stats" ON user_weekly_stats;

-- Allow everyone to view weekly stats (for leaderboards)
CREATE POLICY "Users can view weekly stats"
  ON user_weekly_stats
  FOR SELECT
  USING (true);

-- Allow users to insert/update their own stats (needed for trigger)
CREATE POLICY "Users can insert weekly stats"
  ON user_weekly_stats
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update weekly stats"
  ON user_weekly_stats
  FOR UPDATE
  USING (true);

-- 4. Update catches RLS to allow logging for session participants
DROP POLICY IF EXISTS "users_can_log_catches_for_session_participants" ON catches;
DROP POLICY IF EXISTS "Users can insert own catches" ON catches;

CREATE POLICY "Users can insert own catches"
  ON catches
  FOR INSERT
  WITH CHECK (
    -- Either logging for yourself
    auth.uid() = user_id
    OR
    -- Or logging for someone in a session you're both part of
    (
      session_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM session_participants sp1
        INNER JOIN session_participants sp2 
          ON sp1.session_id = sp2.session_id
        WHERE sp1.user_id = auth.uid()
          AND sp2.user_id = catches.user_id
          AND sp1.status IN ('active', 'pending')
          AND sp2.status IN ('active', 'pending')
          AND catches.session_id = sp1.session_id
      )
    )
  );

-- Verify the changes
SELECT 
  'logged_by_user_id column exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'catches' 
    AND column_name = 'logged_by_user_id'
  ) as result;

SELECT 
  'joined_at is nullable' as check_name,
  is_nullable = 'YES' as result
FROM information_schema.columns 
WHERE table_name = 'session_participants' 
AND column_name = 'joined_at';
