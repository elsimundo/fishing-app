-- Add additional weight milestone challenges

INSERT INTO challenges (slug, title, description, icon, category, difficulty, criteria, xp_reward, sort_order) VALUES
-- Entry-level weight milestones
('first_2kg', '2kg Club', 'Catch a fish over 2kg (4.4lb)', '🎯', 'skill', 'easy', '{"type": "catch_weight", "min_kg": 2}', 50, 83),
('first_20kg', 'Leviathan', 'Catch a fish over 20kg (44lb)', '🐉', 'skill', 'legendary', '{"type": "catch_weight", "min_kg": 20}', 500, 88),
('first_30kg', 'Sea Monster', 'Catch a fish over 30kg (66lb)', '🦈', 'skill', 'legendary', '{"type": "catch_weight", "min_kg": 30}', 750, 89)

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
