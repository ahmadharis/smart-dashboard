-- Create user_tenants table to control tenant access
CREATE TABLE IF NOT EXISTS user_tenants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(tenant_id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user-tenant combinations
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE user_tenants ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own tenant access" ON user_tenants
  FOR SELECT USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_user_tenant ON user_tenants(user_id, tenant_id);

-- Create function to check if user has access to tenant
CREATE OR REPLACE FUNCTION check_user_tenant_access(user_uuid UUID, tenant_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_tenants 
    WHERE user_id = user_uuid AND tenant_id = tenant_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
