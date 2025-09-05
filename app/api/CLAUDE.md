# API Directory - Multi-Tenant API Architecture

## Overview

All API routes implement multi-tenant architecture with three distinct authentication patterns. Every API operation is tenant-scoped and follows strict security protocols.

## API Categories

### Internal APIs (`internal/`)
**Authentication**: Session-based (JWT tokens)  
**Usage**: Authenticated dashboard operations  
**Rate Limit**: 50 requests/minute  

**Endpoints:**
- `dashboards/` - Dashboard CRUD operations
- `data-files/` - File management and processing
- `settings/` - Tenant configuration management
- `tenant-permissions/` - User access control

### Public APIs (`public/`)
**Authentication**: Token-based (public share tokens)  
**Usage**: Public dashboard sharing  
**Rate Limit**: 20 requests/minute  

**Endpoints:**
- `tenants` - List accessible tenants for authenticated user
- `shared/[token]/` - Access shared dashboard data
- `shared/[token]/data-files` - Shared dashboard files

### Upload API (`upload-xml`)
**Authentication**: API key-based (tenant-specific keys)  
**Usage**: External data ingestion  
**Rate Limit**: 100 requests/minute (dedicated rate limiter)
**File Size Limit**: 50MB max file size  

**Purpose**: Automated XML data uploads from external systems

## Authentication Patterns

### 1. Session Authentication (Internal APIs)
```typescript
// Middleware validation
const { user, tenant } = await validateSession(request)
if (!user || !tenant) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Required Headers:**
- `Authorization: Bearer <jwt_token>`
- `X-Tenant-ID: <tenant_uuid>` (optional, can be in URL)

### 2. API Key Authentication (Upload)
```typescript
// API key validation
const apiKey = request.headers.get('x-api-key') || 
               request.headers.get('authorization')?.replace('Bearer ', '')
const tenant = await validateTenantApiKey(apiKey)
```

**Required Headers:**
- `x-api-key: <tenant_api_key>` OR `Authorization: Bearer <tenant_api_key>`
- `X-Data-Type: <data_category>` (for file uploads)
- `X-Dashboard-Id: <dashboard_id>` OR `X-Dashboard-Title: <title>`

### 3. Public Token Authentication (Shared)
```typescript
// Token validation
const shareRecord = await validatePublicToken(token)
if (!shareRecord || shareRecord.expires_at < new Date()) {
  return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
}
```

**URL Pattern**: `/api/public/shared/{token}/...`

## Route Handler Patterns

### Standard Route Structure
```typescript
import { validateSession, sanitizeInput } from '@/lib/auth-middleware'
import { createResponse } from '@/lib/api-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params
    const { user, tenant } = await validateSession(request, tenantId)
    
    // Tenant-scoped database query
    const data = await supabase
      .from('table_name')
      .select('*')
      .eq('tenant_id', tenantId)
    
    return createResponse({ data }, 200)
  } catch (error) {
    return createResponse({ error: 'Internal server error' }, 500)
  }
}
```

## Security Middleware

### Global Middleware (`middleware.ts`)
Applied to all requests:
- CORS configuration with domain whitelisting
- Rate limiting (IP-based)
- Security headers (CSP, XSS protection)
- Request size limits
- Input sanitization

### Request Validation
```typescript
// UUID validation
if (!isValidUUID(tenantId)) {
  return NextResponse.json({ error: 'Invalid tenant ID' }, { status: 400 })
}

// Input sanitization
const sanitizedInput = sanitizeInput(requestBody)
```

## Multi-Tenant Data Access

### Database Query Pattern
```typescript
// ALWAYS include tenant filtering
const result = await supabase
  .from('table_name')
  .select('*')
  .eq('tenant_id', tenantId) // CRITICAL: Never forget this
  .eq('user_id', userId) // If user-specific
```

### Tenant Access Validation
```typescript
// Validate user has access to tenant
const access = await supabase
  .from('user_tenants')
  .select('*')
  .eq('user_id', user.id)
  .eq('tenant_id', tenantId)
  .single()

if (!access) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 })
}
```

## Error Handling

### Production Error Responses
```typescript
// Generic errors in production
const isProduction = process.env.NODE_ENV === 'production'
const errorMessage = isProduction ? 'Internal server error' : error.message

return NextResponse.json(
  { error: errorMessage },
  { status: 500 }
)
```

### Error Types
- `400` - Bad Request (invalid input, malformed data)
- `401` - Unauthorized (missing/invalid authentication)
- `403` - Forbidden (valid auth, insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error (server-side issues)

## API Development Guidelines

### Creating New Endpoints

1. **Choose the right category**:
   - Internal: Authenticated operations
   - Public: Shared dashboard access
   - Upload: External data ingestion

2. **Implement proper authentication**:
   ```typescript
   const { user, tenant } = await validateSession(request, tenantId)
   ```

3. **Validate tenant access**:
   ```typescript
   // Ensure user can access this tenant
   const hasAccess = await checkTenantAccess(user.id, tenantId)
   ```

4. **Filter all queries by tenant**:
   ```typescript
   .eq('tenant_id', tenantId) // NEVER forget this
   ```

5. **Sanitize inputs**:
   ```typescript
   const clean = sanitizeInput(request.body)
   ```

6. **Return consistent responses**:
   ```typescript
   return createResponse({ data, message }, status)
   ```

### Testing Checklist
- [ ] Authentication works correctly
- [ ] Tenant isolation is enforced
- [ ] Invalid tenant IDs are rejected
- [ ] Users can't access other tenants' data
- [ ] Rate limiting functions properly
- [ ] Error messages are appropriate for production

## File Upload Specifics

### XML Processing Pipeline
1. **Validate file size** (50MB limit)
2. **Authenticate via API key** (tenant-specific)
3. **Parse and sanitize XML** (prevent XXE attacks)
4. **Convert to JSON format**
5. **Store in database** with tenant isolation
6. **Generate charts** based on data structure

### Dashboard Handling
- **Existing Dashboard**: Use `X-Dashboard-Id` header
- **New Dashboard**: Use `X-Dashboard-Title` header
- **Dataset Replacement**: Same data type replaces existing data

## Rate Limiting

### Implementation
- **Internal APIs**: 50 requests/minute per IP
- **Public APIs**: 20 requests/minute per IP  
- **Upload API**: 100 requests/minute per IP (dedicated rate limiter)
- **File Size Limits**: 50MB max for upload-xml, 10MB for others

### Dedicated Upload Rate Limiter
The upload-xml endpoint has its own rate limiting implementation to accommodate higher throughput requirements:

```typescript
function checkUploadXmlRateLimit(ip: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const key = `upload_xml_${ip}`
  const record = publicRateLimitMap.get(key)
  
  if (!record || now > record.resetTime) {
    publicRateLimitMap.set(key, { count: 1, resetTime: now + windowMs })
    return true
  }
  
  if (record.count >= limit) {
    return false
  }
  
  record.count++
  return true
}
```

**Key Features:**
- Separate rate limit tracking for upload endpoints
- 100 requests per minute (5x more than public APIs)
- IP-based tracking with sliding window
- Dedicated memory map for upload rate limiting

### Headers Returned
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1640995200
```

## Working with APIs

### Common Patterns
- All endpoints return JSON responses
- Consistent error message format
- Tenant validation on every request
- Input sanitization and validation
- Proper HTTP status codes

### Database Patterns
- Row-Level Security (RLS) policies
- Tenant-scoped queries with `.eq('tenant_id', tenantId)`
- Foreign key relationships maintain data integrity
- Cascade deletes for tenant data cleanup

This API architecture ensures complete tenant isolation while providing flexible access patterns for different use cases.