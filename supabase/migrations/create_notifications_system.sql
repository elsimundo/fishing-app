-- =====================================================
-- NOTIFICATIONS SYSTEM
-- =====================================================
-- Creates tables and functions for a comprehensive notification system
-- including competition invites, catch approvals, social interactions, etc.

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN (
    'competition_invite',
    'competition_starting_soon',
    'competition_winner',
    'catch_approved',
    'catch_rejected',
    'post_like',
    'post_comment',
    'follow',
    'session_catch'
  )),
  title text NOT NULL,
  message text NOT NULL,
  action_url text,
  related_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  related_competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE,
  related_session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  related_catch_id uuid REFERENCES catches(id) ON DELETE CASCADE,
  related_post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;

-- =====================================================
-- 2. COMPETITION INVITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS competition_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition_id uuid REFERENCES competitions(id) ON DELETE CASCADE NOT NULL,
  inviter_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  invitee_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz,
  UNIQUE(competition_id, invitee_id)
);

CREATE INDEX idx_competition_invites_invitee ON competition_invites(invitee_id, status);
CREATE INDEX idx_competition_invites_competition ON competition_invites(competition_id);

-- =====================================================
-- 3. RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE competition_invites ENABLE ROW LEVEL SECURITY;

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
  ON notifications FOR DELETE
  USING (auth.uid() = user_id);

-- Competition invites policies
CREATE POLICY "Users can view invites they sent or received"
  ON competition_invites FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

CREATE POLICY "Users can create competition invites for competitions they own"
  ON competition_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM competitions
      WHERE id = competition_id AND created_by = auth.uid()
    )
  );

CREATE POLICY "Invitees can update their invite status"
  ON competition_invites FOR UPDATE
  USING (auth.uid() = invitee_id);

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_action_url text DEFAULT NULL,
  p_related_user_id uuid DEFAULT NULL,
  p_related_competition_id uuid DEFAULT NULL,
  p_related_session_id uuid DEFAULT NULL,
  p_related_catch_id uuid DEFAULT NULL,
  p_related_post_id uuid DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    action_url,
    related_user_id,
    related_competition_id,
    related_session_id,
    related_catch_id,
    related_post_id
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_action_url,
    p_related_user_id,
    p_related_competition_id,
    p_related_session_id,
    p_related_catch_id,
    p_related_post_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS bigint AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM notifications
    WHERE user_id = auth.uid() AND is_read = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. TRIGGER: Create notification when competition invite is sent
-- =====================================================
CREATE OR REPLACE FUNCTION notify_competition_invite()
RETURNS TRIGGER AS $$
DECLARE
  v_competition_title text;
  v_inviter_username text;
BEGIN
  -- Get competition title and inviter username
  SELECT c.title, p.username
  INTO v_competition_title, v_inviter_username
  FROM competitions c
  JOIN profiles p ON p.id = NEW.inviter_id
  WHERE c.id = NEW.competition_id;

  -- Create notification for invitee
  PERFORM create_notification(
    p_user_id := NEW.invitee_id,
    p_type := 'competition_invite',
    p_title := 'Competition Invitation',
    p_message := v_inviter_username || ' invited you to join "' || v_competition_title || '"',
    p_action_url := '/compete/' || NEW.competition_id,
    p_related_user_id := NEW.inviter_id,
    p_related_competition_id := NEW.competition_id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER competition_invite_notification
  AFTER INSERT ON competition_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_competition_invite();

-- =====================================================
-- 6. GRANTS
-- =====================================================
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_unread_notification_count TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE notifications IS 'Stores all user notifications for various events';
COMMENT ON TABLE competition_invites IS 'Stores competition invitation requests';
COMMENT ON FUNCTION create_notification IS 'Helper function to create a new notification';
COMMENT ON FUNCTION mark_notification_read IS 'Marks a specific notification as read';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marks all user notifications as read';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns count of unread notifications for current user';
