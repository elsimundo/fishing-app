-- Gamification Enhancements: Streaks, Rarity, Showcase, Shares
-- ============================================================

-- 1. Add rarity tier to challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS rarity TEXT DEFAULT 'common' 
  CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary'));

-- 2. Add share tracking fields
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS share_image_template TEXT;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS unlock_sound TEXT DEFAULT 'default';

-- 3. User streaks table
CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INT DEFAULT 0,
  longest_streak INT DEFAULT 0,
  last_activity_date DATE,
  streak_freezes_available INT DEFAULT 1,
  streak_freezes_used_this_week INT DEFAULT 0,
  week_start_for_freeze DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on user_streaks
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
  ON user_streaks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
  ON user_streaks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
  ON user_streaks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 4. Profile showcase (pinned achievements)
CREATE TABLE IF NOT EXISTS profile_showcase (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  position INT CHECK (position >= 1 AND position <= 6),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, position),
  UNIQUE (user_id, challenge_id)
);

-- Enable RLS on profile_showcase
ALTER TABLE profile_showcase ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view showcases"
  ON profile_showcase FOR SELECT
  USING (true);

CREATE POLICY "Users can manage own showcase"
  ON profile_showcase FOR ALL
  USING (auth.uid() = user_id);

-- 5. Achievement shares tracking (for analytics and viral growth)
CREATE TABLE IF NOT EXISTS achievement_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES challenges(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'twitter', 'facebook', 'copy_link', 'native_share')),
  shared_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on achievement_shares
ALTER TABLE achievement_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own shares"
  ON achievement_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own shares"
  ON achievement_shares FOR SELECT
  USING (auth.uid() = user_id);

-- 6. Add streak fields to profiles for quick access
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_streak INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0;

-- 7. Function to update streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS TABLE(
  new_streak INT,
  streak_increased BOOLEAN,
  streak_lost BOOLEAN,
  longest_streak INT
) AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
  v_today DATE := CURRENT_DATE;
  v_streak_increased BOOLEAN := FALSE;
  v_streak_lost BOOLEAN := FALSE;
BEGIN
  -- Get or create streak record
  INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date)
  VALUES (p_user_id, 0, 0, NULL)
  ON CONFLICT (user_id) DO NOTHING;
  
  SELECT us.last_activity_date, us.current_streak, us.longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_streaks us
  WHERE us.user_id = p_user_id;
  
  -- Calculate new streak
  IF v_last_date IS NULL THEN
    -- First activity ever
    v_current_streak := 1;
    v_streak_increased := TRUE;
  ELSIF v_last_date = v_today THEN
    -- Already logged today, no change
    NULL;
  ELSIF v_last_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day, increase streak
    v_current_streak := v_current_streak + 1;
    v_streak_increased := TRUE;
  ELSE
    -- Streak broken (unless we use a freeze)
    -- Check if freeze available
    IF EXISTS (
      SELECT 1 FROM user_streaks 
      WHERE user_id = p_user_id 
      AND streak_freezes_available > 0
      AND v_last_date = v_today - INTERVAL '2 days'
    ) THEN
      -- Use freeze, continue streak
      UPDATE user_streaks 
      SET streak_freezes_available = streak_freezes_available - 1
      WHERE user_id = p_user_id;
      v_current_streak := v_current_streak + 1;
      v_streak_increased := TRUE;
    ELSE
      -- Streak lost
      v_streak_lost := v_current_streak > 0;
      v_current_streak := 1;
      v_streak_increased := TRUE;
    END IF;
  END IF;
  
  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;
  
  -- Save changes
  UPDATE user_streaks
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Also update profile for quick access
  UPDATE profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak
  WHERE id = p_user_id;
  
  RETURN QUERY SELECT v_current_streak, v_streak_increased, v_streak_lost, v_longest_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Update existing challenges with rarity based on difficulty
UPDATE challenges SET rarity = 'common' WHERE difficulty = 'easy' AND rarity IS NULL;
UPDATE challenges SET rarity = 'uncommon' WHERE difficulty = 'medium' AND rarity IS NULL;
UPDATE challenges SET rarity = 'rare' WHERE difficulty = 'hard' AND rarity IS NULL;
UPDATE challenges SET rarity = 'epic' WHERE difficulty = 'expert' AND rarity IS NULL;
UPDATE challenges SET rarity = 'legendary' WHERE difficulty = 'legendary' AND rarity IS NULL;

-- 9. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_streaks_user_id ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_showcase_user_id ON profile_showcase(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_shares_user_id ON achievement_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_challenges_rarity ON challenges(rarity);

-- 10. Add trigger to reset weekly freeze allowance
CREATE OR REPLACE FUNCTION reset_weekly_streak_freezes()
RETURNS TRIGGER AS $$
BEGIN
  -- Reset freezes on Monday
  IF NEW.last_activity_date IS NOT NULL AND 
     (NEW.week_start_for_freeze IS NULL OR 
      NEW.week_start_for_freeze < date_trunc('week', CURRENT_DATE)) THEN
    NEW.streak_freezes_available := 1;
    NEW.streak_freezes_used_this_week := 0;
    NEW.week_start_for_freeze := date_trunc('week', CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reset_weekly_freezes
  BEFORE UPDATE ON user_streaks
  FOR EACH ROW
  EXECUTE FUNCTION reset_weekly_streak_freezes();
