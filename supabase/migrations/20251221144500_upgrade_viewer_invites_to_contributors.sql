-- Upgrade existing viewer participants to contributors
-- Since invites now always create contributors, any existing viewers
-- who were invited (status = pending or active) should be upgraded

UPDATE session_participants
SET role = 'contributor'
WHERE role = 'viewer'
  AND status IN ('pending', 'active');

-- Add comment explaining the change
COMMENT ON TABLE session_participants IS 'Session participants with roles: owner (session creator), contributor (can log catches and post), viewer (view-only for public sessions)';
