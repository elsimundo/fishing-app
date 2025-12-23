-- Update Shark Hunter to exclude dogfish (they're too easy)
UPDATE challenges
SET 
  description = 'Catch a shark species (smoothhound or tope)',
  criteria = '{"type": "catch_species_any", "species": ["smoothhound", "tope"]}'
WHERE slug = 'shark_hunter';

-- Add tiered Dogfish challenges
INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order, water_type)
VALUES 
-- Tier 1: Pup Star - 5 dogfish
(
  'dogfish_pup_star',
  'Pup Star',
  'Catch 5 dogfish',
  '🐕',
  'species',
  'easy',
  '{"type": "catch_species_count", "species": ["dogfish"], "value": 5}',
  50,
  33,
  'saltwater'
),
-- Tier 2: Barking Mad - 20 dogfish
(
  'dogfish_barking_mad',
  'Barking Mad',
  'Catch 20 dogfish',
  '🦮',
  'species',
  'medium',
  '{"type": "catch_species_count", "species": ["dogfish"], "value": 20}',
  100,
  34,
  'saltwater'
),
-- Tier 3: Top Dog - 50 dogfish
(
  'dogfish_top_dog',
  'Top Dog',
  'Catch 50 dogfish',
  '🏆',
  'species',
  'hard',
  '{"type": "catch_species_count", "species": ["dogfish"], "value": 50}',
  200,
  35,
  'saltwater'
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  criteria = EXCLUDED.criteria,
  xp_reward = EXCLUDED.xp_reward,
  water_type = EXCLUDED.water_type;
