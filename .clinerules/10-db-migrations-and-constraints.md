<!--
Rule: R-010
Title: Database Migrations, Constraints, and Indexing
Status: enabled
-->

# R-010 — Database Migrations, Constraints, and Indexing

Purpose & Scope

- Enforce correct execution order for SQL migrations and preserve schema integrity for multi-tenant isolation.
- Maintain critical constraints and indexes that power dataset replacement, isolation, and performance.

Do

- Execute migrations in the documented order to preserve dependencies and RLS enablement:
  1. 001_create_tenants_table.sql
  2. 002_create_users_table.sql
  3. 003_create_dashboards_table.sql
  4. 004_create_data_files_table.sql
  5. 005_create_settings_table.sql
  6. 006_create_user_profiles_table.sql
  7. 007_create_user_tenants_table.sql
  8. 010_create_public_dashboard_shares.sql
  9. 011_add_public_sharing_setting.sql
  10. 012_enable_row_level_security.sql
- Preserve tenant-scoped uniqueness and FK constraints:
  - data_files: UNIQUE(tenant_id, dashboard_id, data_type) for dataset replacement.
  - tenants: UNIQUE(api_key), UNIQUE(domain).
  - settings: UNIQUE(tenant_id, key).
  - FKs with ON DELETE CASCADE for tenant-scoped tables.
- Maintain essential indexes for performance:
  - Tenant-scoped: dashboards(tenant_id), data_files(tenant_id), settings(tenant_id).
  - Relationships: user_tenants(user_id), user_tenants(tenant_id), data_files(dashboard_id).
  - JSONB: data_files(json_data GIN), settings(value GIN).
- Keep RLS enabled for all tenant tables (see R-011). API layer must still filter by tenant_id.
- Test schema after migrations (tables exist, policies applied) and validate RLS policies are present.
- Use prepared statements and pagination for large queries; filter by tenant_id first in WHERE clauses.

Don’t

- Reorder migrations or skip 012_enable_row_level_security.sql (CRITICAL for production).
- Drop or weaken uniqueness constraints that enable dataset replacement and isolation.
- Remove indexes that support tenant-scoped access patterns and JSONB queries.
- Assume RLS alone enforces application correctness—always include explicit `.eq('tenant_id', ...)` filtering.

Required Patterns

1. Migration execution order (Supabase CLI or SQL editor)

```bash
# Recommended: Supabase CLI
supabase db reset
# Or execute files manually in exact order in the SQL editor
```

2. Core uniqueness and relationships

```sql
-- data_files: dataset replacement
UNIQUE(tenant_id, dashboard_id, data_type);

-- tenants
UNIQUE(api_key);
UNIQUE(domain);

-- settings
UNIQUE(tenant_id, key);

-- Common FK with cascade
tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE;
```

3. Essential indexes

```sql
-- Tenant-scoped queries
CREATE INDEX IF NOT EXISTS idx_dashboards_tenant_id ON dashboards(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_files_tenant_id ON data_files(tenant_id);
CREATE INDEX IF NOT EXISTS idx_settings_tenant_id ON settings(tenant_id);

-- Relationships
CREATE INDEX IF NOT EXISTS idx_user_tenants_user_id ON user_tenants(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tenants_tenant_id ON user_tenants(tenant_id);

-- JSONB
CREATE INDEX IF NOT EXISTS idx_data_files_json_data ON data_files USING GIN(json_data);
CREATE INDEX IF NOT EXISTS idx_settings_value ON settings USING GIN(value);

-- Dashboard-data
CREATE INDEX IF NOT EXISTS idx_data_files_dashboard_id ON data_files(dashboard_id);
```

4. Post-migration validation

```sql
-- Verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify RLS/policies
SELECT tablename, policyname FROM pg_policies;
```

5. Tenant-first query optimization

```sql
-- Filter by tenant_id first for selective scans
SELECT d.*
FROM dashboards d
WHERE d.tenant_id = $1
ORDER BY d.display_order
LIMIT $2 OFFSET $3;
```

PR Checklist

- [ ] Migrations executed in the documented order; 012 RLS enabled before production.
- [ ] Uniqueness constraints preserved (data_files, tenants, settings).
- [ ] Required indexes exist (tenant_id, JSONB, relationships).
- [ ] All tenant-scoped tables use ON DELETE CASCADE FKs.
- [ ] Post-migration validation performed (tables, policies).
- [ ] Query patterns filter by tenant_id first and use pagination/prepared statements.

References

- Scripts: `scripts/CLAUDE.md` — Execution order, schema definitions, RLS, indexes, constraints, optimization notes.
- Root: `README.md` — Database setup order and security notice for RLS.
- Root: `CLAUDE.md` — Database schema overview and tenant isolation.
