-- Clean up and reset session_shares policies
DROP POLICY IF EXISTS "session_shares_auth_select" ON session_shares;
DROP POLICY IF EXISTS "session_shares_auth_insert" ON session_shares;
DROP POLICY IF EXISTS "session_shares_auth_delete" ON session_shares;
DROP POLICY IF EXISTS "Users can view own session shares" ON session_shares;
DROP POLICY IF EXISTS "Users can manage session shares" ON session_shares;
DROP POLICY IF EXISTS "Owners can manage their session shares" ON session_shares;
DROP POLICY IF EXISTS "Shared users can view their shares" ON session_shares;

ALTER TABLE session_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their session shares"
ON session_shares
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Shared users can view their shares"
ON session_shares
FOR SELECT
USING (auth.uid() = shared_with_user_id);