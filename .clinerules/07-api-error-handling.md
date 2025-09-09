<!--
Rule: R-007
Title: API Error Semantics and Production Safety
Status: enabled
-->

# R-007 — API Error Semantics and Production Safety

Purpose & Scope

- Standardize error handling semantics across all API routes.
- Ensure safe, generic error disclosure in production and consistent HTTP status codes.

Do

- Return appropriate HTTP status codes:
  - 400 — Bad Request (invalid input, malformed data, schema violations)
  - 401 — Unauthorized (missing/invalid authentication)
  - 403 — Forbidden (valid auth, insufficient permissions/tenant access)
  - 404 — Not Found (resource doesn’t exist or not within tenant scope)
  - 429 — Too Many Requests (rate limit exceeded)
  - 500 — Internal Server Error (unhandled server-side issues)
- Use generic error messages in production:
  - Derive environment and redact details when `NODE_ENV === "production"`.
- Use a response helper (pattern) for consistency:
  - Centralize JSON shape (e.g., `{ error, message, data }`) and headers.
- Normalize validation errors:
  - Convert Zod or schema errors to a generic 400 message in production.
- Log server-side errors with appropriate detail and correlation identifiers (but never expose secrets in responses).

Don’t

- Leak stack traces or sensitive details to clients in production.
- Use 200 OK for error conditions.
- Rely on ambiguous messages; ensure consistent structure even if generic.
- Omit tenant-aware considerations (e.g., 404 vs 403 decisions based on access rules).

Required Patterns

1. Generic production error response

```ts
const isProduction = process.env.NODE_ENV === "production";
const errorMessage = isProduction
  ? "Internal server error"
  : (error as Error).message;

return NextResponse.json({ error: errorMessage }, { status: 500 });
```

2. Status code mapping examples

```ts
// 400 — invalid input
return NextResponse.json({ error: "Bad request" }, { status: 400 });

// 401 — missing/invalid auth
return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// 403 — insufficient permissions/tenant access
return NextResponse.json({ error: "Access denied" }, { status: 403 });

// 404 — not found in tenant scope
return NextResponse.json({ error: "Not found" }, { status: 404 });

// 429 — rate limited
return NextResponse.json({ error: "Too many requests" }, { status: 429 });
```

3. Route handler try/catch structure

```ts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    const { user, tenant } = await validateSession(request, tenantId);
    if (!user || !tenant) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ... perform tenant-scoped logic

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    const isProduction = process.env.NODE_ENV === "production";
    const message = isProduction
      ? "Internal server error"
      : (error as Error).message;
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

4. Validation error normalization (Zod)

```ts
const parsed = schema.safeParse(payload);
if (!parsed.success) {
  // Avoid leaking detailed schema errors in production
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}
```

PR Checklist

- [ ] Handlers map errors to correct HTTP status codes (400/401/403/404/429/500).
- [ ] Production responses are generic; no stack traces or sensitive info exposed.
- [ ] A consistent JSON response shape is used across endpoints.
- [ ] Validation errors return 400 with safe messaging.
- [ ] Logs capture enough context for debugging (without secrets), including tenantId when applicable.

References

- API: `app/api/CLAUDE.md` — Error Handling (production generic messages, status code taxonomy, route structure).
- Lib: `lib/CLAUDE.md` — Validation and security utilities (supporting safe responses).
- Root: `CLAUDE.md` — Security Model (generic errors, validation).
