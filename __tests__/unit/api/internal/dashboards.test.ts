/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/internal/dashboards/route'
import { validateAuthAndTenant } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/auth-middleware')
jest.mock('@/lib/supabase')

const mockValidateAuthAndTenant = validateAuthAndTenant as jest.MockedFunction<typeof validateAuthAndTenant>
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>

// Mock Supabase client methods
const mockFrom = jest.fn()
const mockSelect = jest.fn()
const mockInsert = jest.fn()
const mockEq = jest.fn()
const mockOrder = jest.fn()
const mockSingle = jest.fn()

// Create a chainable query builder mock
const createMockQueryBuilder = () => ({
  select: mockSelect.mockReturnThis(),
  insert: mockInsert.mockReturnThis(),
  eq: mockEq.mockReturnThis(),
  order: mockOrder,
  single: mockSingle,
})

describe('/api/internal/dashboards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Setup fresh mock implementations
    mockFrom.mockReturnValue(createMockQueryBuilder())
    mockCreateServiceClient.mockReturnValue({ from: mockFrom } as any)
  })

  describe('GET', () => {
    describe('Authentication and Authorization', () => {
      it('returns 401 when authentication fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Authentication required',
        })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
        expect(mockValidateAuthAndTenant).toHaveBeenCalledWith(request, true)
      })

      it('returns 401 when tenant validation fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Access denied to this tenant',
        })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Access denied to this tenant' })
      })

      it('returns 401 when no tenant ID is provided', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Tenant ID is required',
        })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Tenant ID is required' })
      })
    })

    describe('Successful Requests', () => {
      it('returns dashboards for valid tenant', async () => {
        const mockDashboards = [
          {
            id: 1,
            name: 'Dashboard 1',
            tenant_id: 'test-tenant-id',
            sort_order: 1,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            name: 'Dashboard 2',
            tenant_id: 'test-tenant-id',
            sort_order: 2,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockOrder.mockResolvedValue({ data: mockDashboards, error: null })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual(mockDashboards)

        expect(mockFrom).toHaveBeenCalledWith('dashboards')
        expect(mockSelect).toHaveBeenCalledWith('*')
        expect(mockEq).toHaveBeenCalledWith('tenant_id', 'test-tenant-id')
        expect(mockOrder).toHaveBeenCalledWith('sort_order', { ascending: true })
      })

      it('returns empty array when no dashboards exist', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockOrder.mockResolvedValue({ data: null, error: null })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual([])
      })
    })

    describe('Database Errors', () => {
      it('returns 500 when database query fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockOrder.mockResolvedValue({ 
          data: null, 
          error: { message: 'Connection timeout', code: '57014' } 
        })

        // Mock console.error to avoid noise in tests
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        const response = await GET(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({ 
          error: 'Database error', 
          details: 'Connection timeout'
        })

        expect(consoleSpy).toHaveBeenCalledWith('❌ Database error:', expect.any(Object))
        consoleSpy.mockRestore()
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('only returns dashboards for the authenticated tenant', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'tenant-a',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockOrder.mockResolvedValue({ data: [], error: null })

        const request = new NextRequest('http://localhost/api/internal/dashboards')
        await GET(request)

        expect(mockEq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
        expect(mockEq).not.toHaveBeenCalledWith('tenant_id', 'tenant-b')
      })
    })
  })

  describe('POST', () => {
    describe('Authentication and Authorization', () => {
      it('returns 401 when authentication fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Authentication required',
        })

        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Dashboard' }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
      })

      it('returns 403 when tenant ID in body mismatches authenticated tenant', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'tenant-a',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          body: JSON.stringify({ 
            name: 'Test Dashboard',
            tenantId: 'tenant-b' // Different tenant ID
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body).toEqual({ error: 'Tenant ID mismatch' })
      })
    })

    describe('Successful Requests', () => {
      it('creates a new dashboard successfully', async () => {
        const mockDashboard = {
          id: 1,
          name: 'Test Dashboard',
          description: 'Test description',
          tenant_id: 'test-tenant-id',
          sort_order: 1,
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockSingle.mockResolvedValue({ data: mockDashboard, error: null })

        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Dashboard',
            description: 'Test description',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual(mockDashboard)

        expect(mockInsert).toHaveBeenCalledWith([{
          name: 'Test Dashboard',
          description: 'Test description',
          tenant_id: 'test-tenant-id',
        }])
        expect(mockSelect).toHaveBeenCalled()
        expect(mockSingle).toHaveBeenCalled()
      })
    })

    describe('Database Errors', () => {
      it('returns 500 when database insertion fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockSingle.mockResolvedValue({ 
          data: null, 
          error: { message: 'Unique constraint violation', code: '23505' } 
        })

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test Dashboard' }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({
          error: 'Database error',
          details: 'Unique constraint violation',
        })

        expect(consoleSpy).toHaveBeenCalledWith('❌ Database error:', expect.any(Object))
        consoleSpy.mockRestore()
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('always uses authenticated tenant ID for dashboard creation', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'authenticated-tenant',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockSingle.mockResolvedValue({ data: {}, error: null })

        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          body: JSON.stringify({ 
            name: 'Test Dashboard',
            // No tenant ID provided in body
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        await POST(request)

        expect(mockInsert).toHaveBeenCalledWith([{
          name: 'Test Dashboard',
          tenant_id: 'authenticated-tenant',
        }])
      })
    })
  })
})