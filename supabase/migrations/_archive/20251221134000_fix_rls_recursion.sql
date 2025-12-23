-- Fix infinite recursion in session_participants RLS policies
-- The issue is that policies reference sessions table which has its own RLS

-- Drop all the problematic policies
DROP POLICY IF EXISTS "session_participants_select_own" ON session_participants;
DROP POLICY IF EXISTS "session_participants_select_owner" ON session_participants;
DROP POLICY IF EXISTS "session_participants_insert_own" ON session_participants;
DROP POLICY IF EXISTS "session_participants_insert_owner" ON session_participants;
DROP POLICY IF EXISTS "session_participants_update_own" ON session_participants;
DROP POLICY IF EXISTS "session_participants_update_owner" ON session_participants;
DROP POLICY IF EXISTS "session_participants_delete_own" ON session_participants;
DROP POLICY IF EXISTS "session_participants_delete_owner" ON session_participants;

-- Create a simple, non-recursive policy
-- Users can see and manage their own participant records
CREATE POLICY "session_participants_own"
  ON session_participants FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session owners can manage participants via a security definer function
-- This avoids RLS recursion by using a function that bypasses RLS

-- Function to check if user owns a session (bypasses RLS)
CREATE OR REPLACE FUNCTION is_session_owner(p_session_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM sessions 
    WHERE id = p_session_id AND user_id = p_user_id
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Session owners can SELECT participants in their sessions
CREATE POLICY "session_participants_owner_select"
  ON session_participants FOR SELECT
  TO authenticated
  USING (is_session_owner(session_id, auth.uid()));

-- Session owners can INSERT participants (invites)
CREATE POLICY "session_participants_owner_insert"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (is_session_owner(session_id, auth.uid()));

-- Session owners can UPDATE participants (accept/decline/change role)
CREATE POLICY "session_participants_owner_update"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (is_session_owner(session_id, auth.uid()))
  WITH CHECK (is_session_owner(session_id, auth.uid()));

-- Session owners can DELETE participants (remove)
CREATE POLICY "session_participants_owner_delete"
  ON session_participants FOR DELETE
  TO authenticated
  USING (is_session_owner(session_id, auth.uid()));
