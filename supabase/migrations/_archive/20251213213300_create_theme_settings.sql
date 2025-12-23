-- Theme settings table for storing customizable brand colors
CREATE TABLE IF NOT EXISTS theme_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE theme_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Anyone can read theme settings" ON theme_settings;
DROP POLICY IF EXISTS "Admins can update theme settings" ON theme_settings;
DROP POLICY IF EXISTS "Admins can insert theme settings" ON theme_settings;

-- Anyone can read theme settings (needed for app theming)
CREATE POLICY "Anyone can read theme settings"
  ON theme_settings FOR SELECT
  USING (true);

-- Only admins can update theme settings
CREATE POLICY "Admins can update theme settings"
  ON theme_settings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can insert theme settings
CREATE POLICY "Admins can insert theme settings"
  ON theme_settings FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Insert default theme colors
INSERT INTO theme_settings (key, value, label, description) VALUES
  ('primary', '#1BA9A0', 'Primary Color', 'Main brand color used for buttons, links, and accents'),
  ('primary_hover', '#0D9488', 'Primary Hover', 'Darker shade for hover states on primary buttons'),
  ('secondary', '#0D4B4E', 'Secondary Color', 'Secondary brand color for backgrounds and accents'),
  ('accent', '#14B8A6', 'Accent Color', 'Bright accent color for highlights'),
  ('background_dark', '#1A2D3D', 'Dark Background', 'Main background color in dark mode'),
  ('card_dark', '#243B4A', 'Dark Card', 'Card background color in dark mode'),
  ('background_light', '#F8FAFC', 'Light Background', 'Main background color in light mode'),
  ('card_light', '#FFFFFF', 'Light Card', 'Card background color in light mode')
ON CONFLICT (key) DO NOTHING;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_theme_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS theme_settings_updated_at ON theme_settings;
CREATE TRIGGER theme_settings_updated_at
  BEFORE UPDATE ON theme_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_theme_settings_updated_at();
