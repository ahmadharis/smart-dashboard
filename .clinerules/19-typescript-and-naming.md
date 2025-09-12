<!--
Rule: R-019
Title: TypeScript Conventions and Naming Standards
Status: enabled
-->

# R-019 — TypeScript Conventions and Naming Standards

Purpose & Scope

- Enforce consistent, type-safe patterns across server and client code.
- Standardize naming for files, components, props, and utility helpers to improve readability and DX.

Do

- Prefer strict, explicit typing:
  - Avoid `any`; prefer `unknown` and narrow via validation (e.g., Zod).
  - Infer types from Zod schemas where possible (e.g., `z.infer<typeof schema>`).
- Define interfaces for all component props:
  - Co-locate prop interfaces with components; name them `<ComponentName>Props`.
  - Include `tenantId: string` in tenant-scoped components.
- Use safe result/union types for operations:
  - Result type and discriminated unions for API responses.
- Use branded types where appropriate (e.g., UUID).
- Use descriptive, action-oriented function names; avoid abbreviations.
- Keep imports organized and path-alias based (e.g., `@/lib/...`, `@/components/...`) per tsconfig paths.
- Naming conventions:
  - Components: PascalCase file and export names (e.g., `DashboardClient.tsx`).
  - Non-component module files: kebab-case (e.g., `data-utils.ts`, `xml-parser.ts`).
  - Variables/functions: camelCase.
  - Constants/enums: UPPER_SNAKE_CASE or PascalCase enums.
- Prefer composition over inheritance; split large modules.
- Use async/await with proper error handling; avoid unhandled promise rejections.
- For Next.js pages:
  - Use `PageProps` with `params: Promise<{ tenantId: string }>` where applicable (see R-003).
- Keep public APIs and internal APIs typed distinctly; export DTO types where needed.

Don’t

- Export untyped functions or implicit `any` return types.
- Use non-null assertions (`!`) as a substitute for proper checks.
- Mix component and non-component file naming styles.
- Duplicate type definitions across modules; centralize shared types where appropriate.
- Leak server-only types to client bundles (e.g., service role keys, server-only utilities).

Required Patterns

1. Component props interfaces

```ts
interface DashboardClientProps {
  tenantId: string;
  selectedDashboardId?: string;
}
```

2. API response unions

```ts
type APIResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

3. Branded UUID and Result type

```ts
// Branded UUID for safety
type UUID = string & { __brand: "UUID" };

// Result type
export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

export async function safeAsync<T>(op: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await op() };
  } catch (e) {
    return { ok: false, error: e as Error };
  }
}
```

4. Zod schema inference

```ts
import { z } from "zod";

export const dashboardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  tenant_id: z.string().uuid(),
});

export type DashboardInput = z.infer<typeof dashboardSchema>;
```

5. File naming conventions

```text
components/dashboard-client.tsx      # component file: PascalCase export inside, kebab file is acceptable in this repo
components/data-chart.tsx            # component file
lib/data-utils.ts                    # utility modules in kebab-case
lib/xml-parser.ts
lib/security.ts
```

6. Narrowing unknown

```ts
async function toJSON<T>(request: Request): Promise<T | null> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return null;
  }
  // validate via Zod schema before cast/infer
  return payload as T; // only after safeParse success
}
```

7. No implicit any and no non-null assertions

```ts
// Bad
const name = (user as any).name!;
```

```ts
// Good
if (!user || !user.name) return null;
const { name } = user;
```

PR Checklist

- [ ] All new/changed modules use explicit, strict typing; no implicit `any`.
- [ ] Component props interfaces exist and include `tenantId` where applicable.
- [ ] API response and Result/union patterns used consistently.
- [ ] Zod schema inference used for DTOs; no manual type duplication.
- [ ] File naming follows conventions (components vs utilities).
- [ ] No non-null assertions or unsafe casts without prior validation.

References

- Lib: `lib/CLAUDE.md` — TypeScript patterns (branded UUID, Result type, discriminated unions); validation and security utilities.
- Components: `components/CLAUDE.md` — Props interfaces guidance; naming conventions; tenant validation patterns.
- App Router: `app/CLAUDE.md` — Page `PageProps` patterns with `params: Promise<{ tenantId: string }>` for tenant-scoped routes.
