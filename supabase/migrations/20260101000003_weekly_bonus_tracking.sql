-- Add weekly bonus tracking to prevent farming
-- Migration: 20260101000003_weekly_bonus_tracking

-- Track weekly species bonus claims to prevent delete/re-log farming
CREATE TABLE IF NOT EXISTS weekly_bonus_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  species text NOT NULL,
  week_start date NOT NULL,
  points_awarded integer NOT NULL,
  claimed_at timestamptz DEFAULT now(),
  
  -- One claim per user per species per week
  UNIQUE(user_id, species, week_start)
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_weekly_bonus_claims_user_week 
ON weekly_bonus_claims(user_id, week_start);

-- Comment
COMMENT ON TABLE weekly_bonus_claims IS 'Tracks weekly species bonus XP claims to prevent farming via delete/re-log';
