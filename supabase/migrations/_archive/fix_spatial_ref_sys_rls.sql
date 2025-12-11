-- =====================================================
-- FIX SPATIAL_REF_SYS RLS WARNING
-- =====================================================
-- The spatial_ref_sys table is a PostGIS system table owned by the extension
-- We cannot modify it directly, but we can hide it from the API by removing it from the exposed schema

-- Note: This table is safe to leave as-is. It contains public reference data for spatial coordinate systems.
-- The RLS warning can be safely ignored for PostGIS system tables.

-- If you want to suppress the warning, you would need to:
-- 1. Contact Supabase support to exclude this table from linting
-- 2. Or accept this as a false positive for system tables

-- For now, we'll just document that this is expected behavior
COMMENT ON TABLE spatial_ref_sys IS 'PostGIS system table - RLS not applicable to extension-owned tables';
