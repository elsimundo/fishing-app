-- Add moon_phase column to sessions and catches tables
-- Moon phase is stored as a string (e.g., "Full Moon", "Waxing Crescent")

-- Add to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS moon_phase TEXT;

-- Add to catches table
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS moon_phase TEXT;

-- Add comment for documentation
COMMENT ON COLUMN sessions.moon_phase IS 'Moon phase at the time the session was created (e.g., Full Moon, Waxing Crescent)';
COMMENT ON COLUMN catches.moon_phase IS 'Moon phase at the time the catch was logged (e.g., Full Moon, Waxing Crescent)';
