<!--
Rule: R-003
Title: Protected Tenant Routing and Page Contracts
Status: enabled
-->

# R-003 — Protected Tenant Routing and Page Contracts

Purpose & Scope

- Standardize tenant-scoped routing and page composition in the Next.js App Router.
- Ensure all `[tenantId]` routes are protected, correctly typed, and validate tenant access before rendering data.

Do

- Use dynamic `[tenantId]` segments for all tenant-scoped pages.
- Wrap all `[tenantId]` pages in `<ProtectedRoute>` to enforce authentication and tenant access checks.
- Implement `PageProps` with `params: Promise<{ tenantId: string }>` and await it in server components/pages.
- Add Suspense boundaries and loading skeletons for async components.
- Validate tenant access in page or component logic prior to fetching/rendering tenant data.
- Keep public sharing under `/shared/[token]` and ensure read-only there (see R-004).

Don’t

- Render tenant-scoped data without `<ProtectedRoute>` on `[tenantId]` pages.
- Assume `tenantId` is valid without UUID validation and access checks.
- Mix public sharing routes with authenticated tenant routes.
- Omit Suspense/loading states for async page content.

Required Patterns

1. Standard tenant-scoped page structure

```tsx
// app/[tenantId]/page.tsx
interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function Page({ params }: PageProps) {
  const { tenantId } = await params;

  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSkeleton />}>
        <PageContent tenantId={tenantId} />
      </Suspense>
    </ProtectedRoute>
  );
}
```

2. Root layout with required providers

```tsx
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <main>{children}</main>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

3. Component-level tenant access enforcement

```tsx
const TenantScopedComponent = ({ tenantId }: { tenantId: string }) => {
  const { tenantAccess } = useAuth();
  const hasAccess = tenantAccess?.some((t) => t.tenant_id === tenantId);
  if (!hasAccess) return <AccessDenied />;
  return <div>{/* tenant data */}</div>;
};
```

4. Public sharing routing separation (read-only)

```text
/shared/[token]/page.tsx            # public dashboard view
/shared/[token]/tv-mode/page.tsx    # public TV mode
```

PR Checklist

- [ ] All tenant pages live under `app/[tenantId]/...` and are wrapped with `<ProtectedRoute>`.
- [ ] Page components use `PageProps` with `params: Promise<{ tenantId: string }>` and `await` it.
- [ ] Suspense/loading states are implemented for async content.
- [ ] Components validate tenant access via `AuthProvider` before rendering tenant data.
- [ ] Public sharing routes are separate (`/shared/[token]`) and strictly read-only.
- [ ] No leakage of tenant data outside of protected `[tenantId]` routes.

References

- App Router: `app/CLAUDE.md` — Routing Structure, Page Component Patterns, Layout Hierarchy, Security Considerations.
- Components: `components/CLAUDE.md` — Tenant Context Validation, Tenant-Scoped Data Fetching.
- Root: `CLAUDE.md` — Tenant Isolation Layers and Operational Modes.
- API: `app/api/CLAUDE.md` — Public token model (complements separation of public routes).
