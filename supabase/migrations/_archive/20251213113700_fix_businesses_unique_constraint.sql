-- Fix businesses table: add unique constraint on osm_id for upsert to work
-- Error was: 'there is no unique or exclusion constraint matching the ON CONFLICT specification'

-- Add unique constraint on osm_id (needed for ON CONFLICT upsert)
-- Use a partial unique constraint to only enforce uniqueness on non-null osm_ids
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_osm_id_unique 
ON businesses(osm_id) 
WHERE osm_id IS NOT NULL;
