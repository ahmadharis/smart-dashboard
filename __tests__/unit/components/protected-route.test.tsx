/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, mockRouter } from '@/__tests__/utils/test-utils';
import { ProtectedRoute } from '@/components/protected-route';
import { useAuth } from '@/components/auth-provider';

// Mock dependencies
jest.mock('@/components/auth-provider');
jest.mock('@/components/access-denied', () => ({
  AccessDenied: ({ deniedTenantId }: { deniedTenantId: string }) => (
    <div data-testid="access-denied">
      Access denied for tenant: {deniedTenantId}
    </div>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Loader2: ({ className, ...props }: any) => (
    <div data-testid="loader-icon" className={className} {...props} />
  ),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('ProtectedRoute', () => {
  const mockCheckTenantAccess = jest.fn();
  
  const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckTenantAccess.mockReturnValue(true);
    mockRouter.push.mockClear();
  });

  describe('Loading State', () => {
    it('shows loading spinner when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('applies correct styling to loading screen', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      const loadingContainer = screen.getByText('Loading...').closest('div');
      expect(loadingContainer?.parentElement).toHaveClass(
        'min-h-screen',
        'bg-background',
        'flex',
        'items-center',
        'justify-center'
      );
    });
  });

  describe('Unauthenticated User', () => {
    it('redirects to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('returns null while redirecting unauthenticated user', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      const { container } = render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(container.firstChild).toBeNull();
    });

    it('does not call router.push multiple times during loading', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Authenticated User with Access', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('renders children when user is authenticated and has access', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();
    });

    it('passes tenantId to checkTenantAccess', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockCheckTenantAccess).toHaveBeenCalledWith('test-tenant');
    });
  });

  describe('Authenticated User without Access', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('shows access denied when user lacks tenant access', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(false);

      render(
        <ProtectedRoute tenantId="restricted-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('access-denied')).toBeInTheDocument();
      expect(screen.getByText('Access denied for tenant: restricted-tenant')).toBeInTheDocument();
      expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('does not redirect when showing access denied', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(false);

      render(
        <ProtectedRoute tenantId="restricted-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).not.toHaveBeenCalled();
    });
  });

  describe('Tenant Selector Special Case', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('bypasses access check for tenant-selector page', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      // Even if checkTenantAccess would return false, should still render
      mockCheckTenantAccess.mockReturnValue(false);

      render(
        <ProtectedRoute tenantId="tenant-selector">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
      expect(screen.queryByTestId('access-denied')).not.toBeInTheDocument();
      expect(mockCheckTenantAccess).not.toHaveBeenCalledWith('tenant-selector');
    });
  });

  describe('State Transitions', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('transitions from loading to authenticated state', async () => {
      const { rerender } = render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      // Initial loading state
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();

      // Transition to authenticated
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });

    it('transitions from loading to unauthenticated redirect', async () => {
      const { rerender } = render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      // Initial loading state
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
      expect(mockRouter.push).not.toHaveBeenCalled();

      // Transition to unauthenticated
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.queryByTestId('loader-icon')).not.toBeInTheDocument();
      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });
  });

  describe('useEffect Dependencies', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('re-evaluates authentication when user changes', () => {
      const { rerender } = render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      // First render - no user
      mockUseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');

      // Second render - with user
      mockRouter.push.mockClear();
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).not.toHaveBeenCalled();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Multiple Children', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('renders multiple child components when authorized', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      render(
        <ProtectedRoute tenantId="test-tenant">
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles undefined user gracefully', () => {
      mockUseAuth.mockReturnValue({
        user: undefined as any,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(mockRouter.push).toHaveBeenCalledWith('/auth/login');
    });

    it('handles checkTenantAccess errors by throwing', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: {},
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockImplementation(() => {
        throw new Error('Access check failed');
      });

      // Should throw the error rather than handling gracefully
      expect(() => {
        render(
          <ProtectedRoute tenantId="test-tenant">
            <TestComponent />
          </ProtectedRoute>
        );
      }).toThrow('Access check failed');
    });
  });

  describe('Performance', () => {
    it('does not cause unnecessary re-renders', () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      };

      mockUseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        tenantAccess: { 'test-tenant': true },
        checkTenantAccess: mockCheckTenantAccess,
        refreshPermissions: jest.fn(),
      });

      mockCheckTenantAccess.mockReturnValue(true);

      const { rerender } = render(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();

      // Re-render with same props should not cause issues
      rerender(
        <ProtectedRoute tenantId="test-tenant">
          <TestComponent />
        </ProtectedRoute>
      );

      expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    });
  });
});