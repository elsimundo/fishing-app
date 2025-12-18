-- Add conservation challenges for catch & release (saltwater only)
-- These reward anglers who practice sustainable fishing

INSERT INTO challenges (slug, title, description, scope, category, xp_reward, icon, is_active, water_type, difficulty, criteria, sort_order)
VALUES
  -- Conservation milestone challenges (saltwater only)
  ('conservation_10', 'Catch & Release', 'Release 10 saltwater fish back to the sea', 'global', 'conservation', 50, '🐟', true, 'saltwater', 'easy', '{"type": "released_catches", "water_type": "saltwater", "count": 10}', 300),
  ('conservation_50', 'Ocean Guardian', 'Release 50 saltwater fish back to the sea', 'global', 'conservation', 150, '🌊', true, 'saltwater', 'medium', '{"type": "released_catches", "water_type": "saltwater", "count": 50}', 301),
  ('conservation_100', 'Sea Steward', 'Release 100 saltwater fish back to the sea', 'global', 'conservation', 300, '🦈', true, 'saltwater', 'hard', '{"type": "released_catches", "water_type": "saltwater", "count": 100}', 302),
  ('conservation_200', 'Conservation Hero', 'Release 200 saltwater fish back to the sea', 'global', 'conservation', 500, '🏆', true, 'saltwater', 'expert', '{"type": "released_catches", "water_type": "saltwater", "count": 200}', 303),
  ('conservation_500', 'Ocean Champion', 'Release 500 saltwater fish back to the sea', 'global', 'conservation', 1000, '🌟', true, 'saltwater', 'legendary', '{"type": "released_catches", "water_type": "saltwater", "count": 500}', 304)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE challenges IS 'Conservation challenges reward sustainable fishing practices';
