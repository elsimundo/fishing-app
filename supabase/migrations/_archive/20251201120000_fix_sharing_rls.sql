-- Phase 2A: fix sharing RLS by adding owner_id to session_shares

-- 1) Add owner_id column referencing profiles
ALTER TABLE session_shares
ADD COLUMN owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 2) Backfill owner_id from sessions.user_id
UPDATE session_shares ss
SET owner_id = s.user_id
FROM sessions s
WHERE ss.session_id = s.id;

-- 3) Make owner_id required
ALTER TABLE session_shares
ALTER COLUMN owner_id SET NOT NULL;

-- 4) Index for performance
CREATE INDEX IF NOT EXISTS idx_session_shares_owner ON session_shares(owner_id);

-- 5) Drop existing permissive policies on session_shares (adjust names as needed)
DROP POLICY IF EXISTS "session_shares_auth_select" ON session_shares;
DROP POLICY IF EXISTS "session_shares_auth_insert" ON session_shares;
DROP POLICY IF EXISTS "session_shares_auth_delete" ON session_shares;
DROP POLICY IF EXISTS "Owners can manage their session shares" ON session_shares;
DROP POLICY IF EXISTS "Shared users can view their shares" ON session_shares;

-- 6) New tight, non-recursive policies on session_shares
ALTER TABLE session_shares ENABLE ROW LEVEL SECURITY;

-- Owners can fully manage shares for their sessions
CREATE POLICY "Owners can manage their session shares"
ON session_shares
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Shared users can read rows where they are the viewer
CREATE POLICY "Shared users can view their shares"
ON session_shares
FOR SELECT
USING (auth.uid() = shared_with_user_id);

-- 7) Fix sessions policies to allow owner OR shared viewers
DROP POLICY IF EXISTS "sessions_owner_full_access" ON sessions;
DROP POLICY IF EXISTS "Users can view sessions they own or are shared with" ON sessions;
DROP POLICY IF EXISTS "Users can insert own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON sessions;

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- View: owner OR shared via session_shares
CREATE POLICY "Users can view sessions they own or are shared with"
ON sessions
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM session_shares ss
    WHERE ss.session_id = sessions.id
      AND ss.shared_with_user_id = auth.uid()
  )
);

-- Insert / update / delete: owner only
CREATE POLICY "Users can insert own sessions"
ON sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sessions"
ON sessions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sessions"
ON sessions
FOR DELETE
USING (auth.uid() = user_id);

-- 8) Fix catches policies to allow shared viewers
DROP POLICY IF EXISTS "Users can view catches they own or are shared with" ON catches;
DROP POLICY IF EXISTS "Users can view own catches" ON catches;
DROP POLICY IF EXISTS "Users can insert own catches" ON catches;
DROP POLICY IF EXISTS "Users can update own catches" ON catches;
DROP POLICY IF EXISTS "Users can delete own catches" ON catches;

ALTER TABLE catches ENABLE ROW LEVEL SECURITY;

-- View: owner OR shared viewer via session_shares/sessions
CREATE POLICY "Users can view catches they own or are shared with"
ON catches
FOR SELECT
USING (
  auth.uid() = user_id
  OR EXISTS (
    SELECT 1
    FROM session_shares ss
    JOIN sessions s ON ss.session_id = s.id
    WHERE s.id = catches.session_id
      AND ss.shared_with_user_id = auth.uid()
  )
);

-- Insert / update / delete: owner only
CREATE POLICY "Users can insert own catches"
ON catches
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own catches"
ON catches
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own catches"
ON catches
FOR DELETE
USING (auth.uid() = user_id);
