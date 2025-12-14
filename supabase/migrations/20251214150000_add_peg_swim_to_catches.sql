-- ============================================================================
-- Add peg/swim field to catches for lake sessions
-- ============================================================================
-- Allows anglers to record which peg or swim they were fishing at

ALTER TABLE catches ADD COLUMN IF NOT EXISTS peg_swim TEXT;

-- Add comment for documentation
COMMENT ON COLUMN catches.peg_swim IS 'Optional peg or swim number/name for lake sessions (e.g., "Peg 12", "Swim 3")';
