# Smart Dashboard - Multi-Tenant Data Visualization Platform

## Project Overview

Smart Dashboard is a **Next.js 15.2.4** multi-tenant data visualization platform for enterprise analytics. It converts XML data into interactive charts and dashboards with complete tenant isolation.

### Key Architecture
- **Framework**: Next.js (App Router) + React 19 + TypeScript
- **Database**: Supabase with Row-Level Security (RLS)
- **Authentication**: JWT tokens + tenant API keys
- **UI**: Radix UI + Tailwind CSS + shadcn/ui
- **Charts**: Recharts for visualization

## Multi-Tenant Architecture

**CRITICAL**: Every operation in this system is tenant-scoped. Always ensure:
- All database queries include `tenant_id` filtering
- All API calls validate tenant access via `user_tenants` table
- All components check tenant context before rendering data
- Public sharing uses secure token-based access

### Tenant Isolation Layers
1. **Database**: UUID-based tenant_id foreign keys + RLS policies
2. **API**: Middleware validates tenant access on every request
3. **Components**: Tenant context passed through React providers
4. **Routing**: Dynamic `[tenantId]` URL structure

## Core Features

### Data Processing Pipeline
```
XML Upload → Parsing & Validation → JSON Conversion → Chart Generation → Dashboard Display
```

### Operational Modes
1. **Normal Mode**: Full dashboard management with authentication
2. **TV Mode**: Auto-advancing full-screen presentations
3. **Shared Mode**: Public token-based access without login

## Key Directories

### `/app/` - Next.js App Router
- `[tenantId]/` - Tenant-scoped pages (all protected)
- `api/` - API routes (internal vs public patterns)
- `auth/` - Authentication flow pages
- `shared/[token]/` - Public dashboard access

### `/components/` - React Components
- Core: `dashboard-client.tsx`, `data-chart.tsx`, `file-management-client.tsx`
- Auth: `auth-provider.tsx`, `protected-route.tsx`
- TV Mode: `tv-mode-client.tsx`, `public-tv-mode-client.tsx`
- Sharing: `share-dialog.tsx`

### `/lib/` - Utilities & Logic
- `auth-middleware.ts` - Authentication validation
- `xml-parser.ts` - XML to JSON conversion
- `data-utils.ts` - Chart data processing
- `security.ts` - Input validation & sanitization
- `supabase/` - Database client configurations

### `/scripts/` - Database Migrations
Migration order (IMPORTANT):
```
001_create_tenants_table.sql
002_create_users_table.sql
003_create_dashboards_table.sql
004_create_data_files_table.sql
005_create_settings_table.sql
006_create_user_profiles_table.sql
007_create_user_tenants_table.sql
009_add_api_key_to_tenants.sql
010_create_public_dashboard_shares.sql
011_add_public_sharing_setting.sql
012_fix_data_files_unique_constraint.sql
```

## Security Model

### Authentication Patterns
1. **Session Auth**: Supabase JWT for internal APIs
2. **API Key Auth**: Tenant-specific keys for uploads
3. **Public Token Auth**: Time-limited dashboard sharing

### Security Layers
- Rate limiting (20/min public, 50/min internal, 100/min upload-xml)
- CORS with domain whitelisting
- Input size limits (10MB internal, 50MB uploads)
- XML sanitization to prevent XXE attacks
- UUID validation for all tenant/user IDs

## Database Schema (Core Tables)

```sql
tenants          -- Tenant organizations + API keys
users            -- Supabase auth users
user_tenants     -- Many-to-many tenant access
dashboards       -- Dashboard configurations
data_files       -- XML files + converted JSON
settings         -- Tenant-specific settings
user_profiles    -- Extended user information
public_dashboard_shares -- Public sharing tokens
```

## Development Guidelines

### Essential Patterns
- **Always check tenant access** before any operation
- **Use existing utility functions** in `/lib/` for common operations
- **Follow the component patterns** established in existing files
- **Validate all inputs** using schemas in `validation.ts`
- **Test multi-tenant isolation** - users should never see other tenant data

### API Development
- Internal APIs: Use session authentication + tenant validation
- External APIs: Use API key authentication
- Public APIs: Use token-based access with expiration
- Always return generic error messages in production

### Component Development
- Wrap tenant-scoped pages with `ProtectedRoute`
- Use `AuthProvider` context for user/tenant state
- Follow existing patterns for loading states and error handling
- Implement proper TypeScript interfaces for all props

## Environment Setup

Required variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000
```

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build  
npm run lint     # ESLint check
npm run start    # Production server
```

## Critical Security Notes

- **Never commit** environment variables or API keys
- **Always validate** tenant access before data operations
- **Use RLS policies** for all tenant-scoped database tables
- **Sanitize XML input** to prevent XXE attacks
- **Test public sharing** functionality for proper access control

## Working with This Codebase

1. **Understand tenant context** - Every operation is tenant-scoped
2. **Use existing patterns** - Follow established authentication/validation flows
3. **Check component hierarchy** - Understand how data flows through the app
4. **Review database relationships** - Understand how tenant isolation works
5. **Test across modes** - Normal, TV mode, and public sharing all work differently

This documentation is shared across the team. Update it when adding new patterns or changing core architecture.