# Scripts Directory - Database Schema & Migrations

## Overview

This directory contains SQL migration scripts that define the complete database schema for the Smart Dashboard's multi-tenant architecture. Scripts must be executed in numerical order for proper dependency resolution.

## Migration Execution Order

**CRITICAL**: Execute scripts in this exact order to maintain referential integrity:

```sql
001_create_tenants_table.sql        -- Core tenant entities
002_create_users_table.sql          -- User authentication (Supabase)
003_create_dashboards_table.sql     -- Dashboard configurations
004_create_data_files_table.sql     -- XML/JSON data storage
005_create_settings_table.sql       -- Tenant-specific settings
006_create_user_profiles_table.sql  -- Extended user information
007_create_user_tenants_table.sql   -- Multi-tenant access control
009_add_api_key_to_tenants.sql      -- API key authentication
010_create_public_dashboard_shares.sql  -- Public sharing
011_add_public_sharing_setting.sql  -- Sharing configuration
012_fix_data_files_unique_constraint.sql -- Data integrity fix
```

## Database Schema Overview

### Core Tables

#### tenants
**Purpose**: Central tenant management with domain-based assignment
```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  api_key TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Features**:
- Unique API keys for external integrations
- Domain-based automatic tenant assignment
- Audit timestamps for all records

#### users (Supabase Auth)
**Purpose**: Links Supabase authentication to application users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_tenants
**Purpose**: Many-to-many relationship for multi-tenant access control
```sql
CREATE TABLE user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);
```

**Access Pattern**: Users can belong to multiple tenants, enabling cross-tenant access for enterprise users.

### Data Storage Tables

#### dashboards
**Purpose**: Dashboard configurations and metadata
```sql
CREATE TABLE dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### data_files
**Purpose**: XML files and converted JSON data storage
```sql
CREATE TABLE data_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL,
  json_data JSONB NOT NULL,
  file_name TEXT,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, dashboard_id, data_type) -- Dataset replacement
);
```

**Key Features**:
- JSONB storage for efficient querying and indexing
- Unique constraint enables dataset replacement
- Display ordering for consistent presentation

### Configuration Tables

#### settings
**Purpose**: Tenant-specific configuration key-value storage
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, key)
);
```

#### public_dashboard_shares
**Purpose**: Token-based public dashboard sharing
```sql
CREATE TABLE public_dashboard_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dashboard_id UUID NOT NULL REFERENCES dashboards(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Row-Level Security (RLS)

### Current RLS Implementation

#### user_profiles
```sql
-- Users can only access their own profile
CREATE POLICY "Users can access own profile" ON user_profiles
FOR ALL USING (auth.uid()::text = user_id::text);
```

#### user_tenants  
```sql
-- Users can only see their own tenant relationships
CREATE POLICY "Users can access own tenant relationships" ON user_tenants
FOR ALL USING (auth.uid()::text = user_id::text);
```

### Required RLS Policies (Recommended)

**All tenant-scoped tables need RLS policies**:

```sql
-- Tenants: Users can only access tenants they belong to
CREATE POLICY "Users can access assigned tenants" ON tenants
FOR ALL USING (
  id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid()
  )
);

-- Dashboards: Tenant-scoped access
CREATE POLICY "Users can access tenant dashboards" ON dashboards
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid()
  )
);

-- Data files: Tenant-scoped access
CREATE POLICY "Users can access tenant data files" ON data_files
FOR ALL USING (
  tenant_id IN (
    SELECT tenant_id FROM user_tenants 
    WHERE user_id = auth.uid()
  )
);
```

## Multi-Tenant Isolation Architecture

### Tenant Assignment Strategy
1. **Domain-based Assignment**: New users automatically assigned to tenant matching email domain
2. **Manual Assignment**: Admin users can assign users to additional tenants
3. **Cross-tenant Access**: Enterprise users can access multiple tenants

### Data Isolation Patterns
```sql
-- Every tenant-scoped query MUST include tenant filtering
SELECT * FROM dashboards 
WHERE tenant_id = $1 -- NEVER forget this condition

-- Join with user access validation
SELECT d.* FROM dashboards d
JOIN user_tenants ut ON d.tenant_id = ut.tenant_id
WHERE ut.user_id = $1 AND d.tenant_id = $2
```

## Database Performance

### Indexes
**Essential indexes for query performance**:

```sql
-- Tenant-scoped queries
CREATE INDEX idx_dashboards_tenant_id ON dashboards(tenant_id);
CREATE INDEX idx_data_files_tenant_id ON data_files(tenant_id);
CREATE INDEX idx_settings_tenant_id ON settings(tenant_id);

-- User-tenant relationships
CREATE INDEX idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON user_tenants(tenant_id);

-- JSONB data queries
CREATE INDEX idx_data_files_json_data ON data_files USING GIN(json_data);
CREATE INDEX idx_settings_value ON settings USING GIN(value);

-- Dashboard-data relationships
CREATE INDEX idx_data_files_dashboard_id ON data_files(dashboard_id);
```

### Query Optimization
- Always filter by `tenant_id` first in WHERE clauses
- Use prepared statements for repeated queries
- Leverage JSONB indexes for data exploration
- Implement proper pagination for large result sets

## Migration Best Practices

### Running Migrations

1. **Backup Database** before running any migrations:
   ```sql
   pg_dump -h localhost -U postgres -d smart_dashboard > backup.sql
   ```

2. **Execute in Order** using Supabase SQL editor or CLI:
   ```bash
   # Via Supabase CLI (recommended)
   supabase db reset
   # Or execute each file individually in the SQL editor
   ```

3. **Validate Schema** after migration:
   ```sql
   -- Check all tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   
   -- Verify RLS policies
   SELECT tablename, policyname FROM pg_policies;
   ```

### Adding New Migrations

1. **Create numbered file**: `013_new_feature.sql`
2. **Include rollback instructions** in comments
3. **Test on development environment** first
4. **Update this documentation** with schema changes

### Schema Modification Patterns
```sql
-- Add new column with default
ALTER TABLE table_name 
ADD COLUMN new_column TEXT DEFAULT 'default_value';

-- Add tenant_id to existing table
ALTER TABLE table_name 
ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Create new tenant-scoped table
CREATE TABLE new_table (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  -- other columns
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Data Integrity

### Foreign Key Constraints
- All tenant-scoped tables reference `tenants(id)` with `CASCADE DELETE`
- User references use `auth.users(id)` with `CASCADE DELETE`
- Dashboard-data relationships maintained through foreign keys

### Unique Constraints
```sql
-- Prevent duplicate data types per dashboard
UNIQUE(tenant_id, dashboard_id, data_type)

-- One API key per tenant
UNIQUE(api_key)

-- Domain assignment uniqueness
UNIQUE(domain)
```

## Working with the Database

### Development Queries
```sql
-- Get user's accessible tenants
SELECT t.* FROM tenants t
JOIN user_tenants ut ON t.id = ut.tenant_id
WHERE ut.user_id = $1;

-- Get tenant's dashboards with data file counts
SELECT d.*, COUNT(df.id) as file_count
FROM dashboards d
LEFT JOIN data_files df ON d.id = df.dashboard_id
WHERE d.tenant_id = $1
GROUP BY d.id
ORDER BY d.display_order;

-- Search JSONB data
SELECT * FROM data_files 
WHERE tenant_id = $1 
AND json_data @> '{"field": "value"}';
```

### Maintenance Tasks
- Monitor JSONB storage growth
- Vacuum and analyze tables regularly
- Archive old dashboard data if needed
- Monitor public share token usage and cleanup expired tokens

This database schema provides a robust foundation for multi-tenant data isolation while supporting complex data visualization workflows and public sharing capabilities.