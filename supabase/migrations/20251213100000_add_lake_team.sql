-- ============================================================================
-- Lake Team: Multi-user access for lake owners
-- ============================================================================
-- Allows lake owners to add managers and bailiffs who can access the owner dashboard

CREATE TABLE IF NOT EXISTS lake_team (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lake_id UUID NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('manager', 'bailiff')),
  invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (lake_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lake_team_lake_id ON lake_team(lake_id);
CREATE INDEX IF NOT EXISTS idx_lake_team_user_id ON lake_team(user_id);

-- Enable RLS
ALTER TABLE lake_team ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Anyone can see team members for lakes (public info for transparency)
DROP POLICY IF EXISTS "Lake team members are viewable" ON lake_team;
CREATE POLICY "Lake team members are viewable"
  ON lake_team FOR SELECT
  USING (true);

-- Only lake owner or existing managers can add team members
DROP POLICY IF EXISTS "Owners and managers can add team members" ON lake_team;
CREATE POLICY "Owners and managers can add team members"
  ON lake_team FOR INSERT
  WITH CHECK (
    -- User is the lake owner
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    -- User is a manager of this lake
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );

-- Only lake owner or managers can remove team members (but not themselves if they're the only manager)
DROP POLICY IF EXISTS "Owners and managers can remove team members" ON lake_team;
CREATE POLICY "Owners and managers can remove team members"
  ON lake_team FOR DELETE
  USING (
    -- User is the lake owner
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    -- User is a manager of this lake
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );

-- Only lake owner or managers can update roles
DROP POLICY IF EXISTS "Owners and managers can update team roles" ON lake_team;
CREATE POLICY "Owners and managers can update team roles"
  ON lake_team FOR UPDATE
  USING (
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  )
  WITH CHECK (
    auth.uid() IN (SELECT claimed_by FROM lakes WHERE id = lake_id)
    OR
    auth.uid() IN (SELECT user_id FROM lake_team WHERE lake_team.lake_id = lake_id AND role = 'manager')
  );

-- ============================================================================
-- Helper function to check if user has lake access
-- ============================================================================

CREATE OR REPLACE FUNCTION user_lake_role(p_lake_id UUID, p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Check if user is the owner
  IF EXISTS (SELECT 1 FROM lakes WHERE id = p_lake_id AND claimed_by = p_user_id) THEN
    RETURN 'owner';
  END IF;
  
  -- Check lake_team for manager/bailiff role
  SELECT role INTO v_role
  FROM lake_team
  WHERE lake_id = p_lake_id AND user_id = p_user_id;
  
  RETURN v_role; -- Returns NULL if no role found
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
