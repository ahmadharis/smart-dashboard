/**
 * Authentication Test Helpers
 * 
 * Shared utilities and mocks for authentication integration tests
 */

import type { User } from '@supabase/supabase-js'

// Mock user data for tests
export const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'test-user-123',
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
  ...overrides,
})

// Mock session data
export const createMockSession = (user?: User) => ({
  user: user || createMockUser(),
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
  expires_in: 3600,
  token_type: 'bearer' as const,
})

// Mock tenant data
export const createMockTenant = (overrides: any = {}) => ({
  tenant_id: 'tenant-123',
  name: 'Test Tenant',
  domain: 'example.com',
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-01T00:00:00Z',
  ...overrides,
})

// Mock tenant access object
export const createMockTenantAccess = (tenants: Record<string, boolean>) => ({
  tenantAccess: tenants,
})

// Supabase client mock factory
export const createMockSupabaseClient = (overrides: any = {}) => {
  const defaultMock = {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Sign up failed' },
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      contains: jest.fn().mockReturnThis(),
      containedBy: jest.fn().mockReturnThis(),
      rangeGt: jest.fn().mockReturnThis(),
      rangeGte: jest.fn().mockReturnThis(),
      rangeLt: jest.fn().mockReturnThis(),
      rangeLte: jest.fn().mockReturnThis(),
      rangeAdjacent: jest.fn().mockReturnThis(),
      overlaps: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      match: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      filter: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    })),
  }

  return {
    ...defaultMock,
    ...overrides,
    auth: {
      ...defaultMock.auth,
      ...overrides.auth,
    },
  }
}

// Authentication state scenarios
export const AUTH_SCENARIOS = {
  UNAUTHENTICATED: {
    session: null,
    user: null,
    tenantAccess: {},
  },
  AUTHENTICATED_NO_TENANTS: {
    session: createMockSession(),
    user: createMockUser(),
    tenantAccess: {},
  },
  AUTHENTICATED_SINGLE_TENANT: {
    session: createMockSession(),
    user: createMockUser(),
    tenantAccess: { 'tenant-123': true },
  },
  AUTHENTICATED_MULTIPLE_TENANTS: {
    session: createMockSession(),
    user: createMockUser(),
    tenantAccess: {
      'tenant-123': true,
      'tenant-456': true,
      'tenant-789': false,
    },
  },
  AUTHENTICATED_ADMIN: {
    session: createMockSession(createMockUser({
      user_metadata: { role: 'admin' },
    })),
    user: createMockUser({
      user_metadata: { role: 'admin' },
    }),
    tenantAccess: {
      'tenant-123': true,
      'tenant-456': true,
      'tenant-789': true,
      'tenant-admin': true,
    },
  },
} as const

// Mock fetch responses for tenant permissions API
export const mockTenantPermissionsResponse = (tenantAccess: Record<string, boolean>) => ({
  ok: true,
  json: () => Promise.resolve({ tenantAccess }),
  headers: {
    get: (name: string) => {
      if (name === 'content-type') return 'application/json'
      return null
    },
  },
})

// Mock fetch error responses
export const mockFetchError = (status: number, message: string) => ({
  ok: false,
  status,
  statusText: message,
  json: () => Promise.resolve({ error: message }),
  headers: {
    get: () => 'application/json',
  },
})

// Rate limiting helpers
export class MockRateLimiter {
  private requests = new Map<string, { count: number; resetTime: number }>()

  checkRateLimit(ip: string, limit: number = 50, windowMs: number = 60000) {
    const now = Date.now()
    const key = ip
    const record = this.requests.get(key)

    if (!record || now > record.resetTime) {
      this.requests.set(key, { count: 1, resetTime: now + windowMs })
      return {
        allowed: true,
        remaining: limit - 1,
        reset: Math.ceil((now + windowMs) / 1000),
      }
    }

    if (record.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        reset: Math.ceil(record.resetTime / 1000),
      }
    }

    record.count++
    return {
      allowed: true,
      remaining: limit - record.count,
      reset: Math.ceil(record.resetTime / 1000),
    }
  }

  reset() {
    this.requests.clear()
  }
}

// UUID validation helpers
export const VALID_UUIDS = [
  '550e8400-e29b-41d4-a716-446655440000',
  '550E8400-E29B-41D4-A716-446655440000',
  '12345678-1234-1234-1234-123456789abc',
  '00000000-0000-0000-0000-000000000000',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
]

export const INVALID_UUIDS = [
  'invalid-uuid',
  '123-456-789',
  'not-a-uuid',
  '550e8400-e29b-41d4-a716-44665544000', // Too short
  '550e8400-e29b-41d4-a716-4466554400000', // Too long
  '550e8400-e29b-41d4-a716-44665544000g', // Invalid character
  '',
  'null',
  'undefined',
]

// Environment setup helpers
export const setupTestEnvironment = (env: Record<string, string> = {}) => {
  const originalEnv = process.env
  
  process.env = {
    ...originalEnv,
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
    ...env,
  }

  return () => {
    process.env = originalEnv
  }
}

// Async test helpers
export const waitFor = (condition: () => boolean, timeout: number = 5000): Promise<void> => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const check = () => {
      if (condition()) {
        resolve()
      } else if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for condition after ${timeout}ms`))
      } else {
        setTimeout(check, 10)
      }
    }
    
    check()
  })
}

// Mock localStorage for browser tests
export const mockLocalStorage = () => {
  const store = new Map<string, string>()
  
  const localStorage = {
    getItem: jest.fn((key: string) => store.get(key) || null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key)
    }),
    clear: jest.fn(() => {
      store.clear()
    }),
    length: 0,
    key: jest.fn(() => null),
  }

  Object.defineProperty(global, 'localStorage', {
    value: localStorage,
    writable: true,
  })

  return localStorage
}

// Mock sessionStorage for browser tests
export const mockSessionStorage = () => {
  const store = new Map<string, string>()
  
  const sessionStorage = {
    getItem: jest.fn((key: string) => store.get(key) || null),
    setItem: jest.fn((key: string, value: string) => {
      store.set(key, value)
    }),
    removeItem: jest.fn((key: string) => {
      store.delete(key)
    }),
    clear: jest.fn(() => {
      store.clear()
    }),
    length: 0,
    key: jest.fn(() => null),
  }

  Object.defineProperty(global, 'sessionStorage', {
    value: sessionStorage,
    writable: true,
  })

  return sessionStorage
}

// Test data factories
export const createTestTenants = (count: number = 3) => {
  return Array.from({ length: count }, (_, index) => ({
    tenant_id: `tenant-${index + 1}`,
    name: `Test Tenant ${index + 1}`,
    domain: `example${index + 1}.com`,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  }))
}

export const createTestUsers = (count: number = 3) => {
  return Array.from({ length: count }, (_, index) =>
    createMockUser({
      id: `user-${index + 1}`,
      email: `user${index + 1}@example.com`,
    })
  )
}

// Security test helpers
export const createMaliciousPayloads = () => ({
  xss: [
    '<script>alert("xss")</script>',
    'javascript:alert("xss")',
    '"><script>alert("xss")</script>',
    '\';alert("xss");//',
  ],
  sqlInjection: [
    "'; DROP TABLE users; --",
    "' OR '1'='1",
    '1; DELETE FROM tenants WHERE 1=1',
    "admin'--",
  ],
  pathTraversal: [
    '../../../etc/passwd',
    '..\\..\\..\\windows\\system32',
    '....//....//....//etc/passwd',
  ],
  longStrings: [
    'a'.repeat(10000),
    'x'.repeat(100000),
    '🎉'.repeat(1000), // Unicode
  ],
})

// Performance test helpers
export const measureTime = async <T>(fn: () => Promise<T>): Promise<{ result: T; time: number }> => {
  const start = performance.now()
  const result = await fn()
  const end = performance.now()
  return { result, time: end - start }
}

export const runConcurrently = async <T>(
  fn: () => Promise<T>,
  concurrency: number = 10
): Promise<T[]> => {
  const promises = Array.from({ length: concurrency }, () => fn())
  return Promise.all(promises)
}

// Error assertion helpers
export const expectToThrow = async (fn: () => Promise<any>, errorMessage?: string) => {
  try {
    await fn()
    throw new Error('Expected function to throw')
  } catch (error) {
    if (errorMessage) {
      expect((error as Error).message).toMatch(errorMessage)
    }
  }
}

export const expectToReject = async (promise: Promise<any>, errorMessage?: string) => {
  try {
    await promise
    throw new Error('Expected promise to reject')
  } catch (error) {
    if (errorMessage) {
      expect((error as Error).message).toMatch(errorMessage)
    }
  }
}