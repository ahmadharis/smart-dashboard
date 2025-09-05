# Components Directory - React Component Architecture

## Overview

This directory contains React components for the multi-tenant dashboard application. All components follow modern React patterns with functional components, hooks, and TypeScript interfaces.

## Component Categories

### Core Dashboard Components
- `dashboard-client.tsx` - Main dashboard interface and state management
- `data-chart.tsx` - Chart rendering with Recharts integration
- `file-management-client.tsx` - File upload and data management
- `dashboard-switcher.tsx` - Dashboard selection and navigation

### Authentication & Security
- `auth-provider.tsx` - Authentication context and session management
- `protected-route.tsx` - Route protection wrapper component
- `access-denied.tsx` - Access denial interface
- `login-form.tsx` - User login interface

### TV Mode & Presentation
- `tv-mode-client.tsx` - Authenticated TV mode with controls
- `public-tv-mode-client.tsx` - Public TV mode for shared dashboards
- `tv-mode-settings.tsx` - TV mode configuration panel

### Sharing & Public Access
- `share-dialog.tsx` - Public dashboard sharing interface
- `tenant-selector.tsx` - Multi-tenant selection component

### Navigation & Layout
- `navigation.tsx` - Main application navigation
- `user-nav.tsx` - User menu and profile options
- `chart-type-selector.tsx` - Chart type selection interface

### UI Foundation
- `theme-provider.tsx` - Theme context (light/dark mode)
- `ui/` - shadcn/ui component library

## Multi-Tenant Component Patterns

### Tenant Context Validation
Every component that displays tenant data MUST validate tenant access:

```typescript
interface ComponentProps {
  tenantId: string
  // other props
}

const Component = ({ tenantId }: ComponentProps) => {
  const { user, tenantAccess } = useAuth()
  
  // Always validate tenant access
  const hasAccess = tenantAccess?.some(t => t.tenant_id === tenantId)
  if (!hasAccess) return <AccessDenied />
  
  // Component logic...
}
```

### Tenant-Scoped Data Fetching
```typescript
const useTenantData = (tenantId: string) => {
  const { user } = useAuth()
  
  return useSWR(
    user ? `/api/internal/data?tenantId=${tenantId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      // Include tenant in cache key
      dedupingInterval: 60000
    }
  )
}
```

## Core Components Deep Dive

### DashboardClient
**Purpose**: Main dashboard interface with drag-drop, editing, and real-time updates

**Key Features**:
- Tenant-scoped dashboard management
- Drag-and-drop reordering
- Real-time data updates with polling
- Chart type selection and configuration
- Public sharing integration

**Props Interface**:
```typescript
interface DashboardClientProps {
  tenantId: string
  initialDashboards: Dashboard[]
  selectedDashboardId?: string
}
```

### DataChart
**Purpose**: Universal chart component using Recharts

**Supported Chart Types**:
- Line Charts (time series data)
- Bar Charts (categorical data)
- Area Charts (cumulative data)
- Pie Charts (proportional data)

**Key Features**:
- Automatic chart type detection based on data structure
- Responsive design with container queries
- Custom color schemes and themes
- Export functionality

### FileManagementClient
**Purpose**: Complete file upload and data management interface

**Key Features**:
- XML file validation and parsing
- Drag-and-drop upload interface
- Progress tracking and error handling
- Dataset replacement logic
- Bulk operations (delete, reorder)
- File size validation (10MB limit)

### TVModeClient / PublicTVModeClient
**Purpose**: Full-screen presentation modes

**Features**:
- Auto-advancing slideshows
- Configurable refresh intervals
- Full-screen optimization
- Touch/keyboard navigation
- Public vs authenticated access patterns

## Authentication Components

### AuthProvider
**Purpose**: Global authentication state management

**Context Provided**:
```typescript
interface AuthContextType {
  user: User | null
  tenantAccess: TenantAccess[] | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}
```

### ProtectedRoute
**Purpose**: Route-level authentication and tenant access control

**Usage Pattern**:
```tsx
<ProtectedRoute>
  <TenantScopedComponent tenantId={tenantId} />
</ProtectedRoute>
```

**Validation Logic**:
1. Check user authentication
2. Validate tenant access permissions
3. Redirect to login if unauthenticated
4. Show access denied if no tenant access

## State Management Patterns

### Local Component State
Use `useState` for component-specific state:
```typescript
const [selectedChart, setSelectedChart] = useState<string | null>(null)
const [loading, setLoading] = useState(false)
```

### Global State (Context)
Use React Context for:
- Authentication state (`AuthProvider`)
- Theme preferences (`ThemeProvider`)
- Tenant access information

### Server State (SWR)
Use SWR for data fetching:
```typescript
const { data, error, mutate } = useSWR(
  `/api/internal/dashboards?tenantId=${tenantId}`,
  fetcher,
  {
    revalidateOnFocus: false,
    refreshInterval: 30000 // 30 second polling
  }
)
```

## UI Component Patterns

### shadcn/ui Integration
All UI components use the shadcn/ui library with Radix UI primitives:

**Common Components**:
- `Button`, `Input`, `Select` - Form elements
- `Dialog`, `Popover`, `Tooltip` - Overlays
- `Card`, `Tabs`, `Accordion` - Layout
- `Alert`, `Badge`, `Separator` - Feedback

### Theme Integration
Components automatically support light/dark themes:
```typescript
import { useTheme } from 'next-themes'

const Component = () => {
  const { theme } = useTheme()
  
  return (
    <div className="bg-background text-foreground">
      {/* Content adapts to theme automatically */}
    </div>
  )
}
```

## Performance Optimizations

### Memoization
Strategic use of `React.memo` and `useMemo`:
```typescript
const ExpensiveComponent = React.memo(({ data }: Props) => {
  const processedData = useMemo(() => 
    expensiveDataProcessing(data), [data]
  )
  
  return <div>{/* Rendered content */}</div>
})
```

### Lazy Loading
Dynamic imports for heavy components:
```typescript
const ChartComponent = lazy(() => import('./data-chart'))

// Usage
<Suspense fallback={<ChartSkeleton />}>
  <ChartComponent data={chartData} />
</Suspense>
```

## Data Visualization Components

### Chart Configuration
```typescript
interface ChartConfig {
  type: 'line' | 'bar' | 'area' | 'pie'
  xAxisKey: string
  yAxisKey: string
  title?: string
  color?: string
}
```

### Responsive Charts
All charts implement responsive behavior:
```typescript
const ResponsiveChart = ({ data }: ChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  
  useEffect(() => {
    // Resize observer logic
  }, [])
  
  return (
    <div ref={containerRef}>
      <ResponsiveContainer width="100%" height={dimensions.height}>
        {/* Chart component */}
      </ResponsiveContainer>
    </div>
  )
}
```

## Component Development Guidelines

### Creating New Components

1. **Use TypeScript interfaces** for all props:
   ```typescript
   interface ComponentProps {
     tenantId: string
     required: string
     optional?: number
   }
   ```

2. **Implement tenant validation** for data components:
   ```typescript
   const { tenantAccess } = useAuth()
   const hasAccess = tenantAccess?.some(t => t.tenant_id === tenantId)
   ```

3. **Follow naming conventions**:
   - PascalCase for component names
   - kebab-case for file names
   - Descriptive, action-based names

4. **Include proper error boundaries**:
   ```typescript
   if (error) return <ErrorFallback error={error} />
   if (loading) return <LoadingSkeleton />
   ```

### Testing Considerations
- Test with multiple tenant contexts
- Verify authentication state changes
- Test public vs authenticated access
- Validate responsive behavior
- Check theme switching

### Performance Guidelines
- Use `React.memo` for expensive components
- Implement proper dependency arrays in hooks
- Lazy load heavy components
- Optimize re-renders with proper state structure

## Security Considerations

### Data Sanitization
Always sanitize data before rendering:
```typescript
import { sanitizeHtml } from '@/lib/security'

const SafeComponent = ({ userInput }: Props) => {
  const safeHtml = sanitizeHtml(userInput)
  return <div dangerouslySetInnerHTML={{ __html: safeHtml }} />
}
```

### Tenant Isolation
Components MUST NOT display data from other tenants:
```typescript
// Always filter by current tenant
const filteredData = data.filter(item => item.tenant_id === tenantId)
```

This component architecture ensures scalable, secure, and maintainable React components that properly handle the multi-tenant nature of the Smart Dashboard application.