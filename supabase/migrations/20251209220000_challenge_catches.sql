-- Track which catches contributed to each challenge completion
CREATE TABLE IF NOT EXISTS challenge_catches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_challenge_id UUID NOT NULL REFERENCES user_challenges(id) ON DELETE CASCADE,
  catch_id UUID NOT NULL REFERENCES catches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_challenge_id, catch_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_challenge_catches_user_challenge ON challenge_catches(user_challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_catches_catch ON challenge_catches(catch_id);

-- RLS policies
ALTER TABLE challenge_catches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own challenge catches" ON challenge_catches;
CREATE POLICY "Users can view their own challenge catches" ON challenge_catches
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = challenge_catches.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert their own challenge catches" ON challenge_catches;
CREATE POLICY "Users can insert their own challenge catches" ON challenge_catches
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = challenge_catches.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete their own challenge catches" ON challenge_catches;
CREATE POLICY "Users can delete their own challenge catches" ON challenge_catches
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_challenges uc
      WHERE uc.id = challenge_catches.user_challenge_id
      AND uc.user_id = auth.uid()
    )
  );
