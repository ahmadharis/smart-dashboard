# Lib Directory - Utilities & Business Logic

## Overview

This directory contains core utilities, business logic, and TypeScript patterns that power the Smart Dashboard. All utilities are designed with multi-tenant architecture and security-first principles.

## Core Utility Files

### Authentication & Security
- `auth-middleware.ts` - Authentication validation and middleware
- `security.ts` - Input validation, sanitization, and security utilities
- `public-auth.ts` - Public dashboard token authentication

### Data Processing
- `data-utils.ts` - Data transformation and chart processing utilities
- `xml-parser.ts` - Secure XML parsing and JSON conversion
- `validation.ts` - Input validation schemas and functions

### Database & API
- `supabase.ts` - Supabase client configuration
- `api-client.ts` - API client utilities and request handling
- `supabase/` - Multiple Supabase client configurations

### Utilities
- `utils.ts` - General utility functions (cn, etc.)
- `time-utils.ts` - Date/time formatting and parsing
- `share-utils.ts` - Dashboard sharing utilities

## Authentication System

### auth-middleware.ts
**Purpose**: Comprehensive authentication validation for all API routes

**Key Functions**:
```typescript
// Session validation with tenant access check
async function validateSession(
  request: NextRequest, 
  tenantId?: string
): Promise<{ user: User; tenant: Tenant }>

// API key validation for upload endpoints
async function validateTenantApiKey(
  apiKey: string
): Promise<Tenant | null>

// Rate limiting implementation
async function checkRateLimit(
  identifier: string, 
  limit: number
): Promise<boolean>
```

**Multi-Tenant Validation**:
- Validates JWT tokens from Supabase
- Checks user-tenant relationship via `user_tenants` table
- Enforces tenant-scoped access to all resources
- Implements timing-safe string comparison

### security.ts
**Purpose**: Input validation and security hardening

**Key Features**:
```typescript
// UUID validation with strict regex
export function isValidUUID(uuid: string): boolean

// Input sanitization for XSS prevention
export function sanitizeInput(input: unknown): string

// XML security - prevent XXE attacks
export function sanitizeXML(xmlContent: string): string

// Rate limiting with sliding window
export function createRateLimiter(
  windowMs: number, 
  maxRequests: number
)
```

**Security Measures**:
- Strict UUID validation patterns
- HTML entity encoding for XSS prevention
- XML external entity (XXE) attack prevention
- Request size limits and validation
- Content-Type validation

## Data Processing Pipeline

### xml-parser.ts
**Purpose**: Secure XML parsing with JSON conversion

**Processing Flow**:
1. **XML Validation**: Structure and syntax validation
2. **Security Sanitization**: Remove external entities and dangerous elements
3. **Parsing**: Convert XML to structured JSON
4. **Field Order Preservation**: Maintain original field order for consistency
5. **Type Inference**: Detect data types for chart generation

**Key Functions**:
```typescript
// Main parsing function
export async function parseXMLToJSON(
  xmlContent: string
): Promise<{
  success: boolean
  data?: any[]
  error?: string
  recordCount?: number
}>

// Data type detection for charts
function inferDataTypes(data: any[]): {
  dateFields: string[]
  numericFields: string[]
  textFields: string[]
}
```

### data-utils.ts
**Purpose**: Universal data transformation and chart utilities

**Key Capabilities**:
- **Multi-format Support**: JSON, XML, CSV data processing
- **Chart Data Preparation**: Transform data for Recharts components
- **Date Normalization**: Handle multiple date formats consistently
- **Data Type Detection**: Automatic field type inference
- **Performance Optimization**: Efficient large dataset processing

**Core Functions**:
```typescript
// Universal data transformer
export function transformDataForCharts(
  rawData: any[], 
  config: ChartConfig
): ChartData[]

// Date normalization across formats
export function normalizeDate(dateValue: any): Date | null

// Automatic chart type suggestion
export function suggestChartType(data: any[]): ChartType
```

## Database Integration

### Supabase Client Architecture

**Multiple Client Types**:
```typescript
// Browser client (client-side operations)
createBrowserClient()

// Server client (API routes)
createServerClient() 

// Service client (admin operations)
createServiceClient()

// Middleware client (authentication)
createMiddlewareClient()
```

**Client Selection Pattern**:
```typescript
// Use appropriate client based on context
const supabase = typeof window === 'undefined' 
  ? createServerClient() 
  : createBrowserClient()
```

### supabase/ Directory Structure
- `browser.ts` - Client-side Supabase configuration
- `server.ts` - Server-side configuration with cookie handling
- `service.ts` - Service role client for admin operations
- `middleware.ts` - Middleware-specific client setup

## Validation System

### validation.ts
**Purpose**: Type-safe input validation with Zod schemas

**Schema Definitions**:
```typescript
// Tenant validation
export const tenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  domain: z.string().email().optional()
})

// Dashboard validation
export const dashboardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  tenant_id: z.string().uuid()
})

// File upload validation
export const fileUploadSchema = z.object({
  dataType: z.string().min(1).max(50),
  dashboardId: z.string().uuid().optional(),
  dashboardTitle: z.string().max(200).optional()
})
```

**Validation Patterns**:
- UUID validation for all ID fields
- String length limits to prevent DoS
- Email format validation
- File size and type restrictions
- XSS prevention through input sanitization

## API Client Utilities

### api-client.ts
**Purpose**: Standardized API communication with error handling

**Key Features**:
```typescript
// Authenticated API client
export class APIClient {
  private baseURL: string
  private tenantId?: string
  
  async get<T>(endpoint: string): Promise<T>
  async post<T>(endpoint: string, data: any): Promise<T>
  async put<T>(endpoint: string, data: any): Promise<T>
  async delete<T>(endpoint: string): Promise<T>
}

// Error handling
interface APIError {
  message: string
  status: number
  code?: string
}
```

**Authentication Integration**:
- Automatic JWT token inclusion
- Tenant context management
- Request/response interceptors
- Standardized error handling

## Time & Formatting Utilities

### time-utils.ts
**Purpose**: Consistent date/time handling across the application

**Functions**:
```typescript
// Format dates for display
export function formatDisplayDate(date: Date): string

// Parse various date formats
export function parseFlexibleDate(dateString: string): Date | null

// Time zone handling
export function formatDateWithTimezone(
  date: Date, 
  timezone: string
): string

// Duration calculations
export function calculateDuration(
  start: Date, 
  end: Date
): { hours: number; minutes: number }
```

## Multi-Tenant Utility Patterns

### Tenant Context Validation
```typescript
// Always validate tenant context
export async function validateTenantAccess(
  userId: string, 
  tenantId: string
): Promise<boolean> {
  const access = await supabase
    .from('user_tenants')
    .select('*')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .single()
    
  return !!access
}
```

### Database Query Helpers
```typescript
// Tenant-scoped query builder
export function createTenantQuery<T>(
  tableName: string, 
  tenantId: string
) {
  return supabase
    .from(tableName)
    .select('*')
    .eq('tenant_id', tenantId) // NEVER forget this
}
```

## TypeScript Patterns

### Type Definitions
```typescript
// Branded types for UUID validation
type UUID = string & { __brand: 'UUID' }

// Discriminated unions for API responses
type APIResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: string }

// Tenant-scoped types
interface TenantScopedEntity {
  id: UUID
  tenant_id: UUID
  created_at: string
  updated_at: string
}
```

### Error Handling Patterns
```typescript
// Result type for operations
export type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E }

// Safe async operations
export async function safeAsync<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const value = await operation()
    return { ok: true, value }
  } catch (error) {
    return { ok: false, error: error as Error }
  }
}
```

## Development Guidelines

### Using Utilities

1. **Always validate tenant context** before operations:
   ```typescript
   const hasAccess = await validateTenantAccess(userId, tenantId)
   if (!hasAccess) throw new Error('Access denied')
   ```

2. **Use type-safe validation**:
   ```typescript
   const validatedData = dashboardSchema.parse(inputData)
   ```

3. **Handle errors consistently**:
   ```typescript
   const result = await safeAsync(() => riskyOperation())
   if (!result.ok) {
     // Handle error
   }
   ```

4. **Sanitize all inputs**:
   ```typescript
   const cleanInput = sanitizeInput(userInput)
   ```

### Security Best Practices
- Never trust user input - always validate and sanitize
- Use timing-safe comparisons for sensitive operations
- Implement proper rate limiting on all endpoints
- Log security-relevant events for monitoring
- Use branded types to prevent UUID mixups

### Performance Considerations
- Cache expensive operations where possible
- Use streaming for large data processing
- Implement proper pagination for large datasets
- Use connection pooling for database operations
- Monitor and optimize database queries

This utilities library provides the foundation for secure, scalable, and maintainable multi-tenant operations throughout the Smart Dashboard application.