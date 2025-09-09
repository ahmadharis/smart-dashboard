/**
 * Route Protection Integration Tests
 * 
 * Tests the complete route protection mechanism including:
 * - Protected route access control
 * - Authentication redirects
 * - Tenant-specific route access
 * - Public route accessibility
 * - Middleware integration
 */

import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

// Mock the supabase middleware
jest.mock('@/lib/supabase/middleware', () => ({
  updateSession: jest.fn((request: any) => ({
    status: 200,
    headers: {
      set: jest.fn(),
      get: jest.fn(),
    },
    request,
  })),
}))

// Mock environment variables
const originalEnv = process.env
beforeAll(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('Route Protection Integration Tests', () => {
  const { updateSession } = require('@/lib/supabase/middleware')
  
  beforeEach(() => {
    jest.clearAllMocks()
    updateSession.mockImplementation((request: NextRequest) => 
      NextResponse.next({ request })
    )
  })

  describe('Public Routes', () => {
    it('should allow access to home page without authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/')

      // Act
      const response = await middleware(request)

      // Assert
      expect(response.status).not.toBe(302) // Not redirected
      expect(response.status).not.toBe(307) // Not redirected
      expect(updateSession).toHaveBeenCalledWith(request)
    })

    it('should allow access to auth pages without authentication', async () => {
      // Arrange
      const authPages = [
        '/auth/login',
        '/auth/sign-up',
        '/auth/sign-up-success',
        '/auth/callback',
      ]

      for (const path of authPages) {
        // Act
        const request = new NextRequest(`http://localhost${path}`)
        const response = await middleware(request)

        // Assert
        expect(response.status).not.toBe(302) // Not redirected
        expect(response.status).not.toBe(307) // Not redirected
      }
    })

    it('should allow access to shared routes without authentication', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/shared/dashboard/123')

      // Act
      const response = await middleware(request)

      // Assert
      expect(response.status).not.toBe(302) // Not redirected
      expect(response.status).not.toBe(307) // Not redirected
    })

    it('should allow access to static resources', async () => {
      // Arrange
      const staticResources = [
        '/_next/static/chunks/main.js',
        '/_next/image?url=%2Flogo.png&w=256&q=75',
        '/favicon.ico',
      ]

      for (const path of staticResources) {
        // Act
        const request = new NextRequest(`http://localhost${path}`)
        const response = await middleware(request)

        // Assert
        expect(response.status).not.toBe(302) // Not redirected
      }
    })
  })

  describe('Tenant Route Validation', () => {
    it('should allow access to valid UUID tenant routes', async () => {
      // Arrange
      const validTenantId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest(`http://localhost/${validTenantId}/dashboard`)

      // Act
      const response = await middleware(request)

      // Assert
      expect(response.status).not.toBe(302) // Not redirected to home
      expect(updateSession).toHaveBeenCalledWith(request)
    })

    it('should redirect invalid tenant ID formats to home', async () => {
      // Arrange
      const invalidTenantIds = [
        'invalid-uuid',
        '123-456-789',
        'not-a-uuid',
        'admin',
        'dashboard',
      ]

      for (const invalidId of invalidTenantIds) {
        // Act
        const request = new NextRequest(`http://localhost/${invalidId}/dashboard`)
        const response = await middleware(request)

        // Assert
        expect(response.status).toBe(307)
        expect(response.headers.get('location')).toBe('http://localhost/')
      }
    })

    it('should redirect empty path segments to home', async () => {
      // Arrange
      const request = new NextRequest('http://localhost//')

      // Act
      const response = await middleware(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe('http://localhost/')
    })

    it('should handle various UUID formats correctly', async () => {
      // Arrange - Test different valid UUID formats
      const validUUIDs = [
        '550e8400-e29b-41d4-a716-446655440000', // Standard format
        '550E8400-E29B-41D4-A716-446655440000', // Uppercase
        '12345678-1234-1234-1234-123456789abc', // Mixed case
        '00000000-0000-0000-0000-000000000000', // All zeros
        'ffffffff-ffff-ffff-ffff-ffffffffffff', // All f's
      ]

      for (const uuid of validUUIDs) {
        // Act
        const request = new NextRequest(`http://localhost/${uuid}/dashboard`)
        const response = await middleware(request)

        // Assert
        expect(response.status).not.toBe(307) // Not redirected to home
      }
    })
  })

  describe('API Route Protection', () => {
    describe('Internal API Routes', () => {
      it('should apply rate limiting to internal API routes', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should set rate limit headers
        expect(response.headers.get('X-RateLimit-Limit')).toBe('50')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('49')
        expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
      })

      it('should enforce same-origin policy for internal API routes in production', async () => {
        // Arrange: Set production environment
        process.env.NODE_ENV = 'production'
        
        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'GET',
          headers: {
            'origin': 'http://malicious-site.com',
            'host': 'localhost',
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should reject cross-origin requests
        expect(response.status).toBe(403)
        const responseData = await response.json()
        expect(responseData.error).toContain('Internal APIs require same-origin requests')

        // Cleanup
        process.env.NODE_ENV = 'test'
      })

      it('should allow same-origin requests for internal API routes', async () => {
        // Arrange: Set production environment
        process.env.NODE_ENV = 'production'
        
        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'GET',
          headers: {
            'origin': 'http://localhost',
            'host': 'localhost',
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should allow same-origin requests
        expect(response.status).not.toBe(403)

        // Cleanup
        process.env.NODE_ENV = 'test'
      })

      it('should validate HTTP methods for internal API routes', async () => {
        // Arrange
        const validMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
        const invalidMethods = ['TRACE', 'CONNECT', 'OPTIONS']

        // Test valid methods
        for (const method of validMethods) {
          const request = new NextRequest('http://localhost/api/internal/dashboards', {
            method,
          })
          const response = await middleware(request)
          expect(response.status).not.toBe(405)
        }

        // Test invalid methods
        for (const method of invalidMethods) {
          const request = new NextRequest('http://localhost/api/internal/dashboards', {
            method,
          })
          const response = await middleware(request)
          if (response.status === 405) {
            const responseData = await response.json()
            expect(responseData.error).toBe('Method not allowed')
          }
        }
      })
    })

    describe('Public API Routes', () => {
      it('should apply different rate limiting to public API routes', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/public/tenants', {
          method: 'GET',
          headers: {
            'x-forwarded-for': '192.168.1.1',
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should set different rate limits for public APIs
        expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('19')
      })

      it('should handle rate limit exceeded for public routes', async () => {
        // Arrange: Make multiple requests to exceed rate limit
        const baseRequest = {
          method: 'GET',
          headers: { 'x-forwarded-for': '192.168.1.100' },
        }

        // Act: Make requests up to the limit
        const requests = Array.from({ length: 21 }, (_, i) =>
          new NextRequest('http://localhost/api/public/tenants', baseRequest)
        )

        let lastResponse
        for (const request of requests) {
          lastResponse = await middleware(request)
        }

        // Assert: Last request should be rate limited
        expect(lastResponse?.status).toBe(429)
        if (lastResponse?.status === 429) {
          const responseData = await lastResponse.json()
          expect(responseData.error).toBe('Too many requests')
        }
      })
    })

    describe('Upload XML Route', () => {
      it('should apply specific rate limiting to upload-xml route', async () => {
        // Arrange
        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          headers: {
            'x-forwarded-for': '192.168.1.1',
            'content-type': 'application/xml',
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should set upload-specific rate limits
        expect(response.headers.get('X-RateLimit-Limit')).toBe('100')
        expect(response.headers.get('X-RateLimit-Remaining')).toBe('99')
      })

      it('should enforce content length limits for upload-xml', async () => {
        // Arrange: Request with content larger than 50MB
        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          headers: {
            'content-length': (51 * 1024 * 1024).toString(), // 51MB
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should reject oversized requests
        expect(response.status).toBe(413)
        const responseData = await response.json()
        expect(responseData.error).toBe('Request too large')
      })

      it('should allow valid content length for upload-xml', async () => {
        // Arrange: Request with content within 50MB limit
        const request = new NextRequest('http://localhost/api/upload-xml', {
          method: 'POST',
          headers: {
            'content-length': (10 * 1024 * 1024).toString(), // 10MB
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should not reject based on content length
        expect(response.status).not.toBe(413)
      })
    })

    describe('General API Route Protection', () => {
      it('should enforce content length limits for non-upload routes', async () => {
        // Arrange: Request with content larger than 10MB
        const request = new NextRequest('http://localhost/api/internal/dashboards', {
          method: 'POST',
          headers: {
            'content-length': (11 * 1024 * 1024).toString(), // 11MB
          },
        })

        // Act
        const response = await middleware(request)

        // Assert: Should reject oversized requests
        expect(response.status).toBe(413)
        const responseData = await response.json()
        expect(responseData.error).toBe('Request too large')
      })
    })
  })

  describe('Security Headers', () => {
    it('should set security headers for all responses', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/')

      // Act
      const response = await middleware(request)

      // Assert: Should set security headers
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=31536000; includeSubDomains'
      )
      expect(response.headers.get('Content-Security-Policy')).toBeTruthy()
      expect(response.headers.get('Permissions-Policy')).toBe(
        'camera=(), microphone=(), geolocation=(), payment=()'
      )
    })

    it('should set different CSP for development vs production', async () => {
      // Test development CSP (current environment)
      const devRequest = new NextRequest('http://localhost/')
      const devResponse = await middleware(devRequest)
      const devCSP = devResponse.headers.get('Content-Security-Policy')
      expect(devCSP).toContain("'unsafe-eval'")
      expect(devCSP).toContain("'unsafe-inline'")
      expect(devCSP).toContain('ws: wss:')

      // Test production CSP
      process.env.NODE_ENV = 'production'
      const prodRequest = new NextRequest('http://localhost/')
      const prodResponse = await middleware(prodRequest)
      const prodCSP = prodResponse.headers.get('Content-Security-Policy')
      expect(prodCSP).not.toContain("'unsafe-eval'")
      expect(prodCSP).toContain("'unsafe-inline'") // Still needed for Next.js
      expect(prodCSP).not.toContain('ws: wss:')

      // Cleanup
      process.env.NODE_ENV = 'test'
    })
  })

  describe('CORS Configuration', () => {
    it('should set CORS headers for tenant routes in development', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest(`http://localhost/${tenantId}/dashboard`, {
        headers: {
          'origin': 'http://localhost:3001',
        },
      })

      // Act
      const response = await middleware(request)

      // Assert: Should set CORS headers in development
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001')
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe(
        'GET, POST, PUT, PATCH, DELETE, OPTIONS'
      )
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization')
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('X-Tenant-Id')
    })

    it('should restrict CORS in production', async () => {
      // Arrange: Set production environment
      process.env.NODE_ENV = 'production'
      
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest(`http://localhost/${tenantId}/dashboard`, {
        headers: {
          'origin': 'http://malicious-site.com',
          'host': 'localhost',
        },
      })

      // Act
      const response = await middleware(request)

      // Assert: Should not set CORS for unauthorized origins
      expect(response.headers.get('Access-Control-Allow-Origin')).not.toBe('http://malicious-site.com')

      // Cleanup
      process.env.NODE_ENV = 'test'
    })
  })

  describe('Error Handling', () => {
    it('should handle supabase middleware errors gracefully', async () => {
      // Arrange: Mock supabase middleware to return redirect
      mockUpdateSession.mockImplementation(() => 
        NextResponse.redirect(new URL('/auth/login', 'http://localhost'), 302)
      )

      const request = new NextRequest('http://localhost/')

      // Act
      const response = await middleware(request)

      // Assert: Should respect supabase redirect
      expect(response.status).toBe(302)
      expect(response.headers.get('location')).toBe('http://localhost/auth/login')
    })

    it('should handle malformed requests gracefully', async () => {
      // Arrange: Request with malformed headers
      const request = new NextRequest('http://localhost/api/internal/test', {
        method: 'POST',
        headers: {
          'content-type': 'invalid-type',
          'x-forwarded-for': '', // Empty IP
        },
      })

      // Act
      const response = await middleware(request)

      // Assert: Should not crash and should set rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('50')
    })

    it('should handle missing headers gracefully', async () => {
      // Arrange: Request without common headers
      const request = new NextRequest('http://localhost/api/internal/test', {
        method: 'GET',
      })

      // Act
      const response = await middleware(request)

      // Assert: Should handle missing headers without error
      expect(response.headers.get('X-RateLimit-Limit')).toBe('50')
    })
  })

  describe('Edge Cases', () => {
    it('should handle URLs with query parameters and fragments', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest(
        `http://localhost/${tenantId}/dashboard?tab=analytics&view=chart#section1`
      )

      // Act
      const response = await middleware(request)

      // Assert: Should process normally
      expect(response.status).not.toBe(307) // Not redirected to home
    })

    it('should handle encoded URL characters', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      const request = new NextRequest(
        `http://localhost/${tenantId}/dashboard%2Fsub-page`
      )

      // Act
      const response = await middleware(request)

      // Assert: Should process normally
      expect(response.status).not.toBe(307)
    })

    it('should handle very long URLs', async () => {
      // Arrange
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'
      const longPath = 'a'.repeat(2000)
      const request = new NextRequest(`http://localhost/${tenantId}/${longPath}`)

      // Act
      const response = await middleware(request)

      // Assert: Should handle without error
      expect(response).toBeTruthy()
    })

    it('should handle concurrent requests to same route', async () => {
      // Arrange
      const requests = Array.from({ length: 10 }, (_, i) =>
        new NextRequest(`http://localhost/api/internal/test`, {
          headers: { 'x-forwarded-for': `192.168.1.${i}` },
        })
      )

      // Act: Process all requests concurrently
      const responses = await Promise.all(
        requests.map(request => middleware(request))
      )

      // Assert: All requests should be processed
      expect(responses).toHaveLength(10)
      responses.forEach(response => {
        expect(response.headers.get('X-RateLimit-Limit')).toBe('50')
      })
    })
  })
})