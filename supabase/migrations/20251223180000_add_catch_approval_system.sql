-- Add approval system for catches logged by others
-- When someone logs a catch for another person, it needs approval

-- 1. Add approval_status column to catches
ALTER TABLE catches ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved';
ALTER TABLE catches ADD COLUMN IF NOT EXISTS approval_requested_at timestamptz;
ALTER TABLE catches ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- Set default based on logged_by_user_id
-- If logged_by_user_id is different from user_id, it needs approval
UPDATE catches 
SET approval_status = CASE 
  WHEN logged_by_user_id IS NOT NULL AND logged_by_user_id != user_id THEN 'pending'
  ELSE 'approved'
END
WHERE approval_status IS NULL;

-- 2. Create function to handle catch approval
CREATE OR REPLACE FUNCTION approve_catch(p_catch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only the person who caught the fish can approve
  UPDATE catches
  SET 
    approval_status = 'approved',
    approved_at = NOW()
  WHERE id = p_catch_id
    AND user_id = auth.uid()
    AND approval_status = 'pending';
END;
$$;

-- 3. Create function to reject/delete pending catch
CREATE OR REPLACE FUNCTION reject_catch(p_catch_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only the person who caught the fish can reject
  DELETE FROM catches
  WHERE id = p_catch_id
    AND user_id = auth.uid()
    AND approval_status = 'pending';
END;
$$;

-- 4. Update RLS policies to allow viewing pending catches
DROP POLICY IF EXISTS "Users can view own catches" ON catches;
CREATE POLICY "Users can view own catches"
  ON catches
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR auth.uid() = logged_by_user_id
    OR is_public = true
  );

-- 5. Update RLS to allow edit/delete only by logger until approved
DROP POLICY IF EXISTS "Users can update own catches" ON catches;
CREATE POLICY "Users can update own catches"
  ON catches
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = logged_by_user_id AND approval_status = 'pending')
  );

DROP POLICY IF EXISTS "Users can delete own catches" ON catches;
CREATE POLICY "Users can delete own catches"
  ON catches
  FOR DELETE
  USING (
    auth.uid() = user_id 
    OR (auth.uid() = logged_by_user_id AND approval_status = 'pending')
  );

-- 6. Add comment
COMMENT ON COLUMN catches.approval_status IS 'pending = awaiting approval from user_id, approved = confirmed, rejected = deleted';

-- Grant permissions
GRANT EXECUTE ON FUNCTION approve_catch(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_catch(uuid) TO authenticated;
