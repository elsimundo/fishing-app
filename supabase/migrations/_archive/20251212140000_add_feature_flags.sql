-- Feature flags system for controlling app features
-- Allows enabling/disabling features like freshwater fishing from admin panel

CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT 'false',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES profiles(id)
);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Anyone can read settings (needed for feature flags)
DROP POLICY IF EXISTS "Anyone can read app settings" ON app_settings;
CREATE POLICY "Anyone can read app settings" ON app_settings
  FOR SELECT USING (true);

-- Only admins can modify settings
DROP POLICY IF EXISTS "Admins can modify app settings" ON app_settings;
CREATE POLICY "Admins can modify app settings" ON app_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Insert default feature flags
INSERT INTO app_settings (key, value, description) VALUES
  ('feature_freshwater_enabled', 'false', 'Enable freshwater fishing features (species, challenges, filters)'),
  ('feature_tackle_shops_enabled', 'false', 'Enable tackle shop listings'),
  ('feature_clubs_enabled', 'false', 'Enable fishing club listings'),
  ('feature_competitions_enabled', 'true', 'Enable competitions feature'),
  ('feature_ai_identifier_enabled', 'true', 'Enable AI fish identifier')
ON CONFLICT (key) DO NOTHING;

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

COMMENT ON TABLE app_settings IS 'Application-wide settings and feature flags controlled via admin panel';
