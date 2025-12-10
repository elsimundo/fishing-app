-- Add target_species column to competition_awards table
-- This allows awards to target specific species (e.g., "Biggest Smoothhound", "Heaviest Cod")

ALTER TABLE competition_awards
ADD COLUMN IF NOT EXISTS target_species TEXT DEFAULT NULL;

-- Add a comment explaining the field
COMMENT ON COLUMN competition_awards.target_species IS 'Optional species name this award targets. When set, only catches of this species count toward the award.';

-- Example awards with target species:
-- "Biggest Smoothhound" -> category: 'biggest_single', target_species: 'Smoothhound'
-- "Heaviest Cod" -> category: 'heaviest_total', target_species: 'Cod'
-- "Longest Skate" -> category: 'longest_fish', target_species: 'Skate'
