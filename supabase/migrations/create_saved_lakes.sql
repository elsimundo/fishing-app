-- Saved Lakes / Watchlist for freshwater venues
-- Allows users to save lakes they want to track

CREATE TABLE IF NOT EXISTS saved_lakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lake_id uuid NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lake_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_lakes_user_id ON saved_lakes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lakes_lake_id ON saved_lakes(lake_id);

-- RLS policies
ALTER TABLE saved_lakes ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved lakes
CREATE POLICY "Users can view own saved lakes"
  ON saved_lakes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can save lakes
CREATE POLICY "Users can save lakes"
  ON saved_lakes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can unsave lakes
CREATE POLICY "Users can unsave lakes"
  ON saved_lakes FOR DELETE
  USING (auth.uid() = user_id);
