<!--
Rule: R-004
Title: Public Sharing Access Model (Token-Based, Read-Only)
Status: enabled
-->

# R-004 — Public Sharing Access Model (Token-Based, Read-Only)

Purpose & Scope

- Define strict, read-only access for publicly shared dashboards using time-bound share tokens.
- Ensure token validation, tenant scoping, and non-mutating behavior across public pages and APIs.

Do

- Use token-based access for public routes:
  - Pages: `/shared/[token]` and `/shared/[token]/tv-mode`
  - APIs: `/api/public/shared/{token}/...`
- Validate share token on every request, including expiry:
  - Resolve token → share record → dashboard → tenant.
  - Enforce tenant scoping based on the resolved tenant.
- Keep public access strictly read-only:
  - Disallow all write operations (POST/PUT/PATCH/DELETE) in public routes.
- Apply rate limiting for public endpoints (20 requests/minute per IP).
- Return appropriate HTTP status codes:
  - 401 for invalid/expired token
  - 403 for any attempted write (should never be implemented)
  - 404 if resource not found in the context of the share
- Optionally increment view counters server-side in a tenant-scoped manner (see schema fields like `view_count`, `last_accessed_at`).
- Ensure CORS configuration allows intended domains only (even for public routes).

Don’t

- Accept authentication tokens (JWT/API key) for public sharing flows.
- Expose any write capability under public URLs.
- Render data for a dashboard outside the tenant resolved by the token.
- Bypass token validation in client components (validate server-side).
- Leak sensitive internal identifiers; keep public responses minimal and safe.

Required Patterns

1. Public token validation (API)

```ts
// URL pattern: /api/public/shared/{token}/...
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

// Resolve to tenant context via dashboard relationship and scope downstream queries
// All queries must filter by the resolved tenant_id
```

2. Read-only enforcement

```ts
// Public API handlers should only implement GET (and similar read-only) methods
export async function POST() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

3. Public pages routing separation

```text
/shared/[token]/page.tsx            # Public dashboard view (read-only)
/shared/[token]/tv-mode/page.tsx    # Public TV mode (read-only)
```

4. Tenant-scoped reads based on share resolution

```ts
// After resolving share -> dashboard -> tenantId
const result = await supabase
  .from("data_files")
  .select("*")
  .eq("tenant_id", tenantId) // CRITICAL: scope to token's tenant
  .eq("dashboard_id", dashboardId);
```

5. Rate limit for public API

```ts
// Pseudocode for public endpoints
if (!checkPublicRateLimit(ip, 20 /* per minute */)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

PR Checklist

- [ ] All public routes exist only under `/shared/[token]` (pages) and `/api/public/shared/{token}` (APIs).
- [ ] Token validation is performed on every request; expired or invalid tokens return 401.
- [ ] All public routes are strictly read-only; mutating methods return 403.
- [ ] All queries are explicitly tenant-scoped using the tenant resolved from the share token.
- [ ] Public endpoints are rate limited at 20/min and return appropriate headers where applicable.
- [ ] CORS remains restricted to intended domains, even for public endpoints.

References

- API: `app/api/CLAUDE.md` — Public APIs (Token-based), Authentication Patterns, Error Handling, Rate Limiting.
- App Router: `app/CLAUDE.md` — Public Sharing Routes (`shared/[token]/`), Security Considerations (token validation, read-only).
- Root: `README.md` — Public dashboard sharing, Endpoint overview.
- Database: `scripts/CLAUDE.md` — `public_dashboard_shares` schema, unique constraints, tenant isolation, and relationships enabling token → dashboard → tenant resolution.
