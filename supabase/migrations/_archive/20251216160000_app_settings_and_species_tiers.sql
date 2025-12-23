-- APP SETTINGS & SPECIES TIERS
-- Configurable XP values and species-based point tiers

------------------------------------------------------------
-- 1. APP SETTINGS TABLE
------------------------------------------------------------

-- Drop if exists to ensure clean schema (safe for new deployments)
DROP TABLE IF EXISTS app_settings CASCADE;

CREATE TABLE app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX idx_app_settings_category ON app_settings(category);

-- RLS: Anyone can read, only admins can write
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage app settings" ON app_settings;
CREATE POLICY "Admins can manage app settings" ON app_settings 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

------------------------------------------------------------
-- 2. SPECIES TIERS
------------------------------------------------------------

-- Add tier column to track XP value category
-- common = pest fish, easy to catch
-- standard = regular species
-- trophy = harder to catch, bigger fish
-- rare = uncommon species

-- Drop existing to ensure clean schema
DROP TABLE IF EXISTS species_tiers CASCADE;
DROP TYPE IF EXISTS species_tier CASCADE;

CREATE TYPE species_tier AS ENUM ('common', 'standard', 'trophy', 'rare');

CREATE TABLE species_tiers (
  species TEXT PRIMARY KEY,
  tier species_tier NOT NULL DEFAULT 'standard',
  base_xp INTEGER NOT NULL DEFAULT 10,
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_species_tiers_tier ON species_tiers(tier);

-- RLS
ALTER TABLE species_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read species tiers" ON species_tiers;
CREATE POLICY "Anyone can read species tiers" ON species_tiers 
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage species tiers" ON species_tiers;
CREATE POLICY "Admins can manage species tiers" ON species_tiers 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

------------------------------------------------------------
-- 3. SEED DEFAULT XP SETTINGS
------------------------------------------------------------

INSERT INTO app_settings (key, value, description, category) VALUES
-- XP by tier
('xp_tier_common', '5', 'Base XP for common species (pest fish)', 'xp'),
('xp_tier_standard', '10', 'Base XP for standard species', 'xp'),
('xp_tier_trophy', '15', 'Base XP for trophy species', 'xp'),
('xp_tier_rare', '20', 'Base XP for rare species', 'xp'),

-- XP bonuses
('xp_first_species', '25', 'Bonus XP for catching a new species', 'xp'),
('xp_pb_multiplier', '2', 'XP multiplier for personal best', 'xp'),
('xp_released_bonus', '5', 'Bonus XP for releasing a catch', 'xp'),
('xp_full_details_bonus', '5', 'Bonus XP for logging all details (weight, length, bait, rig)', 'xp'),

-- Session XP
('xp_start_session', '5', 'XP for starting a fishing session', 'xp'),

-- Referral XP
('xp_referral_signup', '50', 'XP when a referred friend signs up', 'xp'),

-- Requirements
('xp_require_photo', 'true', 'Require photo for catch to earn XP', 'rules'),
('xp_backlog_earns', 'false', 'Whether backlog catches can earn XP', 'rules'),

-- System toggles
('xp_system_enabled', 'true', 'Master toggle for XP system', 'system'),
('leaderboard_enabled', 'true', 'Show leaderboards', 'system'),
('challenges_enabled', 'true', 'Enable challenge system', 'system')

;

------------------------------------------------------------
-- 4. SEED SPECIES TIERS
------------------------------------------------------------

INSERT INTO species_tiers (species, tier, base_xp) VALUES
-- COMMON (5 XP) - Small/pest fish, easy to catch
('Mackerel', 'common', 5),
('Whiting', 'common', 5),
('Pouting', 'common', 5),
('Poor Cod', 'common', 5),
('Rockling', 'common', 5),
('Goby', 'common', 5),
('Blenny', 'common', 5),
('Sand Smelt', 'common', 5),
('Scad', 'common', 5),
('Garfish', 'common', 5),
('Lesser Spotted Dogfish', 'common', 5),
('Roach', 'common', 5),
('Rudd', 'common', 5),
('Gudgeon', 'common', 5),
('Dace', 'common', 5),
('Bleak', 'common', 5),
('Minnow', 'common', 5),

-- STANDARD (10 XP) - Regular species
('Bass', 'standard', 10),
('Pollack', 'standard', 10),
('Wrasse', 'standard', 10),
('Ballan Wrasse', 'standard', 10),
('Cuckoo Wrasse', 'standard', 10),
('Plaice', 'standard', 10),
('Flounder', 'standard', 10),
('Dab', 'standard', 10),
('Sole', 'standard', 10),
('Black Bream', 'standard', 10),
('Red Mullet', 'standard', 10),
('Gurnard', 'standard', 10),
('Grey Mullet', 'standard', 10),
('Thin-Lipped Mullet', 'standard', 10),
('Golden Grey Mullet', 'standard', 10),
('Carp', 'standard', 10),
('Mirror Carp', 'standard', 10),
('Common Carp', 'standard', 10),
('Crucian Carp', 'standard', 10),
('Bream', 'standard', 10),
('Tench', 'standard', 10),
('Perch', 'standard', 10),
('Chub', 'standard', 10),
('Barbel', 'standard', 10),
('Eel', 'standard', 10),
('Zander', 'standard', 10),

-- TROPHY (15 XP) - Bigger/harder to catch
('Cod', 'trophy', 15),
('Ling', 'trophy', 15),
('Coalfish', 'trophy', 15),
('Conger Eel', 'trophy', 15),
('Tope', 'trophy', 15),
('Smoothhound', 'trophy', 15),
('Starry Smoothhound', 'trophy', 15),
('Spurdog', 'trophy', 15),
('Bull Huss', 'trophy', 15),
('Thornback Ray', 'trophy', 15),
('Small-Eyed Ray', 'trophy', 15),
('Spotted Ray', 'trophy', 15),
('Cuckoo Ray', 'trophy', 15),
('Blonde Ray', 'trophy', 15),
('Pike', 'trophy', 15),
('Brown Trout', 'trophy', 15),
('Rainbow Trout', 'trophy', 15),
('Sea Trout', 'trophy', 15),
('Salmon', 'trophy', 15),
('Atlantic Salmon', 'trophy', 15),
('Grayling', 'trophy', 15),

-- RARE (20 XP) - Uncommon/difficult species
('Turbot', 'rare', 20),
('Brill', 'rare', 20),
('Undulate Ray', 'rare', 20),
('Painted Ray', 'rare', 20),
('Stingray', 'rare', 20),
('Common Skate', 'rare', 20),
('Blue Shark', 'rare', 20),
('Porbeagle', 'rare', 20),
('Thresher Shark', 'rare', 20),
('John Dory', 'rare', 20),
('Trigger Fish', 'rare', 20),
('Gilt-Head Bream', 'rare', 20),
('Bass (Large >5lb)', 'rare', 20),
('Halibut', 'rare', 20),
('Catfish', 'rare', 20),
('Wels Catfish', 'rare', 20),
('Sturgeon', 'rare', 20)

;

------------------------------------------------------------
-- 5. HELPER FUNCTION: Get XP for species
------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_species_xp(p_species TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base_xp INTEGER;
  v_tier_setting TEXT;
BEGIN
  -- Try to get from species_tiers table
  SELECT base_xp INTO v_base_xp FROM species_tiers WHERE species ILIKE p_species;
  
  IF v_base_xp IS NOT NULL THEN
    RETURN v_base_xp;
  END IF;
  
  -- Default to standard tier if species not found
  SELECT value::TEXT INTO v_tier_setting FROM app_settings WHERE key = 'xp_tier_standard';
  RETURN COALESCE(v_tier_setting::INTEGER, 10);
END;
$$;

------------------------------------------------------------
-- 6. HELPER FUNCTION: Get app setting
------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_app_setting(p_key TEXT, p_default JSONB DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_value JSONB;
BEGIN
  SELECT value INTO v_value FROM app_settings WHERE key = p_key;
  RETURN COALESCE(v_value, p_default);
END;
$$;

COMMENT ON TABLE app_settings IS 'Configurable application settings for XP, rules, and system toggles';
COMMENT ON TABLE species_tiers IS 'Species categorization for XP rewards - common/standard/trophy/rare';
