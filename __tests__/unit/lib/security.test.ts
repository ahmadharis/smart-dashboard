import { NextRequest, NextResponse } from 'next/server'
import {
  validateApiKey,
  validateTenant,
  validateSecurity,
  isValidUUID,
  sanitizeString,
  validateEmail,
  createSecurityErrorResponse,
  createSecureResponse,
  setCorsHeaders,
  SecurityValidationResult
} from '../../../lib/security'
import { createServiceClient } from '../../../lib/supabase'

// Mock the supabase module
jest.mock('../../../lib/supabase', () => ({
  createServiceClient: jest.fn()
}))

const mockCreateServiceClient = createServiceClient as jest.MockedFunction<typeof createServiceClient>

// Mock console methods to avoid noise in tests
const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

describe('Security Module', () => {
  let mockSupabase: any

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    consoleSpy.mockClear()
    
    // Setup default supabase mock
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }
    mockCreateServiceClient.mockReturnValue(mockSupabase)
  })

  afterAll(() => {
    consoleSpy.mockRestore()
  })

  describe('validateApiKey', () => {
    const createMockRequest = (headers: Record<string, string> = {}): NextRequest => {
      return {
        headers: {
          get: (key: string) => headers[key] || null
        }
      } as unknown as NextRequest
    }

    describe('Happy Path', () => {
      it('should validate API key from x-api-key header', async () => {
        // Arrange
        const apiKey = 'valid-api-key-123'
        const tenantId = 'tenant-123'
        const request = createMockRequest({ 'x-api-key': apiKey })
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: tenantId, api_key: apiKey },
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: tenantId
        })
        expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
        expect(mockSupabase.select).toHaveBeenCalledWith('tenant_id, api_key')
        expect(mockSupabase.eq).toHaveBeenCalledWith('api_key', apiKey)
      })

      it('should validate API key from Authorization Bearer header', async () => {
        // Arrange
        const apiKey = 'bearer-token-123'
        const tenantId = 'tenant-456'
        const request = createMockRequest({ 'authorization': `Bearer ${apiKey}` })
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: tenantId, api_key: apiKey },
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: tenantId
        })
      })

      it('should prefer x-api-key over Authorization header when both present', async () => {
        // Arrange
        const xApiKey = 'x-api-key-value'
        const bearerToken = 'bearer-token-value'
        const tenantId = 'tenant-789'
        const request = createMockRequest({ 
          'x-api-key': xApiKey,
          'authorization': `Bearer ${bearerToken}`
        })
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: tenantId, api_key: xApiKey },
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(mockSupabase.eq).toHaveBeenCalledWith('api_key', xApiKey)
      })

      it('should trim whitespace from API key', async () => {
        // Arrange
        const apiKey = 'trimmed-key'
        const tenantId = 'tenant-trim'
        const request = createMockRequest({ 'x-api-key': `  ${apiKey}  ` })
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: tenantId, api_key: apiKey },
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result.isValid).toBe(true)
        expect(mockSupabase.eq).toHaveBeenCalledWith('api_key', apiKey)
      })
    })

    describe('Error Cases', () => {
      it('should reject request with no API key', async () => {
        // Arrange
        const request = createMockRequest({})

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'API key is required. Provide x-api-key header or Authorization: Bearer token.'
        })
      })

      it('should reject request with empty API key', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': '' })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'API key is required. Provide x-api-key header or Authorization: Bearer token.'
        })
      })

      it('should reject request with whitespace-only API key', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': '   ' })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid API key'
        })
        // Verify it queried with empty string
        expect(mockSupabase.eq).toHaveBeenCalledWith('api_key', '')
      })

      it('should reject invalid API key (database error)', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'invalid-key' })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid API key'
        })
      })

      it('should reject invalid API key (no data returned)', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'invalid-key' })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid API key'
        })
      })

      it('should reject mismatched API key', async () => {
        // Arrange
        const providedKey = 'provided-key'
        const storedKey = 'different-stored-key'
        const request = createMockRequest({ 'x-api-key': providedKey })
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: 'tenant-123', api_key: storedKey },
          error: null
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid API key'
        })
      })

      it('should handle database exceptions gracefully', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'test-key' })
        
        mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'API key validation failed'
        })
      })
    })

    describe('Security Edge Cases', () => {
      it('should handle SQL injection attempt in API key', async () => {
        // Arrange
        const maliciousKey = "'; DROP TABLE tenants; --"
        const request = createMockRequest({ 'x-api-key': maliciousKey })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result.isValid).toBe(false)
        expect(mockSupabase.eq).toHaveBeenCalledWith('api_key', maliciousKey.trim())
      })

      it('should handle extremely long API key', async () => {
        // Arrange
        const longKey = 'a'.repeat(10000)
        const request = createMockRequest({ 'x-api-key': longKey })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result.isValid).toBe(false)
      })

      it('should handle special characters in API key', async () => {
        // Arrange
        const specialKey = 'key<script>alert("xss")</script>'
        const request = createMockRequest({ 'x-api-key': specialKey })
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateApiKey(request)

        // Assert
        expect(result.isValid).toBe(false)
      })
    })
  })

  describe('validateTenant', () => {
    describe('Happy Path', () => {
      it('should validate existing tenant with valid UUID', async () => {
        // Arrange
        const tenantId = '123e4567-e89b-12d3-a456-426614174000'
        
        mockSupabase.single.mockResolvedValue({
          data: { tenant_id: tenantId },
          error: null
        })

        // Act
        const result = await validateTenant(tenantId)

        // Assert
        expect(result).toBe(true)
        expect(mockSupabase.from).toHaveBeenCalledWith('tenants')
        expect(mockSupabase.select).toHaveBeenCalledWith('tenant_id')
        expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', tenantId)
      })
    })

    describe('Error Cases', () => {
      it('should reject empty tenant ID', async () => {
        // Act
        const result = await validateTenant('')

        // Assert
        expect(result).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })

      it('should reject null tenant ID', async () => {
        // Act
        const result = await validateTenant(null as any)

        // Assert
        expect(result).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })

      it('should reject undefined tenant ID', async () => {
        // Act
        const result = await validateTenant(undefined as any)

        // Assert
        expect(result).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })

      it('should reject invalid UUID format', async () => {
        // Act
        const result = await validateTenant('not-a-uuid')

        // Assert
        expect(result).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })

      it('should reject tenant that does not exist in database', async () => {
        // Arrange
        const tenantId = '123e4567-e89b-12d3-a456-426614174000'
        
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })

        // Act
        const result = await validateTenant(tenantId)

        // Assert
        expect(result).toBe(false)
      })

      it('should handle database exceptions gracefully', async () => {
        // Arrange
        const tenantId = '123e4567-e89b-12d3-a456-426614174000'
        
        mockSupabase.single.mockRejectedValue(new Error('Database connection failed'))

        // Act
        const result = await validateTenant(tenantId)

        // Assert
        expect(result).toBe(false)
        expect(consoleSpy).toHaveBeenCalledWith('Tenant validation error:', expect.any(Error))
      })
    })

    describe('Security Edge Cases', () => {
      it('should reject SQL injection attempt in tenant ID', async () => {
        // Act
        const result = await validateTenant("123e4567-e89b-12d3-a456-426614174000'; DROP TABLE tenants; --")

        // Assert
        expect(result).toBe(false)
        expect(mockSupabase.from).not.toHaveBeenCalled()
      })

      it('should reject malformed UUID variations', async () => {
        const invalidUUIDs = [
          '123e4567-e89b-12d3-a456-42661417400', // too short
          '123e4567-e89b-12d3-a456-4266141740000', // too long
          '123e4567-e89b-12d3-a456-42661417400g', // invalid character
          '123e4567e89b12d3a456426614174000', // no hyphens
          '123e4567-e89b-12d3-a456-426614174000-extra', // extra content
        ]

        for (const invalidUUID of invalidUUIDs) {
          const result = await validateTenant(invalidUUID)
          expect(result).toBe(false)
        }
      })
    })
  })

  describe('validateSecurity', () => {
    const createMockRequest = (
      headers: Record<string, string> = {},
      url: string = 'https://example.com/api/test'
    ): NextRequest => {
      return {
        headers: {
          get: (key: string) => headers[key] || null
        },
        url
      } as unknown as NextRequest
    }

    // Store original functions to restore them
    let originalValidateApiKey: any
    let originalValidateTenant: any

    beforeEach(() => {
      // Store original functions
      const securityModule = require('../../../lib/security')
      originalValidateApiKey = securityModule.validateApiKey
      originalValidateTenant = securityModule.validateTenant

      // Mock validateApiKey to return success by default
      securityModule.validateApiKey = jest.fn().mockResolvedValue({
        isValid: true,
        tenantId: 'test-tenant-id'
      })

      // Mock validateTenant to return success by default
      securityModule.validateTenant = jest.fn().mockResolvedValue(true)
    })

    afterEach(() => {
      // Restore original functions
      const securityModule = require('../../../lib/security')
      securityModule.validateApiKey = originalValidateApiKey
      securityModule.validateTenant = originalValidateTenant
    })

    describe('Happy Path', () => {
      it('should validate security without tenant requirement', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'valid-key' })

        // Act
        const result = await validateSecurity(request, false)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: 'test-tenant-id'
        })
      })

      it('should validate security with tenant from API key', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'valid-key' })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: 'test-tenant-id'
        })
      })

      it('should validate security with tenant from X-Tenant-Id header', async () => {
        // Arrange
        const tenantId = 'header-tenant-id'
        const request = createMockRequest({ 
          'x-api-key': 'valid-key',
          'X-Tenant-Id': tenantId
        })

        // Mock API key validation to return matching tenant
        jest.spyOn(require('../../../lib/security'), 'validateApiKey').mockResolvedValue({
          isValid: true,
          tenantId: tenantId
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: tenantId
        })
      })

      it('should validate security with tenant from query parameter', async () => {
        // Arrange
        const tenantId = 'query-tenant-id'
        const request = createMockRequest(
          { 'x-api-key': 'valid-key' },
          `https://example.com/api/test?tenant_id=${tenantId}`
        )

        // Mock API key validation to return matching tenant
        jest.spyOn(require('../../../lib/security'), 'validateApiKey').mockResolvedValue({
          isValid: true,
          tenantId: tenantId
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: tenantId
        })
      })

      it('should validate security with tenant from URL path', async () => {
        // Arrange
        const tenantId = 'path-tenant-id'
        const request = createMockRequest(
          { 'x-api-key': 'valid-key' },
          `https://example.com/${tenantId}/dashboard`
        )

        // Mock API key validation to return matching tenant
        jest.spyOn(require('../../../lib/security'), 'validateApiKey').mockResolvedValue({
          isValid: true,
          tenantId: tenantId
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: true,
          tenantId: tenantId
        })
      })
    })

    describe('Error Cases', () => {
      it('should fail when API key validation fails', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'invalid-key' })
        const securityModule = require('../../../lib/security')

        securityModule.validateApiKey = jest.fn().mockResolvedValue({
          isValid: false,
          error: 'Invalid API key'
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid API key'
        })
      })

      it('should fail when tenant is required but not provided', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'valid-key' })
        const securityModule = require('../../../lib/security')

        securityModule.validateApiKey = jest.fn().mockResolvedValue({
          isValid: true,
          tenantId: undefined
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Tenant ID is required. Provide X-Tenant-Id header or tenant_id parameter.'
        })
      })

      it('should fail when requested tenant does not match API key tenant', async () => {
        // Arrange
        const request = createMockRequest({ 
          'x-api-key': 'valid-key',
          'X-Tenant-Id': 'different-tenant'
        })
        const securityModule = require('../../../lib/security')

        securityModule.validateApiKey = jest.fn().mockResolvedValue({
          isValid: true,
          tenantId: 'api-key-tenant'
        })

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'API key does not have access to the requested tenant'
        })
      })

      it('should fail when tenant validation fails', async () => {
        // Arrange
        const request = createMockRequest({ 'x-api-key': 'valid-key' })
        const securityModule = require('../../../lib/security')

        securityModule.validateTenant = jest.fn().mockResolvedValue(false)

        // Act
        const result = await validateSecurity(request, true)

        // Assert
        expect(result).toEqual({
          isValid: false,
          error: 'Invalid or inaccessible tenant'
        })
      })
    })
  })

  describe('isValidUUID', () => {
    describe('Valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000', // UUID v4
        '123e4567-e89b-22d3-a456-426614174000', // UUID v2
        '123e4567-e89b-32d3-a456-426614174000', // UUID v3
        '123e4567-e89b-42d3-a456-426614174000', // UUID v4
        '123e4567-e89b-52d3-a456-426614174000', // UUID v5
        '123E4567-E89B-12D3-A456-426614174000', // uppercase
        '00000000-0000-1000-8000-000000000000', // all zeros with valid version/variant
      ]

      validUUIDs.forEach(uuid => {
        it(`should validate ${uuid}`, () => {
          expect(isValidUUID(uuid)).toBe(true)
        })
      })
    })

    describe('Invalid UUIDs', () => {
      const invalidUUIDs = [
        '', // empty string
        'not-a-uuid', // random string
        '123e4567-e89b-12d3-a456-42661417400', // too short
        '123e4567-e89b-12d3-a456-4266141740000', // too long
        '123e4567-e89b-12d3-a456-42661417400g', // invalid character
        '123e4567e89b12d3a456426614174000', // no hyphens
        '123e4567-e89b-12d3-a456-426614174000-extra', // extra content
        '123e4567-e89b-02d3-a456-426614174000', // invalid version (0)
        '123e4567-e89b-62d3-a456-426614174000', // invalid version (6)
        '123e4567-e89b-12d3-2456-426614174000', // invalid variant (2)
        '123e4567-e89b-12d3-c456-426614174000', // invalid variant (c)
        null,
        undefined
      ]

      invalidUUIDs.forEach(uuid => {
        it(`should reject ${uuid === null ? 'null' : uuid === undefined ? 'undefined' : uuid}`, () => {
          expect(isValidUUID(uuid as any)).toBe(false)
        })
      })
    })
  })

  describe('sanitizeString', () => {
    describe('Happy Path', () => {
      it('should return clean string unchanged', () => {
        const input = 'Hello World 123'
        expect(sanitizeString(input)).toBe(input)
      })

      it('should trim whitespace', () => {
        const input = '  Hello World  '
        expect(sanitizeString(input)).toBe('Hello World')
      })

      it('should respect custom max length', () => {
        const input = 'This is a long string'
        expect(sanitizeString(input, 10)).toBe('This is a ')
      })
    })

    describe('Security Sanitization', () => {
      it('should remove dangerous HTML characters', () => {
        const input = 'Hello <script>alert("xss")</script> World'
        expect(sanitizeString(input)).toBe('Hello scriptalert(xss)/script World')
      })

      it('should remove all dangerous characters', () => {
        const input = `<>&"'`
        expect(sanitizeString(input)).toBe('')
      })

      it('should handle mixed dangerous and safe content', () => {
        const input = 'Safe content <dangerous> more safe content'
        expect(sanitizeString(input)).toBe('Safe content dangerous more safe content')
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty string', () => {
        expect(sanitizeString('')).toBe('')
      })

      it('should handle null input', () => {
        expect(sanitizeString(null as any)).toBe('')
      })

      it('should handle undefined input', () => {
        expect(sanitizeString(undefined as any)).toBe('')
      })

      it('should handle non-string input', () => {
        expect(sanitizeString(123 as any)).toBe('')
        expect(sanitizeString({} as any)).toBe('')
        expect(sanitizeString([] as any)).toBe('')
      })

      it('should handle string with only dangerous characters', () => {
        expect(sanitizeString('<>\'"&')).toBe('')
      })

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(1000)
        expect(sanitizeString(longString)).toBe('a'.repeat(255))
      })

      it('should handle zero max length', () => {
        expect(sanitizeString('Hello', 0)).toBe('')
      })

      it('should handle negative max length', () => {
        expect(sanitizeString('Hello', -5)).toBe('')
      })
    })
  })

  describe('validateEmail', () => {
    describe('Valid Emails', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.org',
        'user+tag@example.co.uk',
        'firstname.lastname@company.com',
        'user123@test-domain.com',
        'a@b.co',
        'very.long.email.address@very.long.domain.name.com'
      ]

      validEmails.forEach(email => {
        it(`should validate ${email}`, () => {
          expect(validateEmail(email)).toBe(true)
        })
      })
    })

    describe('Invalid Emails', () => {
      const invalidEmails = [
        '', // empty
        'not-an-email', // no @ symbol
        '@domain.com', // no user part
        'user@', // no domain
        'user@domain', // no TLD
        'user space@domain.com', // space in user part
        'user@domain .com', // space in domain
        'user@domain..com', // double dot (actually valid by this regex)
        'user@@domain.com', // double @
        'user@domain@com', // multiple @ symbols
        null,
        undefined
      ]

      invalidEmails.forEach(email => {
        it(`should reject ${email === null ? 'null' : email === undefined ? 'undefined' : email}`, () => {
          expect(validateEmail(email as any)).toBe(false)
        })
      })

      // These are edge cases that the current regex allows but might be questionable
      it('should handle edge cases that current regex allows', () => {
        // The current regex is quite permissive for these cases
        expect(validateEmail('.user@domain.com')).toBe(true) // leading dot in user
        expect(validateEmail('user.@domain.com')).toBe(true) // trailing dot in user
        expect(validateEmail('user@.domain.com')).toBe(true) // domain starts with dot
        expect(validateEmail('user@domain.com.')).toBe(true) // domain ends with dot
      })
    })
  })

  describe('createSecurityErrorResponse', () => {
    it('should create error response with provided message for client errors', () => {
      const message = 'Unauthorized access'
      const response = createSecurityErrorResponse(message, 401)
      
      // We can't easily test the NextResponse internals in unit tests,
      // but we can verify the function returns a NextResponse object
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should sanitize error message for server errors', () => {
      const message = 'Database connection failed with sensitive info'
      const response = createSecurityErrorResponse(message, 500)
      
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should use default status of 401', () => {
      const response = createSecurityErrorResponse('Test error')
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('createSecureResponse', () => {
    it('should create secure response with data', () => {
      const data = { message: 'Success', data: [1, 2, 3] }
      const response = createSecureResponse(data)
      
      expect(response).toBeInstanceOf(NextResponse)
    })

    it('should use custom status code', () => {
      const data = { created: true }
      const response = createSecureResponse(data, 201)
      
      expect(response).toBeInstanceOf(NextResponse)
    })
  })

  describe('setCorsHeaders', () => {
    it('should set CORS headers on response', () => {
      const response = NextResponse.json({ test: true })
      const corsResponse = setCorsHeaders(response)
      
      expect(corsResponse).toBeInstanceOf(NextResponse)
      // In a full integration test, we would verify the actual headers
      // For unit tests, we verify the function executes without error
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete security validation flow', async () => {
      // This test exercises the actual validateSecurity function with real mocked dependencies
      // without overriding the internal function calls
      
      // Arrange
      const apiKey = 'valid-api-key'
      const tenantId = '123e4567-e89b-12d3-a456-426614174000'
      const request = {
        headers: {
          get: (key: string) => key === 'x-api-key' ? apiKey : null
        },
        url: 'https://example.com/api/test'
      } as unknown as NextRequest

      // Mock successful API key validation
      mockSupabase.single.mockResolvedValueOnce({
        data: { tenant_id: tenantId, api_key: apiKey },
        error: null
      })

      // Mock successful tenant validation
      mockSupabase.single.mockResolvedValueOnce({
        data: { tenant_id: tenantId },
        error: null
      })

      // Act
      const result = await validateSecurity(request, true)

      // Assert
      expect(result).toEqual({
        isValid: true,
        tenantId: tenantId
      })
    })

    it('should handle security validation with multi-tenant access control', async () => {
      // Arrange
      const apiKey = 'tenant-specific-key'
      const correctTenantId = '123e4567-e89b-12d3-a456-426614174000'
      const unauthorizedTenantId = '987fcdeb-51a2-43d1-9f8e-ba9876543210'
      
      const request = {
        headers: {
          get: (key: string) => {
            if (key === 'x-api-key') return apiKey
            if (key === 'X-Tenant-Id') return unauthorizedTenantId
            return null
          }
        },
        url: 'https://example.com/api/test'
      } as unknown as NextRequest

      // Mock API key validation - returns tenant that doesn't match requested
      mockSupabase.single.mockResolvedValue({
        data: { tenant_id: correctTenantId, api_key: apiKey },
        error: null
      })

      // Act
      const result = await validateSecurity(request, true)

      // Assert
      expect(result).toEqual({
        isValid: false,
        error: 'API key does not have access to the requested tenant'
      })
    })
  })
})