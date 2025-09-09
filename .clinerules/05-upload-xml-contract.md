<!--
Rule: R-005
Title: Upload-XML Contract and Secure Processing Pipeline
Status: enabled
-->

# R-005 — Upload-XML Contract and Secure Processing Pipeline

Purpose & Scope

- Define the exact request contract, authentication, limits, and secure processing pipeline for the `/api/upload-xml` endpoint.
- Ensure external integrations (ETL/MOCA/etc.) can reliably ingest XML with tenant isolation and dataset replacement semantics.

Do

- Authenticate requests with the tenant’s API key:
  - Accept via `x-api-key: <tenant_api_key>` or `Authorization: Bearer <tenant_api_key>`.
- Require headers that define routing and dataset semantics:
  - `X-Data-Type: <category>` (e.g., Sales, Inventory) — required
  - Either `X-Dashboard-Id: <uuid>` or `X-Dashboard-Title: <string>` — required
    - If `X-Dashboard-Id` not provided, create/find dashboard by `X-Dashboard-Title`.
- Enforce limits and rate controls:
  - Max file size: 50MB
  - Rate limit: 100 requests/minute per IP (dedicated limiter for upload-xml)
- Execute the secured pipeline:
  1. Validate size, content-type, and headers
  2. Authenticate API key → resolve tenant
  3. Sanitize XML (prevent XXE) and parse → JSON
  4. Infer types and prepare chart-ready data
  5. Store to `data_files` with tenant and dashboard scope
  6. Respect dataset replacement via unique constraint `(tenant_id, dashboard_id, data_type)`
  7. Return standardized JSON response with `success`, `message`, `recordCount`, and `dashboardId`
- Return appropriate HTTP status codes and generic messages in production.

Don’t

- Accept JWTs or public tokens for this endpoint.
- Process requests without `X-Data-Type` and one of `X-Dashboard-Id` or `X-Dashboard-Title`.
- Trust raw XML; always sanitize and validate before parse.
- Bypass tenant filtering when upserting `data_files`.
- Exceed file size or rate limits; fail fast and clearly.

Required Patterns

1. API key extraction and validation

```ts
const apiKey =
  request.headers.get("x-api-key") ||
  request.headers.get("authorization")?.replace("Bearer ", "");

if (!apiKey) {
  return NextResponse.json({ error: "Missing API key" }, { status: 401 });
}

const tenant = await validateTenantApiKey(apiKey);
if (!tenant) {
  return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
}
```

2. Required headers and size limits

```ts
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

// Enforce 50MB limit (implementation may vary by runtime/body parser)
if (!withinSizeLimit(request, 50 * 1024 * 1024)) {
  return NextResponse.json({ error: "File too large" }, { status: 413 });
}
```

3. Rate limiting (dedicated upload limiter)

```ts
if (!checkUploadXmlRateLimit(ip /*, limit=100, window=60s */)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

4. Secure XML processing pipeline

```ts
const rawXml = await request.text();

const safeXml = sanitizeXML(rawXml); // prevent XXE
const parsed = await parseXMLToJSON(safeXml);
if (!parsed.success || !parsed.data) {
  return NextResponse.json({ error: "Invalid XML" }, { status: 400 });
}

// Optional: infer types, normalize dates, prepare chart data
const recordCount = parsed.recordCount ?? parsed.data.length;
```

5. Dataset replacement and storage (tenant-scoped)

```ts
// Resolve dashboardId (by header or create/find by title scoped to tenant)
const dashboard = await ensureDashboard(tenant.id, {
  dashboardId,
  dashboardTitle,
});

// Upsert data_files with unique(tenant_id, dashboard_id, data_type)
const { error } = await supabase.from("data_files").upsert(
  {
    tenant_id: tenant.id,
    dashboard_id: dashboard.id,
    data_type: dataType,
    json_data: parsed.data,
    file_name: providedFileName ?? null,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "tenant_id, dashboard_id, data_type" }
);

if (error) {
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

return NextResponse.json(
  {
    success: true,
    message: `Data processed and saved for ${dataType}`,
    recordCount,
    dashboardId: dashboard.id,
  },
  { status: 200 }
);
```

6. MOCA/example client integration (docs)

```bash
curl -X POST https://your-domain.com/api/upload-xml \
  -H "Content-Type: application/xml" \
  -H "x-api-key: <tenant-api-key>" \
  -H "X-Data-Type: Sales" \
  -H "X-Dashboard-Title: Q4 Analytics" \
  --data-binary @./sample.xml
```

PR Checklist

- [ ] Endpoint authenticates via API key; JWT/public tokens are rejected.
- [ ] `X-Data-Type` and either `X-Dashboard-Id` or `X-Dashboard-Title` are required and validated.
- [ ] 50MB file size and 100/min rate limits are enforced.
- [ ] XML is sanitized to prevent XXE and parsed securely; invalid XML yields 400.
- [ ] Data is stored tenant-scoped; queries and upserts filter by `tenant_id`.
- [ ] Dataset replacement uses the `(tenant_id, dashboard_id, data_type)` uniqueness contract.
- [ ] Response format matches documented shape with generic errors in production.

References

- API: `app/api/CLAUDE.md` — Upload API category, Authentication, File size limit, Dedicated rate limiter, Required headers.
- Lib: `lib/CLAUDE.md` — `xml-parser.ts` (sanitize/parse/infer), `data-utils.ts` (transform), `validation.ts` (schemas), security utilities.
- Root: `README.md` — Upload XML API quick start, MOCA example, request/response structure.
- Database: `scripts/CLAUDE.md` — `data_files` unique constraints, schema relationships, tenant isolation.
