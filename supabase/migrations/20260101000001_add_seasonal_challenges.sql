-- Add seasonal challenge fields to challenges table
-- Migration: 20260101000001_add_seasonal_challenges

-- Add season field (spring, summer, autumn, winter, special)
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS season TEXT CHECK (season IN ('spring', 'summer', 'autumn', 'winter', 'special'));

-- Add event_type field (seasonal, monthly, annual, limited)
ALTER TABLE challenges 
ADD COLUMN IF NOT EXISTS event_type TEXT CHECK (event_type IN ('seasonal', 'monthly', 'annual', 'limited'));

-- Add index for seasonal queries
CREATE INDEX IF NOT EXISTS idx_challenges_season ON challenges(season) WHERE season IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_challenges_event_type ON challenges(event_type) WHERE event_type IS NOT NULL;

-- Add index for active seasonal challenges
CREATE INDEX IF NOT EXISTS idx_challenges_seasonal_active ON challenges(season, starts_at, ends_at) 
WHERE season IS NOT NULL AND is_active = true;

-- Comment on new fields
COMMENT ON COLUMN challenges.season IS 'Season for seasonal challenges: spring, summer, autumn, winter, or special events';
COMMENT ON COLUMN challenges.event_type IS 'Type of time-limited challenge: seasonal (3 months), monthly, annual, or limited (short events)';
