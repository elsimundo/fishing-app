-- Quick diagnostic query to check winter challenges
-- Run this in Supabase SQL Editor to see what's happening

-- 1. Check if ANY challenges have season='winter'
SELECT COUNT(*) as winter_challenge_count 
FROM challenges 
WHERE season = 'winter';

-- 2. Check what seasons exist in the database
SELECT DISTINCT season, COUNT(*) as count
FROM challenges 
GROUP BY season
ORDER BY season;

-- 3. Check if the specific winter challenge slugs exist
SELECT slug, title, season, is_active, created_at
FROM challenges 
WHERE slug LIKE 'winter%'
ORDER BY slug;

-- 4. Check the challenges table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'challenges'
AND column_name IN ('season', 'event_type', 'starts_at', 'ends_at')
ORDER BY column_name;
