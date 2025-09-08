-- Enable Row Level Security (RLS) for Multi-Tenant Isolation
-- This is CRITICAL for security - prevents cross-tenant data access
-- Execute this script immediately before production deployment

-- =============================================================================
-- Enable RLS on all tenant-scoped tables
-- =============================================================================

-- Enable RLS on tenants table
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on dashboards table  
ALTER TABLE dashboards ENABLE ROW LEVEL SECURITY;

-- Enable RLS on data_files table
ALTER TABLE data_files ENABLE ROW LEVEL SECURITY;

-- Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Enable RLS on public_dashboard_shares table
ALTER TABLE public_dashboard_shares ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Create RLS Policies for Tenant Isolation
-- =============================================================================

-- Tenants: Users can only access tenants they are assigned to
CREATE POLICY "Users can access assigned tenants" ON tenants
FOR ALL USING
(
  tenant_id IN
(
    SELECT tenant_id
FROM user_tenants
WHERE user_id = auth.uid()
  )
);

-- Dashboards: Users can only access dashboards from their assigned tenants
CREATE POLICY "Users can access tenant dashboards" ON dashboards
FOR ALL USING
(
  tenant_id IN
(
    SELECT tenant_id
FROM user_tenants
WHERE user_id = auth.uid()
  )
);

-- Data Files: Users can only access data files from their assigned tenants
CREATE POLICY "Users can access tenant data files" ON data_files
FOR ALL USING
(
  tenant_id IN
(
    SELECT tenant_id
FROM user_tenants
WHERE user_id = auth.uid()
  )
);

-- Settings: Users can only access settings from their assigned tenants
CREATE POLICY "Users can access tenant settings" ON settings
FOR ALL USING
(
  tenant_id IN
(
    SELECT tenant_id
FROM user_tenants
WHERE user_id = auth.uid()
  )
);

-- Public Dashboard Shares: Users can only manage shares for their tenant dashboards
CREATE POLICY "Users can manage tenant dashboard shares" ON public_dashboard_shares
FOR ALL USING
(
  tenant_id IN
(
    SELECT tenant_id
FROM user_tenants
WHERE user_id = auth.uid()
  )
);

-- =============================================================================
-- Service Role Bypass Policies (for API operations)
-- =============================================================================
-- The service role needs to bypass RLS for API operations like upload-xml
-- These policies allow service role to access all data for API functionality

-- Service role can access all tenants (for API key validation)
CREATE POLICY "Service role can access all tenants" ON tenants
FOR ALL TO service_role USING
(true);

-- Service role can access all dashboards (for API operations)
CREATE POLICY "Service role can access all dashboards" ON dashboards
FOR ALL TO service_role USING
(true);

-- Service role can access all data files (for API operations)
CREATE POLICY "Service role can access all data files" ON data_files
FOR ALL TO service_role USING
(true);

-- Service role can access all settings (for API operations)
CREATE POLICY "Service role can access all settings" ON settings
FOR ALL TO service_role USING
(true);

-- Service role can access all dashboard shares (for public sharing)
CREATE POLICY "Service role can access all dashboard shares" ON public_dashboard_shares
FOR ALL TO service_role USING
(true);

-- =============================================================================
-- Verification Queries
-- =============================================================================
-- Run these queries after migration to verify RLS is working correctly

/*
-- Check that RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('tenants', 'dashboards', 'data_files', 'settings', 'public_dashboard_shares');

-- Check all created policies
SELECT schemaname, tablename, policyname, roles, cmd, qual
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test tenant isolation (should only return user's assigned tenants)
-- Run this as a regular authenticated user (not service_role)
SELECT tenant_id, name FROM tenants;
*/

-- =============================================================================
-- IMPORTANT NOTES
-- =============================================================================
-- 1. This migration MUST be applied before production deployment
-- 2. Test thoroughly in development environment first
-- 3. All API calls use service_role which bypasses RLS (correct for APIs)
-- 4. Dashboard users use regular auth.uid() which enforces RLS (correct for UI)
-- 5. If you get "permission denied" errors, check user_tenants table assignments