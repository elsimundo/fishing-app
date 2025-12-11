-- =====================================================
-- ADD NOTIFICATIONS FOR SOCIAL INTERACTIONS
-- =====================================================
-- Creates triggers for post likes and comments

-- =====================================================
-- 1. TRIGGER: Notify when someone likes your post
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

  -- Create notification for post author
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
-- 2. TRIGGER: Notify when someone comments on your post
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

  -- Create comment preview (first 50 chars)
  v_comment_preview := CASE
    WHEN length(NEW.content) > 50 THEN substring(NEW.content from 1 for 50) || '...'
    ELSE NEW.content
  END;

  -- Create notification for post author
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
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION notify_post_like IS 'Creates notification when someone likes a post';
COMMENT ON FUNCTION notify_post_comment IS 'Creates notification when someone comments on a post';
