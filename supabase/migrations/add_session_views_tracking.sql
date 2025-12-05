-- =====================================================
-- SESSION/COMPETITION VIEWS TRACKING
-- =====================================================
-- Tracks when users view ended sessions/competitions to move them from banners to history

CREATE TABLE IF NOT EXISTS session_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX idx_session_views_user ON session_views(user_id);
CREATE INDEX idx_session_views_session ON session_views(session_id);

-- Enable RLS
ALTER TABLE session_views ENABLE ROW LEVEL SECURITY;

-- Users can view their own view records
CREATE POLICY "Users can view their own session views"
  ON session_views FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own view records
CREATE POLICY "Users can insert their own session views"
  ON session_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to mark session as viewed
CREATE OR REPLACE FUNCTION mark_session_viewed(p_session_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO session_views (session_id, user_id)
  VALUES (p_session_id, auth.uid())
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION mark_session_viewed TO authenticated;

COMMENT ON TABLE session_views IS 'Tracks when users view ended sessions/competitions to hide completed banners';
COMMENT ON FUNCTION mark_session_viewed IS 'Marks a session as viewed by the current user';
