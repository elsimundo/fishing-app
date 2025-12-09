-- SPECIES DATABASE & WATER TYPE DIFFERENTIATION
-- Enables regional challenges, catch intel, and "hunt the fish" features

------------------------------------------------------------
-- 1. SPECIES INFO TABLE
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS species_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name text UNIQUE NOT NULL, -- Canonical name (lowercase for matching)
  display_name text NOT NULL, -- Display name
  common_names text[] DEFAULT '{}', -- Alternative names
  
  -- Classification
  water_type text NOT NULL CHECK (water_type IN ('saltwater', 'freshwater', 'both')),
  family text, -- e.g., 'Cyprinidae', 'Percidae'
  
  -- UK Distribution
  uk_regions text[] DEFAULT '{}', -- ["South Coast", "Cornwall", "Scotland", etc.]
  habitat text, -- "Lakes, slow rivers", "Rocky coastline", etc.
  
  -- Seasonality
  peak_months integer[] DEFAULT '{}', -- [6,7,8] for June-August
  year_round boolean DEFAULT false,
  
  -- Size info (for specimen tracking)
  typical_weight_lb numeric,
  specimen_weight_lb numeric, -- What counts as a "specimen" catch
  uk_record_lb numeric,
  
  -- Rarity & difficulty
  rarity text DEFAULT 'common' CHECK (rarity IN ('common', 'medium', 'rare', 'very_rare')),
  difficulty text DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard', 'expert')),
  
  -- Display
  emoji text,
  description text,
  image_url text,
  
  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_species_info_water_type ON species_info(water_type);
CREATE INDEX IF NOT EXISTS idx_species_info_name ON species_info(name);

------------------------------------------------------------
-- 2. ADD WATER TYPE TO CHALLENGES
------------------------------------------------------------

ALTER TABLE challenges ADD COLUMN IF NOT EXISTS water_type text DEFAULT 'both' 
  CHECK (water_type IN ('saltwater', 'freshwater', 'both'));

CREATE INDEX IF NOT EXISTS idx_challenges_water_type ON challenges(water_type);

------------------------------------------------------------
-- 3. ADD WATER TYPE TO WEEKLY SPECIES POINTS
------------------------------------------------------------

ALTER TABLE weekly_species_points ADD COLUMN IF NOT EXISTS water_type text DEFAULT 'freshwater'
  CHECK (water_type IN ('saltwater', 'freshwater'));

------------------------------------------------------------
-- 4. SEED UK FRESHWATER SPECIES
------------------------------------------------------------

INSERT INTO species_info (name, display_name, common_names, water_type, family, uk_regions, habitat, peak_months, year_round, typical_weight_lb, specimen_weight_lb, uk_record_lb, rarity, difficulty, emoji, description) VALUES

-- COARSE FISH (Freshwater)
('carp', 'Common Carp', ARRAY['Carp', 'King Carp', 'Mirror Carp', 'Leather Carp'], 'freshwater', 'Cyprinidae', 
 ARRAY['Nationwide'], 'Still waters, lakes, slow rivers', ARRAY[5,6,7,8,9], false, 15, 30, 68, 'common', 'medium', '🐟',
 'The UK''s most popular coarse fish. Found in most still waters.'),

('pike', 'Northern Pike', ARRAY['Pike', 'Jack Pike', 'Esox'], 'freshwater', 'Esocidae',
 ARRAY['Nationwide'], 'Lakes, rivers, canals, reservoirs', ARRAY[10,11,12,1,2,3], false, 8, 20, 46, 'common', 'medium', '🐊',
 'Apex predator of UK freshwaters. Best caught in colder months.'),

('perch', 'European Perch', ARRAY['Perch', 'Striped Perch'], 'freshwater', 'Percidae',
 ARRAY['Nationwide'], 'Lakes, rivers, canals', ARRAY[9,10,11,12,1,2], false, 1, 3, 6, 'common', 'easy', '🐠',
 'Distinctive striped fish, great for beginners.'),

('tench', 'Tench', ARRAY['Tench', 'Doctor Fish'], 'freshwater', 'Cyprinidae',
 ARRAY['England', 'Wales'], 'Weedy lakes, ponds, slow rivers', ARRAY[5,6,7,8], false, 4, 8, 15, 'medium', 'medium', '🌿',
 'Beautiful olive-green fish. Dawn and dusk feeder.'),

('bream', 'Common Bream', ARRAY['Bream', 'Bronze Bream', 'Skimmer'], 'freshwater', 'Cyprinidae',
 ARRAY['England', 'Wales', 'Ireland'], 'Lakes, slow rivers, canals', ARRAY[5,6,7,8,9], false, 5, 10, 22, 'common', 'easy', '🥉',
 'Shoaling fish, often caught in numbers.'),

('roach', 'Roach', ARRAY['Roach', 'Redfin'], 'freshwater', 'Cyprinidae',
 ARRAY['Nationwide'], 'Rivers, lakes, canals', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 0.5, 2, 4, 'common', 'easy', '🐡',
 'Classic silver fish, abundant in most waters.'),

('rudd', 'Rudd', ARRAY['Rudd', 'Golden Rudd'], 'freshwater', 'Cyprinidae',
 ARRAY['England', 'Wales', 'Ireland'], 'Weedy lakes, ponds', ARRAY[5,6,7,8], false, 0.5, 2, 4, 'medium', 'easy', '✨',
 'Golden-flanked surface feeder.'),

('chub', 'Chub', ARRAY['Chub', 'Chevin'], 'freshwater', 'Cyprinidae',
 ARRAY['England', 'Wales'], 'Rivers, streams', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 3, 6, 9, 'common', 'medium', '💪',
 'Powerful river fish, fights hard.'),

('barbel', 'Barbel', ARRAY['Barbel'], 'freshwater', 'Cyprinidae',
 ARRAY['Thames Valley', 'Severn', 'Trent', 'Yorkshire'], 'Fast-flowing rivers', ARRAY[6,7,8,9,10], false, 6, 12, 21, 'medium', 'hard', '🏋️',
 'Powerful river specialist. Incredible fighters.'),

('trout', 'Brown Trout', ARRAY['Trout', 'Brown Trout', 'Wild Trout'], 'freshwater', 'Salmonidae',
 ARRAY['Nationwide'], 'Rivers, streams, lakes', ARRAY[3,4,5,6,7,8,9], false, 2, 5, 31, 'common', 'medium', '🌈',
 'Native UK trout. Found in clean, cold waters.'),

('rainbow_trout', 'Rainbow Trout', ARRAY['Rainbow', 'Rainbows'], 'freshwater', 'Salmonidae',
 ARRAY['Stocked fisheries'], 'Stocked lakes and reservoirs', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 3, 8, 24, 'common', 'easy', '🌈',
 'Stocked fish, popular at commercial fisheries.'),

('zander', 'Zander', ARRAY['Zander', 'Pike-perch'], 'freshwater', 'Percidae',
 ARRAY['East Anglia', 'Midlands', 'Severn'], 'Deep lakes, slow rivers, canals', ARRAY[9,10,11,12,1,2], false, 5, 10, 21, 'rare', 'hard', '👁️',
 'Nocturnal predator with distinctive eyes.'),

('catfish', 'Wels Catfish', ARRAY['Catfish', 'Wels', 'Cat'], 'freshwater', 'Siluridae',
 ARRAY['Midlands', 'South England'], 'Deep lakes, rivers', ARRAY[5,6,7,8,9], false, 30, 60, 144, 'rare', 'expert', '🐱',
 'Europe''s largest freshwater fish. Rare but growing.'),

('eel', 'European Eel', ARRAY['Eel', 'Silver Eel'], 'both', 'Anguillidae',
 ARRAY['Nationwide'], 'Rivers, lakes, estuaries', ARRAY[5,6,7,8,9], false, 2, 5, 11, 'medium', 'medium', '🐍',
 'Mysterious migratory fish. Declining in numbers.'),

('crucian_carp', 'Crucian Carp', ARRAY['Crucian', 'Crucians'], 'freshwater', 'Cyprinidae',
 ARRAY['South England', 'Midlands'], 'Small ponds, estate lakes', ARRAY[5,6,7,8], false, 1, 3, 4, 'rare', 'medium', '🏆',
 'True crucians are rare. Prized specimen fish.'),

-- GAME FISH (Freshwater)
('salmon', 'Atlantic Salmon', ARRAY['Salmon', 'Atlantic Salmon'], 'both', 'Salmonidae',
 ARRAY['Scotland', 'Wales', 'North England', 'Ireland'], 'Rivers (spawning)', ARRAY[6,7,8,9,10,11], false, 10, 20, 64, 'medium', 'expert', '🐟',
 'King of game fish. Requires license and season.'),

('grayling', 'Grayling', ARRAY['Grayling', 'Lady of the Stream'], 'freshwater', 'Salmonidae',
 ARRAY['Chalk streams', 'Northern rivers'], 'Clean, fast-flowing rivers', ARRAY[10,11,12,1,2,3], false, 1, 2, 4, 'medium', 'hard', '👸',
 'Beautiful fish with sail-like dorsal fin.')

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  common_names = EXCLUDED.common_names,
  water_type = EXCLUDED.water_type,
  uk_regions = EXCLUDED.uk_regions,
  peak_months = EXCLUDED.peak_months,
  typical_weight_lb = EXCLUDED.typical_weight_lb,
  specimen_weight_lb = EXCLUDED.specimen_weight_lb,
  rarity = EXCLUDED.rarity,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  updated_at = now();

------------------------------------------------------------
-- 5. SEED UK SALTWATER SPECIES
------------------------------------------------------------

INSERT INTO species_info (name, display_name, common_names, water_type, family, uk_regions, habitat, peak_months, year_round, typical_weight_lb, specimen_weight_lb, uk_record_lb, rarity, difficulty, emoji, description) VALUES

-- SEA FISH
('bass', 'European Bass', ARRAY['Bass', 'Sea Bass', 'Schoolie'], 'saltwater', 'Moronidae',
 ARRAY['South Coast', 'West Coast', 'Wales', 'Cornwall', 'Devon'], 'Rocky coastline, estuaries, beaches', ARRAY[5,6,7,8,9,10], false, 3, 8, 19, 'medium', 'hard', '🎸',
 'The UK''s most prized sea fish. Minimum size 42cm.'),

('mackerel', 'Atlantic Mackerel', ARRAY['Mackerel', 'Joey Mackerel'], 'saltwater', 'Scombridae',
 ARRAY['South Coast', 'West Coast', 'Cornwall'], 'Open water, piers, beaches', ARRAY[5,6,7,8,9], false, 1, 2, 6, 'common', 'easy', '⚡',
 'Fast, abundant summer fish. Great for beginners.'),

('cod', 'Atlantic Cod', ARRAY['Cod', 'Codling'], 'saltwater', 'Gadidae',
 ARRAY['North Sea', 'Scotland', 'North East'], 'Deep water, wrecks', ARRAY[10,11,12,1,2,3], false, 5, 15, 58, 'medium', 'medium', '🐟',
 'Classic winter sea fish. Best from boats.'),

('pollock', 'Pollock', ARRAY['Pollock', 'Pollack', 'Lythe'], 'saltwater', 'Gadidae',
 ARRAY['South West', 'Wales', 'Scotland'], 'Wrecks, reefs, rocky marks', ARRAY[4,5,6,7,8,9,10], false, 4, 10, 29, 'common', 'medium', '🎣',
 'Hard-fighting wreck fish.'),

('coalfish', 'Coalfish', ARRAY['Coalfish', 'Coley', 'Saithe'], 'saltwater', 'Gadidae',
 ARRAY['Scotland', 'North East', 'North West'], 'Wrecks, piers, rocky marks', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 5, 15, 37, 'common', 'medium', '⬛',
 'Abundant in Scottish waters.'),

('whiting', 'Whiting', ARRAY['Whiting'], 'saltwater', 'Gadidae',
 ARRAY['Nationwide coasts'], 'Sandy/muddy seabed', ARRAY[9,10,11,12,1,2], false, 1, 2, 4, 'common', 'easy', '⚪',
 'Common winter shore fish.'),

('plaice', 'Plaice', ARRAY['Plaice', 'Flatfish'], 'saltwater', 'Pleuronectidae',
 ARRAY['South Coast', 'East Coast'], 'Sandy seabed', ARRAY[3,4,5,6,7,8,9], false, 1, 4, 10, 'common', 'medium', '🫓',
 'Distinctive orange-spotted flatfish.'),

('flounder', 'Flounder', ARRAY['Flounder', 'Flattie'], 'saltwater', 'Pleuronectidae',
 ARRAY['Nationwide coasts', 'Estuaries'], 'Estuaries, sandy beaches', ARRAY[9,10,11,12,1,2,3], false, 1, 3, 5, 'common', 'easy', '🫓',
 'Enters estuaries and rivers.'),

('dab', 'Dab', ARRAY['Dab'], 'saltwater', 'Pleuronectidae',
 ARRAY['Nationwide coasts'], 'Sandy seabed', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 0.5, 1, 2, 'common', 'easy', '🫓',
 'Small but tasty flatfish.'),

('sole', 'Dover Sole', ARRAY['Sole', 'Dover Sole'], 'saltwater', 'Soleidae',
 ARRAY['South Coast', 'East Coast'], 'Sandy/muddy seabed', ARRAY[5,6,7,8,9], false, 1, 2, 6, 'medium', 'medium', '👟',
 'Prized eating fish. Night feeder.'),

('ray', 'Thornback Ray', ARRAY['Ray', 'Thornback', 'Roker'], 'saltwater', 'Rajidae',
 ARRAY['South Coast', 'West Coast', 'Irish Sea'], 'Sandy/muddy seabed', ARRAY[4,5,6,7,8,9,10], false, 8, 15, 31, 'medium', 'medium', '🦋',
 'Most common UK ray species.'),

('smoothhound', 'Smoothhound', ARRAY['Smoothhound', 'Smooth-hound', 'Smoothie'], 'saltwater', 'Triakidae',
 ARRAY['South Coast', 'East Coast'], 'Sandy/muddy seabed', ARRAY[5,6,7,8,9], false, 8, 15, 28, 'medium', 'medium', '🦈',
 'Small shark species. Great sport.'),

('dogfish', 'Lesser Spotted Dogfish', ARRAY['Dogfish', 'LSD', 'Rock Salmon'], 'saltwater', 'Scyliorhinidae',
 ARRAY['Nationwide coasts'], 'Rocky/sandy seabed', ARRAY[1,2,3,4,5,6,7,8,9,10,11,12], true, 2, 3, 4, 'common', 'easy', '🐕',
 'Small shark, very common.'),

('conger', 'Conger Eel', ARRAY['Conger', 'Conger Eel'], 'saltwater', 'Congridae',
 ARRAY['South West', 'Wales', 'Wrecks'], 'Wrecks, rocky holes', ARRAY[6,7,8,9,10], false, 20, 50, 133, 'medium', 'hard', '🐍',
 'Powerful eel. Can grow very large.'),

('tope', 'Tope', ARRAY['Tope', 'Tope Shark'], 'saltwater', 'Triakidae',
 ARRAY['South Coast', 'Wales', 'Scotland'], 'Open water, over sand', ARRAY[5,6,7,8,9], false, 25, 50, 82, 'medium', 'hard', '🦈',
 'Migratory shark. Catch and release.'),

('mullet', 'Thick-lipped Grey Mullet', ARRAY['Mullet', 'Grey Mullet'], 'saltwater', 'Mugilidae',
 ARRAY['South Coast', 'Harbours', 'Estuaries'], 'Harbours, estuaries, marinas', ARRAY[5,6,7,8,9,10], false, 3, 6, 14, 'common', 'expert', '🤔',
 'Notoriously difficult to catch.'),

('wrasse', 'Ballan Wrasse', ARRAY['Wrasse', 'Ballan'], 'saltwater', 'Labridae',
 ARRAY['South West', 'Wales', 'Scotland'], 'Rocky coastline, kelp', ARRAY[5,6,7,8,9,10], false, 3, 6, 9, 'common', 'medium', '🌈',
 'Colourful reef fish.'),

('garfish', 'Garfish', ARRAY['Garfish', 'Gar', 'Needlefish'], 'saltwater', 'Belonidae',
 ARRAY['South Coast', 'West Coast'], 'Surface, open water', ARRAY[5,6,7,8,9], false, 1, 2, 3, 'medium', 'medium', '🗡️',
 'Long, slender surface fish with green bones.'),

('brill', 'Brill', ARRAY['Brill'], 'saltwater', 'Scophthalmidae',
 ARRAY['South Coast', 'West Coast'], 'Sandy seabed', ARRAY[4,5,6,7,8,9], false, 3, 8, 16, 'rare', 'hard', '💎',
 'Prized flatfish, similar to turbot.'),

('turbot', 'Turbot', ARRAY['Turbot'], 'saltwater', 'Scophthalmidae',
 ARRAY['South Coast'], 'Sandy seabed', ARRAY[5,6,7,8,9], false, 5, 15, 33, 'rare', 'hard', '👑',
 'The king of flatfish.')

ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  common_names = EXCLUDED.common_names,
  water_type = EXCLUDED.water_type,
  uk_regions = EXCLUDED.uk_regions,
  peak_months = EXCLUDED.peak_months,
  typical_weight_lb = EXCLUDED.typical_weight_lb,
  specimen_weight_lb = EXCLUDED.specimen_weight_lb,
  rarity = EXCLUDED.rarity,
  emoji = EXCLUDED.emoji,
  description = EXCLUDED.description,
  updated_at = now();

------------------------------------------------------------
-- 6. UPDATE EXISTING CHALLENGES WITH WATER TYPE
------------------------------------------------------------

-- Freshwater challenges
UPDATE challenges SET water_type = 'freshwater' WHERE slug IN (
  'catch_carp', 'catch_pike', 'catch_perch', 'catch_tench', 'catch_roach', 'catch_bream', 'catch_trout'
);

-- Saltwater challenges  
UPDATE challenges SET water_type = 'saltwater' WHERE slug IN (
  'catch_bass', 'catch_mackerel', 'catch_cod'
);

-- Both/general challenges stay as 'both'
UPDATE challenges SET water_type = 'both' WHERE water_type IS NULL;

------------------------------------------------------------
-- 7. ADD MORE WATER-TYPE SPECIFIC CHALLENGES
------------------------------------------------------------

INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order, water_type) VALUES

-- SALTWATER CHALLENGES
('saltwater_first', 'Sea Legs', 'Catch your first saltwater fish', '🌊', 'exploration', 'easy', '{"type": "water_type_catch", "water_type": "saltwater", "value": 1}', 50, 43, 'saltwater'),
('saltwater_10', 'Salty Dog', 'Catch 10 saltwater fish', '⚓', 'milestones', 'easy', '{"type": "water_type_catch", "water_type": "saltwater", "value": 10}', 75, 44, 'saltwater'),
('saltwater_species_5', 'Ocean Explorer', 'Catch 5 different saltwater species', '🐙', 'species', 'medium', '{"type": "water_type_species", "water_type": "saltwater", "value": 5}', 150, 45, 'saltwater'),
('catch_mackerel', 'Mackerel Mania', 'Catch a mackerel', '⚡', 'species', 'easy', '{"type": "catch_species", "species": "mackerel"}', 30, 28, 'saltwater'),
('catch_cod', 'Cod Father', 'Catch a cod', '🐟', 'species', 'medium', '{"type": "catch_species", "species": "cod"}', 50, 29, 'saltwater'),
('catch_pollock', 'Pollock Pro', 'Catch a pollock', '🎣', 'species', 'medium', '{"type": "catch_species", "species": "pollock"}', 50, 30, 'saltwater'),
('catch_ray', 'Ray of Light', 'Catch a ray', '🦋', 'species', 'medium', '{"type": "catch_species", "species": "ray"}', 75, 31, 'saltwater'),
('shark_hunter', 'Shark Hunter', 'Catch a shark species (smoothhound, tope, dogfish)', '🦈', 'species', 'hard', '{"type": "catch_species_any", "species": ["smoothhound", "tope", "dogfish"]}', 150, 32, 'saltwater'),
('flatfish_fan', 'Flatfish Fan', 'Catch 3 different flatfish species', '🫓', 'species', 'medium', '{"type": "catch_species_count", "species": ["plaice", "flounder", "dab", "sole", "brill", "turbot"], "value": 3}', 100, 33, 'saltwater'),

-- FRESHWATER CHALLENGES
('freshwater_first', 'Lake Life', 'Catch your first freshwater fish', '🏞️', 'exploration', 'easy', '{"type": "water_type_catch", "water_type": "freshwater", "value": 1}', 50, 46, 'freshwater'),
('freshwater_10', 'Freshwater Fan', 'Catch 10 freshwater fish', '🌿', 'milestones', 'easy', '{"type": "water_type_catch", "water_type": "freshwater", "value": 10}', 75, 47, 'freshwater'),
('freshwater_species_5', 'Lake Explorer', 'Catch 5 different freshwater species', '🐸', 'species', 'medium', '{"type": "water_type_species", "water_type": "freshwater", "value": 5}', 150, 48, 'freshwater'),
('catch_barbel', 'Barbel Battler', 'Catch a barbel', '🏋️', 'species', 'hard', '{"type": "catch_species", "species": "barbel"}', 100, 34, 'freshwater'),
('catch_zander', 'Zander Seeker', 'Catch a zander', '👁️', 'species', 'hard', '{"type": "catch_species", "species": "zander"}', 100, 35, 'freshwater'),
('catch_chub', 'Chub Club', 'Catch a chub', '💪', 'species', 'medium', '{"type": "catch_species", "species": "chub"}', 50, 36, 'freshwater'),
('catch_crucian', 'Crucian Quest', 'Catch a crucian carp', '🏆', 'species', 'hard', '{"type": "catch_species", "species": "crucian_carp"}', 150, 37, 'freshwater'),
('predator_hunter', 'Predator Hunter', 'Catch pike, perch, and zander', '🐊', 'species', 'hard', '{"type": "catch_species_all", "species": ["pike", "perch", "zander"]}', 200, 38, 'freshwater'),
('silver_fish_slam', 'Silver Fish Slam', 'Catch roach, rudd, and bream in one session', '✨', 'skill', 'medium', '{"type": "catch_species_session", "species": ["roach", "rudd", "bream"]}', 150, 39, 'freshwater'),

-- SPECIMEN CHALLENGES (Both)
('specimen_10lb', 'Double Figures', 'Catch a fish over 10lb', '💪', 'skill', 'hard', '{"type": "catch_weight", "min_lb": 10}', 150, 84, 'both'),
('specimen_20lb', 'Specimen Hunter', 'Catch a fish over 20lb', '🦣', 'skill', 'legendary', '{"type": "catch_weight", "min_lb": 20}', 300, 85, 'both'),
('specimen_30lb', 'Monster Hunter', 'Catch a fish over 30lb', '👑', 'skill', 'legendary', '{"type": "catch_weight", "min_lb": 30}', 500, 86, 'both'),

-- VERSATILITY
('all_rounder', 'All Rounder', 'Catch both saltwater and freshwater fish', '🌍', 'exploration', 'medium', '{"type": "both_water_types"}', 100, 49, 'both')

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  criteria = EXCLUDED.criteria,
  xp_reward = EXCLUDED.xp_reward,
  sort_order = EXCLUDED.sort_order,
  water_type = EXCLUDED.water_type,
  updated_at = now();

------------------------------------------------------------
-- 8. UPDATE WEEKLY SPECIES POINTS WITH WATER TYPE
------------------------------------------------------------

-- Update existing entries
UPDATE weekly_species_points SET water_type = 'freshwater' 
WHERE species IN ('carp', 'perch', 'pike', 'roach', 'bream', 'tench', 'trout', 'chub', 'barbel', 'rudd');

UPDATE weekly_species_points SET water_type = 'saltwater'
WHERE species IN ('bass', 'mackerel', 'cod', 'pollock');

-- Add more saltwater species for this week
INSERT INTO weekly_species_points (species, points, week_start, is_bonus, bonus_reason, water_type) VALUES
('bass', 15, get_week_start(), true, 'Winter Bass Bonus!', 'saltwater'),
('mackerel', 8, get_week_start(), false, NULL, 'saltwater'),
('cod', 20, get_week_start(), false, NULL, 'saltwater'),
('pollock', 12, get_week_start(), false, NULL, 'saltwater'),
('whiting', 6, get_week_start(), false, NULL, 'saltwater'),
('ray', 18, get_week_start(), false, NULL, 'saltwater'),
('flounder', 8, get_week_start(), false, NULL, 'saltwater')
ON CONFLICT (species, week_start) DO UPDATE SET
  points = EXCLUDED.points,
  is_bonus = EXCLUDED.is_bonus,
  bonus_reason = EXCLUDED.bonus_reason,
  water_type = EXCLUDED.water_type;

------------------------------------------------------------
-- 9. RLS FOR SPECIES INFO
------------------------------------------------------------

ALTER TABLE species_info ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view species info" ON species_info;
CREATE POLICY "Anyone can view species info" ON species_info FOR SELECT USING (true);

------------------------------------------------------------
-- 10. HELPER FUNCTION: GET SPECIES ACTIVITY NEAR LOCATION
------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_species_activity(
  p_species text,
  p_lat double precision,
  p_lng double precision,
  p_radius_km integer DEFAULT 50,
  p_days integer DEFAULT 30
)
RETURNS TABLE(
  total_catches bigint,
  catches_this_week bigint,
  unique_anglers bigint,
  avg_weight numeric,
  best_zone_id uuid,
  best_zone_lat double precision,
  best_zone_lng double precision,
  best_zone_catches bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH nearby_catches AS (
    SELECT 
      c.id,
      c.weight_lb,
      c.zone_id,
      c.caught_at,
      fz.center_lat,
      fz.center_lng
    FROM catches c
    LEFT JOIN fishing_zones fz ON c.zone_id = fz.id
    WHERE LOWER(c.species) = LOWER(p_species)
      AND c.caught_at > NOW() - (p_days || ' days')::interval
      AND c.latitude IS NOT NULL
      AND c.longitude IS NOT NULL
      -- Rough bounding box filter (faster than distance calc)
      AND c.latitude BETWEEN p_lat - (p_radius_km / 111.0) AND p_lat + (p_radius_km / 111.0)
      AND c.longitude BETWEEN p_lng - (p_radius_km / 85.0) AND p_lng + (p_radius_km / 85.0)
  ),
  zone_stats AS (
    SELECT 
      zone_id,
      center_lat,
      center_lng,
      COUNT(*) as zone_catches
    FROM nearby_catches
    WHERE zone_id IS NOT NULL
    GROUP BY zone_id, center_lat, center_lng
    ORDER BY zone_catches DESC
    LIMIT 1
  )
  SELECT 
    COUNT(*)::bigint as total_catches,
    COUNT(*) FILTER (WHERE nc.caught_at > NOW() - interval '7 days')::bigint as catches_this_week,
    COUNT(DISTINCT c.user_id)::bigint as unique_anglers,
    ROUND(AVG(nc.weight_lb)::numeric, 2) as avg_weight,
    zs.zone_id as best_zone_id,
    zs.center_lat as best_zone_lat,
    zs.center_lng as best_zone_lng,
    zs.zone_catches as best_zone_catches
  FROM nearby_catches nc
  JOIN catches c ON nc.id = c.id
  LEFT JOIN zone_stats zs ON true;
END;
$$;

COMMENT ON TABLE species_info IS 'UK fish species database with regional distribution and seasonality';
COMMENT ON FUNCTION get_species_activity IS 'Get catch activity for a species near a location - powers "Hunt the Fish" feature';
