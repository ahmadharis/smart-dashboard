import { http, HttpResponse } from 'msw'

// Mock data for dashboards
const mockDashboards = [
  {
    id: 1,
    name: 'Test Dashboard 1',
    description: 'A test dashboard',
    tenant_id: 'test-tenant',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 2,
    name: 'Test Dashboard 2',
    description: 'Another test dashboard',
    tenant_id: 'test-tenant',
    sort_order: 2,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

// Mock data for data files
const mockDataFiles = [
  {
    id: 1,
    name: 'test-data.xml',
    file_path: '/uploads/test-data.xml',
    tenant_id: 'test-tenant',
    sort_order: 1,
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

// Mock data for tenants
const mockTenants = [
  {
    id: 'test-tenant',
    name: 'Test Tenant',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
  },
]

export const handlers = [
  // Dashboards API
  http.get('/api/internal/dashboards', ({ request }) => {
    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId') || 'test-tenant'
    
    const filteredDashboards = mockDashboards.filter(
      dashboard => dashboard.tenant_id === tenantId
    )
    
    return HttpResponse.json(filteredDashboards)
  }),

  http.post('/api/internal/dashboards', async ({ request }) => {
    const body = await request.json() as any
    
    const newDashboard = {
      id: mockDashboards.length + 1,
      ...body,
      tenant_id: body.tenant_id || 'test-tenant',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    mockDashboards.push(newDashboard)
    return HttpResponse.json(newDashboard, { status: 201 })
  }),

  http.get('/api/internal/dashboards/:id', ({ params }) => {
    const { id } = params
    const dashboard = mockDashboards.find(d => d.id === parseInt(id as string))
    
    if (!dashboard) {
      return HttpResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    return HttpResponse.json(dashboard)
  }),

  http.put('/api/internal/dashboards/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as any
    const dashboardIndex = mockDashboards.findIndex(d => d.id === parseInt(id as string))
    
    if (dashboardIndex === -1) {
      return HttpResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    mockDashboards[dashboardIndex] = {
      ...mockDashboards[dashboardIndex],
      ...body,
      updated_at: new Date().toISOString(),
    }
    
    return HttpResponse.json(mockDashboards[dashboardIndex])
  }),

  http.delete('/api/internal/dashboards/:id', ({ params }) => {
    const { id } = params
    const dashboardIndex = mockDashboards.findIndex(d => d.id === parseInt(id as string))
    
    if (dashboardIndex === -1) {
      return HttpResponse.json({ error: 'Dashboard not found' }, { status: 404 })
    }
    
    mockDashboards.splice(dashboardIndex, 1)
    return HttpResponse.json({ success: true })
  }),

  // Data Files API
  http.get('/api/internal/data-files', ({ request }) => {
    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId') || 'test-tenant'
    
    const filteredDataFiles = mockDataFiles.filter(
      file => file.tenant_id === tenantId
    )
    
    return HttpResponse.json(filteredDataFiles)
  }),

  http.post('/api/internal/data-files', async ({ request }) => {
    const body = await request.json() as any
    
    const newDataFile = {
      id: mockDataFiles.length + 1,
      ...body,
      tenant_id: body.tenant_id || 'test-tenant',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    
    mockDataFiles.push(newDataFile)
    return HttpResponse.json(newDataFile, { status: 201 })
  }),

  // Tenants API
  http.get('/api/public/tenants', () => {
    return HttpResponse.json(mockTenants)
  }),

  // Settings API
  http.get('/api/internal/settings', () => {
    return HttpResponse.json({
      theme: 'light',
      notifications: true,
    })
  }),

  http.post('/api/internal/settings/:key', async ({ params, request }) => {
    const { key } = params
    const body = await request.json() as any
    
    return HttpResponse.json({
      key,
      value: body.value,
      updated_at: new Date().toISOString(),
    })
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
    })
  }),

  // Auth callback
  http.get('/auth/callback', () => {
    return HttpResponse.json({ success: true })
  }),

  // Handle unmatched requests
  http.all('*', ({ request }) => {
    console.warn(`Unhandled ${request.method} request to ${request.url}`)
    return HttpResponse.json(
      { error: `No handler found for ${request.method} ${request.url}` },
      { status: 404 }
    )
  }),
]