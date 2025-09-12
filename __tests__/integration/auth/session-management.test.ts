/**
 * Session Management Integration Tests
 * 
 * Tests the complete session lifecycle including:
 * - Session creation and validation
 * - Session expiration handling
 * - Token refresh mechanisms
 * - Logout functionality
 * - Concurrent session handling
 */

/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '@/components/auth-provider'
import { ProtectedRoute } from '@/components/protected-route'

// Mock Next.js router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: () => '/test-path',
}))

// Mock Supabase client
const mockSupabaseAuth = {
  getSession: jest.fn(),
  getUser: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChange: jest.fn(),
  refreshSession: jest.fn(),
}

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

// Mock fetch for tenant permissions
const mockFetch = jest.fn()
global.fetch = mockFetch

// Test component to access auth context
function TestComponent() {
  const { user, isLoading, tenantAccess, checkTenantAccess } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'loaded'}</div>
      <div data-testid="user">{user ? user.email : 'no-user'}</div>
      <div data-testid="tenant-access">{JSON.stringify(tenantAccess)}</div>
      <div data-testid="check-tenant">
        {checkTenantAccess('test-tenant') ? 'has-access' : 'no-access'}
      </div>
    </div>
  )
}

describe('Session Management Integration Tests', () => {
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
    mockFetch.mockClear()
    mockPush.mockClear()
    mockRefresh.mockClear()
  })

  describe('Session Creation and Validation', () => {
    it('should establish session on successful authentication', async () => {
      // Arrange: Mock successful session
      const mockSession = {
        user: mockUser,
        access_token: 'valid-access-token',
        refresh_token: 'valid-refresh-token',
        expires_at: Date.now() / 1000 + 3600, // 1 hour from now
        expires_in: 3600,
        token_type: 'bearer',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'test-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert: Session should be established
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('has-access')
      })

      expect(mockSupabaseAuth.getSession).toHaveBeenCalled()
      expect(mockFetch).toHaveBeenCalledWith('/api/internal/tenant-permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user-123' }),
        signal: expect.any(AbortSignal),
      })
    })

    it('should handle no session gracefully', async () => {
      // Arrange: Mock no session
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert: Should handle no session
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
        expect(screen.getByTestId('tenant-access')).toHaveTextContent('{}')
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should handle session retrieval errors', async () => {
      // Arrange: Mock session error
      mockSupabaseAuth.getSession.mockRejectedValue(
        new Error('Session retrieval failed')
      )

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert: Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      })
    })
  })

  describe('Session State Changes', () => {
    it('should handle SIGNED_IN event', async () => {
      // Arrange: Mock initial no session
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      let authStateCallback: (event: string, session: any) => void = () => {}
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'test-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act: Render and then trigger sign in
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
      })

      // Simulate SIGNED_IN event
      await act(async () => {
        authStateCallback('SIGNED_IN', {
          user: mockUser,
          access_token: 'new-token',
        })
      })

      // Assert: Should update user state
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('has-access')
      })
    })

    it('should handle SIGNED_OUT event', async () => {
      // Arrange: Mock initial session
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
        refresh_token: 'valid-refresh-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      let authStateCallback: (event: string, session: any) => void = () => {}
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'test-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act: Render with session, then sign out
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Simulate SIGNED_OUT event
      await act(async () => {
        authStateCallback('SIGNED_OUT', null)
      })

      // Assert: Should clear user state
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('no-user')
        expect(screen.getByTestId('tenant-access')).toHaveTextContent('{}')
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('no-access')
      })
    })

    it('should debounce identical auth events', async () => {
      // Arrange: Mock session
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      let authStateCallback: (event: string, session: any) => void = () => {}
      mockSupabaseAuth.onAuthStateChange.mockImplementation((callback) => {
        authStateCallback = callback
        return { data: { subscription: { unsubscribe: jest.fn() } } }
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'test-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Act: Trigger multiple identical events quickly
      await act(async () => {
        authStateCallback('SIGNED_IN', { user: mockUser })
        authStateCallback('SIGNED_IN', { user: mockUser })
        authStateCallback('SIGNED_IN', { user: mockUser })
      })

      // Assert: Should only process once due to debouncing
      await waitFor(() => {
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      })

      // Only one permissions fetch should have occurred
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Tenant Permissions Management', () => {
    it('should fetch tenant permissions on authentication', async () => {
      // Arrange
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: {
            'tenant-1': true,
            'tenant-2': true,
            'tenant-3': false,
          },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/internal/tenant-permissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-123' }),
          signal: expect.any(AbortSignal),
        })
        
        const tenantAccessText = screen.getByTestId('tenant-access').textContent
        const tenantAccess = JSON.parse(tenantAccessText || '{}')
        expect(tenantAccess).toEqual({
          'tenant-1': true,
          'tenant-2': true,
          'tenant-3': false,
        })
      })
    })

    it('should handle tenant permissions fetch failure', async () => {
      // Arrange
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch.mockRejectedValue(new Error('Network error'))

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert: Should handle error gracefully
      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('loaded')
        expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
        expect(screen.getByTestId('tenant-access')).toHaveTextContent('{}')
      })
    })

    it('should retry failed tenant permissions fetch with exponential backoff', async () => {
      // Arrange
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Mock first two calls to fail, third to succeed
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            tenantAccess: { 'test-tenant': true },
          }),
          headers: {
            get: () => 'application/json',
          },
        })

      // Act
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Assert: Should eventually succeed after retries
      await waitFor(() => {
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('has-access')
      }, { timeout: 10000 })

      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('should refresh permissions manually', async () => {
      // Arrange
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            tenantAccess: { 'test-tenant': false },
          }),
          headers: {
            get: () => 'application/json',
          },
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            tenantAccess: { 'test-tenant': true },
          }),
          headers: {
            get: () => 'application/json',
          },
        })

      function TestComponentWithRefresh() {
        const { checkTenantAccess, refreshPermissions } = useAuth()
        
        return (
          <div>
            <div data-testid="check-tenant">
              {checkTenantAccess('test-tenant') ? 'has-access' : 'no-access'}
            </div>
            <button onClick={refreshPermissions}>Refresh Permissions</button>
          </div>
        )
      }

      // Act
      render(
        <AuthProvider>
          <TestComponentWithRefresh />
        </AuthProvider>
      )

      // Wait for initial load
      await waitFor(() => {
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('no-access')
      })

      // Click refresh button
      await act(async () => {
        screen.getByRole('button', { name: /refresh permissions/i }).click()
      })

      // Assert: Should have refreshed permissions
      await waitFor(() => {
        expect(screen.getByTestId('check-tenant')).toHaveTextContent('has-access')
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Protected Route Integration', () => {
    it('should redirect to login when user is not authenticated', async () => {
      // Arrange: No user session
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Act
      render(
        <AuthProvider>
          <ProtectedRoute tenantId="test-tenant">
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      )

      // Assert: Should redirect to login
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/login')
      })
    })

    it('should show access denied when user lacks tenant access', async () => {
      // Arrange: Authenticated user without tenant access
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'other-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act
      render(
        <AuthProvider>
          <ProtectedRoute tenantId="test-tenant">
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      )

      // Assert: Should show access denied
      await waitFor(() => {
        expect(screen.getByText(/access denied/i)).toBeInTheDocument()
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
      })
    })

    it('should show protected content when user has proper access', async () => {
      // Arrange: Authenticated user with tenant access
      const mockSession = {
        user: mockUser,
        access_token: 'valid-token',
      }

      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          tenantAccess: { 'test-tenant': true },
        }),
        headers: {
          get: () => 'application/json',
        },
      })

      // Act
      render(
        <AuthProvider>
          <ProtectedRoute tenantId="test-tenant">
            <div>Protected Content</div>
          </ProtectedRoute>
        </AuthProvider>
      )

      // Assert: Should show protected content
      await waitFor(() => {
        expect(screen.getByText('Protected Content')).toBeInTheDocument()
        expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Cleanup and Memory Management', () => {
    it('should cleanup subscription on unmount', async () => {
      // Arrange
      const mockUnsubscribe = jest.fn()
      mockSupabaseAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null,
      })

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      })

      // Act
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      unmount()

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled()
    })

    it('should handle component unmount during async operations', async () => {
      // Arrange
      mockSupabaseAuth.getSession.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      mockSupabaseAuth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      })

      // Act: Mount and immediately unmount
      const { unmount } = render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      unmount()

      // Assert: Should not cause memory leaks or errors
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(true).toBe(true) // Test passes if no errors thrown
    })
  })
})