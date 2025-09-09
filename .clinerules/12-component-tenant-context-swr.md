<!--
Rule: R-012
Title: Component Tenant Context and SWR/Data Fetching Patterns
Status: enabled
-->

# R-012 — Component Tenant Context and SWR/Data Fetching Patterns

Purpose & Scope

- Standardize tenant-aware component patterns and client-side data fetching with SWR.
- Ensure components render data only for tenants the user can access and that client caches are tenant-partitioned.

Do

- Consume authentication/tenant context via `AuthProvider`; verify tenant membership before rendering tenant data.
- Include `tenantId` in SWR keys to partition caches per tenant and avoid data bleed.
- Disable unnecessary refetches; set `revalidateOnFocus: false` and use sensible `dedupingInterval` and/or `refreshInterval`.
- Prefer server-rendered props where appropriate, then hydrate client components with tenant-validated data.
- Define strict TypeScript interfaces for props, including `tenantId`.
- Keep public presentation logic separate (`PublicTVModeClient`) and read-only.

Don’t

- Render tenant-scoped UI without verifying `tenantAccess` for the current `tenantId`.
- Use global SWR keys without tenant context (mixes data across tenants).
- Fetch data when unauthenticated or before tenant membership is known.
- Reuse stateful components across tenants without resetting/partitioning state.

Required Patterns

1. Tenant access validation before rendering

```tsx
import { useAuth } from "@/components/auth-provider";
import AccessDenied from "@/components/access-denied";

export function TenantScoped({ tenantId }: { tenantId: string }) {
  const { tenantAccess } = useAuth();
  const hasAccess = tenantAccess?.some((t) => t.tenant_id === tenantId);
  if (!hasAccess) return <AccessDenied />;
  return <div>{/* safe tenant-scoped content */}</div>;
}
```

2. SWR key includes tenantId; avoid refetch on focus

```ts
import useSWR from "swr";

export function useTenantDashboards(tenantId: string, enabled: boolean) {
  const key = enabled ? ["/api/internal/dashboards", tenantId] : null;
  return useSWR(key, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    refreshInterval: 30_000, // optional polling
  });
}
```

3. Protected usage in pages

```tsx
// app/[tenantId]/dashboard/page.tsx (pattern)
export default async function Page({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;
  return (
    <ProtectedRoute>
      <DashboardClient tenantId={tenantId} />
    </ProtectedRoute>
  );
}
```

4. Prop interfaces with explicit tenantId

```ts
interface DashboardClientProps {
  tenantId: string;
  selectedDashboardId?: string;
}
```

5. Public vs Authenticated TV mode separation

```text
components/tv-mode-client.tsx        # authenticated, tenant-scoped
components/public-tv-mode-client.tsx # public, token-scoped (read-only)
```

PR Checklist

- [ ] Components that render tenant data verify access from `AuthProvider` before rendering.
- [ ] SWR keys include `tenantId`; caches are tenant-partitioned.
- [ ] `revalidateOnFocus` disabled where appropriate to reduce churn; polling/deduping configured deliberately.
- [ ] Props/interfaces include `tenantId` for tenant-scoped components.
- [ ] Public presentation components are separate and read-only; no mixing with authenticated logic.

References

- Components: `components/CLAUDE.md` — Tenant Context Validation, Tenant-Scoped Data Fetching, Core Components.
- App Router: `app/CLAUDE.md` — Page Component Patterns, Protected Routes.
- Root: `CLAUDE.md` — Multi-Tenant Architecture (Components layer).
