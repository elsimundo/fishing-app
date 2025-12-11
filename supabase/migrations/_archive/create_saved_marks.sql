-- Saved Marks / Watchlist for fishing spots
-- Allows users to save custom locations (especially useful for sea fishing)

CREATE TABLE IF NOT EXISTS saved_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  water_type text DEFAULT 'sea', -- sea, coastal, river, lake, canal, pond, reservoir, other
  notes text,
  is_public boolean DEFAULT false, -- Share with community or keep private
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_marks_user_id ON saved_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_marks_location ON saved_marks USING gist (
  ll_to_earth(latitude, longitude)
);
CREATE INDEX IF NOT EXISTS idx_saved_marks_public ON saved_marks(is_public) WHERE is_public = true;

-- RLS policies
ALTER TABLE saved_marks ENABLE ROW LEVEL SECURITY;

-- Users can view their own marks
CREATE POLICY "Users can view own marks"
  ON saved_marks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view public marks from others
CREATE POLICY "Users can view public marks"
  ON saved_marks FOR SELECT
  USING (is_public = true);

-- Users can create their own marks
CREATE POLICY "Users can create marks"
  ON saved_marks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own marks
CREATE POLICY "Users can update own marks"
  ON saved_marks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own marks
CREATE POLICY "Users can delete own marks"
  ON saved_marks FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER saved_marks_updated_at
  BEFORE UPDATE ON saved_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_marks_updated_at();
