-- ============================================================================
-- Lakes Improvements: Stats Triggers, Lake Types, Fishing Rules
-- ============================================================================

-- Add lake_type column (commercial, syndicate, club, day_ticket, public, private)
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS lake_type TEXT 
  CHECK (lake_type IN ('commercial', 'syndicate', 'club', 'day_ticket', 'public', 'private'));

-- Add fishing rules columns
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS barbless_only BOOLEAN DEFAULT false;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS catch_and_release_only BOOLEAN DEFAULT false;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS max_rods INTEGER DEFAULT 2;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS rules TEXT;

-- Add stats columns (auto-updated by triggers)
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS total_catches INTEGER DEFAULT 0;
ALTER TABLE lakes ADD COLUMN IF NOT EXISTS last_session_at TIMESTAMPTZ;

-- ============================================================================
-- Triggers to auto-update lake stats
-- ============================================================================

-- Function to update lake stats when sessions are added/updated/deleted
CREATE OR REPLACE FUNCTION update_lake_session_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT or UPDATE with new lake_id
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.lake_id IS NOT NULL THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = NEW.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = NEW.lake_id
      ),
      updated_at = NOW()
    WHERE id = NEW.lake_id;
  END IF;
  
  -- Handle UPDATE where lake_id changed (decrement old lake)
  IF TG_OP = 'UPDATE' AND OLD.lake_id IS NOT NULL AND OLD.lake_id != NEW.lake_id THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      updated_at = NOW()
    WHERE id = OLD.lake_id;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' AND OLD.lake_id IS NOT NULL THEN
    UPDATE lakes
    SET 
      total_sessions = (
        SELECT COUNT(*) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      last_session_at = (
        SELECT MAX(started_at) FROM sessions WHERE lake_id = OLD.lake_id
      ),
      updated_at = NOW()
    WHERE id = OLD.lake_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on sessions table
DROP TRIGGER IF EXISTS trigger_update_lake_session_stats ON sessions;
CREATE TRIGGER trigger_update_lake_session_stats
AFTER INSERT OR UPDATE OR DELETE ON sessions
FOR EACH ROW
EXECUTE FUNCTION update_lake_session_stats();

-- Function to update lake catch count
CREATE OR REPLACE FUNCTION update_lake_catch_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_lake_id UUID;
  v_old_lake_id UUID;
BEGIN
  -- Get lake_id from session for new catch
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    SELECT lake_id INTO v_lake_id
    FROM sessions
    WHERE id = NEW.session_id;
    
    IF v_lake_id IS NOT NULL THEN
      UPDATE lakes
      SET 
        total_catches = (
          SELECT COUNT(*) 
          FROM catches c
          JOIN sessions s ON s.id = c.session_id
          WHERE s.lake_id = v_lake_id
        ),
        updated_at = NOW()
      WHERE id = v_lake_id;
    END IF;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    SELECT lake_id INTO v_old_lake_id
    FROM sessions
    WHERE id = OLD.session_id;
    
    IF v_old_lake_id IS NOT NULL THEN
      UPDATE lakes
      SET 
        total_catches = (
          SELECT COUNT(*) 
          FROM catches c
          JOIN sessions s ON s.id = c.session_id
          WHERE s.lake_id = v_old_lake_id
        ),
        updated_at = NOW()
      WHERE id = v_old_lake_id;
    END IF;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on catches table
DROP TRIGGER IF EXISTS trigger_update_lake_catch_stats ON catches;
CREATE TRIGGER trigger_update_lake_catch_stats
AFTER INSERT OR UPDATE OR DELETE ON catches
FOR EACH ROW
EXECUTE FUNCTION update_lake_catch_stats();

-- ============================================================================
-- Update sample data with lake_type
-- ============================================================================

UPDATE lakes SET lake_type = 'commercial' WHERE slug = 'linear-fisheries';
UPDATE lakes SET lake_type = 'syndicate' WHERE slug = 'wraysbury-lakes';
UPDATE lakes SET lake_type = 'day_ticket' WHERE slug = 'bluebell-lakes';
