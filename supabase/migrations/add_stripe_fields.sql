-- Add Stripe subscription fields to lakes table
-- This tracks premium subscription status

-- Add stripe_customer_id to profiles (one per user)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- Add subscription fields to lakes
ALTER TABLE lakes 
ADD COLUMN IF NOT EXISTS stripe_subscription_id text UNIQUE,
ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz,
ADD COLUMN IF NOT EXISTS premium_plan text; -- 'monthly' or 'yearly'

-- Create subscriptions table for tracking all subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_customer_id text NOT NULL,
  status text NOT NULL, -- 'active', 'canceled', 'past_due', 'trialing', etc.
  price_id text NOT NULL,
  product_type text NOT NULL, -- 'lake_premium', 'shop_premium', etc.
  target_id uuid, -- The lake_id, shop_id, etc. being subscribed
  current_period_start timestamptz NOT NULL,
  current_period_end timestamptz NOT NULL,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index for looking up subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_target_id ON subscriptions(target_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS policies for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role can insert/update (via webhooks)
-- No insert/update policies for regular users

-- Create checkout_sessions table for tracking pending checkouts
CREATE TABLE IF NOT EXISTS checkout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text UNIQUE NOT NULL,
  product_type text NOT NULL,
  target_id uuid, -- The lake_id being upgraded
  status text DEFAULT 'pending', -- 'pending', 'completed', 'expired'
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- RLS for checkout_sessions
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own checkout sessions"
  ON checkout_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Function to check if a lake is premium (for use in queries)
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

-- Comment
COMMENT ON TABLE subscriptions IS 'Tracks all Stripe subscriptions for premium features';
COMMENT ON TABLE checkout_sessions IS 'Tracks pending Stripe checkout sessions';
