-- Extend lake_claims table for proper onboarding flow
-- Run this in Supabase SQL Editor

-- Add new columns to lake_claims
ALTER TABLE lake_claims
ADD COLUMN IF NOT EXISTS role text,
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS proof_url text,
ADD COLUMN IF NOT EXISTS proof_type text,
ADD COLUMN IF NOT EXISTS lake_details jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS interested_in_premium boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add comment for lake_details structure
COMMENT ON COLUMN lake_claims.lake_details IS 'JSON with: water_type, lake_type, day_ticket_price, night_ticket_price, facilities (array), description, species (array)';

-- Add comment for role options
COMMENT ON COLUMN lake_claims.role IS 'owner | manager | staff | committee | other';

-- Add comment for proof_type options
COMMENT ON COLUMN lake_claims.proof_type IS 'insurance | lease | utility_bill | companies_house | club_membership | website_admin | other';

-- Create index for pending claims
CREATE INDEX IF NOT EXISTS idx_lake_claims_status ON lake_claims(status) WHERE status = 'pending';

-- Update RLS policies to allow users to read their own claims
DROP POLICY IF EXISTS "Users can view their own claims" ON lake_claims;
CREATE POLICY "Users can view their own claims"
  ON lake_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert claims
DROP POLICY IF EXISTS "Users can create claims" ON lake_claims;
CREATE POLICY "Users can create claims"
  ON lake_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);
