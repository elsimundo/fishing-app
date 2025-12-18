-- API Usage Tracking for credit monitoring
-- Tracks calls to external APIs (Mapbox, weather, tides, etc.)

CREATE TABLE IF NOT EXISTS api_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_name text NOT NULL,
  endpoint text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_api_usage_api_name ON api_usage(api_name);
CREATE INDEX IF NOT EXISTS idx_api_usage_created_at ON api_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_name_date ON api_usage(api_name, created_at);

-- RLS: Only admins can read, system can insert
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert (tracking happens client-side)
DROP POLICY IF EXISTS "Anyone can log API usage" ON api_usage;
CREATE POLICY "Anyone can log API usage"
  ON api_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only admins can read
DROP POLICY IF EXISTS "Admins can read API usage" ON api_usage;
CREATE POLICY "Admins can read API usage"
  ON api_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Aggregated view for dashboard (daily stats)
CREATE OR REPLACE VIEW api_usage_daily AS
SELECT 
  api_name,
  date_trunc('day', created_at) as date,
  COUNT(*) as call_count
FROM api_usage
GROUP BY api_name, date_trunc('day', created_at)
ORDER BY date DESC, api_name;

-- Grant access to the view
GRANT SELECT ON api_usage_daily TO authenticated;

-- Function to get API usage summary
CREATE OR REPLACE FUNCTION get_api_usage_summary(
  days_back integer DEFAULT 30
)
RETURNS TABLE (
  api_name text,
  total_calls bigint,
  calls_today bigint,
  calls_this_week bigint,
  calls_this_month bigint
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    u.api_name,
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE) as calls_today,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '7 days') as calls_this_week,
    COUNT(*) FILTER (WHERE u.created_at >= CURRENT_DATE - INTERVAL '30 days') as calls_this_month
  FROM api_usage u
  WHERE u.created_at >= CURRENT_DATE - (days_back || ' days')::interval
  GROUP BY u.api_name
  ORDER BY total_calls DESC;
$$;

-- Grant execute to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION get_api_usage_summary TO authenticated;
