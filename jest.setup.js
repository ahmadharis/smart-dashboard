import '@testing-library/jest-dom'

// Setup MSW conditionally for integration tests
let server
try {
  const { server: mswServer } = require('./src/mocks/server')
  server = mswServer
  
  // Establish API mocking before all tests
  beforeAll(() => {
    server.listen({
      onUnhandledRequest: 'warn',
    })
  })

  // Reset any request handlers that we may add during the tests,
  // so they don't affect other tests
  afterEach(() => {
    server.resetHandlers()
  })

  // Clean up after the tests are finished
  afterAll(() => {
    server.close()
  })
} catch (error) {
  // MSW not available, skip server setup (for unit tests)
  console.log('MSW server setup skipped')
}

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({
    tenantId: 'test-tenant',
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Create comprehensive Supabase mock
const createMockSupabaseQuery = () => ({
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
  abortSignal: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  maybeSingle: jest.fn().mockResolvedValue({
    data: null,
    error: null,
  }),
  then: jest.fn().mockResolvedValue({
    data: [],
    error: null,
  }),
})

const createMockSupabaseClient = () => ({
  auth: {
    getSession: jest.fn().mockResolvedValue({
      data: {
        session: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
          access_token: 'test-token',
        },
      },
      error: null,
    }),
    getUser: jest.fn().mockResolvedValue({
      data: {
        user: {
          id: 'test-user-id',
          email: 'test@example.com',
        },
      },
      error: null,
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: {} },
      error: null,
    }),
    signUp: jest.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id' }, session: {} },
      error: null,
    }),
  },
  from: jest.fn(() => createMockSupabaseQuery()),
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: {}, error: null }),
      download: jest.fn().mockResolvedValue({ data: {}, error: null }),
      remove: jest.fn().mockResolvedValue({ data: {}, error: null }),
    })),
  },
})

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn().mockImplementation(createMockSupabaseClient),
}))

// Mock @supabase/auth-helpers-nextjs
jest.mock('@supabase/auth-helpers-nextjs', () => ({
  createServerComponentClient: jest.fn().mockImplementation(createMockSupabaseClient),
  createRouteHandlerClient: jest.fn().mockImplementation(createMockSupabaseClient),
  createMiddlewareClient: jest.fn().mockImplementation(createMockSupabaseClient),
}))

// Mock our custom Supabase utilities
jest.mock('@/lib/supabase', () => ({
  createClient: jest.fn().mockImplementation(createMockSupabaseClient),
  createServiceClient: jest.fn().mockImplementation(createMockSupabaseClient),
}))

// Mock auth middleware functions
jest.mock('@/lib/auth-middleware', () => ({
  validateAuthAndTenant: jest.fn().mockResolvedValue({
    isValid: true,
    tenantId: 'test-tenant-id',
    user: { id: 'test-user-id', email: 'test@example.com' },
    tenant: { id: 'test-tenant-id', name: 'Test Tenant' },
  }),
  validateTenantApiKey: jest.fn().mockResolvedValue({
    id: 'test-tenant-id',
    name: 'Test Tenant',
  }),
  checkRateLimit: jest.fn().mockReturnValue(true),
}))

// Mock next/headers
jest.mock('next/headers', () => ({
  cookies: () => ({
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
  }),
  headers: () => ({
    get: jest.fn(),
    set: jest.fn(),
  }),
}))

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key'
process.env.SUPABASE_URL = 'https://test.supabase.co'
process.env.SUPABASE_ANON_KEY = 'test-anon-key'
process.env.NODE_ENV = 'test'
process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL = 'http://localhost:3000'

// Suppress console errors in tests unless needed
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})

// Mock Web APIs for Node.js environment
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, options = {}) {
      Object.defineProperty(this, 'url', {
        value: typeof input === 'string' ? input : input.url,
        writable: false,
        configurable: true
      })
      this.method = options.method || 'GET'
      this.headers = new Map()
      
      if (options.headers) {
        if (options.headers instanceof Map) {
          this.headers = new Map(options.headers)
        } else if (typeof options.headers === 'object') {
          Object.entries(options.headers).forEach(([key, value]) => {
            this.headers.set(key, value)
          })
        }
      }
    }
  }
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      this.headers = new Map()
      
      if (options.headers) {
        if (options.headers instanceof Map) {
          this.headers = new Map(options.headers)
        } else if (typeof options.headers === 'object') {
          Object.entries(options.headers).forEach(([key, value]) => {
            this.headers.set(key, value)
          })
        }
      }
    }
    
    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body)
      }
      return this.body
    }
    
    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body)
    }
    
    static json(data, options = {}) {
      return new Response(JSON.stringify(data), {
        ...options,
        headers: {
          'content-type': 'application/json',
          ...options.headers
        }
      })
    }
  }
}

if (typeof global.Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.map = new Map()
      if (init) {
        if (init instanceof Map) {
          this.map = new Map(init)
        } else if (typeof init === 'object') {
          Object.entries(init).forEach(([key, value]) => {
            this.map.set(key.toLowerCase(), value)
          })
        }
      }
    }
    
    get(key) {
      return this.map.get(key.toLowerCase())
    }
    
    set(key, value) {
      this.map.set(key.toLowerCase(), value)
    }
    
    has(key) {
      return this.map.has(key.toLowerCase())
    }
    
    delete(key) {
      this.map.delete(key.toLowerCase())
    }
  }
}

// Mock browser APIs conditionally (only in jsdom environment)
if (typeof window !== 'undefined') {
  // Mock window.matchMedia for theme provider
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })

  // Mock IntersectionObserver
  global.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))

  // Mock ResizeObserver
  global.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }))
}