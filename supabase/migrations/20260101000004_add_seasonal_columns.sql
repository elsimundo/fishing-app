-- Add seasonal challenge columns to challenges table
-- Migration: 20260101000004_add_seasonal_columns

-- Add season column (spring, summer, autumn, winter, special)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS season TEXT
  CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'special'));

-- Add event_type column (seasonal, monthly, annual, limited)
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS event_type TEXT
  CHECK (event_type IN ('seasonal', 'monthly', 'annual', 'limited'));

-- Add start and end date columns for time-limited challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS ends_at TIMESTAMPTZ;

-- Create index for querying seasonal challenges
CREATE INDEX IF NOT EXISTS idx_challenges_season ON challenges(season) WHERE season IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_event_type ON challenges(event_type) WHERE event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(starts_at, ends_at) WHERE starts_at IS NOT NULL OR ends_at IS NOT NULL;

-- Add comment
COMMENT ON COLUMN challenges.season IS 'Season for seasonal challenges: spring, summer, autumn, winter, special';
COMMENT ON COLUMN challenges.event_type IS 'Event type: seasonal, monthly, annual, limited';
COMMENT ON COLUMN challenges.starts_at IS 'Challenge start date (for time-limited challenges)';
COMMENT ON COLUMN challenges.ends_at IS 'Challenge end date (for time-limited challenges)';
