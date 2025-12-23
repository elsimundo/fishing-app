-- Add condition-based challenges (weather, moon phase, etc.)
-- These challenges use the environmental data now stored on catches/sessions

INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order, water_type) VALUES

-- MOON PHASE CHALLENGES
('full_moon_catch', 'Lunar Legend', 'Catch a fish during a full moon', '🌕', 'conditions', 'medium', '{"type": "moon_phase", "phase": "Full Moon"}', 75, 52, 'both'),
('new_moon_catch', 'Dark Side', 'Catch a fish during a new moon', '🌑', 'conditions', 'medium', '{"type": "moon_phase", "phase": "New Moon"}', 75, 53, 'both'),
('moon_master', 'Moon Master', 'Catch fish during 4 different moon phases', '🌙', 'conditions', 'hard', '{"type": "moon_phases_count", "value": 4}', 150, 54, 'both'),

-- WEATHER CHALLENGES (enhanced)
('sunny_fisher', 'Fair Weather Fisher', 'Catch 10 fish on clear/sunny days', '☀️', 'conditions', 'easy', '{"type": "weather_count", "conditions": ["Clear", "Sunny", "Mainly clear"], "value": 10}', 75, 55, 'both'),
('storm_chaser', 'Storm Chaser', 'Catch a fish during a thunderstorm', '⛈️', 'conditions', 'hard', '{"type": "weather_condition", "value": "Thunderstorm"}', 150, 56, 'both'),
('fog_fisher', 'Fog Fisher', 'Catch a fish in foggy conditions', '🌫️', 'conditions', 'medium', '{"type": "weather_condition", "value": "Fog"}', 100, 57, 'both'),

-- SESSION TIME CHALLENGES
('dawn_session', 'Early Start', 'Start a session before 6am', '🌅', 'sessions', 'medium', '{"type": "session_start_time", "before": "06:00"}', 75, 94, 'both'),
('all_day_session', 'All Day Angler', 'Log a session over 12 hours', '🌞', 'sessions', 'hard', '{"type": "session_duration", "min_hours": 12}', 150, 95, 'both'),
('night_session', 'Night Fisher', 'Start a session after 8pm', '🌃', 'sessions', 'medium', '{"type": "session_start_time", "after": "20:00"}', 75, 96, 'both')

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

-- Update existing weather challenges to use new criteria format
UPDATE challenges SET criteria = '{"type": "weather_count", "conditions": ["rain", "drizzle", "shower"], "value": 5}' WHERE slug = 'weather_warrior';
UPDATE challenges SET criteria = '{"type": "wind_speed_count", "min_mph": 15, "value": 5}' WHERE slug = 'wind_rider';
