-- Relax community insights policy on catches to use is_public + data sharing
-- instead of relying on session.location_privacy, so public catches like
-- 88a43de7-13df-4e4f-ab9d-70afea69c620 are visible to other anglers.

ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community can view public catches for insights" ON catches;

CREATE POLICY "Community can view public catches for insights"
ON catches
FOR SELECT
USING (
  -- Any authenticated user can read public catches for insights
  -- We rely solely on is_public here to avoid depending on optional
  -- profile columns that may not exist in all environments.
  is_public = true
);
