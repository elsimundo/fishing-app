-- ============================================
-- COMBINED MIGRATIONS - December 8, 2024
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- 1. SAVED MARKS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS saved_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  water_type text DEFAULT 'sea',
  notes text,
  privacy_level text DEFAULT 'private', -- 'private', 'friends', 'public'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_saved_marks_user_id ON saved_marks(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_marks_public ON saved_marks(privacy_level) WHERE privacy_level = 'public';

-- RLS policies
ALTER TABLE saved_marks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own marks" ON saved_marks;
CREATE POLICY "Users can view own marks"
  ON saved_marks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view public marks" ON saved_marks;
CREATE POLICY "Users can view public marks"
  ON saved_marks FOR SELECT
  USING (privacy_level = 'public');

DROP POLICY IF EXISTS "Users can create marks" ON saved_marks;
CREATE POLICY "Users can create marks"
  ON saved_marks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own marks" ON saved_marks;
CREATE POLICY "Users can update own marks"
  ON saved_marks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own marks" ON saved_marks;
CREATE POLICY "Users can delete own marks"
  ON saved_marks FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_marks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS saved_marks_updated_at ON saved_marks;
CREATE TRIGGER saved_marks_updated_at
  BEFORE UPDATE ON saved_marks
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_marks_updated_at();

-- ============================================
-- 2. MARK SHARES TABLE (Friend sharing)
-- ============================================

CREATE TABLE IF NOT EXISTS mark_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mark_id uuid NOT NULL REFERENCES saved_marks(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  can_edit boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(mark_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_mark_shares_mark_id ON mark_shares(mark_id);
CREATE INDEX IF NOT EXISTS idx_mark_shares_shared_with ON mark_shares(shared_with);

ALTER TABLE mark_shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view shares they created" ON mark_shares;
CREATE POLICY "Users can view shares they created"
  ON mark_shares FOR SELECT
  USING (auth.uid() = shared_by);

DROP POLICY IF EXISTS "Users can view shares with them" ON mark_shares;
CREATE POLICY "Users can view shares with them"
  ON mark_shares FOR SELECT
  USING (auth.uid() = shared_with);

DROP POLICY IF EXISTS "Users can create shares for own marks" ON mark_shares;
CREATE POLICY "Users can create shares for own marks"
  ON mark_shares FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by AND
    EXISTS (SELECT 1 FROM saved_marks WHERE id = mark_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can delete shares they created" ON mark_shares;
CREATE POLICY "Users can delete shares they created"
  ON mark_shares FOR DELETE
  USING (auth.uid() = shared_by);

-- Policy to view marks shared with you
DROP POLICY IF EXISTS "Users can view marks shared with them" ON saved_marks;
CREATE POLICY "Users can view marks shared with them"
  ON saved_marks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM mark_shares 
      WHERE mark_shares.mark_id = saved_marks.id 
      AND mark_shares.shared_with = auth.uid()
    )
  );

-- ============================================
-- 3. ADD MARK_ID TO SESSIONS AND CATCHES
-- ============================================

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS mark_id uuid REFERENCES saved_marks(id) ON DELETE SET NULL;

ALTER TABLE catches 
ADD COLUMN IF NOT EXISTS mark_id uuid REFERENCES saved_marks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_mark_id ON sessions(mark_id) WHERE mark_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_catches_mark_id ON catches(mark_id) WHERE mark_id IS NOT NULL;

COMMENT ON COLUMN sessions.mark_id IS 'Optional link to a saved mark where the session started';
COMMENT ON COLUMN catches.mark_id IS 'Optional link to a saved mark where the catch was made';

-- ============================================
-- 4. STRIPE FIELDS
-- ============================================

-- Add stripe_customer_id to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Add subscription fields to lakes
ALTER TABLE lakes 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS premium_plan text;

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL,
  price_id text NOT NULL,
  product_type text NOT NULL,
  target_id uuid,
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_target_id ON subscriptions(target_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Checkout sessions table
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE NOT NULL,
  product_type text NOT NULL,
  target_id uuid,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own checkout sessions" ON checkout_sessions;
CREATE POLICY "Users can view own checkout sessions"
  ON checkout_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Helper function
CREATE OR REPLACE FUNCTION is_lake_premium(lake_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lakes 
    WHERE id = lake_id 
    AND is_premium = true 
    AND (premium_expires_at IS NULL OR premium_expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE!
-- ============================================
