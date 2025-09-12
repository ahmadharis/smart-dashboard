<!--
Rule: R-006
Title: Input Validation, UUID Checks, and Sanitization (XXE/XSS)
Status: enabled
-->

# R-006 — Input Validation, UUID Checks, and Sanitization (XXE/XSS)

Purpose & Scope

- Enforce strict, centralized input validation and sanitization across APIs, components, and data pipelines.
- Prevent XXE in XML, XSS in rendered content, and malformed identifier abuse (UUID checks).

Do

- Use centralized validators/utilities:
  - UUIDs: `isValidUUID()` for all `tenantId`, `dashboardId`, and similar IDs.
  - Input sanitization: `sanitizeInput()` for user-supplied text; `sanitizeXML()` for XML prior to parsing.
  - Schemas: Parse/validate request bodies with `validation.ts` (Zod) before processing.
- Validate early at the edge:
  - Reject invalid UUIDs and malformed inputs with `400 Bad Request`.
  - Enforce Content-Type and size limits before reading bodies.
- Sanitize before rendering:
  - When injecting HTML (e.g., dangerouslySetInnerHTML), sanitize content first.
- Keep production error messages generic; avoid leaking internals.
- Validate headers for critical endpoints (e.g., upload-xml) and reject on missing/malformed.

Don’t

- Trust client-provided identifiers; always UUID-validate.
- Parse or store raw XML without `sanitizeXML()` first.
- Render user-provided HTML without sanitization.
- Return verbose error details in production responses.

Required Patterns

1. UUID validation

```ts
import { isValidUUID } from "@/lib/security";

if (!isValidUUID(tenantId)) {
  return NextResponse.json({ error: "Invalid tenant ID" }, { status: 400 });
}
```

2. Body validation with Zod schemas

```ts
import { dashboardSchema } from "@/lib/validation";

let payload: unknown;
try {
  payload = await request.json();
} catch {
  return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
}

const data = dashboardSchema.safeParse(payload);
if (!data.success) {
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

// use data.data (typed)
```

3. Input sanitization (text)

```ts
import { sanitizeInput } from "@/lib/security";

const cleanText = sanitizeInput(userInput);
// Use cleanText for storage or rendering
```

4. XML sanitization and parsing

```ts
import { sanitizeXML } from "@/lib/security";
import { parseXMLToJSON } from "@/lib/xml-parser";

const rawXml = await request.text();
const safeXml = sanitizeXML(rawXml);
const parsed = await parseXMLToJSON(safeXml);
if (!parsed.success || !parsed.data) {
  return NextResponse.json({ error: "Invalid XML" }, { status: 400 });
}
```

5. Safe HTML rendering

```tsx
import { sanitizeHtml } from "@/lib/security";

const SafeComponent = ({ html }: { html: string }) => {
  const safe = sanitizeHtml(html);
  return <div dangerouslySetInnerHTML={{ __html: safe }} />;
};
```

6. Size and content-type checks (example)

```ts
if (request.headers.get("content-type") !== "application/xml") {
  return NextResponse.json(
    { error: "Unsupported content type" },
    { status: 415 }
  );
}

if (!withinSizeLimit(request, 50 * 1024 * 1024)) {
  return NextResponse.json({ error: "Payload too large" }, { status: 413 });
}
```

PR Checklist

- [ ] All ID parameters (e.g., tenantId, dashboardId) pass `isValidUUID()` before use.
- [ ] Request bodies validated with Zod schemas from `validation.ts`; invalid inputs return 400.
- [ ] User-supplied text/HTML is sanitized before storage/rendering.
- [ ] XML payloads are sanitized with `sanitizeXML()` before parsing.
- [ ] Content-Type and size limits enforced at the edge.
- [ ] Production responses avoid leaking sensitive implementation details.

References

- Lib: `lib/CLAUDE.md` — `security.ts` (UUID, sanitizeInput, sanitizeXML), `validation.ts` (Zod schemas).
- API: `app/api/CLAUDE.md` — Request Validation (UUID checks, sanitization), Error Handling (generic prod errors).
- Root: `CLAUDE.md` — Security Model (XML sanitization, size limits), Authentication Patterns.
- README: Upload XML and configuration notes for secure inputs and limits.
