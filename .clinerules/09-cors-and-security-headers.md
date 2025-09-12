<!--
Rule: R-009
Title: CORS, Security Headers, and Request Size Limits
Status: enabled
-->

# R-009 — CORS, Security Headers, and Request Size Limits

Purpose & Scope

- Enforce strict CORS domain whitelisting and security headers on all routes.
- Apply request size limits and input sanitization at the edge via global middleware.
- Reduce cross-site risks (XSS, clickjacking) and prevent oversized payload abuse.

Do

- Configure CORS with an allowlist of trusted domains (no wildcards in production).
  - Honor preflight OPTIONS requests and return only required headers/methods.
  - Keep `Access-Control-Allow-Credentials` disabled unless explicitly needed.
- Set baseline security headers on every response:
  - Content-Security-Policy (CSP)
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY (or SAMEORIGIN if needed)
  - Referrer-Policy: no-referrer
  - Permissions-Policy: restrict powerful APIs (e.g., camera, geolocation).
- Enforce request size limits at the edge:
  - 10MB default for internal/public routes
  - 50MB max for `/api/upload-xml`
- Validate content types:
  - Reject unsupported Content-Type early (e.g., require `application/json` for JSON, `application/xml` for XML).
- Sanitize and validate inputs at the middleware boundary where possible before handing to handlers.

Don’t

- Use `Access-Control-Allow-Origin: *` in production.
- Reflect the request Origin header without verifying it against your allowlist.
- Allow credentials with wildcard origins.
- Accept payloads larger than documented limits.
- Disable or weaken CSP or X-Frame-Options without a documented reason.

Required Patterns

1. CORS allowlist check (middleware)

```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://your-domain.com",
  // Add more deployment domains as needed
]);

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization,content-type,x-api-key,x-tenant-id,x-data-type,x-dashboard-id,x-dashboard-title",
    "Access-Control-Max-Age": "86400",
  };
}

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") ?? "";
  const url = new URL(request.url);
  const isPreflight = request.method === "OPTIONS";

  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "";

  // Handle preflight
  if (isPreflight) {
    const res = new NextResponse(null, { status: allowedOrigin ? 204 : 403 });
    if (allowedOrigin) {
      Object.entries(corsHeaders(allowedOrigin)).forEach(([k, v]) =>
        res.headers.set(k, v)
      );
    }
    // Security headers also for preflight
    applySecurityHeaders(res.headers);
    return res;
  }

  // Proceed with request
  const response = NextResponse.next();

  // CORS (only set if allowed)
  if (allowedOrigin) {
    Object.entries(corsHeaders(allowedOrigin)).forEach(([k, v]) =>
      response.headers.set(k, v)
    );
  }

  // Security headers
  applySecurityHeaders(response.headers);

  return response;
}

function applySecurityHeaders(headers: Headers) {
  // Adjust CSP according to your asset and script needs
  headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // tighten if possible
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
}
```

2. Request size limits by route

```ts
// Example guard (implementation depends on your body parsing strategy)
function withinSizeLimit(request: Request, maxBytes: number): boolean {
  // If using edge runtime or streams, implement reader to cap bytes read
  // For Node runtime, configure body parser limits accordingly
  return true;
}

// In handlers
// internal/public: 10MB
if (!withinSizeLimit(request, 10 * 1024 * 1024)) {
  return NextResponse.json({ error: "Payload too large" }, { status: 413 });
}

// upload-xml: 50MB
if (request.nextUrl.pathname.startsWith("/api/upload-xml")) {
  if (!withinSizeLimit(request, 50 * 1024 * 1024)) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
}
```

3. Content-Type validation

```ts
// JSON endpoints
if (request.headers.get("content-type") !== "application/json") {
  return NextResponse.json(
    { error: "Unsupported content type" },
    { status: 415 }
  );
}

// XML endpoints
if (request.headers.get("content-type") !== "application/xml") {
  return NextResponse.json(
    { error: "Unsupported content type" },
    { status: 415 }
  );
}
```

4. Sanitization at edge (concept)

```ts
// Optionally sanitize known risky headers/inputs early
// Use utilities from lib/security.ts in route handlers for full sanitization
```

PR Checklist

- [ ] CORS allowlist is explicit; no wildcard origins in production.
- [ ] Preflight OPTIONS requests handled with correct headers and status.
- [ ] Security headers set globally (CSP, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- [ ] Request size limits enforced (10MB default; 50MB for upload-xml).
- [ ] Content-Type validation enforced per endpoint type.
- [ ] No reflection of untrusted origins; credentials allowed only with explicit origins (if used).

References

- API: `app/api/CLAUDE.md` — Global Middleware (CORS with domain whitelisting, Security headers, Request size limits, Input sanitization).
- Root: `CLAUDE.md` — Security Layers (rate limiting, CORS, size limits).
- Lib: `lib/CLAUDE.md` — Security utilities and sanitization helpers supporting edge validations.
