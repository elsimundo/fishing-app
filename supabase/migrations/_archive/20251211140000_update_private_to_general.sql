-- Update all existing sessions with 'private' location_privacy to 'general'
-- This makes existing catches visible on the map and in Local Intel

UPDATE sessions 
SET location_privacy = 'general' 
WHERE location_privacy = 'private';

-- Log the update
DO $$
DECLARE
  updated_count integer;
BEGIN
  SELECT COUNT(*) INTO updated_count 
  FROM sessions 
  WHERE location_privacy = 'general';
  
  RAISE NOTICE 'Updated sessions to general location privacy. Total sessions with general privacy: %', updated_count;
END $$;
