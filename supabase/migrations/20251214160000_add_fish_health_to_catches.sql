-- ============================================================================
-- Add fish health reporting fields to catches for lake sessions
-- ============================================================================
-- Allows anglers to report fish health issues (disease, injury, parasites, etc.)
-- Lake owners can use this data to monitor fish stock health

-- Whether the fish has a health issue
ALTER TABLE catches ADD COLUMN IF NOT EXISTS fish_health_issue BOOLEAN DEFAULT FALSE;

-- Type of health issue
ALTER TABLE catches ADD COLUMN IF NOT EXISTS fish_health_type TEXT CHECK (
  fish_health_type IS NULL OR 
  fish_health_type IN ('ulcer', 'fin_damage', 'parasite', 'fungus', 'mouth_damage', 'scale_loss', 'lesion', 'other')
);

-- Description of the issue
ALTER TABLE catches ADD COLUMN IF NOT EXISTS fish_health_notes TEXT;

-- Photo of the health issue (separate from main catch photo)
ALTER TABLE catches ADD COLUMN IF NOT EXISTS fish_health_photo_url TEXT;

-- Whether treatment was applied
ALTER TABLE catches ADD COLUMN IF NOT EXISTS treatment_applied BOOLEAN DEFAULT FALSE;

-- What treatment was applied
ALTER TABLE catches ADD COLUMN IF NOT EXISTS treatment_notes TEXT;

-- Add comments for documentation
COMMENT ON COLUMN catches.fish_health_issue IS 'Whether the fish has a visible health issue';
COMMENT ON COLUMN catches.fish_health_type IS 'Type of health issue: ulcer, fin_damage, parasite, fungus, mouth_damage, scale_loss, lesion, other';
COMMENT ON COLUMN catches.fish_health_notes IS 'Description of the health issue observed';
COMMENT ON COLUMN catches.fish_health_photo_url IS 'Photo URL showing the health issue';
COMMENT ON COLUMN catches.treatment_applied IS 'Whether treatment was applied to the fish';
COMMENT ON COLUMN catches.treatment_notes IS 'Description of treatment applied (e.g., antiseptic, returned to water)';

-- Index for lake owners to query fish health issues
CREATE INDEX IF NOT EXISTS idx_catches_fish_health ON catches(fish_health_issue) WHERE fish_health_issue = TRUE;
