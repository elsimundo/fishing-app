-- Add support for multi-image posts

CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, position)
);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id_position ON post_media(post_id, position);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

-- View media if user can view the parent post
DROP POLICY IF EXISTS "Users can view media for visible posts" ON post_media;
CREATE POLICY "Users can view media for visible posts" ON post_media
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = post_media.post_id
        AND (
          p.user_id = auth.uid()
          OR (p.is_public = true AND can_view_user_posts(auth.uid(), p.user_id))
        )
    )
  );

-- Insert media only for own posts
DROP POLICY IF EXISTS "Users can add media to their own posts" ON post_media;
CREATE POLICY "Users can add media to their own posts" ON post_media
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

-- Update media only for own posts
DROP POLICY IF EXISTS "Users can update media on their own posts" ON post_media;
CREATE POLICY "Users can update media on their own posts" ON post_media
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

-- Delete media only for own posts
DROP POLICY IF EXISTS "Users can delete media from their own posts" ON post_media;
CREATE POLICY "Users can delete media from their own posts" ON post_media
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

COMMENT ON TABLE post_media IS 'Ordered media items for multi-image posts';
