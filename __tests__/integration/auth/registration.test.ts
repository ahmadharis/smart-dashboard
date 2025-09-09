/**
 * Registration Flow Integration Tests
 * 
 * Tests the complete user registration journey including:
 * - New user registration with valid email
 * - Domain-based automatic tenant assignment
 * - Duplicate email registration prevention
 * - Invalid email format handling
 * - Registration with non-matching domain
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST as assignTenantOnSignup } from '@/app/api/auth/assign-tenant-on-signup/route'

// Mock Supabase client with service role
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
  })),
}

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => mockSupabaseClient),
}))

jest.mock('next/headers', () => ({
  cookies: () => ({
    getAll: () => [],
    set: jest.fn(),
  }),
}))

describe('User Registration & Tenant Assignment Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Valid Registration Flow', () => {
    it('should register new user with valid email and assign to matching tenant', async () => {
      // Arrange: Mock tenant data with matching domain
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: 'example.com,test.example.com',
        },
        {
          tenant_id: 'tenant-456',
          name: 'Another Corp',
          domain: 'another.com',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: mockTenants,
            error: null,
          }),
        }),
      })

      // Mock successful user-tenant insertion
      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-123', tenant_id: 'tenant-123' }],
            error: null,
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('User assigned to 1 tenant(s)')
      expect(responseData.assignedTenants).toEqual([
        { id: 'tenant-123', name: 'Example Corp' }
      ])
    })

    it('should assign user to multiple tenants with matching domains', async () => {
      // Arrange: Mock multiple tenants with same domain
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: 'example.com',
        },
        {
          tenant_id: 'tenant-456',
          name: 'Example Subsidiary',
          domain: 'example.com,subsidiary.com',
        },
      ]

      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: [
              { user_id: 'user-123', tenant_id: 'tenant-123' },
              { user_id: 'user-123', tenant_id: 'tenant-456' },
            ],
            error: null,
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('User assigned to 2 tenant(s)')
      expect(responseData.assignedTenants).toHaveLength(2)
      expect(responseData.assignedTenants).toEqual(
        expect.arrayContaining([
          { id: 'tenant-123', name: 'Example Corp' },
          { id: 'tenant-456', name: 'Example Subsidiary' },
        ])
      )
    })

    it('should handle case-insensitive domain matching', async () => {
      // Arrange: Mock tenant with mixed-case domain
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: 'Example.COM,Test.Example.COM',
        },
      ]

      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-123', tenant_id: 'tenant-123' }],
            error: null,
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@EXAMPLE.com', // uppercase domain
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.assignedTenants).toEqual([
        { id: 'tenant-123', name: 'Example Corp' }
      ])
    })
  })

  describe('No Matching Tenants', () => {
    it('should return success with no assigned tenants when domain does not match', async () => {
      // Arrange: Mock tenant with non-matching domain
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: 'example.com',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: mockTenants,
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@different.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('No matching tenants found for email domain')
      expect(responseData.assignedTenants).toEqual([])
    })

    it('should handle empty tenant list gracefully', async () => {
      // Arrange: Mock empty tenant list
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('No matching tenants found for email domain')
      expect(responseData.assignedTenants).toEqual([])
    })

    it('should handle tenants with null domain', async () => {
      // Arrange: Mock tenants with null domains
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: null,
        },
        {
          tenant_id: 'tenant-456',
          name: 'Another Corp',
          domain: 'another.com',
        },
      ]

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: mockTenants,
            error: null,
          }),
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.message).toBe('No matching tenants found for email domain')
      expect(responseData.assignedTenants).toEqual([])
    })
  })

  describe('Input Validation', () => {
    it('should return 400 error when userId is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing userId or email')
    })

    it('should return 400 error when email is missing', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Missing userId or email')
    })

    it('should return 400 error for invalid email format', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'invalid-email',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid email format')
    })

    it('should return 400 error for email without domain', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'user@',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Invalid email format')
    })
  })

  describe('Database Error Handling', () => {
    it('should return 500 error when tenant fetch fails', async () => {
      // Arrange: Mock database error
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database connection failed' },
          }),
        }),
      })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to fetch tenants')
    })

    it('should return 500 error when user-tenant insertion fails', async () => {
      // Arrange: Mock successful tenant fetch but failed insertion
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: 'example.com',
        },
      ]

      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insertion failed' },
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to assign tenant access')
    })

    it('should return 500 error for malformed request body', async () => {
      // Arrange: Invalid JSON request
      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: 'invalid-json',
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Internal server error')
    })
  })

  describe('Edge Cases', () => {
    it('should handle whitespace in domain configuration', async () => {
      // Arrange: Mock tenant with whitespace in domain
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: ' example.com , test.example.com ',
        },
      ]

      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-123', tenant_id: 'tenant-123' }],
            error: null,
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.assignedTenants).toEqual([
        { id: 'tenant-123', name: 'Example Corp' }
      ])
    })

    it('should handle empty domain strings', async () => {
      // Arrange: Mock tenant with empty domain string
      const mockTenants = [
        {
          tenant_id: 'tenant-123',
          name: 'Example Corp',
          domain: '',
        },
        {
          tenant_id: 'tenant-456',
          name: 'Valid Corp',
          domain: 'example.com',
        },
      ]

      mockSupabaseClient.from = jest.fn()
        .mockReturnValueOnce({
          select: jest.fn().mockReturnValue({
            not: jest.fn().mockResolvedValue({
              data: mockTenants,
              error: null,
            }),
          }),
        })
        .mockReturnValueOnce({
          insert: jest.fn().mockResolvedValue({
            data: [{ user_id: 'user-123', tenant_id: 'tenant-456' }],
            error: null,
          }),
        })

      const request = new NextRequest('http://localhost/api/auth/assign-tenant-on-signup', {
        method: 'POST',
        body: JSON.stringify({
          userId: 'user-123',
          email: 'john.doe@example.com',
        }),
      })

      // Act
      const response = await assignTenantOnSignup(request)
      const responseData = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.assignedTenants).toEqual([
        { id: 'tenant-456', name: 'Valid Corp' }
      ])
    })
  })
})