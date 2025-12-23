-- Fix the trigger function to run with elevated privileges
-- This allows it to bypass RLS policies when updating user_weekly_stats

CREATE OR REPLACE FUNCTION public.update_user_weekly_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- This makes the function run with the privileges of the function owner (postgres)
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_species_points INT := 0;
BEGIN
  -- Calculate week start (Monday)
  v_week_start := date_trunc('week', NEW.caught_at)::DATE;
  
  -- Get species points for this week
  SELECT points INTO v_species_points
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
    xp_earned,
    created_at,
    updated_at
  )
  VALUES (
    NEW.user_id,
    v_week_start,
    1,
    1,
    COALESCE(v_species_points, 0),
    COALESCE(NEW.xp_awarded, 0),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    catches_count = user_weekly_stats.catches_count + 1,
    species_points = user_weekly_stats.species_points + COALESCE(v_species_points, 0),
    updated_at = NOW();
  
  -- Recalculate fishing_days (distinct days with sessions or catches this week)
  UPDATE user_weekly_stats
  SET fishing_days = (
    SELECT COUNT(DISTINCT DATE(caught_at))
    FROM catches
    WHERE user_id = NEW.user_id
      AND DATE(caught_at) >= v_week_start
      AND DATE(caught_at) < v_week_start + INTERVAL '7 days'
  )
  WHERE user_id = NEW.user_id
    AND week_start = v_week_start;
  
  RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.update_user_weekly_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_weekly_stats() TO anon;
