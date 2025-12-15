-- Allow followers to view completed challenges (badges) for private profiles, while keeping writes restricted.

-- Enable RLS (idempotent)
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;

-- Replace overly-restrictive select policy
DROP POLICY IF EXISTS "Users can view own challenges" ON user_challenges;
CREATE POLICY "Users can view own challenges" ON user_challenges
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR can_view_user_posts(auth.uid(), user_id)
  );

-- Ensure insert/update remain owner-only
DROP POLICY IF EXISTS "Users can insert own challenges" ON user_challenges;
CREATE POLICY "Users can insert own challenges" ON user_challenges
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own challenges" ON user_challenges;
CREATE POLICY "Users can update own challenges" ON user_challenges
  FOR UPDATE
  USING (auth.uid() = user_id);
