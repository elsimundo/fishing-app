-- ============================================================================
-- Sales Partner System
-- Affiliate/partner system for recurring commission on business signups
-- ============================================================================

-- Sales partners table
CREATE TABLE sales_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  partner_code TEXT UNIQUE NOT NULL,
  commission_rate DECIMAL(3,2) DEFAULT 0.25, -- 25%
  total_signups INT DEFAULT 0,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  payment_method TEXT, -- 'bank_transfer', 'paypal', 'stripe'
  payment_details JSONB, -- { iban: '...', paypal_email: '...', stripe_account_id: '...' }
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partner applications
CREATE TABLE partner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  why_join TEXT,
  experience TEXT,
  expected_signups INT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission transactions
CREATE TABLE commission_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES sales_partners(id) ON DELETE CASCADE,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  subscription_amount DECIMAL(10,2) NOT NULL,
  commission_amount DECIMAL(10,2) NOT NULL,
  commission_rate DECIMAL(3,2) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  paid_at TIMESTAMPTZ,
  payment_reference TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add partner tracking to businesses table
ALTER TABLE businesses 
  ADD COLUMN IF NOT EXISTS referred_by_partner_id UUID REFERENCES sales_partners(id),
  ADD COLUMN IF NOT EXISTS partner_commission_rate DECIMAL(3,2);

-- Indexes for performance
CREATE INDEX idx_sales_partners_user_id ON sales_partners(user_id);
CREATE INDEX idx_sales_partners_partner_code ON sales_partners(partner_code);
CREATE INDEX idx_sales_partners_status ON sales_partners(status);

CREATE INDEX idx_partner_applications_user_id ON partner_applications(user_id);
CREATE INDEX idx_partner_applications_status ON partner_applications(status);

CREATE INDEX idx_commission_transactions_partner_id ON commission_transactions(partner_id);
CREATE INDEX idx_commission_transactions_business_id ON commission_transactions(business_id);
CREATE INDEX idx_commission_transactions_status ON commission_transactions(status);
CREATE INDEX idx_commission_transactions_period ON commission_transactions(period_start, period_end);

CREATE INDEX idx_businesses_referred_by_partner ON businesses(referred_by_partner_id) WHERE referred_by_partner_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE sales_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_transactions ENABLE ROW LEVEL SECURITY;

-- Partners can view their own data
CREATE POLICY "Partners can view own data" ON sales_partners
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Partners can update own payment details" ON sales_partners
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Partners can view their own commissions
CREATE POLICY "Partners can view own commissions" ON commission_transactions
  FOR SELECT USING (
    partner_id IN (SELECT id FROM sales_partners WHERE user_id = auth.uid())
  );

-- Users can submit applications
CREATE POLICY "Users can submit applications" ON partner_applications
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own applications" ON partner_applications
  FOR SELECT USING (user_id = auth.uid());

-- Admin policies (requires is_admin column in profiles)
CREATE POLICY "Admins can manage partners" ON sales_partners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage commissions" ON commission_transactions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins can manage applications" ON partner_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to generate unique partner code
CREATE OR REPLACE FUNCTION generate_partner_code(base_name TEXT)
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  counter INT := 0;
BEGIN
  -- Clean base name: uppercase, remove spaces, take first 6 chars
  code := UPPER(REGEXP_REPLACE(base_name, '[^A-Za-z0-9]', '', 'g'));
  code := SUBSTRING(code FROM 1 FOR 6);
  
  -- Add year
  code := code || TO_CHAR(NOW(), 'YY');
  
  -- Check if exists, add counter if needed
  WHILE EXISTS (SELECT 1 FROM sales_partners WHERE partner_code = code) LOOP
    counter := counter + 1;
    code := SUBSTRING(code FROM 1 FOR 6) || TO_CHAR(NOW(), 'YY') || counter::TEXT;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to update partner stats when commission is created
CREATE OR REPLACE FUNCTION update_partner_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings + NEW.commission_amount
    WHERE id = NEW.partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status != 'approved' AND NEW.status = 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings + NEW.commission_amount
    WHERE id = NEW.partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status != 'approved' THEN
    UPDATE sales_partners
    SET total_earnings = total_earnings - OLD.commission_amount
    WHERE id = NEW.partner_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_stats
AFTER INSERT OR UPDATE ON commission_transactions
FOR EACH ROW
EXECUTE FUNCTION update_partner_stats();

-- Function to update partner signup count
CREATE OR REPLACE FUNCTION update_partner_signup_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups + 1
    WHERE id = NEW.referred_by_partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.referred_by_partner_id IS NULL AND NEW.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups + 1
    WHERE id = NEW.referred_by_partner_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.referred_by_partner_id IS NOT NULL AND NEW.referred_by_partner_id IS NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups - 1
    WHERE id = OLD.referred_by_partner_id;
  ELSIF TG_OP = 'DELETE' AND OLD.referred_by_partner_id IS NOT NULL THEN
    UPDATE sales_partners
    SET total_signups = total_signups - 1
    WHERE id = OLD.referred_by_partner_id;
    RETURN OLD;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_partner_signup_count
AFTER INSERT OR UPDATE OR DELETE ON businesses
FOR EACH ROW
EXECUTE FUNCTION update_partner_signup_count();

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Note: Uncomment to add sample partner for testing
-- INSERT INTO sales_partners (user_id, partner_code, commission_rate, status)
-- VALUES (
--   (SELECT id FROM profiles LIMIT 1),
--   'DEMO24',
--   0.25,
--   'active'
-- );
