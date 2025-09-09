/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/internal/settings/route'
import { validateAuthAndTenant } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/auth-middleware')
jest.mock('@/lib/supabase')

const mockValidateAuthAndTenant = validateAuthAndTenant as jest.MockedFunction<typeof validateAuthAndTenant>
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
}

describe('/api/internal/settings', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateServiceClient.mockReturnValue(mockSupabaseClient as any)
  })

  describe('GET', () => {
    describe('Authentication and Authorization', () => {
      it('returns 401 when authentication fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Authentication required',
        })

        const request = new NextRequest('http://localhost/api/internal/settings')
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

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Access denied to this tenant' })
      })

      it('returns 401 when no tenant ID is provided', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          user: { id: 'user-123', email: 'test@example.com' } as any,
          // tenantId is undefined
        })

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
      })
    })

    describe('Successful Requests', () => {
      it('returns settings for valid tenant', async () => {
        const mockSettings = [
          {
            id: 1,
            key: 'theme',
            value: 'dark',
            tenant_id: 'test-tenant-id',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
          {
            id: 2,
            key: 'notifications_enabled',
            value: 'true',
            tenant_id: 'test-tenant-id',
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z',
          },
        ]

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockSettings, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual(mockSettings)

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('settings')
        expect(mockQuery.select).toHaveBeenCalledWith('*')
        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'test-tenant-id')
        expect(mockQuery.order).toHaveBeenCalledWith('key', { ascending: true })
      })

      it('returns empty array when no settings exist', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual([])
      })

      it('orders settings by key alphabetically', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings')
        await GET(request)

        expect(mockQuery.order).toHaveBeenCalledWith('key', { ascending: true })
      })
    })

    describe('Database Errors', () => {
      it('returns 500 when database query fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Connection timeout', code: '57014' } 
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        // Mock console.error to avoid noise in tests
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({ error: 'Database error' })

        expect(consoleSpy).toHaveBeenCalledWith('❌ Database error:', expect.any(Object))
        consoleSpy.mockRestore()
      })
    })

    describe('Internal Errors', () => {
      it('returns 500 when unexpected error occurs', async () => {
        mockValidateAuthAndTenant.mockRejectedValue(new Error('Unexpected error'))

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/settings')
        const response = await GET(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({ error: 'Internal server error' })

        expect(consoleSpy).toHaveBeenCalledWith('Internal settings API error:', expect.any(Error))
        consoleSpy.mockRestore()
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('only returns settings for the authenticated tenant', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'tenant-a',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings')
        await GET(request)

        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'tenant-a')
        expect(mockQuery.eq).not.toHaveBeenCalledWith('tenant_id', 'tenant-b')
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

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'theme', value: 'dark' }),
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

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({ 
            key: 'theme', 
            value: 'dark',
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
      it('creates a new setting successfully', async () => {
        const mockSetting = {
          id: 1,
          key: 'theme',
          value: 'dark',
          tenant_id: 'test-tenant-id',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        }

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSetting, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({
            key: 'theme',
            value: 'dark',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual(mockSetting)

        expect(mockQuery.insert).toHaveBeenCalledWith([{
          key: 'theme',
          value: 'dark',
          tenant_id: 'test-tenant-id',
        }])
        expect(mockQuery.select).toHaveBeenCalled()
        expect(mockQuery.single).toHaveBeenCalled()
      })

      it('creates setting with complex value object', async () => {
        const mockSetting = {
          id: 1,
          key: 'dashboard_config',
          value: { theme: 'dark', auto_refresh: true, refresh_interval: 30 },
          tenant_id: 'test-tenant-id',
        }

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSetting, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({
            key: 'dashboard_config',
            value: { theme: 'dark', auto_refresh: true, refresh_interval: 30 },
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual(mockSetting)
      })

      it('creates setting ignoring body tenant ID when it matches', async () => {
        const mockSetting = {
          id: 1,
          key: 'theme',
          value: 'dark',
          tenant_id: 'test-tenant-id',
        }

        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockSetting, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({
            key: 'theme',
            value: 'dark',
            tenantId: 'test-tenant-id', // Matching tenant ID should be ignored
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockQuery.insert).toHaveBeenCalledWith([{
          key: 'theme',
          value: 'dark',
          tenant_id: 'test-tenant-id',
        }])
      })
    })

    describe('Database Errors', () => {
      it('returns 500 when database insertion fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Unique constraint violation', code: '23505' } 
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({ key: 'theme', value: 'dark' }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({ error: 'Database error' })

        expect(consoleSpy).toHaveBeenCalledWith('❌ Database error:', expect.any(Object))
        consoleSpy.mockRestore()
      })
    })

    describe('Input Validation', () => {
      it('handles malformed JSON gracefully', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: '{ invalid json }',
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        const body = await response.json()
        expect(body).toEqual({ error: 'Internal server error' })

        consoleSpy.mockRestore()
      })

      it('handles empty request body', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: { tenant_id: 'test-tenant-id' }, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({}),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockQuery.insert).toHaveBeenCalledWith([{
          tenant_id: 'test-tenant-id',
        }])
      })

      it('handles various data types in setting values', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const testCases = [
          { key: 'string_setting', value: 'test string' },
          { key: 'number_setting', value: 42 },
          { key: 'boolean_setting', value: true },
          { key: 'array_setting', value: [1, 2, 3] },
          { key: 'null_setting', value: null },
        ]

        for (const testCase of testCases) {
          jest.clearAllMocks()
          mockSupabaseClient.from.mockReturnValue(mockQuery as any)

          const request = new NextRequest('http://localhost/api/internal/settings', {
            method: 'POST',
            body: JSON.stringify(testCase),
            headers: { 'Content-Type': 'application/json' },
          })
          const response = await POST(request)

          expect(response.status).toBe(200)
          expect(mockQuery.insert).toHaveBeenCalledWith([{
            ...testCase,
            tenant_id: 'test-tenant-id',
          }])
        }
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('always uses authenticated tenant ID for setting creation', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'authenticated-tenant',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const mockQuery = {
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({ 
            key: 'theme', 
            value: 'dark',
            // No tenant ID provided in body
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        await POST(request)

        expect(mockQuery.insert).toHaveBeenCalledWith([{
          key: 'theme',
          value: 'dark',
          tenant_id: 'authenticated-tenant',
        }])
      })

      it('prevents cross-tenant setting creation', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'tenant-a',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        const request = new NextRequest('http://localhost/api/internal/settings', {
          method: 'POST',
          body: JSON.stringify({ 
            key: 'theme', 
            value: 'dark',
            tenantId: 'tenant-b' // Attempting to create for different tenant
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        const response = await POST(request)

        expect(response.status).toBe(403)
        const body = await response.json()
        expect(body).toEqual({ error: 'Tenant ID mismatch' })
      })
    })
  })
})