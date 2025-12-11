-- Allow community-wide read access to public/general sessions for Explore/insights
-- while still protecting private sessions.

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community can view public sessions for insights" ON sessions;

CREATE POLICY "Community can view public sessions for insights"
ON sessions
FOR SELECT
USING (
  -- Public for mapping/insights when location privacy is not private
  location_privacy IN ('general', 'exact')
);
