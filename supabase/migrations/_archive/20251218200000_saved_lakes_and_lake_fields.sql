-- My Lakes (saved/pinned lakes) feature
-- Plus additional fields for verified and premium lake info

-- Create saved_lakes table for "My Lakes" feature
CREATE TABLE IF NOT EXISTS saved_lakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lake_id uuid NOT NULL REFERENCES lakes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lake_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_lakes_user ON saved_lakes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_lakes_lake ON saved_lakes(lake_id);

ALTER TABLE saved_lakes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own saved lakes" ON saved_lakes;
CREATE POLICY "Users can view own saved lakes"
  ON saved_lakes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can save lakes" ON saved_lakes;
CREATE POLICY "Users can save lakes"
  ON saved_lakes FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can unsave lakes" ON saved_lakes;
CREATE POLICY "Users can unsave lakes"
  ON saved_lakes FOR DELETE USING (auth.uid() = user_id);

-- Add fields for verified and premium lake info
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS opening_hours text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '[]';
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS rules text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]';
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS day_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS night_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS season_ticket_price numeric(10,2);
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS booking_url text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS special_offers text;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS is_premium boolean DEFAULT false;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS session_count integer DEFAULT 0;

-- Function to update lake session count
CREATE OR REPLACE FUNCTION update_lake_session_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Update session count for the lake when a session is linked
  IF NEW.lake_id IS NOT NULL THEN
    UPDATE lakes 
    SET session_count = (
      SELECT COUNT(*) FROM sessions WHERE lake_id = NEW.lake_id
    )
    WHERE id = NEW.lake_id;
  END IF;
  
  -- If lake_id changed, update old lake too
  IF OLD IS NOT NULL AND OLD.lake_id IS NOT NULL AND OLD.lake_id != NEW.lake_id THEN
    UPDATE lakes 
    SET session_count = (
      SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
    )
    WHERE id = OLD.lake_id;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_lake_session_count ON sessions;
CREATE TRIGGER trigger_update_lake_session_count
  AFTER INSERT OR UPDATE OF lake_id OR DELETE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_lake_session_count();

-- Backfill existing session counts
UPDATE lakes l
SET session_count = (
  SELECT COUNT(*) FROM sessions s WHERE s.lake_id = l.id
);

COMMENT ON TABLE saved_lakes IS 'User saved/pinned lakes for quick access';
COMMENT ON COLUMN lakes.is_premium IS 'Premium lakes get featured placement and full feature access';
COMMENT ON COLUMN lakes.session_count IS 'Number of fishing sessions logged at this lake';
