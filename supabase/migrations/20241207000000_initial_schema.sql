CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."species_tier" AS ENUM (
    'common',
    'standard',
    'trophy',
    'rare'
);


ALTER TYPE "public"."species_tier" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_session_owner_participant"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  insert into session_participants (
    session_id,
    user_id,
    role,
    status,
    joined_at
  ) values (
    new.id,
    new.user_id,
    'owner',
    'active',
    now()
  );
  
  return new;
end;
$$;


ALTER FUNCTION "public"."add_session_owner_participant"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_competition record;
  v_is_organizer boolean;
begin
  -- Get competition
  select * into v_competition
  from competitions
  where id = p_competition_id;

  if not found then
    raise exception 'Competition not found';
  end if;

  -- Verify caller is organizer
  if v_competition.created_by != p_organizer_id then
    raise exception 'Only competition organizer can adjust time';
  end if;

  -- Validate new end time is after start time
  if p_new_ends_at <= v_competition.starts_at then
    raise exception 'End time must be after start time';
  end if;

  -- Store original if first adjustment
  if v_competition.original_ends_at is null then
    update competitions
    set original_ends_at = ends_at
    where id = p_competition_id;
  end if;

  -- Update end time
  update competitions
  set 
    ends_at = p_new_ends_at,
    time_adjusted_count = time_adjusted_count + 1,
    last_adjusted_at = now(),
    last_adjusted_by = p_organizer_id
  where id = p_competition_id;

  -- Also update linked session end time
  update sessions
  set ended_at = p_new_ends_at
  where competition_id = p_competition_id;

  -- Return adjustment details
  return jsonb_build_object(
    'competition_id', p_competition_id,
    'new_ends_at', p_new_ends_at,
    'original_ends_at', v_competition.original_ends_at,
    'adjusted_count', v_competition.time_adjusted_count + 1,
    'reason', p_reason
  );
end;
$$;


ALTER FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text") IS 'Allows organizer to adjust competition end time with reason tracking';



CREATE OR REPLACE FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Verify caller is admin
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_admin_id AND role = 'admin') THEN
    RETURN jsonb_build_object('error', 'Only admins can manually verify catches');
  END IF;
  
  -- Validate level
  IF p_level NOT IN ('unverified', 'bronze', 'silver', 'gold', 'platinum', 'rejected') THEN
    RETURN jsonb_build_object('error', 'Invalid verification level');
  END IF;
  
  UPDATE catches SET
    verification_level = p_level,
    verification_override = p_reason,
    verified_by = p_admin_id,
    verified_at = NOW()
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'level', p_level,
    'catch_id', p_catch_id
  );
END;
$$;


ALTER FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") IS 'Allow admins to manually override verification level';



CREATE OR REPLACE FUNCTION "public"."approve_business"("p_business_id" "uuid", "p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can approve businesses'; END IF;
  UPDATE businesses SET status = 'approved', approved_at = now(), approved_by = p_admin_id WHERE id = p_business_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'approve_business', 'business', p_business_id, jsonb_build_object('approved_at', now()));
END;
$$;


ALTER FUNCTION "public"."approve_business"("p_business_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_business_claim"("p_claim_id" "uuid", "p_reviewer_id" "uuid", "p_action" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_business_id uuid;
  v_user_id uuid;
BEGIN
  SELECT business_id, user_id INTO v_business_id, v_user_id
  FROM business_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE businesses
    SET owner_user_id = v_user_id,
        is_claimed = true
    WHERE id = v_business_id;

    UPDATE business_claims
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_reviewer_id
    WHERE id = p_claim_id;
  ELSIF p_action = 'reject' THEN
    UPDATE business_claims
    SET status = 'rejected',
        reviewed_at = now(),
        reviewed_by = p_reviewer_id
    WHERE id = p_claim_id;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$;


ALTER FUNCTION "public"."approve_business_claim"("p_claim_id" "uuid", "p_reviewer_id" "uuid", "p_action" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_catch"("p_catch_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."approve_catch"("p_catch_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_catch RECORD;
  v_competition RECORD;
BEGIN
  -- Get catch and verify it's in a competition
  SELECT c.*, s.competition_id 
  INTO v_catch 
  FROM catches c
  LEFT JOIN sessions s ON c.session_id = s.id
  WHERE c.id = p_catch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Catch not found');
  END IF;
  
  IF v_catch.competition_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Catch is not in a competition');
  END IF;
  
  -- Verify approver is the competition host
  SELECT * INTO v_competition FROM competitions WHERE id = v_catch.competition_id;
  
  IF v_competition.host_id != p_approver_id THEN
    -- Check if approver is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_approver_id AND role = 'admin') THEN
      RETURN jsonb_build_object('error', 'Only the competition host or admin can approve catches');
    END IF;
  END IF;
  
  -- Update catch
  UPDATE catches SET
    competition_approved = p_approved,
    competition_approved_by = p_approver_id,
    competition_approved_at = NOW(),
    competition_rejection_reason = CASE WHEN p_approved THEN NULL ELSE p_rejection_reason END
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'approved', p_approved,
    'catch_id', p_catch_id
  );
END;
$$;


ALTER FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text") IS 'Allow competition host to approve or reject catches for their competition';



CREATE OR REPLACE FUNCTION "public"."assign_catch_zone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  session_privacy text;
  nearby_lake_id uuid;
BEGIN
  IF NEW.session_id IS NOT NULL THEN
    SELECT location_privacy INTO session_privacy FROM sessions WHERE id = NEW.session_id;
  END IF;
  
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND (session_privacy IS NULL OR session_privacy IN ('general', 'exact')) THEN
    
    -- Check if catch is near a lake - if so, don't assign to a zone
    nearby_lake_id := is_near_lake(NEW.latitude, NEW.longitude);
    
    IF nearby_lake_id IS NOT NULL THEN
      -- Catch is near a lake, don't create/assign zone
      NEW.zone_id := NULL;
    ELSE
      NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
    END IF;
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_catch_zone"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_session_zone"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  nearby_lake_id uuid;
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL 
     AND NEW.latitude != 0 AND NEW.longitude != 0
     AND NEW.location_privacy IN ('general', 'exact') THEN
    
    -- Check if session is near a lake - if so, don't assign to a zone
    nearby_lake_id := is_near_lake(NEW.latitude, NEW.longitude);
    
    IF nearby_lake_id IS NOT NULL THEN
      NEW.zone_id := NULL;
    ELSE
      NEW.zone_id := get_or_create_zone(NEW.latitude, NEW.longitude);
    END IF;
  ELSE
    NEW.zone_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."assign_session_zone"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_approve_non_competition_catch"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  -- Check if session is a competition
  if exists (
    select 1 from sessions s 
    where s.id = new.session_id 
      and s.competition_id is not null
  ) then
    -- It's a competition catch - default to pending
    new.validation_status = 'pending';
  else
    -- Normal session - auto-approve
    new.validation_status = 'approved';
  end if;
  
  return new;
end;
$$;


ALTER FUNCTION "public"."auto_approve_non_competition_catch"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."auto_approve_non_competition_catch"() IS 'Automatically sets validation_status based on whether catch is in a competition session';



CREATE OR REPLACE FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_reference_type" "text" DEFAULT NULL::"text", "p_reference_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("new_xp" integer, "new_level" integer, "leveled_up" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  old_level integer;
  updated_xp integer;
  updated_level integer;
BEGIN
  SELECT level INTO old_level FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles 
  SET 
    xp = xp + p_amount,
    level = calculate_level(xp + p_amount),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, level INTO updated_xp, updated_level;
  
  INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id);
  
  RETURN QUERY SELECT updated_xp, updated_level, (updated_level > old_level);
END;
$$;


ALTER FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_reference_type" "text", "p_reference_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can ban users'; END IF;
  IF p_user_id = p_admin_id THEN RAISE EXCEPTION 'Cannot ban yourself'; END IF;
  UPDATE profiles SET status = 'banned', banned_at = now(), banned_reason = p_reason, banned_by = p_admin_id WHERE id = p_user_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'ban_user', 'user', p_user_id, jsonb_build_object('reason', p_reason));
END;
$$;


ALTER FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_catch RECORD;
  v_session RECORD;
  v_score INTEGER := 0;
  v_details JSONB := '{"signals": [], "penalties": []}';
  v_level TEXT;
  v_distance_m FLOAT;
  v_time_diff_hours FLOAT;
  v_photo_time_diff_hours FLOAT;
BEGIN
  -- Get catch data
  SELECT * INTO v_catch FROM catches WHERE id = p_catch_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Catch not found');
  END IF;
  
  -- Backlog catches are automatically unverified (no XP)
  IF v_catch.is_backlog = TRUE THEN
    UPDATE catches SET 
      verification_score = 0,
      verification_level = 'unverified',
      verification_details = jsonb_build_object(
        'signals', ARRAY['backlog_catch'],
        'penalties', ARRAY[]::TEXT[],
        'reason', 'Backlog catches are not eligible for verification'
      ),
      verified_at = NOW()
    WHERE id = p_catch_id;
    
    RETURN jsonb_build_object(
      'score', 0,
      'level', 'unverified',
      'reason', 'Backlog catch'
    );
  END IF;
  
  -- Get session data if exists
  IF v_catch.session_id IS NOT NULL THEN
    SELECT * INTO v_session FROM sessions WHERE id = v_catch.session_id;
  END IF;
  
  -- ==================
  -- POSITIVE SIGNALS
  -- ==================
  
  -- Has photo (+15)
  IF v_catch.photo_url IS NOT NULL THEN
    v_score := v_score + 15;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["has_photo:15"]'::jsonb);
  END IF;
  
  -- Photo has EXIF GPS (+20)
  IF v_catch.photo_exif_latitude IS NOT NULL AND v_catch.photo_exif_longitude IS NOT NULL THEN
    v_score := v_score + 20;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["exif_gps:20"]'::jsonb);
    
    -- Check GPS proximity to catch location
    IF v_catch.latitude IS NOT NULL AND v_catch.longitude IS NOT NULL THEN
      -- Calculate distance using Haversine approximation
      v_distance_m := ST_DistanceSphere(
        ST_MakePoint(v_catch.longitude, v_catch.latitude),
        ST_MakePoint(v_catch.photo_exif_longitude, v_catch.photo_exif_latitude)
      );
      
      IF v_distance_m <= 100 THEN
        v_score := v_score + 25; -- Within 100m: +15 base + 10 bonus
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["gps_match_100m:25"]'::jsonb);
      ELSIF v_distance_m <= 500 THEN
        v_score := v_score + 15;
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["gps_match_500m:15"]'::jsonb);
      ELSIF v_distance_m > 5000 THEN
        v_score := v_score - 20; -- Penalty: GPS too far
        v_details := jsonb_set(v_details, '{penalties}', 
          (v_details->'penalties') || '["gps_too_far:-20"]'::jsonb);
      END IF;
    END IF;
  END IF;
  
  -- Photo has EXIF timestamp (+15)
  IF v_catch.photo_exif_timestamp IS NOT NULL THEN
    v_score := v_score + 15;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["exif_timestamp:15"]'::jsonb);
    
    -- Check timestamp proximity
    v_photo_time_diff_hours := EXTRACT(EPOCH FROM (v_catch.caught_at - v_catch.photo_exif_timestamp)) / 3600.0;
    v_photo_time_diff_hours := ABS(v_photo_time_diff_hours);
    
    IF v_photo_time_diff_hours <= 0.25 THEN -- Within 15 mins
      v_score := v_score + 15; -- +10 base + 5 bonus
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["time_match_15min:15"]'::jsonb);
    ELSIF v_photo_time_diff_hours <= 1 THEN -- Within 1 hour
      v_score := v_score + 10;
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["time_match_1hr:10"]'::jsonb);
    ELSIF v_photo_time_diff_hours > 24 THEN -- More than 24 hours
      v_score := v_score - 15;
      v_details := jsonb_set(v_details, '{penalties}', 
        (v_details->'penalties') || '["time_too_far:-15"]'::jsonb);
    END IF;
  END IF;
  
  -- Logged during active session (+10)
  IF v_session.id IS NOT NULL THEN
    IF v_catch.caught_at >= v_session.started_at AND 
       (v_session.ended_at IS NULL OR v_catch.caught_at <= v_session.ended_at) THEN
      v_score := v_score + 10;
      v_details := jsonb_set(v_details, '{signals}', 
        (v_details->'signals') || '["in_session:10"]'::jsonb);
    END IF;
    
    -- Catch location near session location (+10)
    IF v_catch.latitude IS NOT NULL AND v_session.latitude IS NOT NULL THEN
      v_distance_m := ST_DistanceSphere(
        ST_MakePoint(v_catch.longitude, v_catch.latitude),
        ST_MakePoint(v_session.longitude, v_session.latitude)
      );
      
      IF v_distance_m <= 1000 THEN
        v_score := v_score + 10;
        v_details := jsonb_set(v_details, '{signals}', 
          (v_details->'signals') || '["near_session:10"]'::jsonb);
      END IF;
    END IF;
  END IF;
  
  -- AI species match (+10)
  IF v_catch.ai_species_match = TRUE THEN
    v_score := v_score + 10;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["ai_species_match:10"]'::jsonb);
  END IF;
  
  -- Has camera info (not screenshot) (+5)
  IF v_catch.photo_camera_make IS NOT NULL OR v_catch.photo_camera_model IS NOT NULL THEN
    v_score := v_score + 5;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["camera_info:5"]'::jsonb);
  END IF;
  
  -- Weather data present (+5)
  IF v_catch.weather_temp IS NOT NULL AND v_catch.weather_condition IS NOT NULL THEN
    v_score := v_score + 5;
    v_details := jsonb_set(v_details, '{signals}', 
      (v_details->'signals') || '["weather_data:5"]'::jsonb);
  END IF;
  
  -- ==================
  -- DUPLICATE CHECK
  -- ==================
  IF v_catch.photo_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM catches 
      WHERE photo_hash = v_catch.photo_hash 
      AND id != p_catch_id
      AND user_id != v_catch.user_id
    ) THEN
      v_score := v_score - 30;
      v_details := jsonb_set(v_details, '{penalties}', 
        (v_details->'penalties') || '["duplicate_photo:-30"]'::jsonb);
    END IF;
  END IF;
  
  -- ==================
  -- DETERMINE LEVEL
  -- ==================
  v_score := GREATEST(0, v_score); -- Don't go below 0
  
  IF v_score >= 85 THEN
    v_level := 'platinum';
  ELSIF v_score >= 70 THEN
    v_level := 'gold';
  ELSIF v_score >= 50 THEN
    v_level := 'silver';
  ELSIF v_score >= 30 THEN
    v_level := 'bronze';
  ELSE
    v_level := 'unverified';
  END IF;
  
  -- Update catch record
  UPDATE catches SET 
    verification_score = v_score,
    verification_level = v_level,
    verification_details = v_details,
    verified_at = NOW()
  WHERE id = p_catch_id;
  
  RETURN jsonb_build_object(
    'score', v_score,
    'level', v_level,
    'details', v_details
  );
END;
$$;


ALTER FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") IS 'Calculate verification score and level for a catch based on photo metadata, location, timing, and AI confirmation';



CREATE OR REPLACE FUNCTION "public"."calculate_competition_score"("p_competition_id" "uuid", "p_session_id" "uuid") RETURNS numeric
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_competition_type text;
  v_score decimal := 0;
begin
  -- Get competition type
  select type into v_competition_type
  from competitions
  where id = p_competition_id;

  -- Calculate score based on type
  case v_competition_type
    when 'heaviest_fish' then
      -- Heaviest catch in session
      select coalesce(max(weight_kg), 0)
      into v_score
      from catches
      where session_id = p_session_id;

    when 'most_catches' then
      -- Number of catches
      select coalesce(count(*), 0)::decimal
      into v_score
      from catches
      where session_id = p_session_id;

    when 'species_diversity' then
      -- Unique species count
      select coalesce(count(distinct species), 0)::decimal
      into v_score
      from catches
      where session_id = p_session_id;

    when 'photo_contest' then
      -- Placeholder: use like_count from related posts
      select coalesce(max(like_count), 0)::decimal
      into v_score
      from posts
      where session_id = p_session_id;

    else
      v_score := 0;
  end case;

  return v_score;
end;
$$;


ALTER FUNCTION "public"."calculate_competition_score"("p_competition_id" "uuid", "p_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_level"("total_xp" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  lvl integer := 1;
  xp_needed integer := 0;
BEGIN
  WHILE total_xp >= xp_needed LOOP
    lvl := lvl + 1;
    xp_needed := xp_needed + (lvl * 50);
  END LOOP;
  RETURN lvl - 1;
END;
$$;


ALTER FUNCTION "public"."calculate_level"("total_xp" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_view_user_posts"("viewer_id" "uuid", "author_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Author can always see their own posts
  IF viewer_id = author_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if author has a private account
  IF EXISTS (SELECT 1 FROM profiles WHERE id = author_id AND is_private = true) THEN
    -- Private account: check if viewer follows author
    RETURN EXISTS (
      SELECT 1 FROM follows 
      WHERE follower_id = viewer_id 
      AND following_id = author_id
    );
  END IF;
  
  -- Public account: anyone can view
  RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."can_view_user_posts"("viewer_id" "uuid", "author_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_typing_indicators"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  DELETE FROM typing_indicators WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$;


ALTER FUNCTION "public"."cleanup_typing_indicators"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_competition_session"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  new_session_id uuid;
BEGIN
  -- Create a session for this competition
  INSERT INTO sessions (
    user_id,
    title,
    location_name,
    latitude,
    longitude,
    water_type,
    started_at,
    ended_at,
    is_active,
    competition_id
  ) VALUES (
    NEW.created_by,
    NEW.title,
    COALESCE(NEW.location_name, 'Competition Location'),
    NEW.location_lat,
    NEW.location_lng,
    NEW.water_type,
    NEW.starts_at,
    NEW.ends_at,
    CASE WHEN NEW.status = 'active' THEN true ELSE false END,
    NEW.id
  )
  RETURNING id INTO new_session_id;

  -- Update the competition with the session_id
  NEW.session_id := new_session_id;

  -- Add the creator as owner participant of the session
  INSERT INTO session_participants (
    session_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    new_session_id,
    NEW.created_by,
    'owner',
    'active',
    NOW()
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."create_competition_session"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text" DEFAULT NULL::"text", "p_related_user_id" "uuid" DEFAULT NULL::"uuid", "p_related_competition_id" "uuid" DEFAULT NULL::"uuid", "p_related_session_id" "uuid" DEFAULT NULL::"uuid", "p_related_catch_id" "uuid" DEFAULT NULL::"uuid", "p_related_post_id" "uuid" DEFAULT NULL::"uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_related_user_id" "uuid", "p_related_competition_id" "uuid", "p_related_session_id" "uuid", "p_related_catch_id" "uuid", "p_related_post_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_related_user_id" "uuid", "p_related_competition_id" "uuid", "p_related_session_id" "uuid", "p_related_catch_id" "uuid", "p_related_post_id" "uuid") IS 'Search path secured to public, pg_catalog';



CREATE OR REPLACE FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_winner_id uuid;
  v_is_organizer boolean;
begin
  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = p_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can declare winners';
  end if;

  -- Verify winner is a participant
  if not exists(
    select 1 from competitions c
    join session_participants sp on sp.session_id = c.session_id
    where c.id = p_competition_id and sp.user_id = p_winner_user_id
  ) then
    raise exception 'Winner must be a competition participant';
  end if;

  -- Insert winner (upsert in case of re-declaration)
  insert into competition_winners (
    competition_id, 
    user_id, 
    category, 
    catch_id, 
    notes, 
    declared_by
  ) values (
    p_competition_id, 
    p_winner_user_id, 
    p_category, 
    p_catch_id, 
    p_notes, 
    p_organizer_id
  )
  on conflict (competition_id, user_id, category) 
  do update set
    catch_id = excluded.catch_id,
    notes = excluded.notes,
    declared_at = now(),
    declared_by = excluded.declared_by
  returning id into v_winner_id;

  return v_winner_id;
end;
$$;


ALTER FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid", "p_notes" "text") IS 'Allows organizer to declare a winner in a specific category';



CREATE OR REPLACE FUNCTION "public"."generate_partner_code"("base_name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  code TEXT;
  counter INT := 0;
BEGIN
  -- Clean base name: uppercase, remove spaces, take first 6 chars
  code := UPPER(REGEXP_REPLACE(base_name, '[^A-Za-z0-9]', '', 'g'));
  code := SUBSTRING(code FROM 1 FOR 6);
  
  -- Add year
  code := code || TO_CHAR(NOW(), 'YY');
  
  -- Check if exists, add counter if needed
  WHILE EXISTS (SELECT 1 FROM sales_partners WHERE partner_code = code) LOOP
    counter := counter + 1;
    code := SUBSTRING(code FROM 1 FOR 6) || TO_CHAR(NOW(), 'YY') || counter::TEXT;
  END LOOP;
  
  RETURN code;
END;
$$;


ALTER FUNCTION "public"."generate_partner_code"("base_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "catches_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  WITH base AS (
    SELECT
      c.user_id,
      COALESCE(sp.water_type, s.water_type) AS raw_water_type
    FROM catches c
    LEFT JOIN sessions s ON s.id = c.session_id
    LEFT JOIN session_participants sp
      ON sp.session_id = c.session_id
      AND sp.user_id = c.user_id
    WHERE COALESCE(c.is_backlog, false) = false
  ),
  typed AS (
    SELECT
      user_id,
      CASE
        WHEN raw_water_type IS NULL THEN NULL
        WHEN lower(raw_water_type) IN ('saltwater', 'sea/coastal') THEN 'saltwater'
        WHEN lower(raw_water_type) LIKE '%sea%' OR lower(raw_water_type) LIKE '%coast%' THEN 'saltwater'
        WHEN lower(raw_water_type) IN ('freshwater', 'lake/reservoir', 'river', 'canal', 'pond') THEN 'freshwater'
        WHEN lower(raw_water_type) LIKE '%lake%' OR lower(raw_water_type) LIKE '%reservoir%' THEN 'freshwater'
        WHEN lower(raw_water_type) LIKE '%river%' OR lower(raw_water_type) LIKE '%canal%' OR lower(raw_water_type) LIKE '%pond%' THEN 'freshwater'
        ELSE NULL
      END AS water_bucket
    FROM base
  )
  SELECT
    user_id,
    COUNT(*)::int AS catches_count
  FROM typed
  WHERE user_id IS NOT NULL
    AND (
      p_water = 'all'
      OR (p_water = 'saltwater' AND water_bucket = 'saltwater')
      OR (p_water = 'freshwater' AND water_bucket = 'freshwater')
    )
  GROUP BY user_id
  ORDER BY catches_count DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_api_usage_summary"("days_back" integer DEFAULT 30) RETURNS TABLE("api_name" "text", "total_calls" bigint, "calls_today" bigint, "calls_this_week" bigint, "calls_this_month" bigint)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    u.api_name,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE) as calls_today,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days') as calls_this_week,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days') as calls_this_month
  FROM api_usage u
  WHERE u.created_at >= CURRENT_DATE - (days_back || ' days')::interval
  GROUP BY u.api_name
  ORDER BY total_calls DESC;
$$;


ALTER FUNCTION "public"."get_api_usage_summary"("days_back" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_app_setting"("p_key" "text", "p_default" "jsonb" DEFAULT NULL::"jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM app_settings WHERE key = p_key;
  RETURN COALESCE(v_value, p_default);
END;
$$;


ALTER FUNCTION "public"."get_app_setting"("p_key" "text", "p_default" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") RETURNS TABLE("rank" bigint, "user_id" "uuid", "username" "text", "full_name" "text", "avatar_url" "text", "score" numeric, "catch_count" bigint, "best_catch_id" "uuid", "best_species" "text", "best_weight" numeric, "best_length" numeric, "best_photo" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_session_id uuid;
  v_type text;
  v_allowed_species text[];
begin
  -- Get competition details
  select c.session_id, c.type, c.allowed_species
  into v_session_id, v_type, v_allowed_species
  from competitions c
  where c.id = p_competition_id;

  if not found then
    raise exception 'Competition not found';
  end if;

  if v_session_id is null then
    raise exception 'Competition has no linked session';
  end if;

  -- Type: heaviest_fish
  if v_type = 'heaviest_fish' then
    return query
    select
      row_number() over (order by max(c.weight_kg) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      max(c.weight_kg) as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.weight_kg desc))[1] as best_catch_id,
      (array_agg(c.species order by c.weight_kg desc))[1] as best_species,
      max(c.weight_kg) as best_weight,
      (array_agg(c.length_cm order by c.weight_kg desc))[1] as best_length,
      (array_agg(c.photo_url order by c.weight_kg desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL: Only approved catches
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    having max(c.weight_kg) is not null
    order by score desc;

  -- Type: most_catches
  elsif v_type = 'most_catches' then
    return query
    select
      row_number() over (order by count(c.id) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      count(c.id)::numeric as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.created_at desc))[1] as best_catch_id,
      (array_agg(c.species order by c.created_at desc))[1] as best_species,
      (array_agg(c.weight_kg order by c.created_at desc))[1] as best_weight,
      (array_agg(c.length_cm order by c.created_at desc))[1] as best_length,
      (array_agg(c.photo_url order by c.created_at desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    order by score desc;

  -- Type: species_diversity
  elsif v_type = 'species_diversity' then
    return query
    select
      row_number() over (order by count(distinct c.species) desc) as rank,
      p.id as user_id,
      p.username,
      p.full_name,
      p.avatar_url,
      count(distinct c.species)::numeric as score,
      count(c.id) as catch_count,
      (array_agg(c.id order by c.created_at desc))[1] as best_catch_id,
      (array_agg(c.species order by c.created_at desc))[1] as best_species,
      (array_agg(c.weight_kg order by c.created_at desc))[1] as best_weight,
      (array_agg(c.length_cm order by c.created_at desc))[1] as best_length,
      (array_agg(c.photo_url order by c.created_at desc))[1] as best_photo
    from catches c
    join profiles p on p.id = c.user_id
    where c.session_id = v_session_id
      and c.validation_status = 'approved' -- CRITICAL
      and (v_allowed_species is null or c.species = any(v_allowed_species))
    group by p.id, p.username, p.full_name, p.avatar_url
    order by score desc;

  else
    raise exception 'Unknown competition type: %', v_type;
  end if;
end;
$$;


ALTER FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") IS 'Returns competition leaderboard with only approved catches counted';



CREATE OR REPLACE FUNCTION "public"."get_or_create_zone"("lat" double precision, "lng" double precision) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  zone_uuid uuid;
  g_lat integer := FLOOR(lat * 100)::integer;
  g_lng integer := FLOOR(lng * 100)::integer;
  c_lat double precision := (FLOOR(lat * 100) + 0.5) / 100;
  c_lng double precision := (FLOOR(lng * 100) + 0.5) / 100;
BEGIN
  SELECT id INTO zone_uuid FROM fishing_zones WHERE grid_lat = g_lat AND grid_lng = g_lng;
  
  IF zone_uuid IS NULL THEN
    INSERT INTO fishing_zones (grid_lat, grid_lng, center_lat, center_lng)
    VALUES (g_lat, g_lng, c_lat, c_lng)
    ON CONFLICT (grid_lat, grid_lng) DO NOTHING
    RETURNING id INTO zone_uuid;
    
    IF zone_uuid IS NULL THEN
      SELECT id INTO zone_uuid FROM fishing_zones WHERE grid_lat = g_lat AND grid_lng = g_lng;
    END IF;
  END IF;
  
  RETURN zone_uuid;
END;
$$;


ALTER FUNCTION "public"."get_or_create_zone"("lat" double precision, "lng" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer DEFAULT 50, "p_days" integer DEFAULT 30) RETURNS TABLE("total_catches" bigint, "catches_this_week" bigint, "unique_anglers" bigint, "avg_weight" numeric, "best_zone_id" "uuid", "best_zone_lat" double precision, "best_zone_lng" double precision, "best_zone_catches" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN QUERY
  WITH nearby_catches AS (
    SELECT 
      c.id,
      c.weight_lb,
      c.zone_id,
      c.caught_at,
      fz.center_lat,
      fz.center_lng
    FROM catches c
    LEFT JOIN fishing_zones fz ON c.zone_id = fz.id
    WHERE LOWER(c.species) = LOWER(p_species)
      AND c.caught_at > NOW() - (p_days || ' days')::interval
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      -- Rough bounding box filter (faster than distance calc)
      AND c.latitude BETWEEN p_lat - (p_radius_km / 111.0) AND p_lat + (p_radius_km / 111.0)
      AND c.longitude BETWEEN p_lng - (p_radius_km / 85.0) AND p_lng + (p_radius_km / 85.0)
  ),
  zone_stats AS (
    SELECT 
      zone_id,
      center_lat,
      center_lng,
      COUNT(*) as zone_catches
    FROM nearby_catches
    WHERE zone_id IS NOT NULL
    GROUP BY zone_id, center_lat, center_lng
    ORDER BY zone_catches DESC
    LIMIT 1
  )
  SELECT 
    COUNT(*)::bigint as total_catches,
    COUNT(*) FILTER (WHERE nc.caught_at > NOW() - interval '7 days')::bigint as catches_this_week,
    COUNT(DISTINCT c.user_id)::bigint as unique_anglers,
    ROUND(AVG(nc.weight_lb)::numeric, 2) as avg_weight,
    zs.zone_id as best_zone_id,
    zs.center_lat as best_zone_lat,
    zs.center_lng as best_zone_lng,
    zs.zone_catches as best_zone_catches
  FROM nearby_catches nc
  JOIN catches c ON nc.id = c.id
  LEFT JOIN zone_stats zs ON true;
END;
$$;


ALTER FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer, "p_days" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer, "p_days" integer) IS 'Get catch activity for a species near a location - powers "Hunt the Fish" feature';



CREATE OR REPLACE FUNCTION "public"."get_species_xp"("p_species" "text") RETURNS integer
    LANGUAGE "plpgsql" STABLE
    AS $$
DECLARE
  v_base_xp INTEGER;
  v_tier_setting TEXT;
BEGIN
  -- Try to get from species_tiers table
  SELECT base_xp INTO v_base_xp FROM species_tiers WHERE species ILIKE p_species;
  
  IF v_base_xp IS NOT NULL THEN
    RETURN v_base_xp;
  END IF;
  
  -- Default to standard tier if species not found
  SELECT value::TEXT INTO v_tier_setting FROM app_settings WHERE key = 'xp_tier_standard';
  RETURN COALESCE(v_tier_setting::INTEGER, 10);
END;
$$;


ALTER FUNCTION "public"."get_species_xp"("p_species" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unread_notification_count"() RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  RETURN (
    SELECT count(*)
    FROM notifications
    WHERE user_id = auth.uid() AND is_read = false
  );
END;
$$;


ALTER FUNCTION "public"."get_unread_notification_count"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_unread_notification_count"() IS 'Returns count of unread notifications for current user';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."posts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "session_id" "uuid",
    "catch_id" "uuid",
    "caption" "text",
    "photo_url" "text",
    "location_privacy" "text",
    "is_public" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "post_must_reference_something" CHECK ((("session_id" IS NOT NULL) OR ("catch_id" IS NOT NULL) OR ("photo_url" IS NOT NULL))),
    CONSTRAINT "posts_location_privacy_check" CHECK (("location_privacy" = ANY (ARRAY['private'::"text", 'general'::"text", 'exact'::"text"]))),
    CONSTRAINT "posts_type_check" CHECK (("type" = ANY (ARRAY['session'::"text", 'catch'::"text", 'photo'::"text"])))
);


ALTER TABLE "public"."posts" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_feed"("for_user_id" "uuid", "page_limit" integer DEFAULT 20, "page_offset" integer DEFAULT 0) RETURNS SETOF "public"."posts"
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT p.*
  FROM posts p
  WHERE p.is_public = true
    AND (
      p.user_id = for_user_id
      OR p.user_id IN (
        SELECT f.following_id
        FROM follows f
        WHERE f.follower_id = for_user_id
      )
    )
  ORDER BY p.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
$$;


ALTER FUNCTION "public"."get_user_feed"("for_user_id" "uuid", "page_limit" integer, "page_offset" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_follow_counts"("for_user_id" "uuid") RETURNS TABLE("follower_count" bigint, "following_count" bigint)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT 
    (SELECT COUNT(*) FROM follows WHERE following_id = for_user_id) as follower_count,
    (SELECT COUNT(*) FROM follows WHERE follower_id = for_user_id) as following_count;
$$;


ALTER FUNCTION "public"."get_user_follow_counts"("for_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_verification_xp_multiplier"("p_level" "text") RETURNS numeric
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN CASE p_level
    WHEN 'platinum' THEN 1.00
    WHEN 'gold' THEN 1.00
    WHEN 'silver' THEN 1.00
    WHEN 'bronze' THEN 0.50
    WHEN 'unverified' THEN 0.00
    WHEN 'rejected' THEN 0.00
    WHEN 'pending' THEN 0.00
    ELSE 0.00
  END;
END;
$$;


ALTER FUNCTION "public"."get_verification_xp_multiplier"("p_level" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_week_start"("for_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "sql"
    AS $$
  SELECT for_date - EXTRACT(ISODOW FROM for_date)::integer + 1;
$$;


ALTER FUNCTION "public"."get_week_start"("for_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer DEFAULT 10) RETURNS TABLE("user_id" "uuid", "catches_count" integer)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  WITH base AS (
    SELECT
      c.user_id,
      c.created_at,
      COALESCE(sp.water_type, s.water_type) AS raw_water_type
    FROM catches c
    LEFT JOIN sessions s ON s.id = c.session_id
    LEFT JOIN session_participants sp
      ON sp.session_id = c.session_id
      AND sp.user_id = c.user_id
    WHERE c.created_at >= p_week_start
      AND c.created_at < p_week_start + INTERVAL '7 days'
      AND COALESCE(c.is_backlog, false) = false
  ),
  typed AS (
    SELECT
      user_id,
      CASE
        WHEN raw_water_type IS NULL THEN NULL
        WHEN lower(raw_water_type) IN ('saltwater', 'sea/coastal') THEN 'saltwater'
        WHEN lower(raw_water_type) LIKE '%sea%' OR lower(raw_water_type) LIKE '%coast%' THEN 'saltwater'
        WHEN lower(raw_water_type) IN ('freshwater', 'lake/reservoir', 'river', 'canal', 'pond') THEN 'freshwater'
        WHEN lower(raw_water_type) LIKE '%lake%' OR lower(raw_water_type) LIKE '%reservoir%' THEN 'freshwater'
        WHEN lower(raw_water_type) LIKE '%river%' OR lower(raw_water_type) LIKE '%canal%' OR lower(raw_water_type) LIKE '%pond%' THEN 'freshwater'
        ELSE NULL
      END AS water_bucket
    FROM base
  )
  SELECT
    user_id,
    COUNT(*)::int AS catches_count
  FROM typed
  WHERE user_id IS NOT NULL
    AND (
      p_water = 'all'
      OR (p_water = 'saltwater' AND water_bucket = 'saltwater')
      OR (p_water = 'freshwater' AND water_bucket = 'freshwater')
    )
  GROUP BY user_id
  ORDER BY catches_count DESC
  LIMIT p_limit;
$$;


ALTER FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer DEFAULT 20) RETURNS TABLE("type" "text", "id" "text", "title" "text", "subtitle" "text", "image_url" "text")
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  WITH input AS (
    SELECT NULLIF(trim(p_query), '') AS q
  ),
  results AS (
    -- Users (profiles) - fuzzy match on username and full_name
    SELECT
      'user' AS type,
      p.id::text AS id,
      COALESCE(p.full_name, p.username) AS title,
      '@' || p.username AS subtitle,
      p.avatar_url AS image_url,
      1 AS priority,
      GREATEST(
        similarity(COALESCE(p.username, ''), i.q),
        similarity(COALESCE(p.full_name, ''), i.q)
      ) AS relevance
    FROM profiles p
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        p.username % i.q
        OR p.full_name % i.q
        OR p.username ILIKE '%' || i.q || '%'
        OR p.full_name ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Lakes - fuzzy match on name
    SELECT
      'lake' AS type,
      l.id::text AS id,
      l.name AS title,
      COALESCE(l.region, l.address, 'Lake') AS subtitle,
      l.cover_image_url AS image_url,
      2 AS priority,
      similarity(l.name, i.q) AS relevance
    FROM lakes l
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        l.name % i.q
        OR l.name ILIKE '%' || i.q || '%'
        OR l.address ILIKE '%' || i.q || '%'
        OR l.region ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Businesses (non-charter) - fuzzy match on name
    SELECT
      'business' AS type,
      b.id::text AS id,
      b.name AS title,
      COALESCE(b.address, b.city, initcap(replace(b.type::text, '_', ' '))) AS subtitle,
      NULL AS image_url,
      3 AS priority,
      similarity(b.name, i.q) AS relevance
    FROM businesses b
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND b.type != 'charter'
      AND (b.status IS NULL OR b.status = 'approved')
      AND (
        b.name % i.q
        OR b.name ILIKE '%' || i.q || '%'
        OR b.address ILIKE '%' || i.q || '%'
        OR b.city ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Charters - fuzzy match on name
    SELECT
      'charter' AS type,
      b.id::text AS id,
      b.name AS title,
      COALESCE(b.address, b.city, 'Charter Boat') AS subtitle,
      NULL AS image_url,
      4 AS priority,
      similarity(b.name, i.q) AS relevance
    FROM businesses b
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND b.type = 'charter'
      AND (b.status IS NULL OR b.status = 'approved')
      AND (
        b.name % i.q
        OR b.name ILIKE '%' || i.q || '%'
        OR b.address ILIKE '%' || i.q || '%'
        OR b.city ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Public Marks
    SELECT
      'mark' AS type,
      m.id::text AS id,
      m.name AS title,
      initcap(m.water_type::text) || ' mark' AS subtitle,
      NULL AS image_url,
      5 AS priority,
      similarity(m.name, i.q) AS relevance
    FROM saved_marks m
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND m.privacy_level = 'public'
      AND (
        m.name % i.q
        OR m.name ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Species - fuzzy match on display_name
    SELECT
      'species' AS type,
      s.id::text AS id,
      s.display_name AS title,
      initcap(s.water_type::text) AS subtitle,
      NULL AS image_url,
      6 AS priority,
      similarity(s.display_name, i.q) AS relevance
    FROM species_info s
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        s.display_name % i.q
        OR s.name % i.q
        OR s.display_name ILIKE '%' || i.q || '%'
        OR s.name ILIKE '%' || i.q || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(s.common_names) cn
          WHERE cn ILIKE '%' || i.q || '%'
        )
      )

    UNION ALL

    -- Challenges - return SLUG instead of id for proper routing
    SELECT
      'challenge' AS type,
      c.slug AS id,  -- Use slug, not id!
      c.title AS title,
      c.category AS subtitle,
      c.icon AS image_url,
      7 AS priority,
      similarity(c.title, i.q) AS relevance
    FROM challenges c
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        c.title % i.q
        OR c.title ILIKE '%' || i.q || '%'
      )
  )
  SELECT r.type, r.id, r.title, r.subtitle, r.image_url
  FROM results r
  ORDER BY r.priority, r.relevance DESC, r.title
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;


ALTER FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_block"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Remove any follow relationship in both directions
  DELETE FROM follows WHERE follower_id = NEW.blocker_id AND following_id = NEW.blocked_id;
  DELETE FROM follows WHERE follower_id = NEW.blocked_id AND following_id = NEW.blocker_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_block"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', NULL),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_user_confirmed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  -- Only run if email_confirmed_at changed from NULL to a value
  IF OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL THEN
    INSERT INTO public.profiles (id, username, email)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'username', NULL),
      NEW.email
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_user_confirmed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"("user_id" "uuid" DEFAULT "auth"."uid"()) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id AND role IN ('admin', 'owner'));
END;
$$;


ALTER FUNCTION "public"."is_admin"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_lake_premium"("lake_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lakes 
    WHERE id = lake_id 
    AND is_premium = true 
    AND (premium_expires_at IS NULL OR premium_expires_at > now())
  );
END;
$$;


ALTER FUNCTION "public"."is_lake_premium"("lake_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_near_lake"("lat" double precision, "lng" double precision, "radius_km" double precision DEFAULT 0.5) RETURNS "uuid"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  found_lake_id uuid;
BEGIN
  -- Find the closest lake within radius using Haversine approximation
  -- At UK latitudes, 1 degree lat ≈ 111km, 1 degree lng ≈ 70km
  SELECT id INTO found_lake_id
  FROM lakes
  WHERE 
    latitude IS NOT NULL AND longitude IS NOT NULL
    AND ABS(latitude - lat) < (radius_km / 111.0)
    AND ABS(longitude - lng) < (radius_km / 70.0)
    AND (
      -- Haversine distance approximation
      6371 * 2 * ASIN(SQRT(
        POWER(SIN(RADIANS(lat - latitude) / 2), 2) +
        COS(RADIANS(latitude)) * COS(RADIANS(lat)) *
        POWER(SIN(RADIANS(lng - longitude) / 2), 2)
      )) < radius_km
    )
  ORDER BY 
    POWER(latitude - lat, 2) + POWER(longitude - lng, 2)
  LIMIT 1;
  
  RETURN found_lake_id;
END;
$$;


ALTER FUNCTION "public"."is_near_lake"("lat" double precision, "lng" double precision, "radius_km" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_session_owner"("p_session_id" "uuid", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id AND user_id = p_user_id
  );
$$;


ALTER FUNCTION "public"."is_session_owner"("p_session_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_all_notifications_read"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$;


ALTER FUNCTION "public"."mark_all_notifications_read"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_all_notifications_read"() IS 'Marks all user notifications as read';



CREATE OR REPLACE FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  UPDATE notifications
  SET is_read = true
  WHERE id = p_notification_id AND user_id = auth.uid();
END;
$$;


ALTER FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") IS 'Marks a specific notification as read';



CREATE OR REPLACE FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
BEGIN
  INSERT INTO session_views (session_id, user_id)
  VALUES (p_session_id, auth.uid())
  ON CONFLICT (session_id, user_id) DO NOTHING;
END;
$$;


ALTER FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") IS 'Marks a session as viewed by the current user';



CREATE OR REPLACE FUNCTION "public"."notify_competition_invite"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_competition_invite"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_competition_pending_catch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."notify_competition_pending_catch"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_competition_pending_catch"() IS 'Notifies competition organizer when catch needs approval';



CREATE OR REPLACE FUNCTION "public"."notify_on_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  sender_username TEXT;
  recipient_id UUID;
BEGIN
  -- Get the sender's username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Get the other participant (recipient)
  SELECT user_id INTO recipient_id
  FROM conversation_participants
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id
  LIMIT 1;

  -- Only notify if we found a recipient
  IF recipient_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      action_url,
      related_user_id
    ) VALUES (
      recipient_id,
      'message',
      'New message',
      COALESCE(sender_username, 'Someone') || ': ' || LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
      '/messages/' || NEW.conversation_id,
      NEW.sender_id
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_on_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_post_comment"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."notify_post_comment"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_post_comment"() IS 'Notifies post author when someone comments on their post';



CREATE OR REPLACE FUNCTION "public"."notify_post_like"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."notify_post_like"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_post_like"() IS 'Notifies post author when someone likes their post';



CREATE OR REPLACE FUNCTION "public"."notify_session_catch"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."notify_session_catch"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."notify_session_catch"() IS 'Notifies session participants when someone logs a catch';



CREATE OR REPLACE FUNCTION "public"."notify_session_join_request"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
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
$$;


ALTER FUNCTION "public"."notify_session_join_request"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_business"("p_business_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can reject businesses'; END IF;
  UPDATE businesses SET status = 'rejected', rejection_reason = p_reason WHERE id = p_business_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'reject_business', 'business', p_business_id, jsonb_build_object('reason', p_reason));
END;
$$;


ALTER FUNCTION "public"."reject_business"("p_business_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reject_catch"("p_catch_id" "uuid", "p_rejection_reason" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
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


ALTER FUNCTION "public"."reject_catch"("p_catch_id" "uuid", "p_rejection_reason" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_competition_id uuid;
  v_is_organizer boolean;
begin
  -- Get competition_id from winner
  select competition_id into v_competition_id
  from competition_winners
  where id = p_winner_id;

  if not found then
    raise exception 'Winner declaration not found';
  end if;

  -- Verify caller is organizer
  select exists(
    select 1 from competitions 
    where id = v_competition_id and created_by = p_organizer_id
  ) into v_is_organizer;

  if not v_is_organizer then
    raise exception 'Only competition organizer can remove winners';
  end if;

  -- Delete winner
  delete from competition_winners where id = p_winner_id;
end;
$$;


ALTER FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") IS 'Allows organizer to remove a winner declaration';



CREATE OR REPLACE FUNCTION "public"."reset_weekly_streak_freezes"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Reset freezes on Monday
  IF NEW.last_activity_date IS NOT NULL AND 
     (NEW.week_start_for_freeze IS NULL OR 
      NEW.week_start_for_freeze < date_trunc('week', CURRENT_DATE)) THEN
    NEW.streak_freezes_available := 1;
    NEW.streak_freezes_used_this_week := 0;
    NEW.week_start_for_freeze := date_trunc('week', CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reset_weekly_streak_freezes"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."restore_account"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE profiles 
  SET 
    deleted_at = NULL,
    deletion_scheduled_for = NULL,
    status = 'active'
  WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."restore_account"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text" DEFAULT NULL::"text") RETURNS TABLE("id" "uuid", "name" "text", "type" "text", "latitude" numeric, "longitude" numeric, "address" "text", "phone" "text", "website" "text", "distance_meters" numeric)
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT 
    b.id,
    b.name,
    b.type,
    b.latitude,
    b.longitude,
    b.address,
    b.phone,
    b.website,
    ST_Distance(
      ST_MakePoint(b.longitude, b.latitude)::geography,
      ST_MakePoint(center_lng, center_lat)::geography
    ) as distance_meters
  FROM businesses b
  WHERE ST_DWithin(
      ST_MakePoint(b.longitude, b.latitude)::geography,
      ST_MakePoint(center_lng, center_lat)::geography,
      radius_meters
    )
    AND (business_type IS NULL OR b.type = business_type)
  ORDER BY distance_meters ASC
  LIMIT 20;
$$;


ALTER FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text") IS 'Search path secured to public, pg_catalog';



CREATE OR REPLACE FUNCTION "public"."search_catches_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "limit_count" integer DEFAULT 50) RETURNS TABLE("id" "uuid", "species" "text", "weight_kg" numeric, "length_cm" numeric, "caught_at" timestamp with time zone, "distance_meters" numeric, "session_id" "uuid", "user_id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
  SELECT 
    c.id,
    c.species,
    c.weight_kg,
    c.length_cm,
    c.caught_at,
    ST_Distance(
      ST_MakePoint(c.longitude, c.latitude)::geography,
      ST_MakePoint(center_lng, center_lat)::geography
    ) as distance_meters,
    c.session_id,
    c.user_id
  FROM catches c
  JOIN sessions s ON c.session_id = s.id
  JOIN posts p ON p.session_id = s.id
  WHERE p.is_public = true
    AND c.latitude IS NOT NULL 
    AND c.longitude IS NOT NULL
    AND ST_DWithin(
      ST_MakePoint(c.longitude, c.latitude)::geography,
      ST_MakePoint(center_lng, center_lat)::geography,
      radius_meters
    )
  ORDER BY c.caught_at DESC
  LIMIT limit_count;
$$;


ALTER FUNCTION "public"."search_catches_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_business_featured"("p_business_id" "uuid", "p_admin_id" "uuid", "p_position" integer, "p_expires_at" timestamp with time zone) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can set featured status'; END IF;
  UPDATE businesses SET is_featured = true, featured_position = p_position, featured_expires_at = p_expires_at WHERE id = p_business_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'set_featured', 'business', p_business_id, jsonb_build_object('position', p_position, 'expires_at', p_expires_at));
END;
$$;


ALTER FUNCTION "public"."set_business_featured"("p_business_id" "uuid", "p_admin_id" "uuid", "p_position" integer, "p_expires_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_business_premium"("p_business_id" "uuid", "p_admin_id" "uuid", "p_expires_at" timestamp with time zone, "p_price_paid" numeric DEFAULT 0) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE v_subscription_id uuid;
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can set premium status'; END IF;
  UPDATE businesses SET is_premium = true, premium_expires_at = p_expires_at WHERE id = p_business_id;
  INSERT INTO premium_subscriptions (business_id, tier, price_paid, starts_at, expires_at, status, payment_method, created_by)
  VALUES (p_business_id, 'premium', p_price_paid, now(), p_expires_at, 'active', 'manual', p_admin_id)
  RETURNING id INTO v_subscription_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'set_premium', 'business', p_business_id, jsonb_build_object('expires_at', p_expires_at, 'price', p_price_paid));
  RETURN v_subscription_id;
END;
$$;


ALTER FUNCTION "public"."set_business_premium"("p_business_id" "uuid", "p_admin_id" "uuid", "p_expires_at" timestamp with time zone, "p_price_paid" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_lake_claimed_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- If claimed_by is being set (was null, now has value)
  IF OLD.claimed_by IS NULL AND NEW.claimed_by IS NOT NULL THEN
    NEW.claimed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_lake_claimed_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."soft_delete_account"("user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  -- Mark profile as deleted
  UPDATE profiles 
  SET 
    deleted_at = NOW(),
    deletion_scheduled_for = NOW() + INTERVAL '30 days',
    status = 'suspended'
  WHERE id = user_id;
  
  -- Remove all follows (both directions)
  DELETE FROM follows WHERE follower_id = user_id OR following_id = user_id;
  
  -- Hide all posts (set to private)
  UPDATE posts SET is_public = false WHERE user_id = user_id;
END;
$$;


ALTER FUNCTION "public"."soft_delete_account"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_zone_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' THEN
    IF NEW.zone_id IS NOT NULL THEN
      PERFORM update_zone_stats(NEW.zone_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.zone_id IS NOT NULL THEN
      PERFORM update_zone_stats(NEW.zone_id);
    END IF;
    -- Also update old zone if zone changed
    IF OLD.zone_id IS NOT NULL AND (OLD.zone_id != NEW.zone_id OR NEW.zone_id IS NULL) THEN
      PERFORM update_zone_stats(OLD.zone_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_update_zone_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_update_zone_stats_on_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF OLD.zone_id IS NOT NULL THEN
    PERFORM update_zone_stats(OLD.zone_id);
  END IF;
  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."trigger_update_zone_stats_on_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."unban_user"("p_user_id" "uuid", "p_admin_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NOT is_admin(p_admin_id) THEN RAISE EXCEPTION 'Only admins can unban users'; END IF;
  UPDATE profiles SET status = 'active', banned_at = NULL, banned_reason = NULL, banned_by = NULL WHERE id = p_user_id;
  INSERT INTO admin_activity_log (admin_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'unban_user', 'user', p_user_id, jsonb_build_object('unbanned_at', now()));
END;
$$;


ALTER FUNCTION "public"."unban_user"("p_user_id" "uuid", "p_admin_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_competition_leaderboard"("p_competition_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  with ranked_entries as (
    select 
      id,
      row_number() over (order by score desc nulls last, submitted_at asc) as new_rank
    from competition_entries
    where competition_id = p_competition_id
      and is_valid = true
  )
  update competition_entries ce
  set rank = re.new_rank
  from ranked_entries re
  where ce.id = re.id;
end;
$$;


ALTER FUNCTION "public"."update_competition_leaderboard"("p_competition_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_competition_status"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  -- upcoming → active
  update competitions
  set status = 'active'
  where status = 'upcoming'
    and starts_at <= now();

  -- active → ended
  update competitions
  set status = 'ended'
  where status = 'active'
    and ends_at <= now();
end;
$$;


ALTER FUNCTION "public"."update_competition_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_conversation_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE conversations SET updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_conversation_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lake_catch_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_lake_id UUID;
  v_old_lake_id UUID;
BEGIN
  -- Get lake_id from session for new catch
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT lake_id INTO v_lake_id
    FROM sessions
    WHERE id = NEW.session_id;
    
    IF v_lake_id IS NOT NULL THEN
      UPDATE lakes
      SET 
        total_catches = (
          SELECT COUNT(*) 
          FROM catches c
          JOIN sessions s ON s.id = c.session_id
          WHERE s.lake_id = v_lake_id
        ),
        updated_at = NOW()
      WHERE id = v_lake_id;
    END IF;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    SELECT lake_id INTO v_old_lake_id
    FROM sessions
    WHERE id = OLD.session_id;
    
    IF v_old_lake_id IS NOT NULL THEN
      UPDATE lakes
      SET 
        total_catches = (
          SELECT COUNT(*) 
          FROM catches c
          JOIN sessions s ON s.id = c.session_id
          WHERE s.lake_id = v_old_lake_id
        ),
        updated_at = NOW()
      WHERE id = v_old_lake_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lake_catch_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lake_reports_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lake_reports_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lake_session_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Update session count for the lake when a session is linked
  IF NEW.lake_id IS NOT NULL THEN
    UPDATE lakes 
    SET session_count = (
      SELECT COUNT(*) FROM sessions WHERE lake_id = NEW.lake_id
    )
    WHERE id = NEW.lake_id;
  END IF;
  
  -- If lake_id changed, update old lake too
  IF OLD IS NOT NULL AND OLD.lake_id IS NOT NULL AND OLD.lake_id != NEW.lake_id THEN
    UPDATE lakes 
    SET session_count = (
      SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
    )
    WHERE id = OLD.lake_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lake_session_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lake_session_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Handle INSERT or UPDATE with new lake_id
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.lake_id IS NOT NULL THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = NEW.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = NEW.lake_id
      ),
      updated_at = NOW()
    WHERE id = NEW.lake_id;
  END IF;
  
  -- Handle UPDATE where lake_id changed (decrement old lake)
  IF TG_OP = 'UPDATE' AND OLD.lake_id IS NOT NULL AND OLD.lake_id != NEW.lake_id THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      updated_at = NOW()
    WHERE id = OLD.lake_id;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.lake_id IS NOT NULL THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      updated_at = NOW()
    WHERE id = OLD.lake_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lake_session_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_lakes_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_lakes_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_partner_signup_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups + 1
    WHERE id = NEW.referred_by_partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.referred_by_partner_id IS NULL AND NEW.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups + 1
    WHERE id = NEW.referred_by_partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.referred_by_partner_id IS NOT NULL AND NEW.referred_by_partner_id IS NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups - 1
    WHERE id = OLD.referred_by_partner_id;
  ELSIF TG_OP = 'DELETE' AND OLD.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups - 1
    WHERE id = OLD.referred_by_partner_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_partner_signup_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_partner_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings + NEW.commission_amount
    WHERE id = NEW.partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings + NEW.commission_amount
    WHERE id = NEW.partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings - OLD.commission_amount
    WHERE id = NEW.partner_id;
  END IF;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_partner_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_saved_marks_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_saved_marks_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_theme_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_theme_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_streak"("p_user_id" "uuid") RETURNS TABLE("new_streak" integer, "streak_increased" boolean, "streak_lost" boolean, "longest_streak" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
  v_streak_increased BOOLEAN := FALSE;
  v_streak_lost BOOLEAN := FALSE;
BEGIN
  -- Get or create streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT us.last_activity_date, us.current_streak, us.longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- Calculate new streak
  IF v_last_date IS NULL THEN
    -- First activity ever
    v_current_streak := 1;
    v_streak_increased := TRUE;
  ELSIF v_last_date = v_today THEN
    -- Already logged today, no change
    NULL;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day, increase streak
    v_current_streak := v_current_streak + 1;
    v_streak_increased := TRUE;
  ELSE
    -- Streak broken (unless we use a freeze)
    -- Check if freeze available
    IF EXISTS (
      SELECT 1 FROM user_streaks 
      WHERE user_id = p_user_id 
      AND streak_freezes_available > 0
      AND v_last_date = v_today - INTERVAL '2 days'
    ) THEN
      -- Use freeze, continue streak
      UPDATE user_streaks 
      SET streak_freezes_available = streak_freezes_available - 1
      WHERE user_id = p_user_id;
      v_current_streak := v_current_streak + 1;
      v_streak_increased := TRUE;
    ELSE
      -- Streak lost
      v_streak_lost := v_current_streak > 0;
      v_current_streak := 1;
      v_streak_increased := TRUE;
    END IF;
  END IF;
  
  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Save changes
  UPDATE user_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Also update profile for quick access
  UPDATE profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT v_current_streak, v_streak_increased, v_streak_lost, v_longest_streak;
END;
$$;


ALTER FUNCTION "public"."update_user_streak"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_user_weekly_stats"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_week_start DATE;
  v_species_points INT;
BEGIN
  -- Get the Monday of the week for this catch
  v_week_start := date_trunc('week', COALESCE(NEW.caught_at, NOW()))::DATE;
  
  -- Get species points for this catch (from weekly_species_points table)
  SELECT COALESCE(points, 0) INTO v_species_points
  FROM weekly_species_points
  WHERE species = NEW.species
    AND week_start = v_week_start
  LIMIT 1;
  
  -- Upsert the user's weekly stats
  INSERT INTO user_weekly_stats (
    user_id,
    week_start,
    catches_count,
    fishing_days,
    species_points,
    xp_earned
  )
  VALUES (
    NEW.user_id,
    v_week_start,
    1,
    1, -- Will be recalculated below
    v_species_points,
    0  -- XP is tracked separately via award_xp function
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    catches_count = user_weekly_stats.catches_count + 1,
    species_points = user_weekly_stats.species_points + v_species_points,
    updated_at = NOW();
  
  -- Recalculate fishing_days (distinct days with sessions or catches this week)
  UPDATE user_weekly_stats
  SET fishing_days = (
    SELECT COUNT(DISTINCT DATE(caught_at))
    FROM catches
    WHERE user_id = NEW.user_id
      AND caught_at >= v_week_start
      AND caught_at < v_week_start + INTERVAL '7 days'
  )
  WHERE user_id = NEW.user_id
    AND week_start = v_week_start;
  
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_user_weekly_stats"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_user_weekly_stats"() IS 'Updates user_weekly_stats table when a catch is logged, calculating species points and fishing days';



CREATE OR REPLACE FUNCTION "public"."update_zone_stats"("target_zone_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  stats RECORD;
  species_json jsonb;
  top_sp text;
BEGIN
  SELECT 
    COUNT(DISTINCT c.id) as total_catches,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT c.user_id) as unique_anglers,
    MAX(c.caught_at) as last_activity
  INTO stats
  FROM catches c
  LEFT JOIN sessions s ON c.session_id = s.id
  WHERE c.zone_id = target_zone_id;
  
  SELECT jsonb_object_agg(species, cnt) INTO species_json
  FROM (
    SELECT species, COUNT(*) as cnt
    FROM catches
    WHERE zone_id = target_zone_id AND species IS NOT NULL
    GROUP BY species
    ORDER BY cnt DESC
    LIMIT 10
  ) sub;
  
  SELECT species INTO top_sp
  FROM catches
  WHERE zone_id = target_zone_id AND species IS NOT NULL
  GROUP BY species
  ORDER BY COUNT(*) DESC
  LIMIT 1;
  
  UPDATE fishing_zones SET
    total_catches = COALESCE(stats.total_catches, 0),
    total_sessions = COALESCE(stats.total_sessions, 0),
    unique_anglers = COALESCE(stats.unique_anglers, 0),
    species_counts = COALESCE(species_json, '{}'),
    top_species = top_sp,
    last_activity_at = stats.last_activity,
    updated_at = now()
  WHERE id = target_zone_id;
END;
$$;


ALTER FUNCTION "public"."update_zone_stats"("target_zone_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."user_lake_role"("p_lake_id" "uuid", "p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check if user is the owner
  IF EXISTS (SELECT 1 FROM lakes WHERE id = p_lake_id AND claimed_by = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  -- Check lake_team for manager/bailiff role
  SELECT role INTO v_role
  FROM lake_team
  WHERE lake_id = p_lake_id AND user_id = p_user_id;
  
  RETURN v_role; -- Returns NULL if no role found
END;
$$;


ALTER FUNCTION "public"."user_lake_role"("p_lake_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_competition_catch_time"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public', 'pg_catalog'
    AS $$
declare
  v_competition record;
begin
  -- Get competition details if this is a competition session
  select c.id, c.starts_at, c.ends_at, c.title
  into v_competition
  from competitions c
  join sessions s on s.competition_id = c.id
  where s.id = new.session_id;

  -- If not a competition, allow any time
  if not found then
    return new;
  end if;

  -- If time override is approved, allow it
  if new.time_override_approved then
    return new;
  end if;

  -- Validate timing
  if new.created_at < v_competition.starts_at then
    raise exception 'Cannot log catch before competition starts. Competition "%" starts at %', 
      v_competition.title, v_competition.starts_at;
  end if;

  if new.created_at > v_competition.ends_at then
    raise exception 'Cannot log catch after competition ends. Competition "%" ended at %', 
      v_competition.title, v_competition.ends_at;
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."validate_competition_catch_time"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."validate_competition_catch_time"() IS 'Enforces competition time boundaries - catches must be logged during competition period';



CREATE OR REPLACE FUNCTION "public"."xp_for_next_level"("current_level" integer) RETURNS integer
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  total_xp integer := 0;
  lvl integer := 1;
BEGIN
  WHILE lvl <= current_level LOOP
    lvl := lvl + 1;
    total_xp := total_xp + (lvl * 50);
  END LOOP;
  RETURN total_xp;
END;
$$;


ALTER FUNCTION "public"."xp_for_next_level"("current_level" integer) OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."achievement_shares" (
    "id" "uuid" NOT NULL,
    "user_id" "uuid",
    "challenge_id" "uuid",
    "platform" "text",
    "shared_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."achievement_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."admin_activity_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "admin_id" "uuid" NOT NULL,
    "action" "text" NOT NULL,
    "entity_type" "text",
    "entity_id" "uuid",
    "details" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."admin_activity_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."api_usage" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "api_name" "text" NOT NULL,
    "endpoint" "text",
    "user_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."api_usage" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."api_usage_daily" AS
 SELECT "api_name",
    "date_trunc"('day'::"text", "created_at") AS "date",
    "count"(*) AS "call_count"
   FROM "public"."api_usage"
  GROUP BY "api_name", ("date_trunc"('day'::"text", "created_at"))
  ORDER BY ("date_trunc"('day'::"text", "created_at")) DESC, "api_name";


ALTER VIEW "public"."api_usage_daily" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."app_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "description" "text",
    "category" "text" DEFAULT 'general'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."app_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."app_settings" IS 'Configurable application settings for XP, rules, and system toggles';



CREATE TABLE IF NOT EXISTS "public"."blocked_users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid" NOT NULL,
    "blocked_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."blocked_users" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."business_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "relationship" "text",
    "proof_notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid"
);


ALTER TABLE "public"."business_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "address" "text",
    "postcode" "text",
    "phone" "text",
    "email" "text",
    "website" "text",
    "description" "text",
    "hours" "jsonb",
    "verified" boolean DEFAULT false,
    "claimed_by_owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lng" numeric,
    "lat" numeric,
    "city" "text",
    "country" "text" DEFAULT 'GB'::"text",
    "facebook" "text",
    "instagram" "text",
    "opening_hours" "jsonb",
    "amenities" "text"[],
    "logo_url" "text",
    "cover_image_url" "text",
    "gallery_urls" "text"[],
    "is_premium" boolean DEFAULT false,
    "premium_expires_at" timestamp with time zone,
    "is_featured" boolean DEFAULT false,
    "featured_expires_at" timestamp with time zone,
    "featured_position" integer,
    "claimed_by" "uuid",
    "claimed_at" timestamp with time zone,
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "source" "text" DEFAULT 'osm'::"text",
    "osm_id" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "rejection_reason" "text",
    "created_by" "uuid",
    "owner_user_id" "uuid",
    "is_claimed" boolean DEFAULT false NOT NULL,
    "stripe_customer_id" "text",
    "stripe_subscription_id" "text",
    "referred_by_partner_id" "uuid",
    "partner_commission_rate" numeric(3,2),
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    CONSTRAINT "businesses_type_check" CHECK (("type" = ANY (ARRAY['tackle_shop'::"text", 'club'::"text", 'charter'::"text", 'bait_shop'::"text", 'boat_rental'::"text", 'guide'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


COMMENT ON COLUMN "public"."businesses"."is_hidden" IS 'Admin soft-hide: hides from Explore map without deleting';



CREATE TABLE IF NOT EXISTS "public"."catches" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "species" "text" NOT NULL,
    "weight_kg" numeric,
    "length_cm" numeric,
    "caught_at" timestamp with time zone NOT NULL,
    "location_name" "text",
    "latitude" numeric,
    "longitude" numeric,
    "bait" "text",
    "rig" "text",
    "fishing_style" "text",
    "photo_url" "text",
    "notes" "text",
    "weather_temp" numeric,
    "weather_condition" "text",
    "wind_speed" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    "released" boolean,
    "validation_status" "text" DEFAULT 'approved'::"text",
    "validated_by" "uuid",
    "validated_at" timestamp with time zone,
    "rejection_reason" "text",
    "time_override_approved" boolean DEFAULT false,
    "time_override_by" "uuid",
    "mark_id" "uuid",
    "zone_id" "uuid",
    "is_public" boolean DEFAULT true,
    "hide_exact_location" boolean DEFAULT false,
    "moon_phase" "text",
    "species_id" "text",
    "region" "text" DEFAULT 'uk_england'::"text",
    "returned" boolean DEFAULT false,
    "photo_exif_latitude" double precision,
    "photo_exif_longitude" double precision,
    "photo_exif_timestamp" timestamp with time zone,
    "photo_camera_make" "text",
    "photo_camera_model" "text",
    "country_code" "text",
    "multi_catch_group_id" "uuid",
    "peg_swim" "text",
    "fish_health_issue" boolean DEFAULT false,
    "fish_health_type" "text",
    "fish_health_notes" "text",
    "fish_health_photo_url" "text",
    "treatment_applied" boolean DEFAULT false,
    "treatment_notes" "text",
    "is_backlog" boolean DEFAULT false NOT NULL,
    "backlog_note" "text",
    "verification_score" integer DEFAULT 0,
    "verification_level" "text" DEFAULT 'pending'::"text",
    "verification_details" "jsonb" DEFAULT '{}'::"jsonb",
    "ai_species_match" boolean,
    "ai_confidence" numeric(3,2) DEFAULT NULL::numeric,
    "photo_hash" "text",
    "verified_at" timestamp with time zone,
    "verified_by" "uuid",
    "verification_override" "text",
    "competition_approved" boolean,
    "competition_approved_by" "uuid",
    "competition_approved_at" timestamp with time zone,
    "competition_rejection_reason" "text",
    CONSTRAINT "catches_fish_health_type_check" CHECK ((("fish_health_type" IS NULL) OR ("fish_health_type" = ANY (ARRAY['ulcer'::"text", 'fin_damage'::"text", 'parasite'::"text", 'fungus'::"text", 'mouth_damage'::"text", 'scale_loss'::"text", 'lesion'::"text", 'other'::"text"])))),
    CONSTRAINT "catches_validation_status_check" CHECK (("validation_status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"]))),
    CONSTRAINT "catches_verification_level_check" CHECK (("verification_level" = ANY (ARRAY['pending'::"text", 'unverified'::"text", 'bronze'::"text", 'silver'::"text", 'gold'::"text", 'platinum'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."catches" OWNER TO "postgres";


COMMENT ON COLUMN "public"."catches"."validation_status" IS 'pending = awaiting organizer approval, approved = counts on leaderboard, rejected = hidden';



COMMENT ON COLUMN "public"."catches"."validated_by" IS 'User ID of organizer who approved/rejected this catch';



COMMENT ON COLUMN "public"."catches"."rejection_reason" IS 'Reason provided by organizer when rejecting a catch';



COMMENT ON COLUMN "public"."catches"."time_override_approved" IS 'Whether organizer has approved a catch logged outside competition time';



COMMENT ON COLUMN "public"."catches"."mark_id" IS 'Optional link to a saved mark where the catch was made';



COMMENT ON COLUMN "public"."catches"."is_public" IS 'Whether this catch appears in the public feed. Default true.';



COMMENT ON COLUMN "public"."catches"."hide_exact_location" IS 'If true, only show general area (e.g. Cornwall) not exact coordinates.';



COMMENT ON COLUMN "public"."catches"."moon_phase" IS 'Moon phase at the time the catch was logged (e.g., Full Moon, Waxing Crescent)';



COMMENT ON COLUMN "public"."catches"."species_id" IS 'Species identifier from central species catalog';



COMMENT ON COLUMN "public"."catches"."region" IS 'Region code for legal size rules';



COMMENT ON COLUMN "public"."catches"."returned" IS 'Whether fish was returned (typically undersized)';



COMMENT ON COLUMN "public"."catches"."photo_exif_latitude" IS 'GPS latitude from photo EXIF data (for verification)';



COMMENT ON COLUMN "public"."catches"."photo_exif_longitude" IS 'GPS longitude from photo EXIF data (for verification)';



COMMENT ON COLUMN "public"."catches"."photo_exif_timestamp" IS 'Original photo timestamp from EXIF data (for verification)';



COMMENT ON COLUMN "public"."catches"."photo_camera_make" IS 'Camera manufacturer from EXIF (e.g. Apple, Samsung)';



COMMENT ON COLUMN "public"."catches"."photo_camera_model" IS 'Camera model from EXIF (e.g. iPhone 15 Pro)';



COMMENT ON COLUMN "public"."catches"."country_code" IS 'ISO 3166-1 alpha-2 country code derived from catch location';



COMMENT ON COLUMN "public"."catches"."multi_catch_group_id" IS 'Groups multiple fish caught on same cast (feathers, multi-hook rigs). NULL for single catches.';



COMMENT ON COLUMN "public"."catches"."peg_swim" IS 'Optional peg or swim number/name for lake sessions (e.g., "Peg 12", "Swim 3")';



COMMENT ON COLUMN "public"."catches"."fish_health_issue" IS 'Whether the fish has a visible health issue';



COMMENT ON COLUMN "public"."catches"."fish_health_type" IS 'Type of health issue: ulcer, fin_damage, parasite, fungus, mouth_damage, scale_loss, lesion, other';



COMMENT ON COLUMN "public"."catches"."fish_health_notes" IS 'Description of the health issue observed';



COMMENT ON COLUMN "public"."catches"."fish_health_photo_url" IS 'Photo URL showing the health issue';



COMMENT ON COLUMN "public"."catches"."treatment_applied" IS 'Whether treatment was applied to the fish';



COMMENT ON COLUMN "public"."catches"."treatment_notes" IS 'Description of treatment applied (e.g., antiseptic, returned to water)';



COMMENT ON COLUMN "public"."catches"."is_backlog" IS 'True for catches logged retroactively (before user joined). These do not earn XP/badges and are excluded from leaderboards.';



COMMENT ON COLUMN "public"."catches"."backlog_note" IS 'Optional note for backlog catches explaining when/where it was caught.';



CREATE TABLE IF NOT EXISTS "public"."challenge_catches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_challenge_id" "uuid" NOT NULL,
    "catch_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."challenge_catches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text" NOT NULL,
    "icon" "text" NOT NULL,
    "category" "text" NOT NULL,
    "difficulty" "text" DEFAULT 'medium'::"text",
    "criteria" "jsonb" NOT NULL,
    "xp_reward" integer DEFAULT 50,
    "sort_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "featured_until" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "water_type" "text" DEFAULT 'both'::"text",
    "countries" "text"[] DEFAULT ARRAY['UK'::"text"],
    "scope" "text" DEFAULT 'global'::"text" NOT NULL,
    "scope_value" "text",
    "scope_countries" "text"[],
    "starts_at" timestamp with time zone,
    "ends_at" timestamp with time zone,
    "rarity" "text" DEFAULT 'common'::"text",
    "share_image_template" "text",
    "unlock_sound" "text",
    CONSTRAINT "challenges_water_type_check" CHECK (("water_type" = ANY (ARRAY['saltwater'::"text", 'freshwater'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."challenges" IS 'Conservation challenges reward sustainable fishing practices';



COMMENT ON COLUMN "public"."challenges"."scope" IS 'Challenge scope: global (everyone), country (specific country), region (sub-country), event (special criteria)';



COMMENT ON COLUMN "public"."challenges"."scope_value" IS 'Value for scope filtering, e.g., country code GB or region name Essex';



COMMENT ON COLUMN "public"."challenges"."scope_countries" IS 'Array of country codes for multi-country challenges';



CREATE TABLE IF NOT EXISTS "public"."checkout_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_session_id" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "target_id" "uuid",
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone NOT NULL
);


ALTER TABLE "public"."checkout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "partner_id" "uuid",
    "business_id" "uuid",
    "subscription_amount" numeric(10,2) NOT NULL,
    "commission_amount" numeric(10,2) NOT NULL,
    "commission_rate" numeric(3,2) NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "paid_at" timestamp with time zone,
    "payment_reference" "text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "commission_transactions_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'paid'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."commission_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_awards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competition_id" "uuid",
    "category" "text" NOT NULL,
    "title" "text" NOT NULL,
    "prize" "text",
    "position" integer DEFAULT 1,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "target_species" "text"
);


ALTER TABLE "public"."competition_awards" OWNER TO "postgres";


COMMENT ON COLUMN "public"."competition_awards"."target_species" IS 'Optional species name this award targets. When set, only catches of this species count toward the award.';



CREATE TABLE IF NOT EXISTS "public"."competition_entries" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "session_id" "uuid" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "score" numeric(10,2),
    "rank" integer,
    "is_valid" boolean DEFAULT true,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."competition_entries" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."competition_invites" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "inviter_id" "uuid" NOT NULL,
    "invitee_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "responded_at" timestamp with time zone,
    CONSTRAINT "competition_invites_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'accepted'::"text", 'declined'::"text"])))
);


ALTER TABLE "public"."competition_invites" OWNER TO "postgres";


COMMENT ON TABLE "public"."competition_invites" IS 'Stores competition invitation requests';



CREATE TABLE IF NOT EXISTS "public"."competitions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_by" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "type" "text" NOT NULL,
    "allowed_species" "text"[],
    "water_type" "text",
    "location_restriction" "jsonb",
    "starts_at" timestamp with time zone NOT NULL,
    "ends_at" timestamp with time zone NOT NULL,
    "entry_fee" numeric(10,2) DEFAULT 0,
    "prize" "text",
    "max_participants" integer,
    "is_public" boolean DEFAULT true,
    "invite_only" boolean DEFAULT false,
    "status" "text" DEFAULT 'upcoming'::"text",
    "winner_id" "uuid",
    "cover_image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "session_id" "uuid",
    "original_ends_at" timestamp with time zone,
    "time_adjusted_count" integer DEFAULT 0,
    "last_adjusted_at" timestamp with time zone,
    "last_adjusted_by" "uuid",
    CONSTRAINT "competitions_check" CHECK (("ends_at" > "starts_at")),
    CONSTRAINT "competitions_description_check" CHECK (("char_length"("description") <= 500)),
    CONSTRAINT "competitions_entry_fee_check" CHECK (("entry_fee" >= (0)::numeric)),
    CONSTRAINT "competitions_max_participants_check" CHECK (("max_participants" > 0)),
    CONSTRAINT "competitions_status_check" CHECK (("status" = ANY (ARRAY['upcoming'::"text", 'active'::"text", 'ended'::"text", 'cancelled'::"text"]))),
    CONSTRAINT "competitions_title_check" CHECK ((("char_length"("title") > 0) AND ("char_length"("title") <= 100))),
    CONSTRAINT "competitions_type_check" CHECK (("type" = ANY (ARRAY['heaviest_fish'::"text", 'most_catches'::"text", 'species_diversity'::"text", 'photo_contest'::"text"]))),
    CONSTRAINT "competitions_water_type_check" CHECK (("water_type" = ANY (ARRAY['saltwater'::"text", 'freshwater'::"text", 'any'::"text"])))
);


ALTER TABLE "public"."competitions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."competitions"."original_ends_at" IS 'Original end time before any adjustments (null if never adjusted)';



COMMENT ON COLUMN "public"."competitions"."time_adjusted_count" IS 'Number of times organizer has adjusted the end time';



COMMENT ON COLUMN "public"."competitions"."last_adjusted_at" IS 'Timestamp of most recent time adjustment';



COMMENT ON COLUMN "public"."competitions"."last_adjusted_by" IS 'User ID of organizer who made the most recent time adjustment';



CREATE OR REPLACE VIEW "public"."competition_stats" WITH ("security_invoker"='true') AS
 SELECT "c"."id" AS "competition_id",
    "count"(DISTINCT "ce"."user_id") AS "participant_count",
    "count"(DISTINCT "ca"."id") AS "total_catches",
    COALESCE("sum"("ca"."weight_kg"), (0)::numeric) AS "total_weight"
   FROM (("public"."competitions" "c"
     LEFT JOIN "public"."competition_entries" "ce" ON (("c"."id" = "ce"."competition_id")))
     LEFT JOIN "public"."catches" "ca" ON (("ce"."session_id" = "ca"."session_id")))
  WHERE (("ca"."validation_status" = 'approved'::"text") OR ("ca"."validation_status" IS NULL))
  GROUP BY "c"."id";


ALTER VIEW "public"."competition_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."competition_stats" IS 'Aggregate statistics for competitions with SECURITY INVOKER';



CREATE TABLE IF NOT EXISTS "public"."competition_winners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "competition_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "category" "text" NOT NULL,
    "catch_id" "uuid",
    "notes" "text",
    "declared_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "declared_by" "uuid" NOT NULL
);


ALTER TABLE "public"."competition_winners" OWNER TO "postgres";


COMMENT ON TABLE "public"."competition_winners" IS 'Tracks multiple winners per competition (e.g., heaviest fish, most species, etc.)';



COMMENT ON COLUMN "public"."competition_winners"."category" IS 'Winner category - can be predefined (heaviest_fish, most_species) or custom';



COMMENT ON COLUMN "public"."competition_winners"."catch_id" IS 'Optional reference to the specific winning catch';



CREATE TABLE IF NOT EXISTS "public"."conversation_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "last_read_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversation_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fishing_zones" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "grid_lat" integer NOT NULL,
    "grid_lng" integer NOT NULL,
    "center_lat" double precision NOT NULL,
    "center_lng" double precision NOT NULL,
    "total_catches" integer DEFAULT 0,
    "total_sessions" integer DEFAULT 0,
    "unique_anglers" integer DEFAULT 0,
    "species_counts" "jsonb" DEFAULT '{}'::"jsonb",
    "top_species" "text",
    "water_type" "text",
    "display_name" "text",
    "last_activity_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lake_id" "uuid"
);


ALTER TABLE "public"."fishing_zones" OWNER TO "postgres";


COMMENT ON TABLE "public"."fishing_zones" IS 'Aggregated fishing activity by ~1km grid cells. Protects exact locations while showing community data.';



COMMENT ON COLUMN "public"."fishing_zones"."lake_id" IS 'If set, this zone overlaps with a lake and should not be displayed (lake handles its own stats)';



CREATE TABLE IF NOT EXISTS "public"."follows" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "no_self_follow" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."follows" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lake_announcements" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lake_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "content" "text" NOT NULL,
    "is_pinned" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lake_announcements" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lake_claims" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lake_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "message" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "decision_reason" "text",
    "reviewed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "reviewed_at" timestamp with time zone,
    "role" "text",
    "business_name" "text",
    "website" "text",
    "phone" "text",
    "email" "text",
    "proof_url" "text",
    "proof_type" "text",
    "lake_details" "jsonb" DEFAULT '{}'::"jsonb",
    "interested_in_premium" boolean DEFAULT false,
    "terms_accepted" boolean DEFAULT false,
    "rejection_reason" "text",
    CONSTRAINT "lake_claims_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."lake_claims" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lake_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lake_id" "uuid" NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "admin_notes" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lake_reports_reason_check" CHECK (("reason" = ANY (ARRAY['not_a_fishing_lake'::"text", 'incorrect_info'::"text", 'duplicate'::"text", 'closed_permanently'::"text", 'safety_issue'::"text", 'access_problem'::"text", 'inappropriate_content'::"text", 'other'::"text"]))),
    CONSTRAINT "lake_reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."lake_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lake_team" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "lake_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lake_team_role_check" CHECK (("role" = ANY (ARRAY['manager'::"text", 'bailiff'::"text"])))
);


ALTER TABLE "public"."lake_team" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text",
    "description" "text",
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "address" "text",
    "postcode" "text",
    "region" "text",
    "water_type" "text" DEFAULT 'lake'::"text",
    "size_acres" numeric(10,2),
    "max_depth_m" numeric(5,2),
    "species" "text"[],
    "has_parking" boolean DEFAULT false,
    "has_toilets" boolean DEFAULT false,
    "has_cafe" boolean DEFAULT false,
    "has_tackle_shop" boolean DEFAULT false,
    "is_night_fishing_allowed" boolean DEFAULT false,
    "is_disabled_accessible" boolean DEFAULT false,
    "phone" "text",
    "email" "text",
    "website" "text",
    "booking_url" "text",
    "day_ticket_price" numeric(8,2),
    "night_ticket_price" numeric(8,2),
    "season_ticket_price" numeric(8,2),
    "cover_image_url" "text",
    "images" "text"[],
    "claimed_by" "uuid",
    "claimed_at" timestamp with time zone,
    "is_verified" boolean DEFAULT false,
    "is_premium" boolean DEFAULT false,
    "premium_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "lake_type" "text",
    "barbless_only" boolean DEFAULT false,
    "catch_and_release_only" boolean DEFAULT false,
    "max_rods" integer DEFAULT 2,
    "rules" "text",
    "total_sessions" integer DEFAULT 0,
    "total_catches" integer DEFAULT 0,
    "last_session_at" timestamp with time zone,
    "is_founding_venue" boolean DEFAULT false,
    "stripe_subscription_id" "text",
    "premium_plan" "text",
    "is_hidden" boolean DEFAULT false NOT NULL,
    "hidden_at" timestamp with time zone,
    "hidden_by" "uuid",
    "opening_hours" "text",
    "facilities" "jsonb" DEFAULT '[]'::"jsonb",
    "photos" "jsonb" DEFAULT '[]'::"jsonb",
    "special_offers" "text",
    "session_count" integer DEFAULT 0,
    CONSTRAINT "lakes_lake_type_check" CHECK (("lake_type" = ANY (ARRAY['commercial'::"text", 'syndicate'::"text", 'club'::"text", 'day_ticket'::"text", 'public'::"text", 'private'::"text"]))),
    CONSTRAINT "lakes_water_type_check" CHECK (("water_type" = ANY (ARRAY['lake'::"text", 'pond'::"text", 'reservoir'::"text", 'river'::"text", 'canal'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."lakes" OWNER TO "postgres";


COMMENT ON COLUMN "public"."lakes"."is_premium" IS 'Premium lakes get featured placement and full feature access';



COMMENT ON COLUMN "public"."lakes"."is_hidden" IS 'Admin soft-hide: hides from Explore map without deleting';



COMMENT ON COLUMN "public"."lakes"."session_count" IS 'Number of fishing sessions logged at this lake';



CREATE TABLE IF NOT EXISTS "public"."mark_shares" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "mark_id" "uuid" NOT NULL,
    "shared_by" "uuid" NOT NULL,
    "shared_with" "uuid" NOT NULL,
    "can_edit" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."mark_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."message_reactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "message_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "emoji" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."message_reactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."message_reactions" IS 'Emoji reactions on messages';



CREATE TABLE IF NOT EXISTS "public"."messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "content" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_type" "text" DEFAULT 'text'::"text",
    "image_url" "text",
    "gif_url" "text",
    "deleted_at" timestamp with time zone,
    "edited_at" timestamp with time zone,
    CONSTRAINT "messages_message_type_check" CHECK (("message_type" = ANY (ARRAY['text'::"text", 'image'::"text", 'gif'::"text"])))
);


ALTER TABLE "public"."messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text" NOT NULL,
    "full_name" "text",
    "avatar_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "email" "text",
    "bio" "text",
    "cover_photo_url" "text",
    "location" "text",
    "role" "text" DEFAULT 'user'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "banned_at" timestamp with time zone,
    "banned_reason" "text",
    "banned_by" "uuid",
    "deleted_at" timestamp with time zone,
    "deletion_scheduled_for" timestamp with time zone,
    "fishing_preference" "text",
    "stripe_customer_id" "text",
    "xp" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "total_challenges_completed" integer DEFAULT 0,
    "country" "text" DEFAULT 'UK'::"text",
    "preferred_water_type" "text" DEFAULT 'freshwater'::"text",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "is_private" boolean DEFAULT false,
    "default_latitude" double precision,
    "default_longitude" double precision,
    "is_admin" boolean DEFAULT false,
    "countries_fished" "text"[] DEFAULT '{}'::"text"[],
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "auto_share_achievements" boolean DEFAULT true,
    CONSTRAINT "profiles_fishing_preference_check" CHECK ((("fishing_preference" IS NULL) OR ("fishing_preference" = ANY (ARRAY['sea'::"text", 'freshwater'::"text", 'both'::"text"])))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['user'::"text", 'moderator'::"text", 'admin'::"text", 'owner'::"text"]))),
    CONSTRAINT "profiles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'banned'::"text"]))),
    CONSTRAINT "profiles_username_format" CHECK (("username" ~ '^[a-z0-9_]{3,20}$'::"text")),
    CONSTRAINT "profiles_username_lowercase" CHECK (("username" = "lower"("username")))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."countries_fished" IS 'Array of country codes where user has logged catches';



COMMENT ON COLUMN "public"."profiles"."auto_share_achievements" IS 'When true, badges, level ups, and other achievements are automatically posted to the user feed';



CREATE OR REPLACE VIEW "public"."my_pending_invitations" WITH ("security_invoker"='true') AS
 SELECT "ci"."id",
    "ci"."competition_id",
    "ci"."inviter_id",
    "ci"."invitee_id",
    "ci"."status",
    "ci"."created_at",
    "ci"."responded_at",
    "c"."title" AS "competition_name",
    "c"."starts_at",
    "c"."ends_at",
    "inviter"."username" AS "inviter_username"
   FROM (("public"."competition_invites" "ci"
     JOIN "public"."competitions" "c" ON (("ci"."competition_id" = "c"."id")))
     JOIN "public"."profiles" "inviter" ON (("ci"."inviter_id" = "inviter"."id")))
  WHERE (("ci"."invitee_id" = "auth"."uid"()) AND ("ci"."status" = 'pending'::"text"));


ALTER VIEW "public"."my_pending_invitations" OWNER TO "postgres";


COMMENT ON VIEW "public"."my_pending_invitations" IS 'Shows pending competition invitations for the current user with SECURITY INVOKER';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "action_url" "text",
    "related_user_id" "uuid",
    "related_competition_id" "uuid",
    "related_session_id" "uuid",
    "related_catch_id" "uuid",
    "related_post_id" "uuid",
    "is_read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "related_lake_id" "uuid",
    CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['competition_invite'::"text", 'competition_starting_soon'::"text", 'competition_winner'::"text", 'catch_approved'::"text", 'catch_rejected'::"text", 'post_like'::"text", 'post_comment'::"text", 'follow'::"text", 'session_catch'::"text", 'message'::"text", 'share'::"text", 'lake_team_invite'::"text", 'lake_team_removed'::"text", 'lake_team_role_changed'::"text", 'lake_claim_submitted'::"text", 'lake_claim_approved'::"text", 'lake_claim_rejected'::"text", 'lake_problem_reported'::"text", 'session_join_request'::"text", 'session_invite'::"text", 'session_invite_accepted'::"text"])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'Stores all user notifications for various events';



CREATE TABLE IF NOT EXISTS "public"."partner_applications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "full_name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "why_join" "text",
    "experience" "text",
    "expected_signups" integer,
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_at" timestamp with time zone,
    "reviewed_by" "uuid",
    "rejection_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "partner_applications_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."partner_applications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_comments" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "text" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "comment_not_empty" CHECK (("length"(TRIM(BOTH FROM "text")) > 0))
);


ALTER TABLE "public"."post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_likes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."post_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "url" "text" NOT NULL,
    "position" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."post_media" OWNER TO "postgres";


COMMENT ON TABLE "public"."post_media" IS 'Ordered media items for multi-image posts';



CREATE TABLE IF NOT EXISTS "public"."premium_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" "uuid" NOT NULL,
    "tier" "text" NOT NULL,
    "price_paid" numeric(10,2),
    "currency" "text" DEFAULT 'GBP'::"text",
    "starts_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "payment_method" "text",
    "stripe_subscription_id" "text",
    "stripe_customer_id" "text",
    "status" "text" DEFAULT 'active'::"text",
    "cancelled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid"
);


ALTER TABLE "public"."premium_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profile_showcase" (
    "user_id" "uuid" NOT NULL,
    "challenge_id" "uuid",
    "position" integer NOT NULL
);


ALTER TABLE "public"."profile_showcase" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reserved_usernames" (
    "username" "text" NOT NULL,
    "reason" "text",
    "reserved_for" "text",
    "claimed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reserved_usernames" OWNER TO "postgres";


COMMENT ON TABLE "public"."reserved_usernames" IS 'Protected usernames that cannot be claimed during signup. Reserved for brands, influencers, and system use.';



CREATE TABLE IF NOT EXISTS "public"."sales_partners" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "partner_code" "text" NOT NULL,
    "commission_rate" numeric(3,2) DEFAULT 0.25,
    "total_signups" integer DEFAULT 0,
    "total_earnings" numeric(10,2) DEFAULT 0,
    "payment_method" "text",
    "payment_details" "jsonb",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "sales_partners_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'suspended'::"text", 'inactive'::"text"])))
);


ALTER TABLE "public"."sales_partners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."saved_lakes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lake_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_lakes" OWNER TO "postgres";


COMMENT ON TABLE "public"."saved_lakes" IS 'User saved/pinned lakes for quick access';



CREATE TABLE IF NOT EXISTS "public"."saved_marks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "latitude" double precision NOT NULL,
    "longitude" double precision NOT NULL,
    "water_type" "text" DEFAULT 'sea'::"text",
    "notes" "text",
    "privacy_level" "text" DEFAULT 'private'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."saved_marks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_participants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "invited_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "joined_at" timestamp with time zone,
    "left_at" timestamp with time zone,
    "status" "text" DEFAULT 'active'::"text",
    "water_type" "text",
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    CONSTRAINT "session_participants_role_check" CHECK (("role" = ANY (ARRAY['owner'::"text", 'contributor'::"text", 'viewer'::"text"]))),
    CONSTRAINT "session_participants_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'left'::"text"])))
);


ALTER TABLE "public"."session_participants" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_participants" IS 'Session participants with roles: owner (session creator), contributor (can log catches and post), viewer (view-only for public sessions)';



CREATE TABLE IF NOT EXISTS "public"."session_shares" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "shared_with_user_id" "uuid" NOT NULL,
    "can_view_exact_location" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "owner_id" "uuid" NOT NULL
);


ALTER TABLE "public"."session_shares" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."session_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "session_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "viewed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."session_views" OWNER TO "postgres";


COMMENT ON TABLE "public"."session_views" IS 'Tracks when users view ended sessions/competitions to hide completed banners';



CREATE TABLE IF NOT EXISTS "public"."sessions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text",
    "location_name" "text" NOT NULL,
    "latitude" numeric,
    "longitude" numeric,
    "water_type" "text",
    "is_public" boolean DEFAULT false,
    "location_privacy" "text" DEFAULT 'private'::"text",
    "started_at" timestamp with time zone NOT NULL,
    "ended_at" timestamp with time zone,
    "paused_at" timestamp with time zone,
    "session_notes" "text",
    "cover_photo_url" "text",
    "weather_temp" numeric,
    "weather_condition" "text",
    "wind_speed" numeric,
    "tide_state" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "competition_id" "uuid",
    "lake_id" "uuid",
    "mark_id" "uuid",
    "zone_id" "uuid",
    "moon_phase" "text",
    "allow_posts" boolean DEFAULT true,
    "allow_comments" boolean DEFAULT true
);


ALTER TABLE "public"."sessions" OWNER TO "postgres";


COMMENT ON COLUMN "public"."sessions"."mark_id" IS 'Optional link to a saved mark where the session started';



COMMENT ON COLUMN "public"."sessions"."moon_phase" IS 'Moon phase at the time the session was created (e.g., Full Moon, Waxing Crescent)';



COMMENT ON COLUMN "public"."sessions"."allow_posts" IS 'Whether participants can add image posts to this session';



COMMENT ON COLUMN "public"."sessions"."allow_comments" IS 'Whether participants can add text comments to this session';



CREATE TABLE IF NOT EXISTS "public"."species_info" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "display_name" "text" NOT NULL,
    "common_names" "text"[] DEFAULT '{}'::"text"[],
    "water_type" "text" NOT NULL,
    "family" "text",
    "uk_regions" "text"[] DEFAULT '{}'::"text"[],
    "habitat" "text",
    "peak_months" integer[] DEFAULT '{}'::integer[],
    "year_round" boolean DEFAULT false,
    "typical_weight_lb" numeric,
    "specimen_weight_lb" numeric,
    "uk_record_lb" numeric,
    "rarity" "text" DEFAULT 'common'::"text",
    "difficulty" "text" DEFAULT 'medium'::"text",
    "emoji" "text",
    "description" "text",
    "image_url" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "country" "text" DEFAULT 'UK'::"text",
    "regions" "text"[],
    CONSTRAINT "species_info_difficulty_check" CHECK (("difficulty" = ANY (ARRAY['easy'::"text", 'medium'::"text", 'hard'::"text", 'expert'::"text"]))),
    CONSTRAINT "species_info_rarity_check" CHECK (("rarity" = ANY (ARRAY['common'::"text", 'medium'::"text", 'rare'::"text", 'very_rare'::"text"]))),
    CONSTRAINT "species_info_water_type_check" CHECK (("water_type" = ANY (ARRAY['saltwater'::"text", 'freshwater'::"text", 'both'::"text"])))
);


ALTER TABLE "public"."species_info" OWNER TO "postgres";


COMMENT ON TABLE "public"."species_info" IS 'UK fish species database with regional distribution and seasonality';



CREATE TABLE IF NOT EXISTS "public"."species_tiers" (
    "species" "text" NOT NULL,
    "tier" "public"."species_tier" DEFAULT 'standard'::"public"."species_tier" NOT NULL,
    "base_xp" integer DEFAULT 10 NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."species_tiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."species_tiers" IS 'Species categorization for XP rewards - common/standard/trophy/rare';



CREATE TABLE IF NOT EXISTS "public"."subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "stripe_subscription_id" "text" NOT NULL,
    "stripe_customer_id" "text" NOT NULL,
    "status" "text" NOT NULL,
    "price_id" "text" NOT NULL,
    "product_type" "text" NOT NULL,
    "target_id" "uuid",
    "current_period_start" timestamp with time zone NOT NULL,
    "current_period_end" timestamp with time zone NOT NULL,
    "cancel_at_period_end" boolean DEFAULT false,
    "canceled_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."theme_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "key" "text" NOT NULL,
    "value" "text" NOT NULL,
    "label" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."theme_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."typing_indicators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."typing_indicators" OWNER TO "postgres";


COMMENT ON TABLE "public"."typing_indicators" IS 'Ephemeral typing status for conversations';



CREATE TABLE IF NOT EXISTS "public"."user_challenges" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "challenge_id" "uuid" NOT NULL,
    "progress" integer DEFAULT 0,
    "target" integer DEFAULT 1,
    "completed_at" timestamp with time zone,
    "xp_awarded" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_challenges" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_challenges" IS 'User progress and completion of challenges';



CREATE TABLE IF NOT EXISTS "public"."user_streaks" (
    "user_id" "uuid" NOT NULL,
    "current_streak" integer DEFAULT 0,
    "longest_streak" integer DEFAULT 0,
    "last_activity_date" "date",
    "streak_freezes_available" integer DEFAULT 1,
    "streak_freezes_used_this_week" integer DEFAULT 0
);


ALTER TABLE "public"."user_streaks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_weekly_stats" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "week_start" "date" NOT NULL,
    "catches_count" integer DEFAULT 0,
    "fishing_days" integer DEFAULT 0,
    "species_points" integer DEFAULT 0,
    "xp_earned" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_weekly_stats" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_weekly_stats" IS 'Weekly activity tracking for leaderboards';



CREATE TABLE IF NOT EXISTS "public"."weekly_species_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "species" "text" NOT NULL,
    "points" integer NOT NULL,
    "week_start" "date" NOT NULL,
    "is_bonus" boolean DEFAULT false,
    "bonus_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "water_type" "text" DEFAULT 'freshwater'::"text",
    "country" "text" DEFAULT 'UK'::"text",
    CONSTRAINT "weekly_species_points_water_type_check" CHECK (("water_type" = ANY (ARRAY['saltwater'::"text", 'freshwater'::"text"])))
);


ALTER TABLE "public"."weekly_species_points" OWNER TO "postgres";


COMMENT ON TABLE "public"."weekly_species_points" IS 'Rotating weekly point values for species';



CREATE TABLE IF NOT EXISTS "public"."xp_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" integer NOT NULL,
    "reason" "text" NOT NULL,
    "reference_type" "text",
    "reference_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."xp_transactions" OWNER TO "postgres";


ALTER TABLE ONLY "public"."achievement_shares"
    ADD CONSTRAINT "achievement_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."admin_activity_log"
    ADD CONSTRAINT "admin_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_claims"
    ADD CONSTRAINT "business_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_osm_id_unique" UNIQUE ("osm_id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_catches"
    ADD CONSTRAINT "challenge_catches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenge_catches"
    ADD CONSTRAINT "challenge_catches_user_challenge_id_catch_id_key" UNIQUE ("user_challenge_id", "catch_id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."challenges"
    ADD CONSTRAINT "challenges_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_stripe_session_id_key" UNIQUE ("stripe_session_id");



ALTER TABLE ONLY "public"."commission_transactions"
    ADD CONSTRAINT "commission_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_awards"
    ADD CONSTRAINT "competition_awards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_entries"
    ADD CONSTRAINT "competition_entries_competition_id_session_id_key" UNIQUE ("competition_id", "session_id");



ALTER TABLE ONLY "public"."competition_entries"
    ADD CONSTRAINT "competition_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_invites"
    ADD CONSTRAINT "competition_invites_competition_id_invitee_id_key" UNIQUE ("competition_id", "invitee_id");



ALTER TABLE ONLY "public"."competition_invites"
    ADD CONSTRAINT "competition_invites_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_competition_id_user_id_category_key" UNIQUE ("competition_id", "user_id", "category");



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fishing_zones"
    ADD CONSTRAINT "fishing_zones_grid_lat_grid_lng_key" UNIQUE ("grid_lat", "grid_lng");



ALTER TABLE ONLY "public"."fishing_zones"
    ADD CONSTRAINT "fishing_zones_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_following_id_key" UNIQUE ("follower_id", "following_id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lake_announcements"
    ADD CONSTRAINT "lake_announcements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lake_claims"
    ADD CONSTRAINT "lake_claims_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lake_reports"
    ADD CONSTRAINT "lake_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lake_team"
    ADD CONSTRAINT "lake_team_lake_id_user_id_key" UNIQUE ("lake_id", "user_id");



ALTER TABLE ONLY "public"."lake_team"
    ADD CONSTRAINT "lake_team_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lakes"
    ADD CONSTRAINT "lakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lakes"
    ADD CONSTRAINT "lakes_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."lakes"
    ADD CONSTRAINT "lakes_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."mark_shares"
    ADD CONSTRAINT "mark_shares_mark_id_shared_with_key" UNIQUE ("mark_id", "shared_with");



ALTER TABLE ONLY "public"."mark_shares"
    ADD CONSTRAINT "mark_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_user_id_emoji_key" UNIQUE ("message_id", "user_id", "emoji");



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_user_id_key" UNIQUE ("post_id", "user_id");



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_post_id_position_key" UNIQUE ("post_id", "position");



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."premium_subscriptions"
    ADD CONSTRAINT "premium_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profile_showcase"
    ADD CONSTRAINT "profile_showcase_pkey" PRIMARY KEY ("user_id", "position");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_stripe_customer_id_key" UNIQUE ("stripe_customer_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."reserved_usernames"
    ADD CONSTRAINT "reserved_usernames_pkey" PRIMARY KEY ("username");



ALTER TABLE ONLY "public"."sales_partners"
    ADD CONSTRAINT "sales_partners_partner_code_key" UNIQUE ("partner_code");



ALTER TABLE ONLY "public"."sales_partners"
    ADD CONSTRAINT "sales_partners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_lakes"
    ADD CONSTRAINT "saved_lakes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."saved_lakes"
    ADD CONSTRAINT "saved_lakes_user_id_lake_id_key" UNIQUE ("user_id", "lake_id");



ALTER TABLE ONLY "public"."saved_marks"
    ADD CONSTRAINT "saved_marks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_user_unique" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."session_shares"
    ADD CONSTRAINT "session_shares_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_shares"
    ADD CONSTRAINT "session_shares_session_id_shared_with_user_id_key" UNIQUE ("session_id", "shared_with_user_id");



ALTER TABLE ONLY "public"."session_views"
    ADD CONSTRAINT "session_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."session_views"
    ADD CONSTRAINT "session_views_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."species_info"
    ADD CONSTRAINT "species_info_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."species_info"
    ADD CONSTRAINT "species_info_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."species_tiers"
    ADD CONSTRAINT "species_tiers_pkey" PRIMARY KEY ("species");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_stripe_subscription_id_key" UNIQUE ("stripe_subscription_id");



ALTER TABLE ONLY "public"."theme_settings"
    ADD CONSTRAINT "theme_settings_key_key" UNIQUE ("key");



ALTER TABLE ONLY "public"."theme_settings"
    ADD CONSTRAINT "theme_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_user_id_key" UNIQUE ("conversation_id", "user_id");



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_user_id_challenge_id_key" UNIQUE ("user_id", "challenge_id");



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_weekly_stats"
    ADD CONSTRAINT "user_weekly_stats_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_weekly_stats"
    ADD CONSTRAINT "user_weekly_stats_user_id_week_start_key" UNIQUE ("user_id", "week_start");



ALTER TABLE ONLY "public"."weekly_species_points"
    ADD CONSTRAINT "weekly_species_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_species_points"
    ADD CONSTRAINT "weekly_species_points_species_week_start_key" UNIQUE ("species", "week_start");



ALTER TABLE ONLY "public"."xp_transactions"
    ADD CONSTRAINT "xp_transactions_pkey" PRIMARY KEY ("id");



CREATE INDEX "competition_entries_competition_id_idx" ON "public"."competition_entries" USING "btree" ("competition_id");



CREATE INDEX "competition_entries_rank_idx" ON "public"."competition_entries" USING "btree" ("competition_id", "rank");



CREATE INDEX "competition_entries_session_id_idx" ON "public"."competition_entries" USING "btree" ("session_id");



CREATE INDEX "competition_entries_user_id_idx" ON "public"."competition_entries" USING "btree" ("user_id");



CREATE INDEX "competition_invites_competition_id_idx" ON "public"."competition_invites" USING "btree" ("competition_id");



CREATE INDEX "competition_invites_invitee_id_idx" ON "public"."competition_invites" USING "btree" ("invitee_id");



CREATE INDEX "competition_invites_status_idx" ON "public"."competition_invites" USING "btree" ("status");



CREATE INDEX "competitions_created_by_idx" ON "public"."competitions" USING "btree" ("created_by");



CREATE INDEX "competitions_ends_at_idx" ON "public"."competitions" USING "btree" ("ends_at");



CREATE INDEX "competitions_session_id_idx" ON "public"."competitions" USING "btree" ("session_id");



CREATE INDEX "competitions_starts_at_idx" ON "public"."competitions" USING "btree" ("starts_at");



CREATE INDEX "competitions_status_idx" ON "public"."competitions" USING "btree" ("status");



CREATE INDEX "competitions_type_idx" ON "public"."competitions" USING "btree" ("type");



CREATE INDEX "idx_achievement_shares_user_id" ON "public"."achievement_shares" USING "btree" ("user_id");



CREATE INDEX "idx_api_usage_api_name" ON "public"."api_usage" USING "btree" ("api_name");



CREATE INDEX "idx_api_usage_api_name_date" ON "public"."api_usage" USING "btree" ("api_name", "created_at");



CREATE INDEX "idx_api_usage_created_at" ON "public"."api_usage" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_app_settings_category" ON "public"."app_settings" USING "btree" ("category");



CREATE INDEX "idx_blocked_users_blocked" ON "public"."blocked_users" USING "btree" ("blocked_id");



CREATE INDEX "idx_blocked_users_blocker" ON "public"."blocked_users" USING "btree" ("blocker_id");



CREATE INDEX "idx_business_claims_business_id" ON "public"."business_claims" USING "btree" ("business_id");



CREATE INDEX "idx_business_claims_status" ON "public"."business_claims" USING "btree" ("status");



CREATE INDEX "idx_business_claims_user_id" ON "public"."business_claims" USING "btree" ("user_id");



CREATE INDEX "idx_businesses_is_claimed" ON "public"."businesses" USING "btree" ("is_claimed");



CREATE INDEX "idx_businesses_is_hidden" ON "public"."businesses" USING "btree" ("is_hidden") WHERE ("is_hidden" = false);



CREATE INDEX "idx_businesses_is_premium" ON "public"."businesses" USING "btree" ("is_premium") WHERE ("is_premium" = true);



CREATE INDEX "idx_businesses_location_gist" ON "public"."businesses" USING "gist" ((("public"."st_makepoint"(("longitude")::double precision, ("latitude")::double precision))::"public"."geography"));



CREATE INDEX "idx_businesses_name_trgm" ON "public"."businesses" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_businesses_osm_id" ON "public"."businesses" USING "btree" ("osm_id");



CREATE UNIQUE INDEX "idx_businesses_osm_id_unique" ON "public"."businesses" USING "btree" ("osm_id") WHERE ("osm_id" IS NOT NULL);



CREATE INDEX "idx_businesses_owner_user_id" ON "public"."businesses" USING "btree" ("owner_user_id");



CREATE INDEX "idx_businesses_referred_by_partner" ON "public"."businesses" USING "btree" ("referred_by_partner_id") WHERE ("referred_by_partner_id" IS NOT NULL);



CREATE INDEX "idx_businesses_type" ON "public"."businesses" USING "btree" ("type");



CREATE INDEX "idx_businesses_verified" ON "public"."businesses" USING "btree" ("verified") WHERE ("verified" = true);



CREATE INDEX "idx_catches_country_code" ON "public"."catches" USING "btree" ("country_code") WHERE ("country_code" IS NOT NULL);



CREATE INDEX "idx_catches_exif_location" ON "public"."catches" USING "btree" ("photo_exif_latitude", "photo_exif_longitude") WHERE ("photo_exif_latitude" IS NOT NULL);



CREATE INDEX "idx_catches_fish_health" ON "public"."catches" USING "btree" ("fish_health_issue") WHERE ("fish_health_issue" = true);



CREATE INDEX "idx_catches_is_backlog" ON "public"."catches" USING "btree" ("is_backlog") WHERE ("is_backlog" = false);



CREATE INDEX "idx_catches_is_public" ON "public"."catches" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_catches_location_gist" ON "public"."catches" USING "gist" ((("public"."st_makepoint"(("longitude")::double precision, ("latitude")::double precision))::"public"."geography")) WHERE (("latitude" IS NOT NULL) AND ("longitude" IS NOT NULL));



CREATE INDEX "idx_catches_mark_id" ON "public"."catches" USING "btree" ("mark_id") WHERE ("mark_id" IS NOT NULL);



CREATE INDEX "idx_catches_multi_catch_group" ON "public"."catches" USING "btree" ("multi_catch_group_id") WHERE ("multi_catch_group_id" IS NOT NULL);



CREATE INDEX "idx_catches_photo_hash" ON "public"."catches" USING "btree" ("photo_hash");



CREATE INDEX "idx_catches_session" ON "public"."catches" USING "btree" ("session_id");



CREATE INDEX "idx_catches_session_time" ON "public"."catches" USING "btree" ("session_id", "caught_at" DESC);



CREATE INDEX "idx_catches_session_validation" ON "public"."catches" USING "btree" ("session_id", "validation_status");



CREATE INDEX "idx_catches_species" ON "public"."catches" USING "btree" ("species");



CREATE INDEX "idx_catches_species_id" ON "public"."catches" USING "btree" ("species_id");



CREATE INDEX "idx_catches_validation_status" ON "public"."catches" USING "btree" ("validation_status");



CREATE INDEX "idx_catches_verification_level" ON "public"."catches" USING "btree" ("verification_level");



CREATE INDEX "idx_catches_verification_score" ON "public"."catches" USING "btree" ("verification_score");



CREATE INDEX "idx_catches_zone_id" ON "public"."catches" USING "btree" ("zone_id");



CREATE INDEX "idx_challenge_catches_catch" ON "public"."challenge_catches" USING "btree" ("catch_id");



CREATE INDEX "idx_challenge_catches_user_challenge" ON "public"."challenge_catches" USING "btree" ("user_challenge_id");



CREATE INDEX "idx_challenges_active" ON "public"."challenges" USING "btree" ("is_active");



CREATE INDEX "idx_challenges_category" ON "public"."challenges" USING "btree" ("category");



CREATE INDEX "idx_challenges_rarity" ON "public"."challenges" USING "btree" ("rarity");



CREATE INDEX "idx_challenges_title_trgm" ON "public"."challenges" USING "gin" ("title" "public"."gin_trgm_ops");



CREATE INDEX "idx_challenges_water_type" ON "public"."challenges" USING "btree" ("water_type");



CREATE INDEX "idx_commission_transactions_business_id" ON "public"."commission_transactions" USING "btree" ("business_id");



CREATE INDEX "idx_commission_transactions_partner_id" ON "public"."commission_transactions" USING "btree" ("partner_id");



CREATE INDEX "idx_commission_transactions_period" ON "public"."commission_transactions" USING "btree" ("period_start", "period_end");



CREATE INDEX "idx_commission_transactions_status" ON "public"."commission_transactions" USING "btree" ("status");



CREATE INDEX "idx_competition_invites_competition" ON "public"."competition_invites" USING "btree" ("competition_id");



CREATE INDEX "idx_competition_invites_invitee" ON "public"."competition_invites" USING "btree" ("invitee_id", "status");



CREATE INDEX "idx_competition_winners_category" ON "public"."competition_winners" USING "btree" ("competition_id", "category");



CREATE INDEX "idx_competition_winners_competition" ON "public"."competition_winners" USING "btree" ("competition_id");



CREATE INDEX "idx_competition_winners_user" ON "public"."competition_winners" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_participants_conversation" ON "public"."conversation_participants" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_participants_user" ON "public"."conversation_participants" USING "btree" ("user_id");



CREATE INDEX "idx_fishing_zones_grid" ON "public"."fishing_zones" USING "btree" ("grid_lat", "grid_lng");



CREATE INDEX "idx_fishing_zones_lake_id" ON "public"."fishing_zones" USING "btree" ("lake_id");



CREATE INDEX "idx_fishing_zones_location" ON "public"."fishing_zones" USING "btree" ("center_lat", "center_lng");



CREATE INDEX "idx_follows_created" ON "public"."follows" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_follows_follower" ON "public"."follows" USING "btree" ("follower_id");



CREATE INDEX "idx_follows_following" ON "public"."follows" USING "btree" ("following_id");



CREATE INDEX "idx_lake_announcements_created_at" ON "public"."lake_announcements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lake_announcements_lake_id" ON "public"."lake_announcements" USING "btree" ("lake_id");



CREATE INDEX "idx_lake_claims_lake_id" ON "public"."lake_claims" USING "btree" ("lake_id");



CREATE INDEX "idx_lake_claims_status" ON "public"."lake_claims" USING "btree" ("status");



CREATE INDEX "idx_lake_claims_user_id" ON "public"."lake_claims" USING "btree" ("user_id");



CREATE INDEX "idx_lake_reports_created_at" ON "public"."lake_reports" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lake_reports_lake_id" ON "public"."lake_reports" USING "btree" ("lake_id");



CREATE INDEX "idx_lake_reports_status" ON "public"."lake_reports" USING "btree" ("status");



CREATE INDEX "idx_lake_team_lake_id" ON "public"."lake_team" USING "btree" ("lake_id");



CREATE INDEX "idx_lake_team_user_id" ON "public"."lake_team" USING "btree" ("user_id");



CREATE INDEX "idx_lakes_claimed_by" ON "public"."lakes" USING "btree" ("claimed_by");



CREATE INDEX "idx_lakes_founding_venue" ON "public"."lakes" USING "btree" ("is_founding_venue") WHERE ("is_founding_venue" = true);



CREATE INDEX "idx_lakes_is_hidden" ON "public"."lakes" USING "btree" ("is_hidden") WHERE ("is_hidden" = false);



CREATE INDEX "idx_lakes_is_verified" ON "public"."lakes" USING "btree" ("is_verified");



CREATE INDEX "idx_lakes_location" ON "public"."lakes" USING "btree" ("latitude", "longitude");



CREATE INDEX "idx_lakes_name_trgm" ON "public"."lakes" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_lakes_region" ON "public"."lakes" USING "btree" ("region");



CREATE INDEX "idx_lakes_slug" ON "public"."lakes" USING "btree" ("slug");



CREATE INDEX "idx_mark_shares_mark_id" ON "public"."mark_shares" USING "btree" ("mark_id");



CREATE INDEX "idx_mark_shares_shared_with" ON "public"."mark_shares" USING "btree" ("shared_with");



CREATE INDEX "idx_message_reactions_message_id" ON "public"."message_reactions" USING "btree" ("message_id");



CREATE INDEX "idx_messages_conversation" ON "public"."messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_messages_created" ON "public"."messages" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_messages_deleted_at" ON "public"."messages" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_is_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_user_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_partner_applications_status" ON "public"."partner_applications" USING "btree" ("status");



CREATE INDEX "idx_partner_applications_user_id" ON "public"."partner_applications" USING "btree" ("user_id");



CREATE INDEX "idx_post_comments_post" ON "public"."post_comments" USING "btree" ("post_id", "created_at");



CREATE INDEX "idx_post_comments_user" ON "public"."post_comments" USING "btree" ("user_id");



CREATE INDEX "idx_post_likes_created" ON "public"."post_likes" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_post_likes_post" ON "public"."post_likes" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_user" ON "public"."post_likes" USING "btree" ("user_id");



CREATE INDEX "idx_post_media_post_id_position" ON "public"."post_media" USING "btree" ("post_id", "position");



CREATE INDEX "idx_posts_catch" ON "public"."posts" USING "btree" ("catch_id") WHERE ("catch_id" IS NOT NULL);



CREATE INDEX "idx_posts_public" ON "public"."posts" USING "btree" ("is_public", "created_at" DESC) WHERE ("is_public" = true);



CREATE INDEX "idx_posts_session" ON "public"."posts" USING "btree" ("session_id") WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_posts_type" ON "public"."posts" USING "btree" ("type");



CREATE INDEX "idx_posts_user_created" ON "public"."posts" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "idx_profile_showcase_user_id" ON "public"."profile_showcase" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_default_location" ON "public"."profiles" USING "btree" ("default_latitude", "default_longitude") WHERE (("default_latitude" IS NOT NULL) AND ("default_longitude" IS NOT NULL));



CREATE INDEX "idx_profiles_deleted_at" ON "public"."profiles" USING "btree" ("deleted_at") WHERE ("deleted_at" IS NOT NULL);



CREATE INDEX "idx_profiles_full_name_trgm" ON "public"."profiles" USING "gin" ("full_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_profiles_fullname" ON "public"."profiles" USING "btree" ("full_name") WHERE ("full_name" IS NOT NULL);



CREATE INDEX "idx_profiles_is_admin" ON "public"."profiles" USING "btree" ("is_admin") WHERE ("is_admin" = true);



CREATE INDEX "idx_profiles_is_private" ON "public"."profiles" USING "btree" ("is_private");



CREATE INDEX "idx_profiles_level" ON "public"."profiles" USING "btree" ("level" DESC);



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_profiles_status" ON "public"."profiles" USING "btree" ("status");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_profiles_username_trgm" ON "public"."profiles" USING "gin" ("username" "public"."gin_trgm_ops");



CREATE INDEX "idx_profiles_xp" ON "public"."profiles" USING "btree" ("xp" DESC);



CREATE INDEX "idx_reserved_usernames_lower" ON "public"."reserved_usernames" USING "btree" ("lower"("username"));



CREATE INDEX "idx_sales_partners_partner_code" ON "public"."sales_partners" USING "btree" ("partner_code");



CREATE INDEX "idx_sales_partners_status" ON "public"."sales_partners" USING "btree" ("status");



CREATE INDEX "idx_sales_partners_user_id" ON "public"."sales_partners" USING "btree" ("user_id");



CREATE INDEX "idx_saved_lakes_lake" ON "public"."saved_lakes" USING "btree" ("lake_id");



CREATE INDEX "idx_saved_lakes_lake_id" ON "public"."saved_lakes" USING "btree" ("lake_id");



CREATE INDEX "idx_saved_lakes_user" ON "public"."saved_lakes" USING "btree" ("user_id");



CREATE INDEX "idx_saved_lakes_user_id" ON "public"."saved_lakes" USING "btree" ("user_id");



CREATE INDEX "idx_saved_marks_public" ON "public"."saved_marks" USING "btree" ("privacy_level") WHERE ("privacy_level" = 'public'::"text");



CREATE INDEX "idx_saved_marks_user_id" ON "public"."saved_marks" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_session_participants_session_user" ON "public"."session_participants" USING "btree" ("session_id", "user_id");



CREATE INDEX "idx_session_participants_status" ON "public"."session_participants" USING "btree" ("status");



CREATE INDEX "idx_session_shares_owner" ON "public"."session_shares" USING "btree" ("owner_id");



CREATE INDEX "idx_session_shares_user" ON "public"."session_shares" USING "btree" ("shared_with_user_id");



CREATE INDEX "idx_session_views_session" ON "public"."session_views" USING "btree" ("session_id");



CREATE INDEX "idx_session_views_user" ON "public"."session_views" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_active" ON "public"."sessions" USING "btree" ("user_id", "ended_at") WHERE ("ended_at" IS NULL);



CREATE INDEX "idx_sessions_allow_comments" ON "public"."sessions" USING "btree" ("allow_comments");



CREATE INDEX "idx_sessions_allow_posts" ON "public"."sessions" USING "btree" ("allow_posts");



CREATE INDEX "idx_sessions_lake_id" ON "public"."sessions" USING "btree" ("lake_id");



CREATE INDEX "idx_sessions_location_gist" ON "public"."sessions" USING "gist" ((("public"."st_makepoint"(("longitude")::double precision, ("latitude")::double precision))::"public"."geography"));



CREATE INDEX "idx_sessions_mark_id" ON "public"."sessions" USING "btree" ("mark_id") WHERE ("mark_id" IS NOT NULL);



CREATE INDEX "idx_sessions_public" ON "public"."sessions" USING "btree" ("is_public") WHERE ("is_public" = true);



CREATE INDEX "idx_sessions_recent" ON "public"."sessions" USING "btree" ("started_at" DESC, "ended_at" DESC);



CREATE INDEX "idx_sessions_started" ON "public"."sessions" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_sessions_user" ON "public"."sessions" USING "btree" ("user_id");



CREATE INDEX "idx_sessions_water_type" ON "public"."sessions" USING "btree" ("water_type") WHERE ("water_type" IS NOT NULL);



CREATE INDEX "idx_sessions_zone_id" ON "public"."sessions" USING "btree" ("zone_id");



CREATE INDEX "idx_species_info_country" ON "public"."species_info" USING "btree" ("country");



CREATE INDEX "idx_species_info_display_name_trgm" ON "public"."species_info" USING "gin" ("display_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_species_info_name" ON "public"."species_info" USING "btree" ("name");



CREATE INDEX "idx_species_info_water_type" ON "public"."species_info" USING "btree" ("water_type");



CREATE INDEX "idx_species_tiers_tier" ON "public"."species_tiers" USING "btree" ("tier");



CREATE INDEX "idx_subscriptions_status" ON "public"."subscriptions" USING "btree" ("status");



CREATE INDEX "idx_subscriptions_stripe_subscription_id" ON "public"."subscriptions" USING "btree" ("stripe_subscription_id");



CREATE INDEX "idx_subscriptions_target_id" ON "public"."subscriptions" USING "btree" ("target_id");



CREATE INDEX "idx_subscriptions_user_id" ON "public"."subscriptions" USING "btree" ("user_id");



CREATE INDEX "idx_typing_indicators_conversation_id" ON "public"."typing_indicators" USING "btree" ("conversation_id");



CREATE INDEX "idx_user_challenges_completed" ON "public"."user_challenges" USING "btree" ("user_id", "completed_at") WHERE ("completed_at" IS NOT NULL);



CREATE INDEX "idx_user_challenges_user" ON "public"."user_challenges" USING "btree" ("user_id");



CREATE INDEX "idx_user_streaks_user_id" ON "public"."user_streaks" USING "btree" ("user_id");



CREATE INDEX "idx_user_weekly_stats_points" ON "public"."user_weekly_stats" USING "btree" ("week_start", "species_points" DESC);



CREATE INDEX "idx_user_weekly_stats_week" ON "public"."user_weekly_stats" USING "btree" ("week_start");



CREATE INDEX "idx_weekly_species_week" ON "public"."weekly_species_points" USING "btree" ("week_start");



CREATE INDEX "idx_xp_transactions_user" ON "public"."xp_transactions" USING "btree" ("user_id", "created_at" DESC);



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "session_participants_session_id_idx" ON "public"."session_participants" USING "btree" ("session_id");



CREATE INDEX "session_participants_status_idx" ON "public"."session_participants" USING "btree" ("status");



CREATE INDEX "session_participants_user_id_idx" ON "public"."session_participants" USING "btree" ("user_id");



CREATE INDEX "sessions_competition_id_idx" ON "public"."sessions" USING "btree" ("competition_id");



CREATE OR REPLACE TRIGGER "catch_auto_approve" BEFORE INSERT ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."auto_approve_non_competition_catch"();



CREATE OR REPLACE TRIGGER "competition_invite_notification" AFTER INSERT ON "public"."competition_invites" FOR EACH ROW EXECUTE FUNCTION "public"."notify_competition_invite"();



CREATE OR REPLACE TRIGGER "competition_pending_catch_notification" AFTER INSERT ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."notify_competition_pending_catch"();



CREATE OR REPLACE TRIGGER "competition_session_auto_creation" AFTER INSERT ON "public"."competitions" FOR EACH ROW EXECUTE FUNCTION "public"."create_competition_session"();



CREATE OR REPLACE TRIGGER "competition_session_trigger" AFTER INSERT ON "public"."competitions" FOR EACH ROW EXECUTE FUNCTION "public"."create_competition_session"();



CREATE OR REPLACE TRIGGER "lake_claimed_at_trigger" BEFORE UPDATE ON "public"."lakes" FOR EACH ROW EXECUTE FUNCTION "public"."set_lake_claimed_at"();



CREATE OR REPLACE TRIGGER "lake_reports_updated_at" BEFORE UPDATE ON "public"."lake_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_lake_reports_updated_at"();



CREATE OR REPLACE TRIGGER "lakes_updated_at" BEFORE UPDATE ON "public"."lakes" FOR EACH ROW EXECUTE FUNCTION "public"."update_lakes_updated_at"();



CREATE OR REPLACE TRIGGER "on_block_user" AFTER INSERT ON "public"."blocked_users" FOR EACH ROW EXECUTE FUNCTION "public"."handle_block"();



CREATE OR REPLACE TRIGGER "on_message_insert" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."update_conversation_timestamp"();



CREATE OR REPLACE TRIGGER "on_message_notify" AFTER INSERT ON "public"."messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_on_message"();



CREATE OR REPLACE TRIGGER "post_comment_notification" AFTER INSERT ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."notify_post_comment"();



CREATE OR REPLACE TRIGGER "post_like_notification" AFTER INSERT ON "public"."post_likes" FOR EACH ROW EXECUTE FUNCTION "public"."notify_post_like"();



CREATE OR REPLACE TRIGGER "saved_marks_updated_at" BEFORE UPDATE ON "public"."saved_marks" FOR EACH ROW EXECUTE FUNCTION "public"."update_saved_marks_updated_at"();



CREATE OR REPLACE TRIGGER "session_catch_notification" AFTER INSERT ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."notify_session_catch"();



CREATE OR REPLACE TRIGGER "session_join_request_notification" AFTER INSERT ON "public"."session_participants" FOR EACH ROW EXECUTE FUNCTION "public"."notify_session_join_request"();



CREATE OR REPLACE TRIGGER "session_owner_participant_trigger" AFTER INSERT ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."add_session_owner_participant"();



CREATE OR REPLACE TRIGGER "set_catches_updated_at" BEFORE UPDATE ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_session_participants_updated_at" BEFORE UPDATE ON "public"."session_participants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "theme_settings_updated_at" BEFORE UPDATE ON "public"."theme_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_theme_settings_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_assign_catch_zone" BEFORE INSERT OR UPDATE OF "latitude", "longitude", "session_id" ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."assign_catch_zone"();



CREATE OR REPLACE TRIGGER "trigger_assign_session_zone" BEFORE INSERT OR UPDATE OF "latitude", "longitude", "location_privacy" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."assign_session_zone"();



CREATE OR REPLACE TRIGGER "trigger_catch_zone_stats" AFTER INSERT OR UPDATE OF "zone_id", "species" ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_zone_stats"();



CREATE OR REPLACE TRIGGER "trigger_catch_zone_stats_delete" AFTER DELETE ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_update_zone_stats_on_delete"();



CREATE OR REPLACE TRIGGER "trigger_reset_weekly_freezes" BEFORE UPDATE ON "public"."user_streaks" FOR EACH ROW EXECUTE FUNCTION "public"."reset_weekly_streak_freezes"();



CREATE OR REPLACE TRIGGER "trigger_update_lake_catch_stats" AFTER INSERT OR DELETE OR UPDATE ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."update_lake_catch_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_lake_session_count" AFTER INSERT OR DELETE OR UPDATE OF "lake_id" ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_lake_session_count"();



CREATE OR REPLACE TRIGGER "trigger_update_lake_session_stats" AFTER INSERT OR DELETE OR UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_lake_session_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_partner_signup_count" AFTER INSERT OR DELETE OR UPDATE ON "public"."businesses" FOR EACH ROW EXECUTE FUNCTION "public"."update_partner_signup_count"();



CREATE OR REPLACE TRIGGER "trigger_update_partner_stats" AFTER INSERT OR UPDATE ON "public"."commission_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_partner_stats"();



CREATE OR REPLACE TRIGGER "trigger_update_weekly_stats" AFTER INSERT ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."update_user_weekly_stats"();



CREATE OR REPLACE TRIGGER "update_businesses_updated_at" BEFORE UPDATE ON "public"."businesses" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_competitions_updated_at" BEFORE UPDATE ON "public"."competitions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_post_comments_updated_at" BEFORE UPDATE ON "public"."post_comments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_posts_updated_at" BEFORE UPDATE ON "public"."posts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sessions_updated_at" BEFORE UPDATE ON "public"."sessions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "validate_catch_time" BEFORE INSERT OR UPDATE OF "created_at" ON "public"."catches" FOR EACH ROW EXECUTE FUNCTION "public"."validate_competition_catch_time"();



ALTER TABLE ONLY "public"."achievement_shares"
    ADD CONSTRAINT "achievement_shares_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id");



ALTER TABLE ONLY "public"."achievement_shares"
    ADD CONSTRAINT "achievement_shares_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."api_usage"
    ADD CONSTRAINT "api_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."app_settings"
    ADD CONSTRAINT "app_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocked_users"
    ADD CONSTRAINT "blocked_users_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_claims"
    ADD CONSTRAINT "business_claims_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_claims"
    ADD CONSTRAINT "business_claims_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."business_claims"
    ADD CONSTRAINT "business_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_claimed_by_owner_fkey" FOREIGN KEY ("claimed_by_owner") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_referred_by_partner_id_fkey" FOREIGN KEY ("referred_by_partner_id") REFERENCES "public"."sales_partners"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_competition_approved_by_fkey" FOREIGN KEY ("competition_approved_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_mark_id_fkey" FOREIGN KEY ("mark_id") REFERENCES "public"."saved_marks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_time_override_by_fkey" FOREIGN KEY ("time_override_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_validated_by_fkey" FOREIGN KEY ("validated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."catches"
    ADD CONSTRAINT "catches_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."fishing_zones"("id");



ALTER TABLE ONLY "public"."challenge_catches"
    ADD CONSTRAINT "challenge_catches_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "public"."catches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."challenge_catches"
    ADD CONSTRAINT "challenge_catches_user_challenge_id_fkey" FOREIGN KEY ("user_challenge_id") REFERENCES "public"."user_challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."checkout_sessions"
    ADD CONSTRAINT "checkout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."commission_transactions"
    ADD CONSTRAINT "commission_transactions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."commission_transactions"
    ADD CONSTRAINT "commission_transactions_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "public"."sales_partners"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_awards"
    ADD CONSTRAINT "competition_awards_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_entries"
    ADD CONSTRAINT "competition_entries_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_entries"
    ADD CONSTRAINT "competition_entries_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_entries"
    ADD CONSTRAINT "competition_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_invites"
    ADD CONSTRAINT "competition_invites_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_invites"
    ADD CONSTRAINT "competition_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_invites"
    ADD CONSTRAINT "competition_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "public"."catches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_declared_by_fkey" FOREIGN KEY ("declared_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."competition_winners"
    ADD CONSTRAINT "competition_winners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_last_adjusted_by_fkey" FOREIGN KEY ("last_adjusted_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."competitions"
    ADD CONSTRAINT "competitions_winner_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_participants"
    ADD CONSTRAINT "conversation_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fishing_zones"
    ADD CONSTRAINT "fishing_zones_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id");



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."follows"
    ADD CONSTRAINT "follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_announcements"
    ADD CONSTRAINT "lake_announcements_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_announcements"
    ADD CONSTRAINT "lake_announcements_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_claims"
    ADD CONSTRAINT "lake_claims_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_claims"
    ADD CONSTRAINT "lake_claims_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lake_claims"
    ADD CONSTRAINT "lake_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_reports"
    ADD CONSTRAINT "lake_reports_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_reports"
    ADD CONSTRAINT "lake_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_reports"
    ADD CONSTRAINT "lake_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lake_team"
    ADD CONSTRAINT "lake_team_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."lake_team"
    ADD CONSTRAINT "lake_team_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lake_team"
    ADD CONSTRAINT "lake_team_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lakes"
    ADD CONSTRAINT "lakes_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lakes"
    ADD CONSTRAINT "lakes_hidden_by_fkey" FOREIGN KEY ("hidden_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."mark_shares"
    ADD CONSTRAINT "mark_shares_mark_id_fkey" FOREIGN KEY ("mark_id") REFERENCES "public"."saved_marks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mark_shares"
    ADD CONSTRAINT "mark_shares_shared_by_fkey" FOREIGN KEY ("shared_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."mark_shares"
    ADD CONSTRAINT "mark_shares_shared_with_fkey" FOREIGN KEY ("shared_with") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."message_reactions"
    ADD CONSTRAINT "message_reactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."messages"
    ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_catch_id_fkey" FOREIGN KEY ("related_catch_id") REFERENCES "public"."catches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_competition_id_fkey" FOREIGN KEY ("related_competition_id") REFERENCES "public"."competitions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_lake_id_fkey" FOREIGN KEY ("related_lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_post_id_fkey" FOREIGN KEY ("related_post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_session_id_fkey" FOREIGN KEY ("related_session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."partner_applications"
    ADD CONSTRAINT "partner_applications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_comments"
    ADD CONSTRAINT "post_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_likes"
    ADD CONSTRAINT "post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."post_media"
    ADD CONSTRAINT "post_media_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_catch_id_fkey" FOREIGN KEY ("catch_id") REFERENCES "public"."catches"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."posts"
    ADD CONSTRAINT "posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profile_showcase"
    ADD CONSTRAINT "profile_showcase_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id");



ALTER TABLE ONLY "public"."profile_showcase"
    ADD CONSTRAINT "profile_showcase_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_banned_by_fkey" FOREIGN KEY ("banned_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reserved_usernames"
    ADD CONSTRAINT "reserved_usernames_claimed_by_fkey" FOREIGN KEY ("claimed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."sales_partners"
    ADD CONSTRAINT "sales_partners_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_lakes"
    ADD CONSTRAINT "saved_lakes_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_lakes"
    ADD CONSTRAINT "saved_lakes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."saved_marks"
    ADD CONSTRAINT "saved_marks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_participants"
    ADD CONSTRAINT "session_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_shares"
    ADD CONSTRAINT "session_shares_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_shares"
    ADD CONSTRAINT "session_shares_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_shares"
    ADD CONSTRAINT "session_shares_shared_with_user_id_fkey" FOREIGN KEY ("shared_with_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_views"
    ADD CONSTRAINT "session_views_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."session_views"
    ADD CONSTRAINT "session_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_lake_id_fkey" FOREIGN KEY ("lake_id") REFERENCES "public"."lakes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_mark_id_fkey" FOREIGN KEY ("mark_id") REFERENCES "public"."saved_marks"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sessions"
    ADD CONSTRAINT "sessions_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "public"."fishing_zones"("id");



ALTER TABLE ONLY "public"."subscriptions"
    ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."typing_indicators"
    ADD CONSTRAINT "typing_indicators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_challenges"
    ADD CONSTRAINT "user_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_streaks"
    ADD CONSTRAINT "user_streaks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_weekly_stats"
    ADD CONSTRAINT "user_weekly_stats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."xp_transactions"
    ADD CONSTRAINT "xp_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can insert lakes" ON "public"."lakes" FOR INSERT WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = ANY (ARRAY['admin@theswim.app'::"text", 'simon@example.com'::"text"])))));



CREATE POLICY "Admins can insert theme settings" ON "public"."theme_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can manage app settings" ON "public"."app_settings" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage applications" ON "public"."partner_applications" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage businesses" ON "public"."businesses" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins can manage commissions" ON "public"."commission_transactions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage partners" ON "public"."sales_partners" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can manage species tiers" ON "public"."species_tiers" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."is_admin" = true)))));



CREATE POLICY "Admins can read API usage" ON "public"."api_usage" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'super_admin'::"text"]))))));



CREATE POLICY "Admins can update lake claims" ON "public"."lake_claims" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = ANY (ARRAY['admin@theswim.app'::"text", 'simon@example.com'::"text", 'sipod1985@googlemail.com'::"text"]))))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = ANY (ARRAY['admin@theswim.app'::"text", 'simon@example.com'::"text", 'sipod1985@googlemail.com'::"text"])))));



CREATE POLICY "Admins can update lakes" ON "public"."lakes" FOR UPDATE USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = 'sipod1985@googlemail.com'::"text")))) WITH CHECK (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = 'sipod1985@googlemail.com'::"text"))));



CREATE POLICY "Admins can update reports" ON "public"."lake_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can update theme settings" ON "public"."theme_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins can view all lake claims" ON "public"."lake_claims" FOR SELECT USING (("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."email" = ANY (ARRAY['admin@theswim.app'::"text", 'simon@example.com'::"text"])))));



CREATE POLICY "Admins can view all reports" ON "public"."lake_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))));



CREATE POLICY "Admins insert activity log" ON "public"."admin_activity_log" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins manage subscriptions" ON "public"."premium_subscriptions" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Admins view activity log" ON "public"."admin_activity_log" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['admin'::"text", 'owner'::"text"]))))));



CREATE POLICY "Allow authenticated users full access" ON "public"."session_participants" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Anyone can log API usage" ON "public"."api_usage" FOR INSERT TO "authenticated" WITH CHECK (true);



CREATE POLICY "Anyone can read app settings" ON "public"."app_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can read species tiers" ON "public"."species_tiers" FOR SELECT USING (true);



CREATE POLICY "Anyone can read theme settings" ON "public"."theme_settings" FOR SELECT USING (true);



CREATE POLICY "Anyone can view active announcements" ON "public"."lake_announcements" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view all catches" ON "public"."catches" FOR SELECT USING (true);



CREATE POLICY "Anyone can view all sessions" ON "public"."sessions" FOR SELECT USING (true);



CREATE POLICY "Anyone can view businesses" ON "public"."businesses" FOR SELECT USING (true);



CREATE POLICY "Anyone can view challenges" ON "public"."challenges" FOR SELECT USING (("is_active" = true));



CREATE POLICY "Anyone can view comments on public posts" ON "public"."post_comments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_comments"."post_id") AND (("posts"."is_public" = true) OR ("posts"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Anyone can view fishing zones" ON "public"."fishing_zones" FOR SELECT USING (true);



CREATE POLICY "Anyone can view follows" ON "public"."follows" FOR SELECT USING (true);



CREATE POLICY "Anyone can view post likes" ON "public"."post_likes" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts"
  WHERE (("posts"."id" = "post_likes"."post_id") AND (("posts"."is_public" = true) OR ("posts"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Anyone can view reserved usernames" ON "public"."reserved_usernames" FOR SELECT USING (true);



CREATE POLICY "Anyone can view showcases" ON "public"."profile_showcase" FOR SELECT USING (true);



CREATE POLICY "Anyone can view species info" ON "public"."species_info" FOR SELECT USING (true);



CREATE POLICY "Anyone can view weekly species points" ON "public"."weekly_species_points" FOR SELECT USING (true);



CREATE POLICY "Approved businesses visible to all" ON "public"."businesses" FOR SELECT USING (("status" = 'approved'::"text"));



CREATE POLICY "Authenticated users can insert lakes" ON "public"."lakes" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can insert zones" ON "public"."fishing_zones" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can view profiles for sharing" ON "public"."profiles" FOR SELECT USING ((("auth"."role"() = 'authenticated'::"text") AND (("deleted_at" IS NULL) OR ("id" = "auth"."uid"()))));



CREATE POLICY "Competition creators can invite users" ON "public"."competition_invites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."competitions" "c"
  WHERE (("c"."id" = "competition_invites"."competition_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "Competition entries are viewable by participants" ON "public"."competition_entries" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."competitions" "c"
  WHERE (("c"."id" = "competition_entries"."competition_id") AND (("c"."is_public" = true) OR ("c"."created_by" = "auth"."uid"()) OR ("auth"."uid"() = "competition_entries"."user_id"))))));



CREATE POLICY "Creators can delete own competitions" ON "public"."competitions" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Creators can update own competitions" ON "public"."competitions" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "Invitees can respond to invites" ON "public"."competition_invites" FOR UPDATE USING (("auth"."uid"() = "invitee_id"));



CREATE POLICY "Invitees can update their invite status" ON "public"."competition_invites" FOR UPDATE USING (("auth"."uid"() = "invitee_id"));



CREATE POLICY "Lake team can view reports for their lakes" ON "public"."lake_reports" FOR SELECT TO "authenticated" USING (((EXISTS ( SELECT 1
   FROM "public"."lakes"
  WHERE (("lakes"."id" = "lake_reports"."lake_id") AND ("lakes"."claimed_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."lake_team"
  WHERE (("lake_team"."lake_id" = "lake_reports"."lake_id") AND ("lake_team"."user_id" = "auth"."uid"()) AND ("lake_team"."role" = 'manager'::"text"))))));



CREATE POLICY "Lake team members are viewable" ON "public"."lake_team" FOR SELECT USING (true);



CREATE POLICY "Lakes are viewable by everyone" ON "public"."lakes" FOR SELECT USING (true);



CREATE POLICY "Only organizer can declare winners" ON "public"."competition_winners" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."competitions" "c"
  WHERE (("c"."id" = "competition_winners"."competition_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "Only organizer can modify winners" ON "public"."competition_winners" USING ((EXISTS ( SELECT 1
   FROM "public"."competitions" "c"
  WHERE (("c"."id" = "competition_winners"."competition_id") AND ("c"."created_by" = "auth"."uid"())))));



CREATE POLICY "Owner or catch creator can delete" ON "public"."catches" FOR DELETE USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."session_participants" "sp"
  WHERE (("sp"."session_id" = "catches"."session_id") AND ("sp"."user_id" = "auth"."uid"()) AND ("sp"."role" = 'owner'::"text"))))));



CREATE POLICY "Owners and participants can view session catches" ON "public"."catches" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."session_participants" "sp"
  WHERE (("sp"."session_id" = "catches"."session_id") AND ("sp"."user_id" = "auth"."uid"()) AND ("sp"."status" = ANY (ARRAY['pending'::"text", 'active'::"text"])))))));



CREATE POLICY "Owners can manage their session shares" ON "public"."session_shares" USING (("auth"."uid"() = "owner_id")) WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "Owners can update their claimed lake" ON "public"."lakes" FOR UPDATE USING (("claimed_by" = "auth"."uid"())) WITH CHECK (("claimed_by" = "auth"."uid"()));



CREATE POLICY "Owners managers and admins can add team members" ON "public"."lake_team" FOR INSERT WITH CHECK ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_team"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team_1"."user_id"
   FROM "public"."lake_team" "lake_team_1"
  WHERE (("lake_team_1"."lake_id" = "lake_team_1"."lake_id") AND ("lake_team_1"."role" = 'manager'::"text"))))));



CREATE POLICY "Owners managers and admins can remove team members" ON "public"."lake_team" FOR DELETE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_team"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team_1"."user_id"
   FROM "public"."lake_team" "lake_team_1"
  WHERE (("lake_team_1"."lake_id" = "lake_team_1"."lake_id") AND ("lake_team_1"."role" = 'manager'::"text"))))));



CREATE POLICY "Owners managers and admins can update team roles" ON "public"."lake_team" FOR UPDATE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_team"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team_1"."user_id"
   FROM "public"."lake_team" "lake_team_1"
  WHERE (("lake_team_1"."lake_id" = "lake_team_1"."lake_id") AND ("lake_team_1"."role" = 'manager'::"text")))))) WITH CHECK ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_team"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team_1"."user_id"
   FROM "public"."lake_team" "lake_team_1"
  WHERE (("lake_team_1"."lake_id" = "lake_team_1"."lake_id") AND ("lake_team_1"."role" = 'manager'::"text"))))));



CREATE POLICY "Participants can view sessions they join" ON "public"."sessions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."session_participants" "sp"
  WHERE (("sp"."session_id" = "sessions"."id") AND ("sp"."user_id" = "auth"."uid"()) AND ("sp"."status" = ANY (ARRAY['pending'::"text", 'active'::"text"]))))));



CREATE POLICY "Partners can update own payment details" ON "public"."sales_partners" FOR UPDATE USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Partners can view own commissions" ON "public"."commission_transactions" FOR SELECT USING (("partner_id" IN ( SELECT "sales_partners"."id"
   FROM "public"."sales_partners"
  WHERE ("sales_partners"."user_id" = "auth"."uid"()))));



CREATE POLICY "Partners can view own data" ON "public"."sales_partners" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Profiles are viewable by everyone" ON "public"."profiles" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Public competitions are viewable by everyone" ON "public"."competitions" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "created_by")));



CREATE POLICY "Public posts are viewable by everyone" ON "public"."posts" FOR SELECT USING ((("is_public" = true) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "Session participants can create catches" ON "public"."catches" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."session_participants" "sp"
  WHERE (("sp"."session_id" = "catches"."session_id") AND ("sp"."user_id" = "auth"."uid"()) AND ("sp"."role" = ANY (ARRAY['owner'::"text", 'contributor'::"text"])) AND ("sp"."status" = 'active'::"text"))))));



CREATE POLICY "Shared users can view their shares" ON "public"."session_shares" FOR SELECT USING (("auth"."uid"() = "shared_with_user_id"));



CREATE POLICY "Staff can create announcements" ON "public"."lake_announcements" FOR INSERT WITH CHECK ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_announcements"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team"."user_id"
   FROM "public"."lake_team"
  WHERE (("lake_team"."lake_id" = "lake_team"."lake_id") AND ("lake_team"."role" = 'manager'::"text"))))));



CREATE POLICY "Staff can delete announcements" ON "public"."lake_announcements" FOR DELETE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_announcements"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team"."user_id"
   FROM "public"."lake_team"
  WHERE (("lake_team"."lake_id" = "lake_team"."lake_id") AND ("lake_team"."role" = 'manager'::"text"))))));



CREATE POLICY "Staff can update announcements" ON "public"."lake_announcements" FOR UPDATE USING ((("auth"."uid"() IN ( SELECT "profiles"."id"
   FROM "public"."profiles"
  WHERE ("profiles"."is_admin" = true))) OR ("auth"."uid"() IN ( SELECT "lakes"."claimed_by"
   FROM "public"."lakes"
  WHERE ("lakes"."id" = "lake_announcements"."lake_id"))) OR ("auth"."uid"() IN ( SELECT "lake_team"."user_id"
   FROM "public"."lake_team"
  WHERE (("lake_team"."lake_id" = "lake_team"."lake_id") AND ("lake_team"."role" = 'manager'::"text"))))));



CREATE POLICY "System can update zone stats" ON "public"."fishing_zones" FOR UPDATE USING (true);



CREATE POLICY "Users can add media to their own posts" ON "public"."post_media" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_media"."post_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can add reactions to messages in their conversations" ON "public"."message_reactions" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "cp" ON (("cp"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can block others" ON "public"."blocked_users" FOR INSERT WITH CHECK ((("auth"."uid"() = "blocker_id") AND ("blocker_id" <> "blocked_id")));



CREATE POLICY "Users can clear their own typing status" ON "public"."typing_indicators" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create business claims" ON "public"."business_claims" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create claims" ON "public"."lake_claims" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create comments" ON "public"."post_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create competition invites for competitions they own" ON "public"."competition_invites" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."competitions"
  WHERE (("competitions"."id" = "competition_invites"."competition_id") AND ("competitions"."created_by" = "auth"."uid"())))));



CREATE POLICY "Users can create competitions" ON "public"."competitions" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Users can create entries" ON "public"."competition_entries" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create lake reports" ON "public"."lake_reports" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "reporter_id"));



CREATE POLICY "Users can create marks" ON "public"."saved_marks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create own posts" ON "public"."posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can create shares for own marks" ON "public"."mark_shares" FOR INSERT WITH CHECK ((("auth"."uid"() = "shared_by") AND (EXISTS ( SELECT 1
   FROM "public"."saved_marks"
  WHERE (("saved_marks"."id" = "mark_shares"."mark_id") AND ("saved_marks"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can create their own lake claims" ON "public"."lake_claims" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete media from their own posts" ON "public"."post_media" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_media"."post_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete own comments" ON "public"."post_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own entries" ON "public"."competition_entries" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own marks" ON "public"."saved_marks" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own posts" ON "public"."posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own profile" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can delete own sessions" ON "public"."sessions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete shares they created" ON "public"."mark_shares" FOR DELETE USING (("auth"."uid"() = "shared_by"));



CREATE POLICY "Users can delete their own challenge catches" ON "public"."challenge_catches" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."user_challenges" "uc"
  WHERE (("uc"."id" = "challenge_catches"."user_challenge_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own notifications" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can follow others" ON "public"."follows" FOR INSERT WITH CHECK (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can insert own catches" ON "public"."catches" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own challenges" ON "public"."user_challenges" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can insert own sessions" ON "public"."sessions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own shares" ON "public"."achievement_shares" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert own streaks" ON "public"."user_streaks" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own challenge catches" ON "public"."challenge_catches" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_challenges" "uc"
  WHERE (("uc"."id" = "challenge_catches"."user_challenge_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can insert their own session views" ON "public"."session_views" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can like posts" ON "public"."post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own showcase" ON "public"."profile_showcase" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own weekly stats" ON "public"."user_weekly_stats" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can remove their own reactions" ON "public"."message_reactions" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can save lakes" ON "public"."saved_lakes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can set their own typing status" ON "public"."typing_indicators" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_id") AND (EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "typing_indicators"."conversation_id") AND ("cp"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can soft delete their own messages" ON "public"."messages" FOR UPDATE USING (("auth"."uid"() = "sender_id")) WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "Users can submit applications" ON "public"."partner_applications" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can submit businesses" ON "public"."businesses" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND ("status" = 'pending'::"text") AND ("source" = 'user_submitted'::"text")));



CREATE POLICY "Users can unblock" ON "public"."blocked_users" FOR DELETE USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can unfollow" ON "public"."follows" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Users can unlike posts" ON "public"."post_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can unsave lakes" ON "public"."saved_lakes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update media on their own posts" ON "public"."post_media" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_media"."post_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update own catches" ON "public"."catches" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own challenges" ON "public"."user_challenges" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own comments" ON "public"."post_comments" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own marks" ON "public"."saved_marks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own posts" ON "public"."posts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



CREATE POLICY "Users can update own sessions" ON "public"."sessions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own streaks" ON "public"."user_streaks" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own typing status" ON "public"."typing_indicators" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view invites they sent or received" ON "public"."competition_invites" FOR SELECT USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id")));



CREATE POLICY "Users can view marks shared with them" ON "public"."saved_marks" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."mark_shares"
  WHERE (("mark_shares"."mark_id" = "saved_marks"."id") AND ("mark_shares"."shared_with" = "auth"."uid"())))));



CREATE POLICY "Users can view media for visible posts" ON "public"."post_media" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."posts" "p"
  WHERE (("p"."id" = "post_media"."post_id") AND (("p"."user_id" = "auth"."uid"()) OR (("p"."is_public" = true) AND "public"."can_view_user_posts"("auth"."uid"(), "p"."user_id")))))));



CREATE POLICY "Users can view own applications" ON "public"."partner_applications" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view own blocks" ON "public"."blocked_users" FOR SELECT USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can view own business claims" ON "public"."business_claims" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own challenges" ON "public"."user_challenges" FOR SELECT USING ((("auth"."uid"() = "user_id") OR "public"."can_view_user_posts"("auth"."uid"(), "user_id")));



CREATE POLICY "Users can view own checkout sessions" ON "public"."checkout_sessions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own invites" ON "public"."competition_invites" FOR SELECT USING ((("auth"."uid"() = "inviter_id") OR ("auth"."uid"() = "invitee_id")));



CREATE POLICY "Users can view own marks" ON "public"."saved_marks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own profile" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own reports" ON "public"."lake_reports" FOR SELECT TO "authenticated" USING (("reporter_id" = "auth"."uid"()));



CREATE POLICY "Users can view own saved lakes" ON "public"."saved_lakes" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own shares" ON "public"."achievement_shares" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own streaks" ON "public"."user_streaks" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own subscriptions" ON "public"."subscriptions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own xp transactions" ON "public"."xp_transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view public marks" ON "public"."saved_marks" FOR SELECT USING (("privacy_level" = 'public'::"text"));



CREATE POLICY "Users can view public posts or posts from followed private acco" ON "public"."posts" FOR SELECT USING ((("is_public" = true) AND "public"."can_view_user_posts"("auth"."uid"(), "user_id")));



CREATE POLICY "Users can view reactions in their conversations" ON "public"."message_reactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."messages" "m"
     JOIN "public"."conversation_participants" "cp" ON (("cp"."conversation_id" = "m"."conversation_id")))
  WHERE (("m"."id" = "message_reactions"."message_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view shares they created" ON "public"."mark_shares" FOR SELECT USING (("auth"."uid"() = "shared_by"));



CREATE POLICY "Users can view shares with them" ON "public"."mark_shares" FOR SELECT USING (("auth"."uid"() = "shared_with"));



CREATE POLICY "Users can view their own challenge catches" ON "public"."challenge_catches" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_challenges" "uc"
  WHERE (("uc"."id" = "challenge_catches"."user_challenge_id") AND ("uc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view their own claims" ON "public"."lake_claims" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own lake claims" ON "public"."lake_claims" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own posts" ON "public"."posts" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can view their own session views" ON "public"."session_views" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view typing in their conversations" ON "public"."typing_indicators" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."conversation_participants" "cp"
  WHERE (("cp"."conversation_id" = "typing_indicators"."conversation_id") AND ("cp"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view weekly stats" ON "public"."user_weekly_stats" FOR SELECT USING (true);



CREATE POLICY "Winners visible to all" ON "public"."competition_winners" FOR SELECT USING (true);



ALTER TABLE "public"."achievement_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_activity_log" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."api_usage" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."app_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."blocked_users" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."business_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."catches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenge_catches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."checkout_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_entries" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_invites" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competition_winners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."competitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversation_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT USING (true);



ALTER TABLE "public"."fishing_zones" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."follows" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lake_announcements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lake_claims" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lake_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lake_team" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lakes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."mark_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."message_reactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "messages_insert" ON "public"."messages" FOR INSERT WITH CHECK (("sender_id" = "auth"."uid"()));



CREATE POLICY "messages_select" ON "public"."messages" FOR SELECT USING (true);



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_insert" ON "public"."conversation_participants" FOR INSERT WITH CHECK (("auth"."uid"() IS NOT NULL));



CREATE POLICY "participants_select" ON "public"."conversation_participants" FOR SELECT USING (true);



CREATE POLICY "participants_update" ON "public"."conversation_participants" FOR UPDATE USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."partner_applications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_comments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."post_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."posts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."premium_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profile_showcase" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reserved_usernames" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales_partners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_lakes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."saved_marks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "session_participants_own" ON "public"."session_participants" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "session_participants_owner_delete" ON "public"."session_participants" FOR DELETE TO "authenticated" USING ("public"."is_session_owner"("session_id", "auth"."uid"()));



CREATE POLICY "session_participants_owner_insert" ON "public"."session_participants" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_session_owner"("session_id", "auth"."uid"()));



CREATE POLICY "session_participants_owner_select" ON "public"."session_participants" FOR SELECT TO "authenticated" USING ("public"."is_session_owner"("session_id", "auth"."uid"()));



CREATE POLICY "session_participants_owner_update" ON "public"."session_participants" FOR UPDATE TO "authenticated" USING ("public"."is_session_owner"("session_id", "auth"."uid"())) WITH CHECK ("public"."is_session_owner"("session_id", "auth"."uid"()));



ALTER TABLE "public"."session_shares" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."session_views" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."species_info" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."species_tiers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."theme_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."typing_indicators" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_challenges" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_streaks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_weekly_stats" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."weekly_species_points" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."xp_transactions" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_session_owner_participant"() TO "anon";
GRANT ALL ON FUNCTION "public"."add_session_owner_participant"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_session_owner_participant"() TO "service_role";



GRANT ALL ON FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."adjust_competition_time"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_new_ends_at" timestamp with time zone, "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."admin_verify_catch"("p_catch_id" "uuid", "p_admin_id" "uuid", "p_level" "text", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_business"("p_business_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_business"("p_business_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_business"("p_business_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_business_claim"("p_claim_id" "uuid", "p_reviewer_id" "uuid", "p_action" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_business_claim"("p_claim_id" "uuid", "p_reviewer_id" "uuid", "p_action" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_business_claim"("p_claim_id" "uuid", "p_reviewer_id" "uuid", "p_action" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_catch"("p_catch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_catch"("p_catch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_catch"("p_catch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_competition_catch"("p_catch_id" "uuid", "p_approved" boolean, "p_approver_id" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_catch_zone"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_catch_zone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_catch_zone"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_session_zone"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_session_zone"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_session_zone"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_approve_non_competition_catch"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_approve_non_competition_catch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_approve_non_competition_catch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_reference_type" "text", "p_reference_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_reference_type" "text", "p_reference_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."award_xp"("p_user_id" "uuid", "p_amount" integer, "p_reason" "text", "p_reference_type" "text", "p_reference_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ban_user"("p_user_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_catch_verification"("p_catch_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_competition_score"("p_competition_id" "uuid", "p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_competition_score"("p_competition_id" "uuid", "p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_competition_score"("p_competition_id" "uuid", "p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_level"("total_xp" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_level"("total_xp" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_level"("total_xp" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."can_view_user_posts"("viewer_id" "uuid", "author_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_view_user_posts"("viewer_id" "uuid", "author_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_view_user_posts"("viewer_id" "uuid", "author_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_typing_indicators"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_competition_session"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_competition_session"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_competition_session"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_related_user_id" "uuid", "p_related_competition_id" "uuid", "p_related_session_id" "uuid", "p_related_catch_id" "uuid", "p_related_post_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_related_user_id" "uuid", "p_related_competition_id" "uuid", "p_related_session_id" "uuid", "p_related_catch_id" "uuid", "p_related_post_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_notification"("p_user_id" "uuid", "p_type" "text", "p_title" "text", "p_message" "text", "p_action_url" "text", "p_related_user_id" "uuid", "p_related_competition_id" "uuid", "p_related_session_id" "uuid", "p_related_catch_id" "uuid", "p_related_post_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."declare_competition_winner"("p_competition_id" "uuid", "p_organizer_id" "uuid", "p_winner_user_id" "uuid", "p_category" "text", "p_catch_id" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_partner_code"("base_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_partner_code"("base_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_partner_code"("base_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_time_catch_leaderboard"("p_water" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_api_usage_summary"("days_back" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_api_usage_summary"("days_back" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_api_usage_summary"("days_back" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_app_setting"("p_key" "text", "p_default" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."get_app_setting"("p_key" "text", "p_default" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_app_setting"("p_key" "text", "p_default" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_competition_leaderboard"("p_competition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_or_create_zone"("lat" double precision, "lng" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."get_or_create_zone"("lat" double precision, "lng" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_or_create_zone"("lat" double precision, "lng" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer, "p_days" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer, "p_days" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_species_activity"("p_species" "text", "p_lat" double precision, "p_lng" double precision, "p_radius_km" integer, "p_days" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_species_xp"("p_species" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_species_xp"("p_species" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_species_xp"("p_species" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unread_notification_count"() TO "service_role";



GRANT ALL ON TABLE "public"."posts" TO "anon";
GRANT ALL ON TABLE "public"."posts" TO "authenticated";
GRANT ALL ON TABLE "public"."posts" TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_feed"("for_user_id" "uuid", "page_limit" integer, "page_offset" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_feed"("for_user_id" "uuid", "page_limit" integer, "page_offset" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_feed"("for_user_id" "uuid", "page_limit" integer, "page_offset" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_follow_counts"("for_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_follow_counts"("for_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_follow_counts"("for_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_verification_xp_multiplier"("p_level" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_verification_xp_multiplier"("p_level" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_verification_xp_multiplier"("p_level" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_week_start"("for_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_week_start"("for_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_week_start"("for_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_weekly_catch_leaderboard"("p_week_start" timestamp with time zone, "p_water" "text", "p_limit" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."global_search"("p_query" "text", "p_limit" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_block"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_block"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_block"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_user_confirmed"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_user_confirmed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_user_confirmed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_lake_premium"("lake_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_lake_premium"("lake_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_lake_premium"("lake_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_near_lake"("lat" double precision, "lng" double precision, "radius_km" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."is_near_lake"("lat" double precision, "lng" double precision, "radius_km" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_near_lake"("lat" double precision, "lng" double precision, "radius_km" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_session_owner"("p_session_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_session_owner"("p_session_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_session_owner"("p_session_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "anon";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_all_notifications_read"() TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_notification_read"("p_notification_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_session_viewed"("p_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_competition_invite"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_competition_invite"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_competition_invite"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_competition_pending_catch"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_competition_pending_catch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_competition_pending_catch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_on_message"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_on_message"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_on_message"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_comment"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_post_like"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_session_catch"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_session_catch"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_session_catch"() TO "service_role";



GRANT ALL ON FUNCTION "public"."notify_session_join_request"() TO "anon";
GRANT ALL ON FUNCTION "public"."notify_session_join_request"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."notify_session_join_request"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_business"("p_business_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_business"("p_business_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_business"("p_business_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."reject_catch"("p_catch_id" "uuid", "p_rejection_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."reject_catch"("p_catch_id" "uuid", "p_rejection_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reject_catch"("p_catch_id" "uuid", "p_rejection_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_competition_winner"("p_winner_id" "uuid", "p_organizer_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_weekly_streak_freezes"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_weekly_streak_freezes"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_weekly_streak_freezes"() TO "service_role";



GRANT ALL ON FUNCTION "public"."restore_account"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."restore_account"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."restore_account"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_businesses_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "business_type" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."search_catches_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_catches_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_catches_in_radius"("center_lat" numeric, "center_lng" numeric, "radius_meters" integer, "limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_business_featured"("p_business_id" "uuid", "p_admin_id" "uuid", "p_position" integer, "p_expires_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."set_business_featured"("p_business_id" "uuid", "p_admin_id" "uuid", "p_position" integer, "p_expires_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_business_featured"("p_business_id" "uuid", "p_admin_id" "uuid", "p_position" integer, "p_expires_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_business_premium"("p_business_id" "uuid", "p_admin_id" "uuid", "p_expires_at" timestamp with time zone, "p_price_paid" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."set_business_premium"("p_business_id" "uuid", "p_admin_id" "uuid", "p_expires_at" timestamp with time zone, "p_price_paid" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_business_premium"("p_business_id" "uuid", "p_admin_id" "uuid", "p_expires_at" timestamp with time zone, "p_price_paid" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_lake_claimed_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_lake_claimed_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_lake_claimed_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."soft_delete_account"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."soft_delete_account"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."soft_delete_account"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats_on_delete"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats_on_delete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_update_zone_stats_on_delete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid", "p_admin_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid", "p_admin_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."unban_user"("p_user_id" "uuid", "p_admin_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_competition_leaderboard"("p_competition_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_competition_leaderboard"("p_competition_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_competition_leaderboard"("p_competition_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_competition_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_competition_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_competition_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_conversation_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lake_catch_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lake_catch_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lake_catch_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lake_reports_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lake_reports_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lake_reports_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lake_session_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lake_session_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lake_session_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lake_session_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lake_session_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lake_session_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_lakes_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_lakes_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_lakes_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_partner_signup_count"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_partner_signup_count"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_partner_signup_count"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_partner_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_partner_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_partner_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_saved_marks_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_saved_marks_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_saved_marks_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_theme_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_theme_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_theme_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_streak"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_user_weekly_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_user_weekly_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_user_weekly_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_zone_stats"("target_zone_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."update_zone_stats"("target_zone_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_zone_stats"("target_zone_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."user_lake_role"("p_lake_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."user_lake_role"("p_lake_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_lake_role"("p_lake_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_competition_catch_time"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_competition_catch_time"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_competition_catch_time"() TO "service_role";



GRANT ALL ON FUNCTION "public"."xp_for_next_level"("current_level" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."xp_for_next_level"("current_level" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."xp_for_next_level"("current_level" integer) TO "service_role";



GRANT ALL ON TABLE "public"."achievement_shares" TO "anon";
GRANT ALL ON TABLE "public"."achievement_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."achievement_shares" TO "service_role";



GRANT ALL ON TABLE "public"."admin_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_activity_log" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage" TO "anon";
GRANT ALL ON TABLE "public"."api_usage" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage" TO "service_role";



GRANT ALL ON TABLE "public"."api_usage_daily" TO "anon";
GRANT ALL ON TABLE "public"."api_usage_daily" TO "authenticated";
GRANT ALL ON TABLE "public"."api_usage_daily" TO "service_role";



GRANT ALL ON TABLE "public"."app_settings" TO "anon";
GRANT ALL ON TABLE "public"."app_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."app_settings" TO "service_role";



GRANT ALL ON TABLE "public"."blocked_users" TO "anon";
GRANT ALL ON TABLE "public"."blocked_users" TO "authenticated";
GRANT ALL ON TABLE "public"."blocked_users" TO "service_role";



GRANT ALL ON TABLE "public"."business_claims" TO "anon";
GRANT ALL ON TABLE "public"."business_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."business_claims" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON TABLE "public"."catches" TO "anon";
GRANT ALL ON TABLE "public"."catches" TO "authenticated";
GRANT ALL ON TABLE "public"."catches" TO "service_role";



GRANT ALL ON TABLE "public"."challenge_catches" TO "anon";
GRANT ALL ON TABLE "public"."challenge_catches" TO "authenticated";
GRANT ALL ON TABLE "public"."challenge_catches" TO "service_role";



GRANT ALL ON TABLE "public"."challenges" TO "anon";
GRANT ALL ON TABLE "public"."challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."challenges" TO "service_role";



GRANT ALL ON TABLE "public"."checkout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."checkout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."commission_transactions" TO "anon";
GRANT ALL ON TABLE "public"."commission_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."competition_awards" TO "anon";
GRANT ALL ON TABLE "public"."competition_awards" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_awards" TO "service_role";



GRANT ALL ON TABLE "public"."competition_entries" TO "anon";
GRANT ALL ON TABLE "public"."competition_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_entries" TO "service_role";



GRANT ALL ON TABLE "public"."competition_invites" TO "anon";
GRANT ALL ON TABLE "public"."competition_invites" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_invites" TO "service_role";



GRANT ALL ON TABLE "public"."competitions" TO "anon";
GRANT ALL ON TABLE "public"."competitions" TO "authenticated";
GRANT ALL ON TABLE "public"."competitions" TO "service_role";



GRANT ALL ON TABLE "public"."competition_stats" TO "anon";
GRANT ALL ON TABLE "public"."competition_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_stats" TO "service_role";



GRANT ALL ON TABLE "public"."competition_winners" TO "anon";
GRANT ALL ON TABLE "public"."competition_winners" TO "authenticated";
GRANT ALL ON TABLE "public"."competition_winners" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_participants" TO "anon";
GRANT ALL ON TABLE "public"."conversation_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_participants" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."fishing_zones" TO "anon";
GRANT ALL ON TABLE "public"."fishing_zones" TO "authenticated";
GRANT ALL ON TABLE "public"."fishing_zones" TO "service_role";



GRANT ALL ON TABLE "public"."follows" TO "anon";
GRANT ALL ON TABLE "public"."follows" TO "authenticated";
GRANT ALL ON TABLE "public"."follows" TO "service_role";



GRANT ALL ON TABLE "public"."lake_announcements" TO "anon";
GRANT ALL ON TABLE "public"."lake_announcements" TO "authenticated";
GRANT ALL ON TABLE "public"."lake_announcements" TO "service_role";



GRANT ALL ON TABLE "public"."lake_claims" TO "anon";
GRANT ALL ON TABLE "public"."lake_claims" TO "authenticated";
GRANT ALL ON TABLE "public"."lake_claims" TO "service_role";



GRANT ALL ON TABLE "public"."lake_reports" TO "anon";
GRANT ALL ON TABLE "public"."lake_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."lake_reports" TO "service_role";



GRANT ALL ON TABLE "public"."lake_team" TO "anon";
GRANT ALL ON TABLE "public"."lake_team" TO "authenticated";
GRANT ALL ON TABLE "public"."lake_team" TO "service_role";



GRANT ALL ON TABLE "public"."lakes" TO "anon";
GRANT ALL ON TABLE "public"."lakes" TO "authenticated";
GRANT ALL ON TABLE "public"."lakes" TO "service_role";



GRANT ALL ON TABLE "public"."mark_shares" TO "anon";
GRANT ALL ON TABLE "public"."mark_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."mark_shares" TO "service_role";



GRANT ALL ON TABLE "public"."message_reactions" TO "anon";
GRANT ALL ON TABLE "public"."message_reactions" TO "authenticated";
GRANT ALL ON TABLE "public"."message_reactions" TO "service_role";



GRANT ALL ON TABLE "public"."messages" TO "anon";
GRANT ALL ON TABLE "public"."messages" TO "authenticated";
GRANT ALL ON TABLE "public"."messages" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."my_pending_invitations" TO "anon";
GRANT ALL ON TABLE "public"."my_pending_invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."my_pending_invitations" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."partner_applications" TO "anon";
GRANT ALL ON TABLE "public"."partner_applications" TO "authenticated";
GRANT ALL ON TABLE "public"."partner_applications" TO "service_role";



GRANT ALL ON TABLE "public"."post_comments" TO "anon";
GRANT ALL ON TABLE "public"."post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."post_likes" TO "anon";
GRANT ALL ON TABLE "public"."post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."post_media" TO "anon";
GRANT ALL ON TABLE "public"."post_media" TO "authenticated";
GRANT ALL ON TABLE "public"."post_media" TO "service_role";



GRANT ALL ON TABLE "public"."premium_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."premium_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."premium_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."profile_showcase" TO "anon";
GRANT ALL ON TABLE "public"."profile_showcase" TO "authenticated";
GRANT ALL ON TABLE "public"."profile_showcase" TO "service_role";



GRANT ALL ON TABLE "public"."reserved_usernames" TO "anon";
GRANT ALL ON TABLE "public"."reserved_usernames" TO "authenticated";
GRANT ALL ON TABLE "public"."reserved_usernames" TO "service_role";



GRANT ALL ON TABLE "public"."sales_partners" TO "anon";
GRANT ALL ON TABLE "public"."sales_partners" TO "authenticated";
GRANT ALL ON TABLE "public"."sales_partners" TO "service_role";



GRANT ALL ON TABLE "public"."saved_lakes" TO "anon";
GRANT ALL ON TABLE "public"."saved_lakes" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_lakes" TO "service_role";



GRANT ALL ON TABLE "public"."saved_marks" TO "anon";
GRANT ALL ON TABLE "public"."saved_marks" TO "authenticated";
GRANT ALL ON TABLE "public"."saved_marks" TO "service_role";



GRANT ALL ON TABLE "public"."session_participants" TO "anon";
GRANT ALL ON TABLE "public"."session_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."session_participants" TO "service_role";



GRANT ALL ON TABLE "public"."session_shares" TO "anon";
GRANT ALL ON TABLE "public"."session_shares" TO "authenticated";
GRANT ALL ON TABLE "public"."session_shares" TO "service_role";



GRANT ALL ON TABLE "public"."session_views" TO "anon";
GRANT ALL ON TABLE "public"."session_views" TO "authenticated";
GRANT ALL ON TABLE "public"."session_views" TO "service_role";



GRANT ALL ON TABLE "public"."sessions" TO "anon";
GRANT ALL ON TABLE "public"."sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."sessions" TO "service_role";



GRANT ALL ON TABLE "public"."species_info" TO "anon";
GRANT ALL ON TABLE "public"."species_info" TO "authenticated";
GRANT ALL ON TABLE "public"."species_info" TO "service_role";



GRANT ALL ON TABLE "public"."species_tiers" TO "anon";
GRANT ALL ON TABLE "public"."species_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."species_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."theme_settings" TO "anon";
GRANT ALL ON TABLE "public"."theme_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."theme_settings" TO "service_role";



GRANT ALL ON TABLE "public"."typing_indicators" TO "anon";
GRANT ALL ON TABLE "public"."typing_indicators" TO "authenticated";
GRANT ALL ON TABLE "public"."typing_indicators" TO "service_role";



GRANT ALL ON TABLE "public"."user_challenges" TO "anon";
GRANT ALL ON TABLE "public"."user_challenges" TO "authenticated";
GRANT ALL ON TABLE "public"."user_challenges" TO "service_role";



GRANT ALL ON TABLE "public"."user_streaks" TO "anon";
GRANT ALL ON TABLE "public"."user_streaks" TO "authenticated";
GRANT ALL ON TABLE "public"."user_streaks" TO "service_role";



GRANT ALL ON TABLE "public"."user_weekly_stats" TO "anon";
GRANT ALL ON TABLE "public"."user_weekly_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."user_weekly_stats" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_species_points" TO "anon";
GRANT ALL ON TABLE "public"."weekly_species_points" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_species_points" TO "service_role";



GRANT ALL ON TABLE "public"."xp_transactions" TO "anon";
GRANT ALL ON TABLE "public"."xp_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."xp_transactions" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







