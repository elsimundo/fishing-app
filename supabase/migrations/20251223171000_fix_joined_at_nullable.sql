-- Fix joined_at to be nullable for pending invitations
-- Users who are invited but haven't accepted yet should have null joined_at

ALTER TABLE session_participants 
ALTER COLUMN joined_at DROP NOT NULL;

-- Update the constraint to ensure joined_at is set when status becomes 'active'
-- This is handled by application logic when accepting invitations
