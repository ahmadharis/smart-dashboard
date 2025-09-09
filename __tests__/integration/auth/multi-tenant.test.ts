/**
 * Multi-Tenant Access Control Integration Tests
 * 
 * Tests the complete multi-tenant access control including:
 * - User-tenant relationship validation
 * - Cross-tenant access prevention  
 * - Tenant switching functionality
 * - Access denied scenarios
 */

import { NextRequest } from 'next/server'
import { validateAuthentication, validateTenantAccess, validateAuthAndTenant } from '@/lib/auth-middleware'
import { createClient } from '@/lib/supabase/server'

// Mock Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  })),
}

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

describe('Multi-Tenant Access Control Integration Tests', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    aud: 'authenticated',
    role: 'authenticated',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    email_confirmed_at: '2023-01-01T00:00:00Z',
    phone_confirmed_at: null,
    confirmation_sent_at: null,
    recovery_sent_at: null,
    email_change_sent_at: null,
    new_email: null,
    invited_at: null,
    action_link: null,
    email_change: null,
    phone_change: null,
    phone: null,
    confirmed_at: '2023-01-01T00:00:00Z',
    email_change_confirm_status: 0,
    banned_until: null,
    deleted_at: null,
    is_anonymous: false,
    app_metadata: {},
    user_metadata: {},
    identities: [],
    factors: [],
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Authentication Validation', () => {
    it('should validate authenticated user successfully', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      })

      const request = new NextRequest('http://localhost/api/test')

      // Act
      const result = await validateAuthentication(request)

      // Assert
      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeUndefined()
    })

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'No session' },
      })

      const request = new NextRequest('http://localhost/api/test')

      // Act
      const result = await validateAuthentication(request)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.user).toBeUndefined()
      expect(result.error).toBe('Authentication required. Please log in.')
    })

    it('should handle authentication service errors', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockRejectedValue(
        new Error('Database connection failed')
      )

      const request = new NextRequest('http://localhost/api/test')

      // Act
      const result = await validateAuthentication(request)

      // Assert
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Authentication service unavailable')
    })
  })

  describe('Tenant Access Validation', () => {
    it('should validate user access to authorized tenant', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: { tenant_id: tenantId },
                error: null,
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await validateTenantAccess(mockUser, tenantId)

      // Assert
      expect(result).toBe(true)
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('user_tenants')
    })

    it('should reject access to unauthorized tenant', async () => {
      // Arrange
      const unauthorizedTenantId = '550e8400-e29b-41d4-a716-446655440001'
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'No rows found' },
              }),
            }),
          }),
        }),
      })

      // Act
      const result = await validateTenantAccess(mockUser, unauthorizedTenantId)

      // Assert
      expect(result).toBe(false)
    })

    it('should handle database errors during tenant validation', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockRejectedValue(
                new Error('Database connection failed')
              ),
            }),
          }),
        }),
      })

      // Act
      const result = await validateTenantAccess(mockUser, tenantId)

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('Combined Auth and Tenant Validation', () => {
    describe('Header-based Tenant ID', () => {
      it('should validate auth and tenant from X-Tenant-Id header', async () => {
        // Arrange
        const tenantId = '550e8400-e29b-41d4-a716-446655440000'
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: tenantId },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': tenantId },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.user).toEqual(mockUser)
        expect(result.tenantId).toBe(tenantId)
      })

      it('should validate auth and tenant from query parameter', async () => {
        // Arrange
        const tenantId = '550e8400-e29b-41d4-a716-446655440000'
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: tenantId },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest(`http://localhost/api/internal/test?tenantId=${tenantId}`)

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.user).toEqual(mockUser)
        expect(result.tenantId).toBe(tenantId)
      })

      it('should extract tenant ID from URL path for page routes', async () => {
        // Arrange
        const tenantId = '550e8400-e29b-41d4-a716-446655440000'
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: tenantId },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest(`http://localhost/${tenantId}/dashboard`)

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.tenantId).toBe(tenantId)
      })
    })

    describe('Tenant ID Validation', () => {
      it('should reject invalid tenant ID format', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': 'invalid-uuid' },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Invalid tenant ID format')
      })

      it('should require tenant ID when requireTenant is true', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const request = new NextRequest('http://localhost/api/internal/test')

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(
          'Tenant ID is required. Provide X-Tenant-Id header, tenantId query parameter, or access via tenant route.'
        )
      })

      it('should skip tenant validation when requireTenant is false', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const request = new NextRequest('http://localhost/api/internal/test')

        // Act
        const result = await validateAuthAndTenant(request, false)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.user).toEqual(mockUser)
        expect(result.tenantId).toBeUndefined()
      })
    })

    describe('Cross-Tenant Access Prevention', () => {
      it('should prevent access to unauthorized tenant', async () => {
        // Arrange
        const unauthorizedTenantId = '550e8400-e29b-41d4-a716-446655440001'
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'No rows found' },
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': unauthorizedTenantId },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Access denied to this tenant')
      })

      it('should handle tenant access check failures', async () => {
        // Arrange
        const tenantId = '550e8400-e29b-41d4-a716-446655440000'
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockRejectedValue(
                  new Error('Database error')
                ),
              }),
            }),
          }),
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': tenantId },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Access denied to this tenant')
      })
    })

    describe('Multiple Tenant Access Scenarios', () => {
      it('should validate user with multiple tenant access', async () => {
        // Arrange
        const tenant1Id = '550e8400-e29b-41d4-a716-446655440000'
        const tenant2Id = '550e8400-e29b-41d4-a716-446655440001'

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        // Mock access to both tenants
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: tenant1Id },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request1 = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': tenant1Id },
        })

        // Act & Assert for first tenant
        const result1 = await validateAuthAndTenant(request1, true)
        expect(result1.isValid).toBe(true)
        expect(result1.tenantId).toBe(tenant1Id)

        // Mock access to second tenant
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: tenant2Id },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request2 = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': tenant2Id },
        })

        // Act & Assert for second tenant
        const result2 = await validateAuthAndTenant(request2, true)
        expect(result2.isValid).toBe(true)
        expect(result2.tenantId).toBe(tenant2Id)
      })
    })

    describe('Tenant ID Priority Order', () => {
      it('should prioritize X-Tenant-Id header over query parameter', async () => {
        // Arrange
        const headerTenantId = '550e8400-e29b-41d4-a716-446655440000'
        const queryTenantId = '550e8400-e29b-41d4-a716-446655440001'

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: headerTenantId },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest(
          `http://localhost/api/internal/test?tenantId=${queryTenantId}`,
          { headers: { 'X-Tenant-Id': headerTenantId } }
        )

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.tenantId).toBe(headerTenantId)
      })

      it('should prioritize query parameter over URL path for API routes', async () => {
        // Arrange
        const queryTenantId = '550e8400-e29b-41d4-a716-446655440000'
        const pathTenantId = '550e8400-e29b-41d4-a716-446655440001'

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })
        mockSupabaseClient.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { tenant_id: queryTenantId },
                  error: null,
                }),
              }),
            }),
          }),
        })

        const request = new NextRequest(
          `http://localhost/api/internal/${pathTenantId}/test?tenantId=${queryTenantId}`
        )

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(true)
        expect(result.tenantId).toBe(queryTenantId)
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty string tenant ID', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': '' },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe(
          'Tenant ID is required. Provide X-Tenant-Id header, tenantId query parameter, or access via tenant route.'
        )
      })

      it('should handle malformed UUID tenant ID', async () => {
        // Arrange
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        const request = new NextRequest('http://localhost/api/internal/test', {
          headers: { 'X-Tenant-Id': '123-456-789' },
        })

        // Act
        const result = await validateAuthAndTenant(request, true)

        // Assert
        expect(result.isValid).toBe(false)
        expect(result.error).toBe('Invalid tenant ID format')
      })

      it('should handle various UUID formats correctly', async () => {
        // Arrange - Test different valid UUID formats
        const validUUIDs = [
          '550e8400-e29b-41d4-a716-446655440000', // Standard format
          '550E8400-E29B-41D4-A716-446655440000', // Uppercase
          '12345678-1234-1234-1234-123456789abc', // Mixed case
        ]

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: mockUser },
          error: null,
        })

        for (const uuid of validUUIDs) {
          mockSupabaseClient.from.mockReturnValue({
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: { tenant_id: uuid },
                    error: null,
                  }),
                }),
              }),
            }),
          })

          const request = new NextRequest('http://localhost/api/internal/test', {
            headers: { 'X-Tenant-Id': uuid },
          })

          // Act
          const result = await validateAuthAndTenant(request, true)

          // Assert
          expect(result.isValid).toBe(true)
          expect(result.tenantId).toBe(uuid)
        }
      })
    })
  })
})