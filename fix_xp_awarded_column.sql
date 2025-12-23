-- Add xp_awarded column to catches table if it doesn't exist
ALTER TABLE catches ADD COLUMN IF NOT EXISTS xp_awarded integer;

-- Update the trigger function to not reference xp_awarded if it's null
CREATE OR REPLACE FUNCTION public.update_user_weekly_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_species_points INT := 0;
BEGIN
  v_week_start := date_trunc('week', NEW.caught_at)::DATE;
  
  SELECT points INTO v_species_points
  FROM weekly_species_points
  WHERE species = NEW.species
    AND week_start = v_week_start
  LIMIT 1;
  
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
    0, -- Don't reference NEW.xp_awarded since it might not exist yet
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, week_start)
  DO UPDATE SET
    catches_count = user_weekly_stats.catches_count + 1,
    species_points = user_weekly_stats.species_points + COALESCE(v_species_points, 0),
    updated_at = NOW();
  
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

GRANT EXECUTE ON FUNCTION public.update_user_weekly_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_weekly_stats() TO anon;
