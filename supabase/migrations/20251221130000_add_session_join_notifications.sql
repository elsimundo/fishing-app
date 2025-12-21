-- Add session join request notification type
DO $$
BEGIN
  -- Drop the existing check constraint if it exists
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add new check constraint with session join request type
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- Existing types
      'competition_invite', 'competition_starting_soon', 'competition_winner',
      'catch_approved', 'catch_rejected',
      'post_like', 'post_comment',
      'follow', 'session_catch', 'message', 'share',
      -- Lake team types
      'lake_team_invite', 'lake_team_removed', 'lake_team_role_changed',
      'lake_claim_submitted', 'lake_claim_approved', 'lake_claim_rejected',
      'lake_problem_reported',
      -- Session collaboration types
      'session_join_request',  -- Someone wants to join your session
      'session_invite',         -- You've been invited to a session
      'session_invite_accepted' -- Someone accepted your session invite
    )
  );
END $$;

-- Function to create notification when someone requests to join a session
CREATE OR REPLACE FUNCTION notify_session_join_request()
RETURNS TRIGGER AS $$
DECLARE
  v_session_owner_id UUID;
  v_session_title TEXT;
  v_requester_username TEXT;
BEGIN
  -- Only create notification for pending join requests
  IF NEW.status = 'pending' AND NEW.role = 'viewer' THEN
    -- Get session owner and title
    SELECT user_id, COALESCE(title, location_name, 'Session')
    INTO v_session_owner_id, v_session_title
    FROM sessions
    WHERE id = NEW.session_id;
    
    -- Get requester's username
    SELECT username INTO v_requester_username
    FROM profiles
    WHERE id = NEW.user_id;
    
    -- Create notification for session owner
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      related_user_id,
      related_session_id
    ) VALUES (
      v_session_owner_id,
      'session_join_request',
      'Join Request',
      v_requester_username || ' wants to join "' || v_session_title || '"',
      '/sessions/' || NEW.session_id,
      NEW.user_id,
      NEW.session_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for session join requests
DROP TRIGGER IF EXISTS session_join_request_notification ON session_participants;
CREATE TRIGGER session_join_request_notification
  AFTER INSERT ON session_participants
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_join_request();
