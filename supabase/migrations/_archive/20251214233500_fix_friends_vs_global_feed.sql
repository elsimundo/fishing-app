-- Ensure Friends feed includes followed private accounts, while Global feed can exclude them at query time.

-- Friends feed: include own posts + posts from users you follow.
-- Visibility is further constrained by existing RLS (can_view_user_posts), so private accounts only show to followers.

-- Drop existing function first (return type may have changed)
DROP FUNCTION IF EXISTS get_user_feed(uuid, integer, integer);

CREATE OR REPLACE FUNCTION get_user_feed(
  for_user_id uuid,
  page_limit integer DEFAULT 20,
  page_offset integer DEFAULT 0
)
RETURNS SETOF posts
LANGUAGE sql
SECURITY INVOKER
STABLE
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

ALTER FUNCTION get_user_feed(uuid, integer, integer) SET search_path = public, pg_catalog;
