-- Create dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
    id UUID DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add primary key constraint explicitly to ensure it exists for foreign key references
ALTER TABLE dashboards ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);

-- Insert default dashboard for default tenant
INSERT INTO dashboards (title, tenant_id) 
SELECT 'Default Dashboard', tenant_id 
FROM tenants 
WHERE name = 'Default' 
ON CONFLICT DO NOTHING;
