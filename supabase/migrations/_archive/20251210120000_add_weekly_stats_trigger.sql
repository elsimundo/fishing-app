-- Function to update user_weekly_stats when a catch is logged
CREATE OR REPLACE FUNCTION update_user_weekly_stats()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update weekly stats when a catch is inserted
DROP TRIGGER IF EXISTS trigger_update_weekly_stats ON catches;
CREATE TRIGGER trigger_update_weekly_stats
  AFTER INSERT ON catches
  FOR EACH ROW
  EXECUTE FUNCTION update_user_weekly_stats();

-- Backfill existing catches for this week (run once)
DO $$
DECLARE
  v_week_start DATE := date_trunc('week', NOW())::DATE;
BEGIN
  -- Clear this week's stats first
  DELETE FROM user_weekly_stats WHERE week_start = v_week_start;
  
  -- Recalculate from catches
  INSERT INTO user_weekly_stats (user_id, week_start, catches_count, fishing_days, species_points, xp_earned)
  SELECT 
    c.user_id,
    v_week_start,
    COUNT(*) as catches_count,
    COUNT(DISTINCT DATE(c.caught_at)) as fishing_days,
    COALESCE(SUM(wsp.points), 0) as species_points,
    0 as xp_earned
  FROM catches c
  LEFT JOIN weekly_species_points wsp 
    ON wsp.species = c.species 
    AND wsp.week_start = v_week_start
  WHERE c.caught_at >= v_week_start
    AND c.caught_at < v_week_start + INTERVAL '7 days'
  GROUP BY c.user_id;
END $$;

COMMENT ON FUNCTION update_user_weekly_stats() IS 'Updates user_weekly_stats table when a catch is logged, calculating species points and fishing days';
