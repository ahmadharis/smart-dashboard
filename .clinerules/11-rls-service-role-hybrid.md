<!--
Rule: R-011
Title: RLS + Service Role Hybrid Model
Status: enabled
-->

# R-011 — RLS + Service Role Hybrid Model

Purpose & Scope

- Define the hybrid security architecture: DB-level RLS with API service-role access plus application-level tenant validation and explicit filtering.
- Ensure reliable API behavior despite `auth.uid()` limitations while preserving strong tenant isolation.

Do

- Keep RLS enabled on all tenant-scoped tables in production.
- Use service-role Supabase clients for API routes that require cross-policy operations, complex joins, or public share access.
- Always perform application-level validation first:
  - Internal APIs: `validateSession(request, tenantId)` and confirm `user_tenants` membership.
  - Public APIs: `validatePublicToken(token)` → resolve dashboard → tenant.
  - Upload APIs: `validateTenantApiKey(apiKey)` → resolve tenant.
- Explicitly scope every query by `tenant_id` even with service role:
  - `.eq("tenant_id", tenantId)` (never rely on implicit context).
- Document and justify any policy exceptions in migrations; keep service-role usage minimal and targeted.

Don’t

- Rely on RLS alone in APIs (service role bypasses RLS).
- Depend on `auth.uid()` in API routes where it may be `NULL`/unreliable.
- Run unscoped queries with service role (risk: cross-tenant leakage).
- Skip token/tenant validation for public share endpoints.

Required Patterns

1. Why hybrid (limitation recap)

```text
- API routes (server context) may not resolve auth.uid() reliably for RLS.
- Public share flows require anonymous read paths that RLS would block.
- Service role enables APIs to operate, but MUST be paired with app validation + explicit tenant filters.
```

2. Internal API with service role + explicit scoping

```ts
const { user, tenant } = await validateSession(request, tenantId);
if (!user || !tenant) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Confirm membership
const access = await supabase
  .from("user_tenants")
  .select("*")
  .eq("user_id", user.id)
  .eq("tenant_id", tenantId)
  .single();

if (!access) {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}

// All queries explicitly scoped
const { data } = await supabase
  .from("dashboards")
  .select("*")
  .eq("tenant_id", tenantId);
```

3. Public share read flow (service role + token → tenant)

```ts
const shareRecord = await validatePublicToken(token);
if (
  !shareRecord ||
  (shareRecord.expires_at && shareRecord.expires_at < new Date())
) {
  return NextResponse.json(
    { error: "Invalid or expired token" },
    { status: 401 }
  );
}

// Resolve tenant via dashboard relationship
const tenantId = shareRecord.tenant_id;
const dashboardId = shareRecord.dashboard_id;

const { data } = await supabase
  .from("data_files")
  .select("*")
  .eq("tenant_id", tenantId)
  .eq("dashboard_id", dashboardId);
```

4. Migration policies acknowledge service role bypass

```sql
-- Example pattern in migrations
-- Service role can access all [table] USING (true);
-- Application code STILL validates tenant + filters by tenant_id.
```

PR Checklist

- [ ] RLS enabled on tenant tables; migrations include clear policies.
- [ ] API routes use service role only where necessary and always validate auth/token/api-key first.
- [ ] Every DB operation with service role is explicitly filtered by `tenant_id`.
- [ ] Public share endpoints resolve token → tenant and remain read-only.
- [ ] Code comments reference hybrid model rationale (auth.uid() limitations).

References

- Scripts: `scripts/CLAUDE.md` — Hybrid Security Architecture, Service Role Bypass Policies, RLS rationale.
- API: `app/api/CLAUDE.md` — Security Middleware, Authentication Patterns, Multi-Tenant Data Access.
- Root: `CLAUDE.md` — Tenant Isolation Layers and Security Model.
