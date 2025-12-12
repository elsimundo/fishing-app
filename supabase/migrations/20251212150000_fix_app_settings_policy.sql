-- Fix RLS policy for app_settings to allow admin/owner updates
-- The previous policy only had USING clause, needs WITH CHECK for INSERT/UPDATE
-- Also allow 'owner' role in addition to 'admin'

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can modify app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can update app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can insert app settings" ON app_settings;
DROP POLICY IF EXISTS "Admins can delete app settings" ON app_settings;

-- Create separate policies for better control (allow admin OR owner)
CREATE POLICY "Admins can update app settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

CREATE POLICY "Admins can delete app settings" ON app_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );
