<!--
Rule: R-016
Title: Performance and UX Patterns (React 19 + Next.js App Router)
Status: enabled
-->

# R-016 — Performance and UX Patterns (React 19 + Next.js App Router)

Purpose & Scope

- Establish predictable client and server performance patterns while maintaining a responsive, accessible UX.
- Cover memoization, lazy loading, network efficiency, polling/deduping, and rendering hygiene across components and pages.

Do

- Memoize expensive calculations and components:
  - Use `useMemo`/`useCallback` and `React.memo` judiciously for stable props.
- Lazy-load heavy components and charts:
  - Use dynamic imports with Suspense fallbacks; keep initial route payloads small.
- Tune SWR fetch behavior:
  - Disable `revalidateOnFocus` by default; apply `dedupingInterval` and `refreshInterval` where needed.
  - Include `tenantId` in keys to avoid cross-tenant cache bleed (see R-012).
- Optimize re-renders:
  - Keep state shapes minimal and colocated.
  - Split large components; prefer composition to monoliths.
- Use responsive/container-based sizing for charts:
  - Avoid fixed pixel dimensions; allow charts to adapt to container size.
- Provide meaningful loading and error states:
  - Wrap async boundaries with Suspense and custom skeletons.
- Prefer server-side data shaping where possible:
  - Ship lean props to clients; hydrate only what is necessary.

Don’t

- Recompute expensive derived data on every render (missing memoization).
- Eager-load rarely used, heavy UI (dialogs, charts, editors) on first paint.
- Over-poll or refetch aggressively without need; be deliberate with intervals.
- Pass unstable function props to memoized children (causing re-renders).
- Use fixed dimensions for charts that break layouts across devices.

Required Patterns

1. Memoization of expensive work

```tsx
import React, { useMemo } from "react";

function ExpensiveView({ rows }: { rows: any[] }) {
  const processed = useMemo(() => expensiveDataProcessing(rows), [rows]);
  return <div>{/* render processed */}</div>;
}
```

2. Component memo + stable props

```tsx
const List = React.memo(function List({ items }: { items: string[] }) {
  return items.map((i) => <div key={i}>{i}</div>);
});
```

3. Lazy loading heavy components

```tsx
import { Suspense, lazy } from "react";

const Chart = lazy(() => import("@/components/data-chart"));

export function ChartPanel({ data }: { data: any[] }) {
  return (
    <Suspense fallback={<ChartSkeleton />}>
      <Chart data={data} />
    </Suspense>
  );
}
```

4. SWR tuning for network efficiency

```ts
import useSWR from "swr";

export function useTenantData(key: string, tenantId: string, enabled = true) {
  return useSWR(enabled ? [key, tenantId] : null, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
    refreshInterval: 30_000, // optional
  });
}
```

5. Responsive chart container

```tsx
<div className="w-full h-full">
  {/* Wrap Recharts ResponsiveContainer inside a parent with stable size */}
  <ResponsiveContainer width="100%" height="100%">
    {/* chart */}
  </ResponsiveContainer>
</div>
```

6. Suspense boundaries and loading skeletons

```tsx
<Suspense fallback={<LoadingSkeleton />}>
  <AsyncSection />
</Suspense>
```

7. State and prop hygiene

```tsx
// Avoid passing new inline objects/functions each render if children are memoized
const stableOptions = useMemo(() => ({ mode: "compact" }), []);
<MemoChild options={stableOptions} />;
```

PR Checklist

- [ ] Expensive computations are memoized; prop/function identities stable where relevant.
- [ ] Heavy UI is lazy-loaded with appropriate Suspense fallbacks.
- [ ] SWR disables `revalidateOnFocus`; deduping/polling configured intentionally.
- [ ] Charts/layouts are responsive and container-sized.
- [ ] Async UI has usable loading/error states; no layout shift surprises.
- [ ] Server does data shaping when possible; client payloads remain lean.

References

- Components: `components/CLAUDE.md` — Performance Optimizations (React.memo/useMemo, Lazy Loading), Data Visualization responsiveness.
- App Router: `app/CLAUDE.md` — Loading States and Suspense patterns.
- Root: `CLAUDE.md` — Operational Modes and UX considerations (TV mode, public).
