-- ============================================================================
-- Businesses: Claiming & Monetisation Foundations
-- ============================================================================

-- 1) Extend businesses table for ownership and monetisation

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS owner_user_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS is_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS osm_id text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'osm',
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS premium_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_businesses_osm_id ON businesses(osm_id);
CREATE INDEX IF NOT EXISTS idx_businesses_owner_user_id ON businesses(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_is_claimed ON businesses(is_claimed);
CREATE INDEX IF NOT EXISTS idx_businesses_is_premium ON businesses(is_premium) WHERE is_premium = true;

-- 2) Business claims table

CREATE TABLE IF NOT EXISTS business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'approved' | 'rejected'
  relationship text,
  proof_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_business_claims_business_id ON business_claims(business_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_user_id ON business_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_business_claims_status ON business_claims(status);

-- RLS setup (basic): users can see their own claims; admins can see all
ALTER TABLE business_claims ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own business claims" ON business_claims;
CREATE POLICY "Users can view own business claims" ON business_claims
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create business claims" ON business_claims;
CREATE POLICY "Users can create business claims" ON business_claims
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies can be layered via a separate role; for now keep updates manual via service role.

-- 3) Helper function to approve / reject claims

CREATE OR REPLACE FUNCTION approve_business_claim(p_claim_id uuid, p_reviewer_id uuid, p_action text)
RETURNS void AS $$
DECLARE
  v_business_id uuid;
  v_user_id uuid;
BEGIN
  SELECT business_id, user_id INTO v_business_id, v_user_id
  FROM business_claims
  WHERE id = p_claim_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found';
  END IF;

  IF p_action = 'approve' THEN
    UPDATE businesses
    SET owner_user_id = v_user_id,
        is_claimed = true
    WHERE id = v_business_id;

    UPDATE business_claims
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = p_reviewer_id
    WHERE id = p_claim_id;
  ELSIF p_action = 'reject' THEN
    UPDATE business_claims
    SET status = 'rejected',
        reviewed_at = now(),
        reviewed_by = p_reviewer_id
    WHERE id = p_claim_id;
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
