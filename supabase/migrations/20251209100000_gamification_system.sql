-- GAMIFICATION SYSTEM: XP, Levels, Challenges, Weekly Species Points
-- TheSwim - "Pokémon meets Fantasy Football for Fishing"

------------------------------------------------------------
-- 1. XP & LEVELS (Profile Extension)
------------------------------------------------------------

-- Add gamification columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS xp integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS level integer DEFAULT 1;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS total_challenges_completed integer DEFAULT 0;

-- Index for leaderboards
CREATE INDEX IF NOT EXISTS idx_profiles_xp ON profiles(xp DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON profiles(level DESC);

------------------------------------------------------------
-- 2. CHALLENGES SYSTEM
------------------------------------------------------------

-- Challenge definitions (admin-managed)
CREATE TABLE IF NOT EXISTS challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL,
  
  -- Categorization
  category text NOT NULL,
  difficulty text DEFAULT 'medium',
  
  -- Completion criteria (JSON for flexibility)
  criteria jsonb NOT NULL,
  
  -- Rewards
  xp_reward integer DEFAULT 50,
  
  -- Display
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  is_featured boolean DEFAULT false,
  featured_until timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_challenges_category ON challenges(category);
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);

-- User challenge progress/completion
CREATE TABLE IF NOT EXISTS user_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  
  progress integer DEFAULT 0,
  target integer DEFAULT 1,
  
  completed_at timestamptz,
  xp_awarded integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, challenge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(user_id, completed_at) WHERE completed_at IS NOT NULL;

------------------------------------------------------------
-- 3. WEEKLY SPECIES POINTS
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS weekly_species_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  species text NOT NULL,
  points integer NOT NULL,
  
  week_start date NOT NULL,
  
  is_bonus boolean DEFAULT false,
  bonus_reason text,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(species, week_start)
);

CREATE INDEX IF NOT EXISTS idx_weekly_species_week ON weekly_species_points(week_start);

-- User weekly stats
CREATE TABLE IF NOT EXISTS user_weekly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  
  catches_count integer DEFAULT 0,
  fishing_days integer DEFAULT 0,
  species_points integer DEFAULT 0,
  xp_earned integer DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_user_weekly_stats_week ON user_weekly_stats(week_start);
CREATE INDEX IF NOT EXISTS idx_user_weekly_stats_points ON user_weekly_stats(week_start, species_points DESC);

------------------------------------------------------------
-- 4. XP TRANSACTION LOG
------------------------------------------------------------

CREATE TABLE IF NOT EXISTS xp_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  amount integer NOT NULL,
  reason text NOT NULL,
  reference_type text,
  reference_id uuid,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON xp_transactions(user_id, created_at DESC);

------------------------------------------------------------
-- 5. HELPER FUNCTIONS
------------------------------------------------------------

-- Calculate level from XP
CREATE OR REPLACE FUNCTION calculate_level(total_xp integer)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  lvl integer := 1;
  xp_needed integer := 0;
BEGIN
  WHILE total_xp >= xp_needed LOOP
    lvl := lvl + 1;
    xp_needed := xp_needed + (lvl * 50);
  END LOOP;
  RETURN lvl - 1;
END;
$$;

-- Get XP needed for next level
CREATE OR REPLACE FUNCTION xp_for_next_level(current_level integer)
RETURNS integer
LANGUAGE plpgsql AS $$
DECLARE
  total_xp integer := 0;
  lvl integer := 1;
BEGIN
  WHILE lvl <= current_level LOOP
    lvl := lvl + 1;
    total_xp := total_xp + (lvl * 50);
  END LOOP;
  RETURN total_xp;
END;
$$;

-- Award XP to user
CREATE OR REPLACE FUNCTION award_xp(
  p_user_id uuid,
  p_amount integer,
  p_reason text,
  p_reference_type text DEFAULT NULL,
  p_reference_id uuid DEFAULT NULL
)
RETURNS TABLE(new_xp integer, new_level integer, leveled_up boolean)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_level integer;
  updated_xp integer;
  updated_level integer;
BEGIN
  SELECT level INTO old_level FROM profiles WHERE id = p_user_id;
  
  UPDATE profiles 
  SET 
    xp = xp + p_amount,
    level = calculate_level(xp + p_amount),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING xp, level INTO updated_xp, updated_level;
  
  INSERT INTO xp_transactions (user_id, amount, reason, reference_type, reference_id)
  VALUES (p_user_id, p_amount, p_reason, p_reference_type, p_reference_id);
  
  RETURN QUERY SELECT updated_xp, updated_level, (updated_level > old_level);
END;
$$;

-- Get current week start (Monday)
CREATE OR REPLACE FUNCTION get_week_start(for_date date DEFAULT CURRENT_DATE)
RETURNS date
LANGUAGE sql AS $$
  SELECT for_date - EXTRACT(ISODOW FROM for_date)::integer + 1;
$$;

------------------------------------------------------------
-- 6. RLS POLICIES
------------------------------------------------------------

ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_species_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_weekly_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view challenges" ON challenges;
CREATE POLICY "Anyone can view challenges" ON challenges FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users can view own challenges" ON user_challenges;
CREATE POLICY "Users can view own challenges" ON user_challenges FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own challenges" ON user_challenges;
CREATE POLICY "Users can insert own challenges" ON user_challenges FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own challenges" ON user_challenges;
CREATE POLICY "Users can update own challenges" ON user_challenges FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can view weekly species points" ON weekly_species_points;
CREATE POLICY "Anyone can view weekly species points" ON weekly_species_points FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view weekly stats" ON user_weekly_stats;
CREATE POLICY "Users can view weekly stats" ON user_weekly_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own weekly stats" ON user_weekly_stats;
CREATE POLICY "Users can manage own weekly stats" ON user_weekly_stats FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own xp transactions" ON xp_transactions;
CREATE POLICY "Users can view own xp transactions" ON xp_transactions FOR SELECT USING (auth.uid() = user_id);

------------------------------------------------------------
-- 7. SEED INITIAL CHALLENGES
------------------------------------------------------------

INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order) VALUES
-- MILESTONES
('first_catch', 'First Catch', 'Log your very first catch', '🎣', 'milestones', 'easy', '{"type": "catch_count", "value": 1}', 25, 1),
('catch_10', 'Getting Started', 'Log 10 catches', '🐟', 'milestones', 'easy', '{"type": "catch_count", "value": 10}', 50, 2),
('catch_50', 'Dedicated Angler', 'Log 50 catches', '🐠', 'milestones', 'medium', '{"type": "catch_count", "value": 50}', 100, 3),
('catch_100', 'Century', 'Log 100 catches', '💯', 'milestones', 'medium', '{"type": "catch_count", "value": 100}', 200, 4),
('catch_500', 'Fishing Fanatic', 'Log 500 catches', '🏆', 'milestones', 'hard', '{"type": "catch_count", "value": 500}', 500, 5),
('catch_1000', 'Legend', 'Log 1000 catches', '👑', 'milestones', 'legendary', '{"type": "catch_count", "value": 1000}', 1000, 6),

-- SPECIES
('species_5', 'Variety Pack', 'Catch 5 different species', '🎨', 'species', 'easy', '{"type": "species_count", "value": 5}', 75, 10),
('species_10', 'Species Hunter', 'Catch 10 different species', '🔍', 'species', 'medium', '{"type": "species_count", "value": 10}', 150, 11),
('species_25', 'Biodiversity Expert', 'Catch 25 different species', '🌊', 'species', 'hard', '{"type": "species_count", "value": 25}', 300, 12),
('catch_carp', 'Carp Catcher', 'Catch a carp', '🐟', 'species', 'easy', '{"type": "catch_species", "species": "carp"}', 30, 20),
('catch_pike', 'Pike Hunter', 'Catch a pike', '🐊', 'species', 'medium', '{"type": "catch_species", "species": "pike"}', 50, 21),
('catch_perch', 'Perch Patrol', 'Catch a perch', '🐠', 'species', 'easy', '{"type": "catch_species", "species": "perch"}', 30, 22),
('catch_bass', 'Bass Master', 'Catch a bass', '🎸', 'species', 'medium', '{"type": "catch_species", "species": "bass"}', 50, 23),
('catch_tench', 'Tench Time', 'Catch a tench', '🌿', 'species', 'medium', '{"type": "catch_species", "species": "tench"}', 50, 24),
('catch_roach', 'Roach Runner', 'Catch a roach', '🐡', 'species', 'easy', '{"type": "catch_species", "species": "roach"}', 30, 25),
('catch_bream', 'Bream Dream', 'Catch a bream', '🥉', 'species', 'easy', '{"type": "catch_species", "species": "bream"}', 30, 26),
('catch_trout', 'Trout Scout', 'Catch a trout', '🌈', 'species', 'medium', '{"type": "catch_species", "species": "trout"}', 50, 27),
('catch_mackerel', 'Mackerel Attack', 'Catch a mackerel', '⚡', 'species', 'easy', '{"type": "catch_species", "species": "mackerel"}', 30, 28),
('catch_cod', 'Cod Father', 'Catch a cod', '🎬', 'species', 'medium', '{"type": "catch_species", "species": "cod"}', 50, 29),

-- TIME
('early_bird', 'Early Bird', 'Log a catch before 6am', '🌅', 'time', 'medium', '{"type": "catch_time", "before": "06:00"}', 75, 30),
('night_owl', 'Night Owl', 'Log a catch after 10pm', '🌙', 'time', 'medium', '{"type": "catch_time", "after": "22:00"}', 75, 31),
('midnight_angler', 'Midnight Angler', 'Log a catch between midnight and 4am', '🦉', 'time', 'hard', '{"type": "catch_time", "after": "00:00", "before": "04:00"}', 100, 32),
('weekend_warrior', 'Weekend Warrior', 'Log catches on 10 different weekends', '📅', 'time', 'medium', '{"type": "weekend_count", "value": 10}', 100, 33),

-- EXPLORATION
('explorer_3', 'Explorer', 'Fish at 3 different locations', '🗺️', 'exploration', 'easy', '{"type": "location_count", "value": 3}', 50, 40),
('explorer_10', 'Adventurer', 'Fish at 10 different locations', '🧭', 'exploration', 'medium', '{"type": "location_count", "value": 10}', 150, 41),
('explorer_25', 'Wanderer', 'Fish at 25 different locations', '🌍', 'exploration', 'hard', '{"type": "location_count", "value": 25}', 300, 42),
('sea_legs', 'Sea Legs', 'Log a saltwater catch', '🌊', 'exploration', 'easy', '{"type": "water_type", "value": "saltwater"}', 50, 43),
('freshwater_fan', 'Freshwater Fan', 'Log a freshwater catch', '🏞️', 'exploration', 'easy', '{"type": "water_type", "value": "freshwater"}', 50, 44),

-- CONDITIONS
('weather_warrior', 'Weather Warrior', 'Log a catch in the rain', '🌧️', 'conditions', 'medium', '{"type": "weather_condition", "value": "rain"}', 75, 50),
('wind_rider', 'Wind Rider', 'Log a catch on a windy day (15+ mph)', '💨', 'conditions', 'medium', '{"type": "wind_speed", "min": 15}', 75, 51),

-- SOCIAL
('social_first_comment', 'Friendly', 'Leave your first comment', '💬', 'social', 'easy', '{"type": "comment_count", "value": 1}', 25, 60),
('social_10_comments', 'Conversationalist', 'Leave 10 comments', '🗣️', 'social', 'easy', '{"type": "comment_count", "value": 10}', 50, 61),
('social_butterfly', 'Social Butterfly', 'Leave 100 comments', '🦋', 'social', 'medium', '{"type": "comment_count", "value": 100}', 150, 62),
('first_follower', 'Making Friends', 'Get your first follower', '👋', 'social', 'easy', '{"type": "follower_count", "value": 1}', 50, 63),
('influencer', 'Influencer', 'Get 50 followers', '⭐', 'social', 'hard', '{"type": "follower_count", "value": 50}', 200, 64),

-- COMPETITION
('comp_entered', 'Competitor', 'Enter your first competition', '🎯', 'competition', 'easy', '{"type": "competition_entered", "value": 1}', 50, 70),
('comp_5_entered', 'Regular Competitor', 'Enter 5 competitions', '🏅', 'competition', 'medium', '{"type": "competition_entered", "value": 5}', 100, 71),
('comp_winner', 'Champion', 'Win a competition', '🥇', 'competition', 'hard', '{"type": "competition_won", "value": 1}', 200, 72),
('comp_podium', 'Podium Finish', 'Finish in top 3 of a competition', '🏆', 'competition', 'medium', '{"type": "competition_podium", "value": 1}', 100, 73),

-- SKILL
('multi_species_day', 'Mixed Bag', 'Catch 3+ species in one session', '🎰', 'skill', 'medium', '{"type": "species_in_session", "value": 3}', 100, 80),
('photo_pro', 'Photographer', 'Add photos to 10 catches', '📸', 'skill', 'easy', '{"type": "photo_count", "value": 10}', 75, 81),
('photo_master', 'Photo Master', 'Add photos to 50 catches', '🖼️', 'skill', 'medium', '{"type": "photo_count", "value": 50}', 150, 82),
('pb_hunter', 'PB Hunter', 'Set a personal best', '📈', 'skill', 'medium', '{"type": "pb_set", "value": 1}', 100, 83),
('double_figures', 'Double Figures', 'Catch a fish over 10lb', '💪', 'skill', 'hard', '{"type": "catch_weight", "min_lb": 10}', 150, 84),
('specimen_hunter', 'Specimen Hunter', 'Catch a fish over 20lb', '🦣', 'skill', 'legendary', '{"type": "catch_weight", "min_lb": 20}', 300, 85),

-- SESSIONS
('first_session', 'First Trip', 'Log your first fishing session', '🚗', 'sessions', 'easy', '{"type": "session_count", "value": 1}', 25, 90),
('session_10', 'Regular', 'Log 10 fishing sessions', '📝', 'sessions', 'easy', '{"type": "session_count", "value": 10}', 75, 91),
('session_50', 'Committed', 'Log 50 fishing sessions', '📚', 'sessions', 'medium', '{"type": "session_count", "value": 50}', 200, 92),
('marathon_session', 'Marathon', 'Log a session over 8 hours', '⏰', 'sessions', 'medium', '{"type": "session_duration", "min_hours": 8}', 100, 93)

ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  criteria = EXCLUDED.criteria,
  xp_reward = EXCLUDED.xp_reward,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

------------------------------------------------------------
-- 8. SEED INITIAL WEEKLY SPECIES POINTS
------------------------------------------------------------

INSERT INTO weekly_species_points (species, points, week_start, is_bonus, bonus_reason) VALUES
('carp', 5, get_week_start(), false, NULL),
('perch', 8, get_week_start(), false, NULL),
('pike', 15, get_week_start(), false, NULL),
('roach', 6, get_week_start(), false, NULL),
('bream', 7, get_week_start(), false, NULL),
('tench', 20, get_week_start(), true, 'Winter Warrior Bonus!'),
('bass', 12, get_week_start(), false, NULL),
('mackerel', 8, get_week_start(), false, NULL),
('cod', 18, get_week_start(), false, NULL),
('pollock', 10, get_week_start(), false, NULL),
('trout', 10, get_week_start(), false, NULL),
('chub', 9, get_week_start(), false, NULL),
('barbel', 16, get_week_start(), false, NULL),
('rudd', 7, get_week_start(), false, NULL)
ON CONFLICT (species, week_start) DO NOTHING;

COMMENT ON TABLE challenges IS 'Lifetime achievement challenges - Pokémon-style collection game';
COMMENT ON TABLE user_challenges IS 'User progress and completion of challenges';
COMMENT ON TABLE weekly_species_points IS 'Rotating weekly point values for species';
COMMENT ON TABLE user_weekly_stats IS 'Weekly activity tracking for leaderboards';
