-- Fix zone stats not updating when catches are deleted
-- The original trigger only fires on INSERT/UPDATE, not DELETE

-- Create a separate trigger function for DELETE that uses OLD instead of NEW
CREATE OR REPLACE FUNCTION trigger_update_zone_stats_on_delete()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.zone_id IS NOT NULL THEN
    PERFORM update_zone_stats(OLD.zone_id);
  END IF;
  RETURN OLD;
END;
$$;

-- Add DELETE trigger for catches
DROP TRIGGER IF EXISTS trigger_catch_zone_stats_delete ON catches;
CREATE TRIGGER trigger_catch_zone_stats_delete
  AFTER DELETE ON catches
  FOR EACH ROW EXECUTE FUNCTION trigger_update_zone_stats_on_delete();

-- Also update the original trigger to handle all cases properly
CREATE OR REPLACE FUNCTION trigger_update_zone_stats()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' THEN
    IF NEW.zone_id IS NOT NULL THEN
      PERFORM update_zone_stats(NEW.zone_id);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.zone_id IS NOT NULL THEN
      PERFORM update_zone_stats(NEW.zone_id);
    END IF;
    -- Also update old zone if zone changed
    IF OLD.zone_id IS NOT NULL AND (OLD.zone_id != NEW.zone_id OR NEW.zone_id IS NULL) THEN
      PERFORM update_zone_stats(OLD.zone_id);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
