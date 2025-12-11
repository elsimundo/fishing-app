-- =====================================================
-- FIX SECURITY DEFINER VIEWS
-- =====================================================
-- Change views from SECURITY DEFINER to SECURITY INVOKER

-- Fix my_pending_invitations view
DROP VIEW IF EXISTS my_pending_invitations;

CREATE VIEW my_pending_invitations
WITH (security_invoker = true)
AS
SELECT 
  ci.*,
  c.title as competition_name,
  c.starts_at,
  c.ends_at,
  inviter.username as inviter_username
FROM competition_invites ci
JOIN competitions c ON ci.competition_id = c.id
JOIN profiles inviter ON ci.inviter_id = inviter.id
WHERE ci.invitee_id = auth.uid()
  AND ci.status = 'pending';

-- Fix competition_stats view
DROP VIEW IF EXISTS competition_stats;

CREATE VIEW competition_stats
WITH (security_invoker = true)
AS
SELECT 
  c.id as competition_id,
  COUNT(DISTINCT ce.user_id) as participant_count,
  COUNT(DISTINCT ca.id) as total_catches,
  COALESCE(SUM(ca.weight_kg), 0) as total_weight
FROM competitions c
LEFT JOIN competition_entries ce ON c.id = ce.competition_id
LEFT JOIN catches ca ON ce.session_id = ca.session_id
WHERE ca.validation_status = 'approved' OR ca.validation_status IS NULL
GROUP BY c.id;

COMMENT ON VIEW my_pending_invitations IS 'Shows pending competition invitations for the current user with SECURITY INVOKER';
COMMENT ON VIEW competition_stats IS 'Aggregate statistics for competitions with SECURITY INVOKER';
