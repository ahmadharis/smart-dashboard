<!--
Rule: R-002
Title: Authentication Mode Selection and Boundaries
Status: enabled
-->

# R-002 — Authentication Mode Selection and Boundaries

Purpose & Scope

- Enforce correct use of the three authentication patterns and their boundaries:
  1. Session/JWT (Internal APIs)
  2. API Key (Upload XML)
  3. Public Token (Shared)
- Prevent auth mode mixing, privilege escalation, and accidental write access through public routes.

Do

- Select the correct auth scheme based on endpoint category:
  - Internal APIs (`/api/internal/...`): Session authentication (JWT) with tenant validation.
  - Upload API (`/api/upload-xml`): API key authentication (tenant-specific).
  - Public APIs (`/api/public/shared/[token]/...`): Public token authentication (read-only).
- Include required headers/inputs:
  - Internal: `Authorization: Bearer <jwt&gt>` and `X-Tenant-ID: <tenant_uuid>` (optional if in URL).
  - Upload: `x-api-key: <tenant_api_key>` (or `Authorization: Bearer <tenant_api_key>`), `X-Data-Type`, and one of `X-Dashboard-Id` or `X-Dashboard-Title`.
  - Public: Token from URL (validate and check expiry).
- Validate tenant access after authentication and before any DB operation.
- Return appropriate HTTP status codes for auth failures (401) and permission issues (403).

Don’t

- Mix authentication patterns (e.g., accept JWTs on upload-xml or API keys on internal routes).
- Allow public token routes to perform writes or administrative actions.
- Proceed with any DB query if authentication or tenant validation fails.
- Accept malformed or missing headers; fail fast with clear HTTP status.

Required Patterns

1. Internal (Session/JWT) — validate session and tenant access

```ts
// Middleware or route handler
const { user, tenant } = await validateSession(request, tenantId);
if (!user || !tenant) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

// Ensure user has access to tenant prior to DB operations
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

2. Upload (API Key) — validate tenant API key and required headers

```ts
// Accept API key from x-api-key or Authorization: Bearer <key>
const apiKey =
  request.headers.get("x-api-key") ||
  request.headers.get("authorization")?.replace("Bearer ", "");

if (!apiKey) {
  return NextResponse.json({ error: "Missing API key" }, { status: 401 });
}

const dataType = request.headers.get("X-Data-Type");
const dashboardId = request.headers.get("X-Dashboard-Id");
const dashboardTitle = request.headers.get("X-Dashboard-Title");

if (!dataType || (!dashboardId && !dashboardTitle)) {
  return NextResponse.json(
    {
      error:
        "Missing X-Data-Type and either X-Dashboard-Id or X-Dashboard-Title",
    },
    { status: 400 }
  );
}

const tenant = await validateTenantApiKey(apiKey);
if (!tenant) {
  return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
}
```

3. Public (Token) — validate share token and enforce read-only

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

// From token resolve: share → dashboard → tenant
// Enforce read-only behavior in shared routes
```

4. Required headers example (client-side or docs)

```http
# Internal
Authorization: Bearer <supabase_jwt_token>
X-Tenant-ID: <tenant_uuid>

# Upload-XML
x-api-key: <tenant_api_key>
X-Data-Type: Sales
X-Dashboard-Id: <uuid>
# or
X-Dashboard-Title: Q4 Analytics
```

PR Checklist

- [ ] Endpoint uses the correct auth scheme for its category (Internal, Upload, Public).
- [ ] Required headers are validated and missing/invalid cases return proper codes.
- [ ] Tenant access is validated after authentication and before any DB call.
- [ ] Public/shared routes are strictly read-only.
- [ ] No mixing of JWT, API key, and public token flows.

References

- API: `app/api/CLAUDE.md` — API Categories, Authentication Patterns (Session, API Key, Public Token), Standard Route Structure.
- Root: `README.md` — External System Integration (Upload XML API), Required headers.
- Root: `CLAUDE.md` — Security Model (Authentication Patterns).
- Lib: `lib/CLAUDE.md` — Authentication & Security utilities (`auth-middleware.ts`, `public-auth.ts`).
