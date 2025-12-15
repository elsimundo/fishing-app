-- BACKLOG CATCHES
-- Allow anglers to log old catches from before they joined.
-- Backlog catches do NOT earn XP, badges, or count toward leaderboards/records.
-- They DO appear on zones (community activity) and can set personal bests (labeled as 'Backlog PB').

-- Add is_backlog flag (default false, immutable after creation by convention)
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS is_backlog boolean DEFAULT false NOT NULL;

-- Add optional note for backlog catches (e.g., "Caught in 2019 before joining")
ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS backlog_note text;

-- Index for filtering out backlog catches in stats/leaderboard queries
CREATE INDEX IF NOT EXISTS idx_catches_is_backlog ON catches(is_backlog) WHERE is_backlog = false;

-- Comments for documentation
COMMENT ON COLUMN catches.is_backlog IS 'True for catches logged retroactively (before user joined). These do not earn XP/badges and are excluded from leaderboards.';
COMMENT ON COLUMN catches.backlog_note IS 'Optional note for backlog catches explaining when/where it was caught.';
