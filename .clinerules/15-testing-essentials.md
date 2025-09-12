<!--
Rule: R-015
Title: Testing Essentials (Auth, Tenant Isolation, Public, Limits)
Status: enabled
-->

# R-015 — Testing Essentials (Auth, Tenant Isolation, Public, Limits)

Purpose & Scope

- Ensure comprehensive automated coverage of multi-tenant security and key behaviors across unit, integration, and e2e tests.
- Validate authentication flows, tenant isolation, public sharing read-only access, error semantics, and rate/file size limits.

Do

- Cover all three auth modes in tests:
  - Internal (JWT/session) for authenticated dashboard operations.
  - Upload-XML (API key) for external ingestion constraints.
  - Public token sharing (read-only).
- Verify tenant isolation rigorously:
  - Users can only see data for tenants they have access to.
  - Cross-tenant access attempts are denied (403) or return scoped 404s as appropriate.
- Validate identifier hygiene and inputs:
  - Reject invalid UUIDs (400).
  - Enforce Content-Type and size limits (415/413).
- Assert error semantics and production messaging:
  - Correct HTTP status codes mapping.
  - Generic messages in production (no stack traces).
- Exercise rate limiting behavior on public/internal/upload categories.

Don’t

- Assume a single-tenant context in tests.
- Use shared fixtures or caches that bleed tenant data between tests.
- Assert on environment-specific stack traces or internal error strings.

Required Patterns

1. Unit tests — utilities and validation

```ts
// Example: lib/validation.test.ts
import { isValidUUID } from "@/lib/security";

describe("UUID validation", () => {
  it("rejects malformed UUIDs", () => {
    expect(isValidUUID("not-a-uuid")).toBe(false);
  });
});
```

2. Integration tests — internal API tenant isolation

```ts
// Example: __tests__/integration/api/dashboards.test.ts
import { getAuthHeadersForTenant } from "../auth/test-helpers";

describe("Internal API — dashboards (tenant-scoped)", () => {
  it("denies access without tenant membership", async () => {
    const res = await fetch("/api/internal/dashboards", {
      headers: getAuthHeadersForTenant({ tenantId: "other-tenant" }),
    });
    expect([401, 403]).toContain(res.status);
  });

  it("lists dashboards for authorized tenant", async () => {
    const res = await fetch("/api/internal/dashboards", {
      headers: getAuthHeadersForTenant({ tenantId: "my-tenant" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data)).toBe(true);
    // Ensure all tenant_id === my-tenant
  });
});
```

3. Integration tests — upload-xml contract

```ts
// Example: __tests__/unit/api/upload-xml.test.ts
describe("Upload XML — required headers and size limits", () => {
  it("rejects missing API key", async () => {
    const res = await fetch("/api/upload-xml", {
      method: "POST",
      body: "<xml/>",
    });
    expect(res.status).toBe(401);
  });

  it("rejects missing dataset headers", async () => {
    const res = await fetch("/api/upload-xml", {
      method: "POST",
      headers: { "x-api-key": "tenant-key", "Content-Type": "application/xml" },
      body: "<xml/>",
    });
    expect(res.status).toBe(400);
  });

  it("enforces 50MB limit", async () => {
    // prepare >50MB payload as a stream or buffer
    // expect 413 Payload Too Large
  });
});
```

4. Integration tests — public sharing read-only

```ts
// Example: __tests__/integration/api/public-share.test.ts
describe("Public share — token validation and read-only", () => {
  it("rejects invalid/expired tokens", async () => {
    const res = await fetch("/api/public/shared/invalid-token");
    expect(res.status).toBe(401);
  });

  it("denies write attempts", async () => {
    const res = await fetch("/api/public/shared/some-token", {
      method: "POST",
    });
    expect(res.status).toBe(403);
  });
});
```

5. Error semantics and production messaging

```ts
// Example: __tests__/unit/lib/security.test.ts
describe("Error responses", () => {
  it("maps invalid input to 400", () => {
    // simulate handler with invalid payload
    // expect status 400 and generic message in production
  });
});
```

6. E2E — multi-tenant navigation and auth

```ts
// e2e/multi-tenant.spec.ts
test("User can switch tenants and only see authorized data", async ({
  page,
}) => {
  await page.goto("/");
  // login flow
  // select tenant A -> see dashboards for A
  // navigate to tenant B -> if no access, expect AccessDenied
});
```

PR Checklist

- [ ] Unit tests cover validators, sanitizers, and core utilities.
- [ ] Integration tests validate auth flows, tenant isolation, and scoped queries.
- [ ] Upload-XML tests enforce API key, headers, size limit, and pipeline basics.
- [ ] Public sharing tests validate token behavior and enforce read-only.
- [ ] Error semantics tested for status codes and generic production messages.
- [ ] E2E tests validate multi-tenant UX, including access-denied paths and switching.

References

- API: `app/api/CLAUDE.md` — Authentication patterns, Multi-Tenant Data Access, Error Handling, Rate Limiting.
- Repo tests: `__tests__/integration/*`, `__tests__/unit/*`, `e2e/*` — existing patterns to extend.
- Root: `CLAUDE.md` — Development Guidelines, Security Model.
