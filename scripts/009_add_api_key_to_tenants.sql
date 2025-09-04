-- Add api_key column to tenants table for tenant-specific API authentication
ALTER TABLE tenants 
ADD COLUMN api_key TEXT UNIQUE;

-- Generate unique API keys for existing tenants
-- Fixed column reference from 'id' to 'tenant_id' to match actual table schema
UPDATE tenants 
SET api_key = 'tenant_' || tenant_id || '_' || substr(md5(random()::text), 1, 32)
WHERE api_key IS NULL;

-- Make api_key required for new tenants
ALTER TABLE tenants 
ALTER COLUMN api_key SET NOT NULL;

-- Add index for faster API key lookups
CREATE INDEX idx_tenants_api_key ON tenants(api_key);
