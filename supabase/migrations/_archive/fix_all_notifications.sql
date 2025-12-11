-- =====================================================
-- COMPREHENSIVE NOTIFICATION TRIGGERS
-- =====================================================
-- Creates all notification triggers for social and competition events

-- =====================================================
-- 1. POST LIKES
-- =====================================================
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id uuid;
  v_liker_username text;
BEGIN
  -- Get post author
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Don't notify if user likes their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get liker's username
  SELECT username INTO v_liker_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create notification
  PERFORM create_notification(
    p_user_id := v_post_author_id,
    p_type := 'post_like',
    p_title := 'New Like',
    p_message := v_liker_username || ' liked your post',
    p_action_url := '/feed',
    p_related_user_id := NEW.user_id,
    p_related_post_id := NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_like_notification ON post_likes;
CREATE TRIGGER post_like_notification
  AFTER INSERT ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_like();

-- =====================================================
-- 2. POST COMMENTS
-- =====================================================
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_post_author_id uuid;
  v_commenter_username text;
  v_comment_preview text;
BEGIN
  -- Get post author
  SELECT user_id INTO v_post_author_id
  FROM posts
  WHERE id = NEW.post_id;

  -- Don't notify if user comments on their own post
  IF v_post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter's username
  SELECT username INTO v_commenter_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Create comment preview (first 50 chars) - column is 'text' not 'content'
  v_comment_preview := CASE
    WHEN length(NEW.text) > 50 THEN substring(NEW.text from 1 for 50) || '...'
    ELSE NEW.text
  END;

  -- Create notification
  PERFORM create_notification(
    p_user_id := v_post_author_id,
    p_type := 'post_comment',
    p_title := 'New Comment',
    p_message := v_commenter_username || ' commented: "' || v_comment_preview || '"',
    p_action_url := '/feed',
    p_related_user_id := NEW.user_id,
    p_related_post_id := NEW.post_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS post_comment_notification ON post_comments;
CREATE TRIGGER post_comment_notification
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

-- =====================================================
-- 3. SESSION CATCH LOGGED (notify other participants)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_session_catch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catcher_username text;
  v_session_title text;
  v_participant record;
BEGIN
  -- Only notify for catches in sessions (not solo catches)
  IF NEW.session_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get catcher username and session title
  SELECT p.username, s.title
  INTO v_catcher_username, v_session_title
  FROM profiles p, sessions s
  WHERE p.id = NEW.user_id AND s.id = NEW.session_id;

  -- Notify all other active participants in the session
  FOR v_participant IN
    SELECT user_id
    FROM session_participants
    WHERE session_id = NEW.session_id
      AND status = 'active'
      AND user_id != NEW.user_id
  LOOP
    PERFORM create_notification(
      p_user_id := v_participant.user_id,
      p_type := 'session_catch',
      p_title := 'New Catch in Session',
      p_message := v_catcher_username || ' logged a ' || NEW.species || ' in "' || v_session_title || '"',
      p_action_url := '/sessions/' || NEW.session_id,
      p_related_user_id := NEW.user_id,
      p_related_session_id := NEW.session_id,
      p_related_catch_id := NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS session_catch_notification ON catches;
CREATE TRIGGER session_catch_notification
  AFTER INSERT ON catches
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_catch();

-- =====================================================
-- 4. COMPETITION CATCH PENDING (notify organizer)
-- =====================================================
CREATE OR REPLACE FUNCTION notify_competition_pending_catch()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_competition_id uuid;
  v_organizer_id uuid;
  v_catcher_username text;
  v_competition_title text;
BEGIN
  -- Only for catches that need validation
  IF NEW.validation_status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Check if this catch is in a competition session
  SELECT s.competition_id, c.created_by, c.title
  INTO v_competition_id, v_organizer_id, v_competition_title
  FROM sessions s
  JOIN competitions c ON c.id = s.competition_id
  WHERE s.id = NEW.session_id;

  -- If not a competition catch, skip
  IF v_competition_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get catcher username
  SELECT username INTO v_catcher_username
  FROM profiles
  WHERE id = NEW.user_id;

  -- Notify competition organizer
  PERFORM create_notification(
    p_user_id := v_organizer_id,
    p_type := 'catch_approved',
    p_title := 'Pending Catch Review',
    p_message := v_catcher_username || ' submitted a ' || NEW.species || ' catch for approval',
    p_action_url := '/compete/' || v_competition_id,
    p_related_user_id := NEW.user_id,
    p_related_competition_id := v_competition_id,
    p_related_session_id := NEW.session_id,
    p_related_catch_id := NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS competition_pending_catch_notification ON catches;
CREATE TRIGGER competition_pending_catch_notification
  AFTER INSERT ON catches
  FOR EACH ROW
  EXECUTE FUNCTION notify_competition_pending_catch();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_post_like IS 'Notifies post author when someone likes their post';
COMMENT ON FUNCTION notify_post_comment IS 'Notifies post author when someone comments on their post';
COMMENT ON FUNCTION notify_session_catch IS 'Notifies session participants when someone logs a catch';
COMMENT ON FUNCTION notify_competition_pending_catch IS 'Notifies competition organizer when catch needs approval';
