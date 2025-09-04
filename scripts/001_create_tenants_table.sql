-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    tenant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain TEXT, -- Added domain column directly to initial table creation
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default tenant
INSERT INTO tenants (name) VALUES ('Default') ON CONFLICT DO NOTHING;
