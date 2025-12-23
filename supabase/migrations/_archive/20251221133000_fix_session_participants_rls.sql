-- Fix RLS policies for session_participants to allow session owners to manage participants

-- Drop the restrictive policy
DROP POLICY IF EXISTS "session_participants_own_rows" ON session_participants;

-- Users can SELECT their own participant records
CREATE POLICY "session_participants_select_own"
  ON session_participants FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Session owners can SELECT all participants in their sessions
CREATE POLICY "session_participants_select_owner"
  ON session_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can INSERT their own participant records (for join requests)
CREATE POLICY "session_participants_insert_own"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Session owners can INSERT participants (for invites)
CREATE POLICY "session_participants_insert_owner"
  ON session_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can UPDATE their own participant records
CREATE POLICY "session_participants_update_own"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Session owners can UPDATE any participant in their sessions (accept/decline/change role)
CREATE POLICY "session_participants_update_owner"
  ON session_participants FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.user_id = auth.uid()
    )
  );

-- Users can DELETE their own participant records (leave session)
CREATE POLICY "session_participants_delete_own"
  ON session_participants FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Session owners can DELETE any participant in their sessions (remove participant)
CREATE POLICY "session_participants_delete_owner"
  ON session_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sessions 
      WHERE sessions.id = session_participants.session_id 
      AND sessions.user_id = auth.uid()
    )
  );
