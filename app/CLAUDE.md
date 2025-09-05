# App Directory - Next.js App Router Structure

## Overview

This directory contains the Next.js App Router implementation for the Smart Dashboard. All routes implement multi-tenant architecture with proper authentication and tenant isolation.

## Routing Structure

### Tenant-Scoped Routes (`[tenantId]/`)
All tenant-scoped pages follow this pattern:
- Route: `/{tenantId}/{page}`
- Protection: Wrapped with `<ProtectedRoute>`
- Authentication: Requires valid JWT token
- Authorization: Validates user access to tenant via `user_tenants` table

**Key Pages:**
- `/[tenantId]/` - Main dashboard view
- `/[tenantId]/dashboard` - Dashboard management
- `/[tenantId]/manage` - File management
- `/[tenantId]/api-docs` - API documentation
- `/[tenantId]/tv-mode` - TV presentation mode

### Authentication Routes (`auth/`)
- `/auth/login` - User login form
- `/auth/sign-up` - User registration with domain-based tenant assignment
- `/auth/sign-up-success` - Post-registration confirmation
- `/auth/callback` - OAuth callback handler

### Public Sharing Routes (`shared/[token]/`)
Token-based public access without authentication:
- `/shared/[token]/` - Public dashboard view
- `/shared/[token]/tv-mode` - Public TV mode presentation

### Protected Routes (`protected/`)
Additional authentication-required pages (if any).

## Page Component Patterns

### Standard Page Structure
```tsx
interface PageProps {
  params: Promise<{ tenantId: string }>
}

export default async function Page({ params }: PageProps) {
  const { tenantId } = await params
  
  return (
    <ProtectedRoute>
      <Suspense fallback={<LoadingSkeleton />}>
        <PageContent tenantId={tenantId} />
      </Suspense>
    </ProtectedRoute>
  )
}
```

### Loading States
Each page should implement:
- Suspense boundaries for async components
- Custom loading skeletons
- Error boundaries where appropriate

## Layout Hierarchy

### Root Layout (`layout.tsx`)
Provides global providers:
```tsx
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
```

**Key Features:**
- OKLCH color system for precise color matching
- Dark/light theme support
- Global authentication context
- Toast notification system

## API Routes Structure

See `api/CLAUDE.md` for detailed API documentation.

**Categories:**
- `api/internal/` - Authenticated internal APIs
- `api/public/` - Public sharing APIs
- `api/auth/` - Authentication handlers
- `api/upload-xml` - File upload endpoint

## Development Patterns

### Creating New Tenant-Scoped Pages
1. Create page in `[tenantId]/` directory
2. Implement `PageProps` interface with `params`
3. Wrap with `<ProtectedRoute>`
4. Add Suspense boundaries
5. Validate tenant access in component

### Authentication Flow
1. User accesses tenant-scoped route
2. `ProtectedRoute` checks authentication status
3. If unauthenticated, redirects to `/auth/login`
4. After login, validates tenant access
5. If no access, shows access denied page

### Public Sharing Flow
1. Generate share token for dashboard
2. Create public URL: `/shared/{token}`
3. Token validation in `shared/[token]/page.tsx`
4. No authentication required, but read-only access

## Security Considerations

### Route Protection
- All `[tenantId]` routes MUST be wrapped with `<ProtectedRoute>`
- Tenant access MUST be validated before showing data
- Public routes MUST validate tokens before access

### Error Handling
- Generic error messages in production
- Detailed errors only in development
- Proper HTTP status codes for API routes

## Styling & Theming

### Global Styles (`globals.css`)
- OKLCH-based color system
- Dark/light theme CSS variables
- Responsive design utilities
- Custom animations and transitions

### Theme Implementation
Uses `next-themes` with:
- System preference detection
- Manual theme switching
- Persistent theme storage
- CSS variable-based color system

## Working with App Router

### Page Creation Checklist
- [ ] Implement proper TypeScript interfaces
- [ ] Add authentication protection (if needed)
- [ ] Include loading states and error boundaries  
- [ ] Validate tenant access for tenant-scoped pages
- [ ] Follow existing component patterns
- [ ] Test across different tenant contexts

### Routing Best Practices
- Use dynamic imports for heavy components
- Implement proper error boundaries
- Add meaningful loading states
- Cache static data where possible
- Follow the established folder structure

## File Organization

```
app/
├── [tenantId]/          # Tenant-scoped pages (protected)
│   ├── page.tsx         # Main dashboard
│   ├── dashboard/       # Dashboard management
│   ├── manage/          # File management  
│   ├── api-docs/        # API documentation
│   └── tv-mode/         # TV presentation
├── api/                 # API routes
│   ├── internal/        # Authenticated APIs
│   ├── public/          # Public sharing APIs
│   └── auth/            # Auth handlers
├── auth/                # Authentication pages
├── shared/              # Public sharing
├── protected/           # Additional protected pages
├── globals.css          # Global styles
├── layout.tsx           # Root layout
└── page.tsx             # Home/landing page
```

This structure ensures proper separation of concerns while maintaining the multi-tenant security model throughout the application.