-- =====================================================
-- ADD NOTIFICATIONS TO CATCH APPROVAL/REJECTION
-- =====================================================
-- Updates approve_catch and reject_catch functions to send notifications

-- Update approve_catch function to send notification
CREATE OR REPLACE FUNCTION approve_catch(p_catch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catch_user_id uuid;
  v_catch_species text;
  v_competition_id uuid;
  v_session_id uuid;
BEGIN
  -- Get catch details
  SELECT c.user_id, c.species, c.session_id, s.competition_id
  INTO v_catch_user_id, v_catch_species, v_session_id, v_competition_id
  FROM catches c
  LEFT JOIN sessions s ON s.id = c.session_id
  WHERE c.id = p_catch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catch not found';
  END IF;

  -- Update catch validation status
  UPDATE catches
  SET validation_status = 'approved'
  WHERE id = p_catch_id;

  -- Create notification for catch owner
  IF v_competition_id IS NOT NULL THEN
    PERFORM create_notification(
      p_user_id := v_catch_user_id,
      p_type := 'catch_approved',
      p_title := 'Catch Approved! 🎉',
      p_message := 'Your ' || v_catch_species || ' catch has been approved and added to the leaderboard',
      p_action_url := '/compete/' || v_competition_id,
      p_related_user_id := auth.uid(),
      p_related_catch_id := p_catch_id,
      p_related_competition_id := v_competition_id,
      p_related_session_id := v_session_id
    );
  END IF;
END;
$$;

-- Update reject_catch function to send notification
CREATE OR REPLACE FUNCTION reject_catch(p_catch_id uuid, p_rejection_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_catch_user_id uuid;
  v_catch_species text;
  v_competition_id uuid;
  v_session_id uuid;
BEGIN
  -- Get catch details
  SELECT c.user_id, c.species, c.session_id, s.competition_id
  INTO v_catch_user_id, v_catch_species, v_session_id, v_competition_id
  FROM catches c
  LEFT JOIN sessions s ON s.id = c.session_id
  WHERE c.id = p_catch_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catch not found';
  END IF;

  -- Update catch validation status and reason
  UPDATE catches
  SET 
    validation_status = 'rejected',
    rejection_reason = p_rejection_reason
  WHERE id = p_catch_id;

  -- Create notification for catch owner
  IF v_competition_id IS NOT NULL THEN
    PERFORM create_notification(
      p_user_id := v_catch_user_id,
      p_type := 'catch_rejected',
      p_title := 'Catch Not Approved',
      p_message := 'Your ' || v_catch_species || ' catch was not approved. Reason: ' || p_rejection_reason,
      p_action_url := '/compete/' || v_competition_id,
      p_related_user_id := auth.uid(),
      p_related_catch_id := p_catch_id,
      p_related_competition_id := v_competition_id,
      p_related_session_id := v_session_id
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION approve_catch IS 'Approves a catch and sends notification to catch owner';
COMMENT ON FUNCTION reject_catch IS 'Rejects a catch with reason and sends notification to catch owner';
