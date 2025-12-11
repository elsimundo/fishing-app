-- =====================================================
-- FIX FUNCTION SEARCH PATHS
-- =====================================================
-- Add SET search_path to all SECURITY DEFINER functions to prevent search path attacks

-- Set search_path for all functions to only use public and pg_catalog schemas
-- This prevents malicious users from creating objects in other schemas that could be called by these functions

ALTER FUNCTION search_businesses_in_radius SET search_path = public, pg_catalog;
ALTER FUNCTION create_notification SET search_path = public, pg_catalog;
ALTER FUNCTION update_competition_status SET search_path = public, pg_catalog;
ALTER FUNCTION notify_post_like SET search_path = public, pg_catalog;
ALTER FUNCTION set_updated_at SET search_path = public, pg_catalog;
ALTER FUNCTION get_user_feed SET search_path = public, pg_catalog;
ALTER FUNCTION create_competition_session SET search_path = public, pg_catalog;
ALTER FUNCTION auto_approve_non_competition_catch SET search_path = public, pg_catalog;
ALTER FUNCTION update_competition_leaderboard SET search_path = public, pg_catalog;
ALTER FUNCTION mark_notification_read SET search_path = public, pg_catalog;
ALTER FUNCTION notify_post_comment SET search_path = public, pg_catalog;
ALTER FUNCTION notify_session_catch SET search_path = public, pg_catalog;
ALTER FUNCTION declare_competition_winner SET search_path = public, pg_catalog;
ALTER FUNCTION notify_competition_pending_catch SET search_path = public, pg_catalog;
ALTER FUNCTION mark_session_viewed SET search_path = public, pg_catalog;
ALTER FUNCTION reject_catch SET search_path = public, pg_catalog;
ALTER FUNCTION remove_competition_winner SET search_path = public, pg_catalog;
ALTER FUNCTION get_unread_notification_count SET search_path = public, pg_catalog;
ALTER FUNCTION search_catches_in_radius SET search_path = public, pg_catalog;
ALTER FUNCTION add_session_owner_participant SET search_path = public, pg_catalog;
ALTER FUNCTION calculate_competition_score SET search_path = public, pg_catalog;
ALTER FUNCTION get_user_follow_counts SET search_path = public, pg_catalog;
ALTER FUNCTION update_updated_at_column SET search_path = public, pg_catalog;
ALTER FUNCTION notify_competition_invite SET search_path = public, pg_catalog;
ALTER FUNCTION approve_catch SET search_path = public, pg_catalog;
ALTER FUNCTION mark_all_notifications_read SET search_path = public, pg_catalog;
ALTER FUNCTION validate_competition_catch_time SET search_path = public, pg_catalog;
ALTER FUNCTION get_competition_leaderboard SET search_path = public, pg_catalog;
ALTER FUNCTION adjust_competition_time SET search_path = public, pg_catalog;

COMMENT ON FUNCTION search_businesses_in_radius IS 'Search path secured to public, pg_catalog';
COMMENT ON FUNCTION create_notification IS 'Search path secured to public, pg_catalog';
