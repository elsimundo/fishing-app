-- Improve global search: return slug for challenges, add fuzzy matching with pg_trgm

-- Enable pg_trgm extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes for better search performance
CREATE INDEX IF NOT EXISTS idx_profiles_username_trgm ON profiles USING gin (username gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name_trgm ON profiles USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lakes_name_trgm ON lakes USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_businesses_name_trgm ON businesses USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_species_info_display_name_trgm ON species_info USING gin (display_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_challenges_title_trgm ON challenges USING gin (title gin_trgm_ops);

-- Drop and recreate global_search with improvements:
-- 1. Return slug for challenges (not id) so routing works
-- 2. Use similarity() for fuzzy matching with fallback to ILIKE
DROP FUNCTION IF EXISTS global_search(text, integer);

CREATE FUNCTION global_search(
  p_query text,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  type text,
  id text,
  title text,
  subtitle text,
  image_url text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
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

ALTER FUNCTION global_search(text, integer) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION global_search(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION global_search(text, integer) TO anon;
