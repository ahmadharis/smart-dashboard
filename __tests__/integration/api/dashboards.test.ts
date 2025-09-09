/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

// Mock the auth middleware first
const mockValidateAuthAndTenant = jest.fn().mockResolvedValue({
  isValid: true,
  tenantId: 'test-tenant',
  userId: 'test-user-id',
})

jest.mock('@/lib/auth-middleware', () => ({
  validateAuthAndTenant: mockValidateAuthAndTenant,
}))

// Mock the Supabase client
const mockSupabaseClient = {
  from: jest.fn(),
}

jest.mock('@/lib/supabase', () => ({
  createServiceClient: jest.fn(() => mockSupabaseClient),
}))

// Import the route handlers after mocks are set up
const { GET, POST } = require('@/app/api/internal/dashboards/route')

describe('/api/internal/dashboards', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/internal/dashboards', () => {
    it('returns dashboards for authenticated tenant', async () => {
      const mockDashboards = [
        {
          id: 1,
          name: 'Dashboard 1',
          description: 'First dashboard',
          tenant_id: 'test-tenant',
          sort_order: 1,
        },
        {
          id: 2,
          name: 'Dashboard 2',
          description: 'Second dashboard',
          tenant_id: 'test-tenant',
          sort_order: 2,
        },
      ]

      // Mock the Supabase chain to return dashboards
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockDashboards,
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(mockDashboards)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('dashboards')
    })

    it('returns empty array when no dashboards exist', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual([])
    })

    it('returns 500 when database error occurs', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed' },
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
      expect(data.details).toBe('Database connection failed')
    })

    it('returns 401 when authentication fails', async () => {
      mockValidateAuthAndTenant.mockResolvedValueOnce({
        isValid: false,
        error: 'Authentication required',
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Authentication required')
    })
  })

  describe('POST /api/internal/dashboards', () => {
    it('creates a new dashboard successfully', async () => {
      const newDashboard = {
        name: 'New Dashboard',
        description: 'A new test dashboard',
      }

      const createdDashboard = {
        id: 3,
        ...newDashboard,
        tenant_id: 'test-tenant',
        sort_order: 1,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      }

      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: createdDashboard,
          error: null,
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards', {
        method: 'POST',
        body: JSON.stringify(newDashboard),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual(createdDashboard)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('dashboards')
    })

    it('validates tenant ID matches authenticated user', async () => {
      const dashboardWithDifferentTenant = {
        name: 'Dashboard',
        description: 'Test',
        tenantId: 'different-tenant',
      }

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards', {
        method: 'POST',
        body: JSON.stringify(dashboardWithDifferentTenant),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toBe('Tenant ID mismatch')
    })

    it('returns 500 when database insertion fails', async () => {
      mockSupabaseClient.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Insertion failed' },
        }),
      })

      const request = new NextRequest('http://localhost:3000/api/internal/dashboards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test Dashboard' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database error')
      expect(data.details).toBe('Insertion failed')
    })

    it('handles malformed JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/internal/dashboards', {
        method: 'POST',
        body: 'invalid json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Internal server error')
    })
  })
})