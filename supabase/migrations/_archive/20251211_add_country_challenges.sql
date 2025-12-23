-- Add country code to catches for geographic challenge tracking
ALTER TABLE catches
ADD COLUMN IF NOT EXISTS country_code text; -- ISO 3166-1 alpha-2 (e.g., 'GB', 'PT', 'FR')

-- Index for efficient country-based queries
CREATE INDEX IF NOT EXISTS idx_catches_country_code ON catches(country_code) WHERE country_code IS NOT NULL;

-- Add scope fields to challenges table
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'global'; -- 'global' | 'country' | 'region' | 'event'

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope_value text; -- e.g., 'GB', 'PT', 'Essex' (null for global)

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS scope_countries text[]; -- For multi-country challenges like "European Tour"

-- Add event timing fields for seasonal challenges
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS starts_at timestamptz;

ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS ends_at timestamptz;

-- Track which countries a user has fished in (for quick lookups)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS countries_fished text[] DEFAULT '{}';

-- Comments for documentation
COMMENT ON COLUMN catches.country_code IS 'ISO 3166-1 alpha-2 country code derived from catch location';
COMMENT ON COLUMN challenges.scope IS 'Challenge scope: global (everyone), country (specific country), region (sub-country), event (special criteria)';
COMMENT ON COLUMN challenges.scope_value IS 'Value for scope filtering, e.g., country code GB or region name Essex';
COMMENT ON COLUMN challenges.scope_countries IS 'Array of country codes for multi-country challenges';
COMMENT ON COLUMN profiles.countries_fished IS 'Array of country codes where user has logged catches';

-- Insert initial country challenges
INSERT INTO challenges (slug, title, description, scope, scope_value, category, xp_reward, icon, is_active, water_type, difficulty, criteria, sort_order)
VALUES
  -- UK Challenges
  ('uk_first_catch', 'UK First Catch', 'Log your first catch in the United Kingdom', 'country', 'GB', 'milestones', 50, '🇬🇧', true, NULL, 'easy', '{"type": "country_catches", "country": "GB", "count": 1}', 100),
  ('uk_explorer_10', 'UK Explorer', 'Catch 10 fish in the United Kingdom', 'country', 'GB', 'exploration', 100, '🇬🇧', true, NULL, 'medium', '{"type": "country_catches", "country": "GB", "count": 10}', 101),
  ('uk_explorer_50', 'UK Angler', 'Catch 50 fish in the United Kingdom', 'country', 'GB', 'exploration', 250, '🇬🇧', true, NULL, 'hard', '{"type": "country_catches", "country": "GB", "count": 50}', 102),
  ('uk_explorer_100', 'UK Master', 'Catch 100 fish in the United Kingdom', 'country', 'GB', 'exploration', 500, '🇬🇧', true, NULL, 'expert', '{"type": "country_catches", "country": "GB", "count": 100}', 103),
  ('uk_species_5', 'UK Species Hunter', 'Catch 5 different species in the UK', 'country', 'GB', 'species', 150, '🇬🇧', true, NULL, 'medium', '{"type": "country_species", "country": "GB", "count": 5}', 104),
  ('uk_species_10', 'UK Species Master', 'Catch 10 different species in the UK', 'country', 'GB', 'species', 300, '🇬🇧', true, NULL, 'hard', '{"type": "country_species", "country": "GB", "count": 10}', 105),
  
  -- Portugal Challenges
  ('pt_first_catch', 'Portugal First Catch', 'Log your first catch in Portugal', 'country', 'PT', 'milestones', 50, '🇵🇹', true, NULL, 'easy', '{"type": "country_catches", "country": "PT", "count": 1}', 110),
  ('pt_explorer_10', 'Portugal Explorer', 'Catch 10 fish in Portugal', 'country', 'PT', 'exploration', 100, '🇵🇹', true, NULL, 'medium', '{"type": "country_catches", "country": "PT", "count": 10}', 111),
  ('pt_species_5', 'Portugal Species Hunter', 'Catch 5 different species in Portugal', 'country', 'PT', 'species', 150, '🇵🇹', true, NULL, 'medium', '{"type": "country_species", "country": "PT", "count": 5}', 112),
  
  -- France Challenges
  ('fr_first_catch', 'France First Catch', 'Log your first catch in France', 'country', 'FR', 'milestones', 50, '🇫🇷', true, NULL, 'easy', '{"type": "country_catches", "country": "FR", "count": 1}', 120),
  ('fr_explorer_10', 'France Explorer', 'Catch 10 fish in France', 'country', 'FR', 'exploration', 100, '🇫🇷', true, NULL, 'medium', '{"type": "country_catches", "country": "FR", "count": 10}', 121),
  ('fr_species_5', 'France Species Hunter', 'Catch 5 different species in France', 'country', 'FR', 'species', 150, '🇫🇷', true, NULL, 'medium', '{"type": "country_species", "country": "FR", "count": 5}', 122),
  
  -- Spain Challenges
  ('es_first_catch', 'Spain First Catch', 'Log your first catch in Spain', 'country', 'ES', 'milestones', 50, '🇪🇸', true, NULL, 'easy', '{"type": "country_catches", "country": "ES", "count": 1}', 130),
  ('es_explorer_10', 'Spain Explorer', 'Catch 10 fish in Spain', 'country', 'ES', 'exploration', 100, '🇪🇸', true, NULL, 'medium', '{"type": "country_catches", "country": "ES", "count": 10}', 131),
  ('es_species_5', 'Spain Species Hunter', 'Catch 5 different species in Spain', 'country', 'ES', 'species', 150, '🇪🇸', true, NULL, 'medium', '{"type": "country_species", "country": "ES", "count": 5}', 132),
  
  -- Ireland Challenges
  ('ie_first_catch', 'Ireland First Catch', 'Log your first catch in Ireland', 'country', 'IE', 'milestones', 50, '🇮🇪', true, NULL, 'easy', '{"type": "country_catches", "country": "IE", "count": 1}', 140),
  ('ie_explorer_10', 'Ireland Explorer', 'Catch 10 fish in Ireland', 'country', 'IE', 'exploration', 100, '🇮🇪', true, NULL, 'medium', '{"type": "country_catches", "country": "IE", "count": 10}', 141),
  
  -- Netherlands Challenges
  ('nl_first_catch', 'Netherlands First Catch', 'Log your first catch in the Netherlands', 'country', 'NL', 'milestones', 50, '🇳🇱', true, NULL, 'easy', '{"type": "country_catches", "country": "NL", "count": 1}', 150),
  ('nl_explorer_10', 'Netherlands Explorer', 'Catch 10 fish in the Netherlands', 'country', 'NL', 'exploration', 100, '🇳🇱', true, NULL, 'medium', '{"type": "country_catches", "country": "NL", "count": 10}', 151),
  
  -- Multi-country / Event Challenges
  ('world_traveler_3', 'International Angler', 'Fish in 3 different countries', 'event', NULL, 'exploration', 300, '🌍', true, NULL, 'hard', '{"type": "unique_countries", "count": 3}', 200),
  ('world_traveler_5', 'World Traveler', 'Fish in 5 different countries', 'event', NULL, 'exploration', 500, '🌍', true, NULL, 'expert', '{"type": "unique_countries", "count": 5}', 201),
  ('world_traveler_10', 'Globe Trotter', 'Fish in 10 different countries', 'event', NULL, 'exploration', 1000, '🌍', true, NULL, 'legendary', '{"type": "unique_countries", "count": 10}', 202),
  ('european_tour', 'European Tour', 'Fish in 3 European countries', 'event', NULL, 'exploration', 400, '🇪🇺', true, NULL, 'hard', '{"type": "european_countries", "count": 3}', 203)
ON CONFLICT (slug) DO NOTHING;
