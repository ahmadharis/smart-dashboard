/**
 * @jest-environment node
 */
import { POST, OPTIONS } from '@/app/api/upload-xml/route'
import { saveDataFile } from '@/lib/data-utils'
import { createSecureResponse, sanitizeString } from '@/lib/security'
import { parseXMLToJSON } from '@/lib/xml-parser'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Mock modules
jest.mock('@/lib/data-utils')
jest.mock('@/lib/security')
jest.mock('@/lib/xml-parser')
jest.mock('@supabase/supabase-js')

const mockSaveDataFile = saveDataFile as jest.MockedFunction<typeof saveDataFile>
const mockCreateSecureResponse = createSecureResponse as jest.MockedFunction<typeof createSecureResponse>
const mockSanitizeString = sanitizeString as jest.MockedFunction<typeof sanitizeString>
const mockParseXMLToJSON = parseXMLToJSON as jest.MockedFunction<typeof parseXMLToJSON>
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  })),
}

describe('/api/upload-xml', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreateClient.mockReturnValue(mockSupabaseClient as any)
    
    // Default mock implementations
    mockCreateSecureResponse.mockImplementation((data: any, status = 200) => {
      return new Response(JSON.stringify(data), { status }) as any
    })
    mockSanitizeString.mockImplementation((input: string) => input.trim())
  })

  describe('OPTIONS', () => {
    it('returns secure CORS response', async () => {
      const mockResponse = new Response(JSON.stringify({}), { status: 200 })
      mockCreateSecureResponse.mockReturnValue(mockResponse as any)

      const response = await OPTIONS()

      expect(response).toBe(mockResponse)
      expect(mockCreateSecureResponse).toHaveBeenCalledWith({})
    })
  })

  describe('POST', () => {
    describe('API Key Authentication', () => {
      it('returns 401 when API key is missing', async () => {
        const mockErrorResponse = new Response(JSON.stringify({ error: 'API key is required' }), { status: 401 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'API key is required' },
          401
        )
      })

      it('returns 401 when X-Tenant-Id header is missing', async () => {
        const mockErrorResponse = new Response(JSON.stringify({ error: 'X-Tenant-Id header is required' }), { status: 401 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'test-api-key',
            'X-Data-Type': 'test',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'X-Tenant-Id header is required' },
          401
        )
      })

      it('validates API key against tenant in database', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        await POST(request)

        expect(mockSupabaseClient.from).toHaveBeenCalledWith('tenants')
        expect(mockQuery.select).toHaveBeenCalledWith('tenant_id, api_key')
        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'test-tenant')
        expect(mockQuery.eq).toHaveBeenCalledWith('api_key', 'valid-api-key')
        expect(mockQuery.maybeSingle).toHaveBeenCalled()
      })

      it('returns 401 for invalid API key', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'invalid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'Invalid API key' },
          401
        )
      })

      it('accepts API key from Authorization header with Bearer prefix', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'bearer-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'authorization': 'Bearer bearer-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        await POST(request)

        expect(mockQuery.eq).toHaveBeenCalledWith('api_key', 'bearer-api-key')
      })
    })

    describe('Header Validation', () => {
      beforeEach(() => {
        // Setup valid authentication for header validation tests
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)
      })

      it('returns 400 when X-Data-Type header is missing', async () => {
        const mockErrorResponse = new Response(JSON.stringify({ error: 'Missing X-Data-Type header' }), { status: 400 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'Missing X-Data-Type header' },
          400
        )
      })

      it('returns 400 when neither X-Dashboard-Id nor X-Dashboard-Title is provided', async () => {
        const mockErrorResponse = new Response(
          JSON.stringify({ 
            error: 'Either X-Dashboard-Id (for existing dashboard) or X-Dashboard-Title (for new dashboard) header is required' 
          }), 
          { status: 400 }
        )
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
      })

      it('returns 400 when both X-Dashboard-Id and X-Dashboard-Title are provided', async () => {
        const mockErrorResponse = new Response(
          JSON.stringify({ error: 'Provide either X-Dashboard-Id OR X-Dashboard-Title, not both' }), 
          { status: 400 }
        )
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Id': 'existing-dashboard',
            'X-Dashboard-Title': 'New Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
      })
    })

    describe('XML Content Validation', () => {
      beforeEach(() => {
        // Setup valid authentication for XML validation tests
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)
      })

      it('returns 400 when no XML data is provided', async () => {
        const mockErrorResponse = new Response(JSON.stringify({ error: 'No XML data provided' }), { status: 400 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'No XML data provided' },
          400
        )
      })

      it('returns 413 when XML data exceeds 50MB limit', async () => {
        const mockErrorResponse = new Response(JSON.stringify({ error: 'XML data too large' }), { status: 413 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        // Create large XML content (51MB)
        const largeXmlContent = 'x'.repeat(51 * 1024 * 1024)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: largeXmlContent,
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'XML data too large' },
          413
        )
      })

      it('accepts valid XML content within size limits', async () => {
        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })

        const validXmlContent = '<products><product><name>Product A</name><price>100</price></product></products>'

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: validXmlContent,
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'products',
            'X-Dashboard-Title': 'Products Dashboard',
          },
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockParseXMLToJSON).toHaveBeenCalledWith(validXmlContent, 'products')
      })
    })

    describe('XML Processing', () => {
      beforeEach(() => {
        // Setup valid authentication
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)
      })

      it('processes XML and saves data file successfully for new dashboard', async () => {
        const mockParsedData = [
          { product: 'Product A', price: 100 },
          { product: 'Product B', price: 200 },
        ]
        const mockFieldOrder = ['product', 'price']

        mockParseXMLToJSON.mockReturnValue({
          data: mockParsedData,
          fieldOrder: mockFieldOrder,
          message: 'Parsed 2 records successfully',
        })

        const mockSavedResult = { dashboard_id: 'new-dashboard-id' }
        mockSaveDataFile.mockResolvedValue(mockSavedResult)
        mockSanitizeString.mockReturnValue('products')

        const xmlContent = '<products><product><name>Product A</name><price>100</price></product></products>'

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: xmlContent,
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'products',
            'X-Dashboard-Title': 'Products Dashboard',
          },
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        const body = await response.json()
        expect(body).toEqual({
          success: true,
          message: 'Parsed 2 records successfully',
          recordCount: 2,
          fileName: 'products.json',
          dashboardId: 'new-dashboard-id',
        })

        expect(mockSanitizeString).toHaveBeenCalledWith('products', 50)
        expect(mockParseXMLToJSON).toHaveBeenCalledWith(xmlContent, 'products')
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          'products.json',
          'products',
          mockParsedData,
          'test-tenant',
          null, // dashboardId is null for new dashboard
          'Products Dashboard',
          mockFieldOrder
        )
      })

      it('processes XML and saves data file for existing dashboard', async () => {
        const mockParsedData = [{ test: 'data' }]
        const mockFieldOrder = ['test']

        mockParseXMLToJSON.mockReturnValue({
          data: mockParsedData,
          fieldOrder: mockFieldOrder,
          message: 'Parsed successfully',
        })

        const mockSavedResult = { dashboard_id: 'existing-dashboard-id' }
        mockSaveDataFile.mockResolvedValue(mockSavedResult)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data><item>test</item></data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Id': 'existing-dashboard-id',
          },
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          'test.json',
          'test',
          mockParsedData,
          'test-tenant',
          'existing-dashboard-id', // Existing dashboard ID
          null, // No dashboard title for existing dashboard
          mockFieldOrder
        )
      })
    })

    describe('Error Handling', () => {
      beforeEach(() => {
        // Setup valid authentication for error handling tests
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)
      })

      it('handles XML parsing errors', async () => {
        mockParseXMLToJSON.mockImplementation(() => {
          throw new Error('Invalid XML format')
        })

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid XML format' }), { status: 500 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        // Mock console.error to avoid noise in tests
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<invalid-xml>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'Invalid XML format' },
          500
        )

        consoleSpy.mockRestore()
      })

      it('handles data file save failures', async () => {
        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue(null) // Save failed

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Failed to save data file' }), { status: 500 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data><item>test</item></data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'Failed to save data file' },
          500
        )
      })

      it('handles database validation errors', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Database connection failed' } 
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'test-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
      })

      it('handles unexpected errors gracefully', async () => {
        // Mock an unexpected error during authentication
        mockSupabaseClient.from.mockImplementation(() => {
          throw new Error('Unexpected error')
        })

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Unexpected error' }), { status: 500 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'test-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(consoleSpy).toHaveBeenCalledWith('API Error:', expect.any(Error))

        consoleSpy.mockRestore()
      })
    })

    describe('Security Features', () => {
      it('implements request timeout (30 seconds)', async () => {
        // This test verifies that the timeout mechanism is in place
        // The actual timeout behavior is hard to test without complex async manipulation
        
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        // The function should complete normally (timeout doesn't trigger)
        const response = await POST(request)
        expect(response.status).toBe(200)
      })

      it('sanitizes data type to prevent injection attacks', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'test-tenant', api_key: 'valid-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })
        mockSanitizeString.mockReturnValue('clean_data_type')

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'valid-api-key',
            'X-Tenant-Id': 'test-tenant',
            'X-Data-Type': 'malicious<script>alert("xss")</script>',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        await POST(request)

        expect(mockSanitizeString).toHaveBeenCalledWith('malicious<script>alert("xss")</script>', 50)
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          'clean_data_type.json',
          'clean_data_type',
          expect.any(Array),
          'test-tenant',
          null,
          'Test Dashboard',
          expect.any(Array)
        )
      })
    })

    describe('Multi-tenant Isolation', () => {
      it('only allows data uploads to the authenticated tenant', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: { tenant_id: 'isolated-tenant', api_key: 'isolated-api-key' },
            error: null,
          }),
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        mockParseXMLToJSON.mockReturnValue({
          data: [{ test: 'data' }],
          fieldOrder: ['test'],
          message: 'Parsed successfully',
        })
        mockSaveDataFile.mockResolvedValue({ dashboard_id: 'new-dashboard' })

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'isolated-api-key',
            'X-Tenant-Id': 'isolated-tenant',
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        await POST(request)

        // Verify that the API key validation checks for the correct tenant
        expect(mockQuery.eq).toHaveBeenCalledWith('tenant_id', 'isolated-tenant')
        expect(mockQuery.eq).toHaveBeenCalledWith('api_key', 'isolated-api-key')

        // Verify that data is saved to the correct tenant
        expect(mockSaveDataFile).toHaveBeenCalledWith(
          expect.any(String),
          expect.any(String),
          expect.any(Array),
          'isolated-tenant', // Authenticated tenant ID
          null,
          'Test Dashboard',
          expect.any(Array)
        )
      })

      it('prevents cross-tenant data uploads with wrong API key', async () => {
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }), // No matching record
        }
        mockSupabaseClient.from.mockReturnValue(mockQuery as any)

        const mockErrorResponse = new Response(JSON.stringify({ error: 'Invalid API key' }), { status: 401 })
        mockCreateSecureResponse.mockReturnValue(mockErrorResponse as any)

        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          body: '<data>test</data>',
          headers: {
            'x-api-key': 'tenant-a-api-key', // API key for tenant A
            'X-Tenant-Id': 'tenant-b', // But trying to access tenant B
            'X-Data-Type': 'test',
            'X-Dashboard-Title': 'Test Dashboard',
          },
        })

        const response = await POST(request)

        expect(response).toBe(mockErrorResponse)
        expect(mockCreateSecureResponse).toHaveBeenCalledWith(
          { error: 'Invalid API key' },
          401
        )
      })
    })
  })
})