-- Create settings table
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (key, tenant_id)
);
