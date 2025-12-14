-- ============================================================================
-- Add admin bypass to lake_team RLS policies
-- ============================================================================
-- Admins should be able to manage lake teams for any lake

-- Drop existing policies
DROP POLICY IF EXISTS "Owners and managers can add team members" ON lake_team;
DROP POLICY IF EXISTS "Owners and managers can remove team members" ON lake_team;
DROP POLICY IF EXISTS "Owners and managers can update team roles" ON lake_team;

-- Recreate INSERT policy with admin bypass
CREATE POLICY "Owners managers and admins can add team members"
  ON lake_team FOR INSERT
  WITH CHECK (
    -- User is an admin
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
    OR
    -- User is the lake owner
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    -- User is a manager of this lake
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );

-- Recreate DELETE policy with admin bypass
CREATE POLICY "Owners managers and admins can remove team members"
  ON lake_team FOR DELETE
  USING (
    -- User is an admin
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
    OR
    -- User is the lake owner
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    -- User is a manager of this lake
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );

-- Recreate UPDATE policy with admin bypass
CREATE POLICY "Owners managers and admins can update team roles"
  ON lake_team FOR UPDATE
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
    OR
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE is_admin = true)
    OR
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );
