<!--
Rule: R-020
Title: Observability, Security Logging, and Auditability
Status: enabled
-->

# R-020 — Observability, Security Logging, and Auditability

Purpose & Scope

- Provide consistent, privacy-safe logging and observability patterns to support debugging, auditing, and incident response in a multi-tenant system.
- Ensure logs contain enough context to diagnose issues without leaking secrets or tenant data across boundaries.

Do

- Use structured logs with consistent fields:
  - `timestamp`, `level`, `event`, `tenantId`, `userId` (when available), `requestId`/`correlationId`, and minimal `details`.
- Capture security-relevant events:
  - Auth failures (401), access denials (403), invalid or expired public tokens, rate limit exceed events (429), input validation failures (400), upload rejections (size/content-type).
- Include tenant and route context in server logs:
  - Always include `tenantId` when operating on tenant-scoped resources.
  - Include route category: `internal`, `public`, or `upload-xml`.
- Redact or omit secrets:
  - Never log API keys, JWTs, service role keys, or raw XML bodies.
  - Truncate long inputs and use hashing for identifiers only when needed (avoid reversible encodings).
- Generate/propagate correlation IDs:
  - Create a `requestId` at the edge (middleware) if none is present (e.g., from `x-request-id`).
  - Propagate `requestId` to downstream logs for the same request.
- Differentiate environments:
  - Use human-friendly logs in development; structured JSON logs in production.
- Monitor high-risk endpoints:
  - `/api/upload-xml` and `/api/public/shared/{token}` should emit summary logs (no payloads) with outcomes and latencies.

Don’t

- Log secrets, raw payloads, or PII beyond what is strictly necessary.
- Emit verbose stack traces in production; use error summaries and correlation IDs.
- Aggregate multiple tenants’ logs into a single event without clear tenant labeling.
- Use unstructured `console.log` for production without consistent fields.

Required Patterns

1. Structured logging helper

```ts
type LogLevel = "debug" | "info" | "warn" | "error";
interface LogMeta {
  tenantId?: string;
  userId?: string;
  requestId?: string;
  routeCategory?: "internal" | "public" | "upload-xml";
  details?: Record<string, unknown>;
}

function log(level: LogLevel, event: string, meta: LogMeta = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...meta,
  };
  // Dev: pretty-print; Prod: JSON line
  if (process.env.NODE_ENV === "production") {
    console.log(JSON.stringify(entry));
  } else {
    // eslint-disable-next-line no-console
    console.log(`[${entry.level}] ${entry.event}`, entry);
  }
}
```

2. Middleware-created requestId and route category

```ts
// middleware.ts (concept)
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { randomUUID } from "crypto";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const incoming = request.headers.get("x-request-id");
  const requestId = incoming || randomUUID();
  response.headers.set("x-request-id", requestId);
  return response;
}

// In handlers: read requestId = request.headers.get("x-request-id")
```

3. Logging security-relevant events

```ts
// Auth failure example
log("warn", "auth.unauthorized", {
  tenantId,
  requestId,
  routeCategory: "internal",
});

// Access denied example
log("warn", "auth.forbidden", {
  tenantId,
  userId,
  requestId,
  routeCategory: "internal",
});

// Public token invalid/expired
log("warn", "public.invalid_token", {
  requestId,
  routeCategory: "public",
});

// Rate limit exceeded
log("info", "rate.limit_exceeded", {
  requestId,
  routeCategory: "upload-xml",
  details: { limit: 100 },
});
```

4. Upload-XML outcome logging (no payload)

```ts
log("info", "upload_xml.processed", {
  tenantId: tenant.id,
  requestId,
  routeCategory: "upload-xml",
  details: { dataType, dashboardId, recordCount },
});
```

5. Error handling with correlation IDs (production)

```ts
try {
  // handler body...
} catch (error) {
  const isProd = process.env.NODE_ENV === "production";
  log("error", "handler.exception", {
    tenantId,
    requestId,
    details: {
      message: (error as Error).message,
      route: "GET /api/internal/dashboards",
    },
  });
  const msg = isProd ? "Internal server error" : (error as Error).message;
  return NextResponse.json({ error: msg, requestId }, { status: 500 });
}
```

6. Redaction/truncation utilities

```ts
function redact(value: string, max = 16) {
  if (!value) return value;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}
```

PR Checklist

- [ ] All new/changed handlers log security-relevant outcomes (401/403/429/400) without leaking secrets.
- [ ] `tenantId`, `userId` (when available), and `requestId` are included in logs for tenant-scoped operations.
- [ ] Upload-XML and public routes log outcomes and latencies without raw payloads.
- [ ] Production logs are structured (JSON) and avoid stack traces in responses; correlation IDs are returned when 5xx occurs.
- [ ] No logging of API keys, JWTs, service role keys, or XML bodies.

References

- Lib: `lib/CLAUDE.md` — Security best practices: “Log security-relevant events for monitoring” and never log sensitive data.
- API: `app/api/CLAUDE.md` — Error Handling (generic production messages), Rate Limiting (headers and exceed events).
- Root: `CLAUDE.md` — Security Model and Multi-Tenant Isolation (contextual tenant/user logging).
