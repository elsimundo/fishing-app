-- Global search RPC for unified search across entities
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
    -- Users (profiles)
    SELECT
      'user' AS type,
      p.id::text AS id,
      COALESCE(p.full_name, p.username) AS title,
      '@' || p.username AS subtitle,
      p.avatar_url AS image_url,
      1 AS priority
    FROM profiles p
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        p.username ILIKE '%' || i.q || '%'
        OR p.full_name ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Lakes
    SELECT
      'lake' AS type,
      l.id::text AS id,
      l.name AS title,
      COALESCE(l.region, l.address, 'Lake') AS subtitle,
      l.cover_image_url AS image_url,
      2 AS priority
    FROM lakes l
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        l.name ILIKE '%' || i.q || '%'
        OR l.address ILIKE '%' || i.q || '%'
        OR l.region ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Businesses (non-charter: tackle_shop, club, guide)
    SELECT
      'business' AS type,
      b.id::text AS id,
      b.name AS title,
      COALESCE(b.address, b.city, initcap(replace(b.type::text, '_', ' '))) AS subtitle,
      NULL AS image_url,
      3 AS priority
    FROM businesses b
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND b.type != 'charter'
      AND (b.status IS NULL OR b.status = 'approved')
      AND (
        b.name ILIKE '%' || i.q || '%'
        OR b.address ILIKE '%' || i.q || '%'
        OR b.city ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Charters (separate category)
    SELECT
      'charter' AS type,
      b.id::text AS id,
      b.name AS title,
      COALESCE(b.address, b.city, 'Charter Boat') AS subtitle,
      NULL AS image_url,
      4 AS priority
    FROM businesses b
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND b.type = 'charter'
      AND (b.status IS NULL OR b.status = 'approved')
      AND (
        b.name ILIKE '%' || i.q || '%'
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
      5 AS priority
    FROM saved_marks m
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND m.privacy_level = 'public'
      AND (
        m.name ILIKE '%' || i.q || '%'
      )

    UNION ALL

    -- Species
    SELECT
      'species' AS type,
      s.id::text AS id,
      s.display_name AS title,
      initcap(s.water_type::text) AS subtitle,
      NULL AS image_url,
      6 AS priority
    FROM species_info s
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        s.display_name ILIKE '%' || i.q || '%'
        OR s.name ILIKE '%' || i.q || '%'
        OR EXISTS (
          SELECT 1
          FROM unnest(s.common_names) cn
          WHERE cn ILIKE '%' || i.q || '%'
        )
      )

    UNION ALL

    -- Challenges
    SELECT
      'challenge' AS type,
      c.id::text AS id,
      c.title AS title,
      c.category AS subtitle,
      c.icon AS image_url,
      7 AS priority
    FROM challenges c
    JOIN input i ON true
    WHERE i.q IS NOT NULL
      AND (
        c.title ILIKE '%' || i.q || '%'
      )
  )
  SELECT r.type, r.id, r.title, r.subtitle, r.image_url
  FROM results r
  ORDER BY r.priority, r.title
  LIMIT GREATEST(1, LEAST(p_limit, 50));
$$;

ALTER FUNCTION global_search(text, integer) SET search_path = public, pg_catalog;
REVOKE ALL ON FUNCTION global_search(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION global_search(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION global_search(text, integer) TO anon;
