-- Test: Insert just ONE winter challenge to see if it works
-- Run this in Supabase SQL Editor

-- Delete if exists
DELETE FROM challenges WHERE slug = 'winter_ice_breaker_2026';

-- Insert single challenge
INSERT INTO challenges (
  slug,
  title,
  description,
  icon,
  category,
  difficulty,
  criteria,
  xp_reward,
  sort_order,
  is_active,
  is_featured,
  water_type,
  scope,
  season,
  event_type,
  starts_at,
  ends_at
) VALUES (
  'winter_ice_breaker_2026',
  'Ice Breaker',
  'Log 5 catches when the temperature is below 5°C',
  '🧊',
  'skill',
  'hard',
  '{"type": "count", "value": 5}',
  150,
  1000,
  true,
  true,
  'both',
  'global',
  'winter',
  'seasonal',
  '2025-12-01T00:00:00Z',
  '2026-02-28T23:59:59Z'
);

-- Verify it was inserted
SELECT slug, title, season, is_active, event_type 
FROM challenges 
WHERE slug = 'winter_ice_breaker_2026';
