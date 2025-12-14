-- Add multi_catch_group_id to catches table
-- This allows grouping multiple fish caught on the same cast (e.g., feathers, multi-hook rigs)
-- Each fish is still a separate record for stats/competitions, but they display grouped in the logbook

ALTER TABLE catches
ADD COLUMN IF NOT EXISTS multi_catch_group_id uuid DEFAULT NULL;

-- Index for efficient grouping queries
CREATE INDEX IF NOT EXISTS idx_catches_multi_catch_group 
ON catches(multi_catch_group_id) 
WHERE multi_catch_group_id IS NOT NULL;

COMMENT ON COLUMN catches.multi_catch_group_id IS 'Groups multiple fish caught on same cast (feathers, multi-hook rigs). NULL for single catches.';
