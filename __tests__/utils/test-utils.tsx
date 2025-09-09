import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'

// Mock Next.js router
const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
}

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ tenantId: 'test-tenant' }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Custom render function with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options })

// Re-export everything
export * from '@testing-library/react'
export { customRender as render }
export { mockRouter }

// Test data factories
export const createMockUser = (overrides?: Partial<any>) => ({
  id: 'test-user-id',
  email: 'test@example.com',
  name: 'Test User',
  ...overrides,
})

export const createMockTenant = (overrides?: Partial<any>) => ({
  id: 'test-tenant',
  name: 'Test Tenant',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockDashboard = (overrides?: Partial<any>) => ({
  id: 1,
  name: 'Test Dashboard',
  description: 'A test dashboard',
  tenant_id: 'test-tenant',
  sort_order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

export const createMockDataFile = (overrides?: Partial<any>) => ({
  id: 1,
  name: 'test-data.xml',
  file_path: '/uploads/test-data.xml',
  tenant_id: 'test-tenant',
  sort_order: 1,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  ...overrides,
})

// Helper to wait for async operations
export const waitForLoadingToFinish = () => 
  new Promise(resolve => setTimeout(resolve, 0))

// Helper to mock fetch responses
export const mockFetch = (responseData: any, options?: { status?: number, ok?: boolean }) => {
  const mockResponse = {
    ok: options?.ok ?? true,
    status: options?.status ?? 200,
    json: jest.fn().mockResolvedValue(responseData),
    text: jest.fn().mockResolvedValue(JSON.stringify(responseData)),
  }
  
  global.fetch = jest.fn().mockResolvedValue(mockResponse)
  return mockResponse
}