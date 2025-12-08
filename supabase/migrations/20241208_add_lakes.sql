-- ============================================================================
-- Lakes Table for Freshwater Venues
-- ============================================================================

-- Create lakes table
CREATE TABLE IF NOT EXISTS lakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  
  -- Location
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  postcode TEXT,
  region TEXT,
  
  -- Venue details
  water_type TEXT DEFAULT 'lake' CHECK (water_type IN ('lake', 'pond', 'reservoir', 'river', 'canal', 'other')),
  size_acres DECIMAL(10, 2),
  max_depth_m DECIMAL(5, 2),
  
  -- Species available (array of species names)
  species TEXT[],
  
  -- Facilities
  has_parking BOOLEAN DEFAULT false,
  has_toilets BOOLEAN DEFAULT false,
  has_cafe BOOLEAN DEFAULT false,
  has_tackle_shop BOOLEAN DEFAULT false,
  is_night_fishing_allowed BOOLEAN DEFAULT false,
  is_disabled_accessible BOOLEAN DEFAULT false,
  
  -- Contact & booking
  phone TEXT,
  email TEXT,
  website TEXT,
  booking_url TEXT,
  
  -- Pricing
  day_ticket_price DECIMAL(8, 2),
  night_ticket_price DECIMAL(8, 2),
  season_ticket_price DECIMAL(8, 2),
  
  -- Images
  cover_image_url TEXT,
  images TEXT[],
  
  -- Ownership & verification
  claimed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lakes_location ON lakes(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_lakes_region ON lakes(region);
CREATE INDEX IF NOT EXISTS idx_lakes_claimed_by ON lakes(claimed_by);
CREATE INDEX IF NOT EXISTS idx_lakes_is_verified ON lakes(is_verified);
CREATE INDEX IF NOT EXISTS idx_lakes_slug ON lakes(slug);

-- Enable RLS
ALTER TABLE lakes ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Anyone can view lakes
CREATE POLICY "Lakes are viewable by everyone"
  ON lakes FOR SELECT
  USING (true);

-- Only admins can insert lakes (for now - manual addition)
-- In future, claimed owners can update their own lake
CREATE POLICY "Admins can insert lakes"
  ON lakes FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM profiles WHERE email IN ('admin@theswim.app', 'simon@example.com')
    )
  );

-- Claimed owners can update their own lake
CREATE POLICY "Owners can update their claimed lake"
  ON lakes FOR UPDATE
  USING (claimed_by = auth.uid())
  WITH CHECK (claimed_by = auth.uid());

-- Add lake_id to sessions table for linking sessions to venues
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS lake_id UUID REFERENCES lakes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_lake_id ON sessions(lake_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lakes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS lakes_updated_at ON lakes;
CREATE TRIGGER lakes_updated_at
  BEFORE UPDATE ON lakes
  FOR EACH ROW
  EXECUTE FUNCTION update_lakes_updated_at();

-- ============================================================================
-- Sample Data (a few UK lakes to start)
-- ============================================================================

INSERT INTO lakes (name, slug, description, latitude, longitude, region, water_type, species, has_parking, has_toilets, day_ticket_price)
VALUES 
  ('Linear Fisheries', 'linear-fisheries', 'Premier carp fishing complex in Oxfordshire', 51.8234, -1.2567, 'Oxfordshire', 'lake', ARRAY['Carp', 'Tench', 'Bream'], true, true, 25.00),
  ('Wraysbury Lakes', 'wraysbury-lakes', 'Famous big carp venue near London', 51.4567, -0.5234, 'Berkshire', 'lake', ARRAY['Carp', 'Pike', 'Perch'], true, true, 30.00),
  ('Bluebell Lakes', 'bluebell-lakes', 'Popular day ticket venue in Northamptonshire', 52.4123, -0.7891, 'Northamptonshire', 'lake', ARRAY['Carp', 'Catfish', 'Sturgeon'], true, true, 20.00)
ON CONFLICT (slug) DO NOTHING;
