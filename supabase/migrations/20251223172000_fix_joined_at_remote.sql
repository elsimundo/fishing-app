-- Fix joined_at to be nullable for pending invitations (remote database fix)
-- This migration can be safely run multiple times

DO $$ 
BEGIN
  -- Check if the column is NOT NULL and change it if needed
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'session_participants' 
      AND column_name = 'joined_at' 
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE session_participants ALTER COLUMN joined_at DROP NOT NULL;
    RAISE NOTICE 'joined_at column is now nullable';
  ELSE
    RAISE NOTICE 'joined_at column is already nullable';
  END IF;
END $$;
