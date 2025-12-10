-- ============================================================================
-- Profile Privacy: Add is_private column for account-level privacy
-- ============================================================================

-- Add is_private column to profiles (default false = public account)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;

-- Index for filtering
CREATE INDEX IF NOT EXISTS idx_profiles_is_private ON profiles(is_private);

-- ============================================================================
-- Update feed query to respect privacy
-- Posts from private accounts should only be visible to:
-- 1. The post author themselves
-- 2. Users who follow the author
-- ============================================================================

-- Create a function to check if a user can view posts from another user
CREATE OR REPLACE FUNCTION can_view_user_posts(viewer_id UUID, author_id UUID)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policy for posts to use the privacy check
DROP POLICY IF EXISTS "Users can view public posts or posts from followed private accounts" ON posts;
CREATE POLICY "Users can view public posts or posts from followed private accounts" ON posts
  FOR SELECT USING (
    -- Post must be public AND (author is public OR viewer follows author OR is own post)
    is_public = true 
    AND can_view_user_posts(auth.uid(), user_id)
  );

-- Keep existing policies for own posts
DROP POLICY IF EXISTS "Users can view their own posts" ON posts;
CREATE POLICY "Users can view their own posts" ON posts
  FOR SELECT USING (user_id = auth.uid());
