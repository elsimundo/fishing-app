DROP FUNCTION IF EXISTS get_weekly_catch_leaderboard(timestamptz, text, integer);

ALTER TABLE session_participants
ADD COLUMN IF NOT EXISTS water_type text;

CREATE FUNCTION get_weekly_catch_leaderboard(
  p_week_start timestamptz,
  p_water text,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  user_id uuid,
  catches_count integer
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  WITH base AS (
    SELECT
      c.user_id,
      c.caught_at,
      COALESCE(sp.water_type, s.water_type) AS raw_water_type
    FROM catches c
    LEFT JOIN sessions s ON s.id = c.session_id
    LEFT JOIN session_participants sp
      ON sp.session_id = c.session_id
      AND sp.user_id = c.user_id
    WHERE c.caught_at >= p_week_start
      AND COALESCE(c.is_backlog, false) = false
      AND COALESCE(c.is_public, true) = true
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

ALTER FUNCTION get_weekly_catch_leaderboard(timestamptz, text, integer) SET search_path = public, pg_catalog;

REVOKE ALL ON FUNCTION get_weekly_catch_leaderboard(timestamptz, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_weekly_catch_leaderboard(timestamptz, text, integer) TO authenticated;
