-- Insert Winter Warrior seasonal challenges
-- Migration: 20260101000002_insert_winter_challenges

-- Winter Warrior challenges (December - February)
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
) VALUES
  -- Ice Breaker: Log 5 catches in cold conditions
  (
    'winter_ice_breaker_2026',
    'Ice Breaker',
    'Log 5 catches when the temperature is below 5°C. True dedication to winter fishing!',
    '🧊',
    'skill',
    'hard',
    '{"type": "count", "value": 5, "condition": "temperature_below_5"}',
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
  ),
  
  -- Winter Warrior: Complete 10 sessions in winter
  (
    'winter_warrior_2026',
    'Winter Warrior',
    'Complete 10 fishing sessions during the winter season. Show your dedication!',
    '❄️',
    'milestones',
    'medium',
    '{"type": "count", "value": 10, "target": "sessions_in_winter"}',
    100,
    1001,
    true,
    true,
    'both',
    'global',
    'winter',
    'seasonal',
    '2025-12-01T00:00:00Z',
    '2026-02-28T23:59:59Z'
  ),
  
  -- Cold Water Champion: Catch 3 different species in winter
  (
    'winter_cold_water_champion_2026',
    'Cold Water Champion',
    'Catch 3 different species during winter. Prove your versatility in harsh conditions!',
    '🐟',
    'species',
    'medium',
    '{"type": "unique_species", "value": 3, "season": "winter"}',
    120,
    1002,
    true,
    false,
    'both',
    'global',
    'winter',
    'seasonal',
    '2025-12-01T00:00:00Z',
    '2026-02-28T23:59:59Z'
  ),
  
  -- Festive Fisher: Log a catch on Christmas or New Year
  (
    'winter_festive_fisher_2026',
    'Festive Fisher',
    'Log a catch on Christmas Day or New Year''s Day. Celebrate the holidays with fishing!',
    '🎄',
    'milestones',
    'easy',
    '{"type": "special_date", "dates": ["2025-12-25", "2026-01-01"]}',
    50,
    1003,
    true,
    false,
    'both',
    'global',
    'winter',
    'seasonal',
    '2025-12-01T00:00:00Z',
    '2026-02-28T23:59:59Z'
  ),
  
  -- Winter Night Owl: Log 5 catches after sunset in winter
  (
    'winter_night_owl_2026',
    'Winter Night Owl',
    'Log 5 catches after sunset during winter. Brave the cold and dark!',
    '🌙',
    'skill',
    'medium',
    '{"type": "count", "value": 5, "condition": "after_sunset_in_winter"}',
    110,
    1004,
    true,
    false,
    'both',
    'global',
    'winter',
    'seasonal',
    '2025-12-01T00:00:00Z',
    '2026-02-28T23:59:59Z'
  ),
  
  -- Winter Explorer: Fish at 5 different locations in winter
  (
    'winter_explorer_2026',
    'Winter Explorer',
    'Visit 5 different fishing spots during winter. Explore in the cold!',
    '🗺️',
    'exploration',
    'easy',
    '{"type": "unique_locations", "value": 5, "season": "winter"}',
    80,
    1005,
    true,
    false,
    'both',
    'global',
    'winter',
    'seasonal',
    '2025-12-01T00:00:00Z',
    '2026-02-28T23:59:59Z'
  )
ON CONFLICT (slug) DO NOTHING;

-- Add comment
COMMENT ON TABLE challenges IS 'Fishing challenges including seasonal, event-based, and permanent challenges';
