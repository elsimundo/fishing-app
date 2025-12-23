-- Lake Reports table for users to report problems with lake listings
CREATE TABLE IF NOT EXISTS lake_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lake_id UUID NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN (
    'not_a_fishing_lake',    -- OSM lake that isn't actually for fishing
    'incorrect_info',        -- Wrong address, phone, website, etc.
    'duplicate',             -- This lake is a duplicate of another
    'closed_permanently',    -- Venue has closed down
    'safety_issue',          -- Safety concern at the venue
    'access_problem',        -- Can't access the venue as described
    'inappropriate_content', -- Offensive content in description/photos
    'other'                  -- Other issue
  )),
  details TEXT,              -- Additional details from reporter
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  admin_notes TEXT,          -- Notes from admin who reviewed
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX idx_lake_reports_lake_id ON lake_reports(lake_id);
CREATE INDEX idx_lake_reports_status ON lake_reports(status);
CREATE INDEX idx_lake_reports_created_at ON lake_reports(created_at DESC);

-- RLS policies for lake_reports
ALTER TABLE lake_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports
CREATE POLICY "Users can create lake reports"
  ON lake_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
  ON lake_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Admins can view all reports
CREATE POLICY "Admins can view all reports"
  ON lake_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Lake owners/managers can view reports for their lakes
CREATE POLICY "Lake team can view reports for their lakes"
  ON lake_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM lakes WHERE id = lake_id AND claimed_by = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM lake_team WHERE lake_id = lake_reports.lake_id AND user_id = auth.uid() AND role = 'manager'
    )
  );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
  ON lake_reports FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Add new notification types to the notifications table
-- First, let's check if we need to alter the type constraint
DO $$
BEGIN
  -- Drop the existing check constraint if it exists
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  
  -- Add new check constraint with lake-related types
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (
    type IN (
      -- Existing types
      'competition_invite', 'competition_starting_soon', 'competition_winner',
      'catch_approved', 'catch_rejected',
      'post_like', 'post_comment',
      'follow', 'session_catch', 'message', 'share',
      -- New lake team types
      'lake_team_invite',      -- You've been added to a lake team
      'lake_team_removed',     -- You've been removed from a lake team
      'lake_team_role_changed', -- Your role has changed
      'lake_claim_submitted',  -- Admin: someone submitted a claim
      'lake_claim_approved',   -- Your claim was approved
      'lake_claim_rejected',   -- Your claim was rejected
      'lake_problem_reported'  -- Owner/team: someone reported a problem
    )
  );
END $$;

-- Add related_lake_id column to notifications if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'related_lake_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN related_lake_id UUID REFERENCES lakes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Trigger to update updated_at on lake_reports
CREATE OR REPLACE FUNCTION update_lake_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lake_reports_updated_at ON lake_reports;
CREATE TRIGGER lake_reports_updated_at
  BEFORE UPDATE ON lake_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_lake_reports_updated_at();
