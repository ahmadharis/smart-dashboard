/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/internal/data-files/route'
import { validateAuthAndTenant } from '@/lib/auth-middleware'
import { createServiceClient } from '@/lib/supabase'
import { parseXMLToJSON } from '@/lib/xml-parser'
import { saveDataFile } from '@/lib/data-utils'
import { validateDashboardId, sanitizeInput, validateDataType, createSecureErrorResponse } from '@/lib/validation'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/auth-middleware')
jest.mock('@/lib/supabase')
jest.mock('@/lib/xml-parser')
jest.mock('@/lib/data-utils')
jest.mock('@/lib/validation')

const mockValidateAuthAndTenant = validateAuthAndTenant as jest.MockedFunction<typeof validateAuthAndTenant>
const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>
const mockParseXMLToJSON = parseXMLToJSON as jest.MockedFunction<typeof parseXMLToJSON>
const mockSaveDataFile = saveDataFile as jest.MockedFunction<typeof saveDataFile>
const mockValidateDashboardId = validateDashboardId as jest.MockedFunction<typeof validateDashboardId>
const mockSanitizeInput = sanitizeInput as jest.MockedFunction<typeof sanitizeInput>
const mockValidateDataType = validateDataType as jest.MockedFunction<typeof validateDataType>
const mockCreateSecureErrorResponse = createSecureErrorResponse as jest.MockedFunction<typeof createSecureErrorResponse>

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn(),
  })),
}

describe('/api/internal/data-files', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateServiceClient.mockReturnValue(mockSupabaseClient as any)
    
    // Setup default mocks for validation functions
    mockValidateDashboardId.mockReturnValue(true)
    mockValidateDataType.mockReturnValue(true)
    mockSanitizeInput.mockImplementation((input: string) => input)
    mockCreateSecureErrorResponse.mockImplementation((message: string, status: number) => {
      return new Response(JSON.stringify({ error: message }), { status }) as any
    })
  })

  describe('GET', () => {
    describe('Authentication and Authorization', () => {
      it('returns 401 when authentication fails', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: false,
          error: 'Authentication required',
        })

        const request = new NextRequest('http://localhost/api/internal/data-files')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
      })

      it('returns 401 when tenant ID is missing', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          user: { id: 'user-123', email: 'test@example.com' } as any,
          // tenantId is undefined
        })

        const request = new NextRequest('http://localhost/api/internal/data-files')
        const response = await GET(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
      })
    })

    describe('Query Parameter Validation', () => {
      it('validates dashboard ID when provided', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockValidateDashboardId.mockReturnValue(false) // Invalid dashboard ID
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Invalid dashboard ID' }), { status: 400 }) as any
        )

        const request = new NextRequest('http://localhost/api/internal/data-files?dashboardId=invalid-id')
        const response = await GET(request)

        expect(response.status).toBe(400)
        expect(mockValidateDashboardId).toHaveBeenCalledWith('invalid-id')
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Invalid dashboard ID', 400)
      })

      it('accepts valid dashboard ID', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockValidateDashboardId.mockReturnValue(true) // Valid dashboard ID

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const validDashboardId = '550e8400-e29b-41d4-a716-446655440000'
        const request = new NextRequest(`http://localhost/api/internal/data-files?dashboardId=${validDashboardId}`)
        const response = await GET(request)

        expect(response.status).toBe(200)
        expect(mockValidateDashboardId).toHaveBeenCalledWith(validDashboardId)
        expect(mockQuery.eq).toHaveBeenCalledWith('dashboard_id', validDashboardId)
      })
    })

    describe('Database Queries', () => {
      it('queries all data files for tenant when no dashboard ID provided', async () => {
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

        const request = new NextRequest('http://localhost/api/internal/data-files')
        await GET(request)

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('data_files')
        expect(mockQuery.select).toHaveBeenCalledWith('*')
        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'test-tenant-id')
        expect(mockQuery.order).toHaveBeenCalledWith('sort_order', { ascending: true })
        expect(mockQuery.eq).not.toHaveBeenCalledWith('dashboard_id', expect.any(String))
      })

      it('queries data files for specific dashboard when dashboard ID provided', async () => {
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

        const dashboardId = '550e8400-e29b-41d4-a716-446655440000'
        const request = new NextRequest(`http://localhost/api/internal/data-files?dashboardId=${dashboardId}`)
        await GET(request)

        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'test-tenant-id')
        expect(mockQuery.eq).toHaveBeenCalledWith('dashboard_id', dashboardId)
      })

      it('maps database results to expected response format', async () => {
        const mockDatabaseResult = [
          {
            id: 1,
            filename: 'test-data.xml',
            data_type: 'sales',
            json_data: [{ name: 'Product A', value: 100 }],
            updated_at: '2024-01-01T00:00:00.000Z',
            chart_type: 'bar',
            sort_order: 1,
            dashboard_id: 'dashboard-123',
            field_order: ['name', 'value'],
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
          order: jest.fn().mockResolvedValue({ data: mockDatabaseResult, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const request = new NextRequest('http://localhost/api/internal/data-files')
        const response = await GET(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual([
          {
            id: 1,
            name: 'test-data.xml',
            type: 'sales',
            data: [{ name: 'Product A', value: 100 }],
            updated_at: '2024-01-01T00:00:00.000Z',
            chart_type: 'bar',
            sort_order: 1,
            dashboard_id: 'dashboard-123',
            field_order: ['name', 'value'],
          },
        ])
      })
    })

    describe('Error Handling', () => {
      it('handles database errors gracefully', async () => {
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
            error: { message: 'Database connection failed', code: '08006' } 
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Database error' }), { status: 500 }) as any
        )

        const request = new NextRequest('http://localhost/api/internal/data-files')
        const response = await GET(request)

        expect(response.status).toBe(500)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Database error', 500, expect.any(Object))
      })

      it('handles unexpected errors', async () => {
        mockValidateAuthAndTenant.mockRejectedValue(new Error('Unexpected error'))

        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }) as any
        )

        const request = new NextRequest('http://localhost/api/internal/data-files')
        const response = await GET(request)

        expect(response.status).toBe(500)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Internal server error', 500, expect.any(Error))
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

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(401)
        const body = await response.json()
        expect(body).toEqual({ error: 'Authentication required' })
      })

      it('returns 403 when tenant ID in form data mismatches authenticated tenant', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'tenant-a',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Tenant ID mismatch' }), { status: 403 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')
        formData.append('tenantId', 'tenant-b')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(403)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Tenant ID mismatch', 403)
      })
    })

    describe('Input Validation', () => {
      beforeEach(() => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })
      })

      it('validates required XML content', async () => {
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'XML content is required' }), { status: 400 }) as any
        )

        const formData = new FormData()
        formData.append('data_type', 'test')
        // Missing XML content

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('XML content is required', 400)
      })

      it('validates XML content size limit', async () => {
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'XML content too large' }), { status: 413 }) as any
        )

        const largeXmlContent = 'x'.repeat(11 * 1024 * 1024) // 11MB, exceeds 10MB limit

        const formData = new FormData()
        formData.append('xml', largeXmlContent)
        formData.append('data_type', 'test')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(413)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('XML content too large', 413)
      })

      it('validates required data type', async () => {
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Invalid data type' }), { status: 400 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        // Missing data_type

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Invalid data type', 400)
      })

      it('validates data type format', async () => {
        mockValidateDataType.mockReturnValue(false) // Invalid data type
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Invalid data type' }), { status: 400 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'invalid<>data_type')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        expect(mockValidateDataType).toHaveBeenCalledWith('invalid<>data_type')
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Invalid data type', 400)
      })

      it('validates dashboard ID when provided and not "new"', async () => {
        mockValidateDashboardId.mockReturnValue(false)
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Invalid dashboard ID' }), { status: 400 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')
        formData.append('dashboard_id', 'invalid-dashboard-id')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(400)
        expect(mockValidateDashboardId).toHaveBeenCalledWith('invalid-dashboard-id')
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Invalid dashboard ID', 400)
      })

      it('allows "new" as dashboard ID without validation', async () => {
        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard-id' })

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')
        formData.append('dashboard_id', 'new')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockValidateDashboardId).not.toHaveBeenCalledWith('new')
      })
    })

    describe('XML Processing', () => {
      beforeEach(() => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })
      })

      it('parses XML and saves data file successfully', async () => {
        const mockParsedData = [{ product: 'A', value: 100 }]
        const mockFieldOrder = ['product', 'value']
        
        mockParseXMLToJSON.mockReturnValue({
          data: mockParsedData,
          fieldOrder: mockFieldOrder,
          message: 'Parsed 1 records successfully',
        })

        const mockSavedResult = {
          dashboard_id: 'dashboard-123',
          id: 1,
        }
        mockSaveDataFile.mockResolvedValue(mockSavedResult)

        const formData = new FormData()
        formData.append('xml', '<products><product><name>A</name><value>100</value></product></products>')
        formData.append('data_type', 'products')
        formData.append('dashboard_id', 'dashboard-123')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual({
          success: true,
          message: 'Parsed 1 records successfully',
          recordCount: 1,
          fileName: 'products.json',
          dashboard_id: 'dashboard-123',
        })

        expect(mockParseXMLToJSON).toHaveBeenCalledWith(
          '<products><product><name>A</name><value>100</value></product></products>',
          'products'
        )
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          'products.json',
          'products',
          mockParsedData,
          'test-tenant-id',
          'dashboard-123',
          undefined,
          mockFieldOrder
        )
      })

      it('handles dashboard title sanitization', async () => {
        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard-id' })
        mockSanitizeInput.mockReturnValue('Clean Dashboard Title')

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')
        formData.append('dashboard_id', 'new')
        formData.append('dashboard_title', 'Dashboard Title<script>')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        await POST(request)

        expect(mockSanitizeInput).toHaveBeenCalledWith('Dashboard Title<script>', 100)
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          'test.json',
          'test',
          expect.any(Array),
          'test-tenant-id',
          undefined, // dashboard_id is undefined for "new"
          'Clean Dashboard Title',
          expect.any(Array)
        )
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'test-tenant-id',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })
      })

      it('handles XML parsing errors', async () => {
        mockParseXMLToJSON.mockImplementation(() => {
          throw new Error('Invalid XML format')
        })
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Invalid XML format' }), { status: 500 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<invalid-xml>')
        formData.append('data_type', 'test')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Invalid XML format', 500, expect.any(Error))
      })

      it('handles data file save failures', async () => {
        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue(null) // Save failed

        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Failed to save data file' }), { status: 500 }) as any
        )

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        const response = await POST(request)

        expect(response.status).toBe(500)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith('Failed to save data file', 500)
      })

      it('handles form data parsing errors', async () => {
        mockCreateSecureErrorResponse.mockReturnValue(
          new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 }) as any
        )

        // Create a request with invalid form data
        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: 'invalid-form-data',
          headers: { 'Content-Type': 'multipart/form-data' },
        })

        const response = await POST(request)

        expect(response.status).toBe(500)
        expect(mockCreateSecureErrorResponse).toHaveBeenCalledWith(expect.any(String), 500, expect.any(Error))
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('only saves data files to authenticated tenant', async () => {
        mockValidateAuthAndTenant.mockResolvedValue({
          isValid: true,
          tenantId: 'isolated-tenant',
          user: { id: 'user-123', email: 'test@example.com' } as any,
        })

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'dashboard-123' })

        const formData = new FormData()
        formData.append('xml', '<data><item>Test</item></data>')
        formData.append('data_type', 'test')

        const request = new NextRequest('http://localhost/api/internal/data-files', {
          method: 'POST',
          body: formData,
        })
        await POST(request)

        expect(mockSaveDataFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array),
          'isolated-tenant', // Authenticated tenant ID
          undefined,
          undefined,
          expect.any(Array)
        )
      })
    })
  })
})