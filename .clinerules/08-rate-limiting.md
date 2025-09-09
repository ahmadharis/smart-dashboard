<!--
Rule: R-008
Title: Rate Limiting and Throughput Controls
Status: enabled
-->

# R-008 — Rate Limiting and Throughput Controls

Purpose & Scope

- Enforce consistent rate limits across API categories to prevent abuse and protect system stability.
- Apply category-specific limits and ensure correct headers and responses are returned.

Do

- Apply rate limits per category:
  - Public APIs: 20 requests/minute per IP
  - Internal APIs: 50 requests/minute per IP
  - Upload-XML: 100 requests/minute per IP (dedicated limiter)
- Enforce limits at the edge/middleware when possible:
  - Use separate buckets/keys for each API category.
  - Prefer sliding window or token bucket implementations with clear reset semantics.
- Return appropriate responses and metadata:
  - Status: 429 Too Many Requests when exceeded.
  - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (epoch seconds).
- Keep rate limit scope tenant-agnostic for IP-based limits unless a use case requires per-tenant limits.
- Ensure Upload-XML uses a dedicated limiter with its own memory map/state separate from public/internal buckets.

Don’t

- Share a single counter across categories (upload spikes must not affect internal/public).
- Return 200 with an error payload when limits are exceeded; use 429.
- Omit rate limit headers where implemented.
- Apply weaker limits to public endpoints than documented (20/min).

Required Patterns

1. Public and internal limit checks (conceptual)

```ts
function checkRateLimit(
  key: string,
  limit: number,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const record = rateMap.get(key);
  if (!record || now > record.resetTime) {
    rateMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= limit) return false;
  record.count++;
  return true;
}

// Usage
const ip = request.headers.get("x-forwarded-for") ?? "unknown";
const key = `internal_${ip}`;
if (!checkRateLimit(key, 50)) {
  return NextResponse.json({ error: "Too many requests" }, { status: 429 });
}
```

2. Dedicated Upload-XML limiter (separate state)

```ts
function checkUploadXmlRateLimit(
  ip: string,
  limit = 100,
  windowMs = 60_000
): boolean {
  const now = Date.now();
  const key = `upload_xml_${ip}`;
  const record = uploadRateMap.get(key);

  if (!record || now > record.resetTime) {
    uploadRateMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}
```

3. Headers for clients (example)

```ts
const resetEpoch = Math.floor(record.resetTime / 1000);
const remaining = Math.max(0, limit - record.count);
const headers = {
  "X-RateLimit-Limit": String(limit),
  "X-RateLimit-Remaining": String(remaining),
  "X-RateLimit-Reset": String(resetEpoch),
};
return NextResponse.json({ data }, { status: 200, headers });
```

4. Category mapping

```text
/api/public/...           -> 20/min per IP
/api/internal/...         -> 50/min per IP
/api/upload-xml           -> 100/min per IP (dedicated map)
```

PR Checklist

- [ ] Public endpoints enforce 20/min IP-based rate limiting with 429 on exceed.
- [ ] Internal endpoints enforce 50/min IP-based rate limiting.
- [ ] Upload-XML uses a dedicated limiter at 100/min, independent from other buckets.
- [ ] When implemented, rate limit headers are returned (`X-RateLimit-*`).
- [ ] No shared counters across categories; each category has an independent key space.

References

- API: `app/api/CLAUDE.md` — Rate Limiting (category limits, dedicated Upload-XML limiter, header examples).
- Root: `CLAUDE.md` — Security Layers with rate limits per category and size limits.
