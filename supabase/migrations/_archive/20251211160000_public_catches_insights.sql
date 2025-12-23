-- Allow community-wide read access to public/general catches for insights
-- while still protecting private sessions and respecting data sharing prefs.

-- Enable RLS on catches is already done in previous migrations; here we add
-- an additional SELECT policy that allows any authenticated user to read
-- catches that are:
--   - in sessions with location_privacy = 'general' or 'exact'
--   - from profiles that have NOT opted out of share_data_for_insights
-- This is in addition to the existing owner/shared viewer policy.

ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Community can view public catches for insights" ON catches;

CREATE POLICY "Community can view public catches for insights"
ON catches
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM sessions s
    LEFT JOIN profiles p ON p.id = catches.user_id
    WHERE s.id = catches.session_id
      AND s.location_privacy IN ('general', 'exact')
      AND COALESCE(p.share_data_for_insights, true) = true
  )
);
