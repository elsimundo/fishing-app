-- Add auto_share_achievements column to profiles
-- Controls whether achievements/milestones are automatically posted to feed
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS auto_share_achievements boolean DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN profiles.auto_share_achievements IS 'When true, badges, level ups, and other achievements are automatically posted to the user feed';
