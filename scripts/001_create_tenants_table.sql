-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain TEXT, -- Added domain column directly to initial table creation
    -- Added api_key column for tenant-specific authentication
    api_key TEXT DEFAULT ('sis_' || gen_random_uuid()::text || '_' || substr(md5(random()::text), 1, 32)),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Added performance index for API key lookups (non-unique to allow shared keys)
CREATE INDEX IF NOT EXISTS idx_tenants_api_key ON tenants(api_key);

-- Insert default tenant
INSERT INTO tenants (name) VALUES ('Default') ON CONFLICT DO NOTHING;
