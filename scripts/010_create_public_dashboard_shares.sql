-- Removed primary key check logic since it's now handled in 003_create_dashboards_table.sql
-- Create public dashboard shares table for anonymous sharing functionality
CREATE TABLE IF NOT EXISTS public_dashboard_shares (
  share_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  share_token VARCHAR(64) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE NULL,
  
  UNIQUE(dashboard_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_public_shares_token ON public_dashboard_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_public_shares_dashboard ON public_dashboard_shares(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_tenant ON public_dashboard_shares(tenant_id);
CREATE INDEX IF NOT EXISTS idx_public_shares_expires ON public_dashboard_shares(expires_at) WHERE expires_at IS NOT NULL;
