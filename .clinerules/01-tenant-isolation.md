<!--
Rule: R-001
Title: Tenant Isolation Enforcement (All Layers)
Status: enabled
-->

# R-001 — Tenant Isolation Enforcement (All Layers)

Purpose & Scope

- Enforce strict tenant isolation across database, APIs, components, routing, and caching.
- Applies to: all data access, server/client code paths, SWR/server state keys, and public sharing flows.

Do

- Include explicit tenant filtering in every database query that touches tenant-scoped tables:
  - Supabase pattern: `.eq('tenant_id', tenantId)` on every read/write/aggregate.
- Validate tenant access before any tenant data operation:
  - Validate user ↔ tenant relationship (via `user_tenants`) for internal flows.
  - Validate share token for public flows and map token → dashboard → tenant.
- Propagate tenant context end-to-end:
  - Routing: use dynamic `[tenantId]` and read it in page/server functions.
  - Components: read tenant access from `AuthProvider` and verify tenant membership.
  - APIs: require tenant context and re-validate before querying.
- Partition caches by tenant:
  - Include `tenantId` in SWR keys and any client/server cache keys.
- Validate tenant identifiers:
  - Use strict UUID validation for `tenantId` anywhere it is provided/derived.
- Keep RLS, service-role, and application validation complementary:
  - RLS enabled at DB level; when using service role in APIs, still validate tenant access and filter by `tenant_id`.

Don’t

- Query tenant-scoped tables without `tenant_id` filters.
- Render tenant data in components without checking `tenantAccess` against the current `tenantId`.
- Use shared caches/keys that don’t include the tenant dimension (risk: cross-tenant data bleed).
- Trust client-provided `tenantId` without validating it (UUID check + access check).
- Assume “internal APIs” are safe without explicit tenant validation and filtering.

Required Patterns

1. Supabase query with explicit tenant filter

```ts
const { data, error } = await supabase
  .from("table_name")
  .select("*")
  .eq("tenant_id", tenantId); // CRITICAL
```

2. Validate session and tenant access in internal APIs

```ts
const { user, tenant } = await validateSession(request, tenantId);
// Ensure user has access to tenant prior to any DB call
const access = await supabase
  .from("user_tenants")
  .select("*")
  .eq("user_id", user.id)
  .eq("tenant_id", tenantId)
  .single();

if (!access) {
  return NextResponse.json({ error: "Access denied" }, { status: 403 });
}
```

3. Token-based validation for public sharing (read-only)

```ts
const shareRecord = await validatePublicToken(token);
if (!shareRecord || shareRecord.expires_at < new Date()) {
  return NextResponse.json(
    { error: "Invalid or expired token" },
    { status: 401 }
  );
}
// Map token → dashboard → tenant and only read within that tenant scope
```

4. Component tenant access enforcement

```tsx
const Component = ({ tenantId }: { tenantId: string }) => {
  const { tenantAccess } = useAuth();
  const hasAccess = tenantAccess?.some((t) => t.tenant_id === tenantId);
  if (!hasAccess) return <AccessDenied />;
  // render tenant data safely
};
```

5. SWR keys partitioned by tenant

```ts
const { data } = useSWR(
  user ? [`/api/internal/dashboards`, tenantId] : null,
  fetcher,
  { revalidateOnFocus: false, dedupingInterval: 60000 }
);
```

PR Checklist

- [ ] Every DB query includes `.eq('tenant_id', tenantId)` or equivalent.
- [ ] API handlers validate tenant access before any DB operation.
- [ ] Components that render tenant data verify access via `AuthProvider`/`tenantAccess`.
- [ ] SWR and any cache keys include `tenantId` to avoid cross-tenant bleed.
- [ ] All incoming `tenantId` values are validated as UUIDs before use.
- [ ] Public sharing paths resolve token → tenant and remain strictly read-only.

References

- Root: `CLAUDE.md` — Multi-Tenant Architecture (“CRITICAL: Every operation in this system is tenant-scoped”), Tenant Isolation Layers.
- API: `app/api/CLAUDE.md` — Multi-Tenant Data Access (explicit `.eq('tenant_id', tenantId)`), Authentication Patterns, Route Handler Patterns.
- Components: `components/CLAUDE.md` — Tenant Context Validation, Tenant-Scoped Data Fetching (SWR key includes tenant).
- App Router: `app/CLAUDE.md` — `[tenantId]` routes and protection with `ProtectedRoute`.
- Database: `scripts/CLAUDE.md` — RLS policies and Data Isolation Patterns (SQL), Unique constraints enabling dataset replacement.
