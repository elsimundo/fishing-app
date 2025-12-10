-- Add admin role column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Create index for admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = true;

-- Update your profile to be admin (replace with your actual user email)
-- Uncomment and update the email below:
-- UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';

-- Or set by user_id if you know it:
-- UPDATE profiles SET is_admin = true WHERE id = 'your-user-id-here';
