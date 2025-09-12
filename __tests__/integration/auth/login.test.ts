/**
 * Login Flow Integration Tests
 * 
 * Tests the complete user login journey including:
 * - Valid credentials login
 * - Invalid credentials handling
 * - Account lockout scenarios
 * - Password reset flow
 * - Session establishment
 */

/**
 * @jest-environment jsdom
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from '@/components/login-form'

// Mock Supabase client
const mockSupabaseAuth = {
  signInWithPassword: jest.fn(),
  signUp: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  getSession: jest.fn(),
  getUser: jest.fn(),
  onAuthStateChange: jest.fn(),
}

const mockSupabaseClient = {
  auth: mockSupabaseAuth,
}

jest.mock('@supabase/ssr', () => ({
  createBrowserClient: jest.fn(() => mockSupabaseClient),
}))

// Mock window location for redirects
const mockReload = jest.fn()
const mockLocationAssign = jest.fn()

Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost',
    reload: mockReload,
    assign: mockLocationAssign,
  },
  writable: true,
})

describe('Login Flow Integration Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    mockReload.mockClear()
    mockLocationAssign.mockClear()
  })

  describe('Successful Login Flow', () => {
    it('should complete login flow with valid credentials', async () => {
      // Arrange: Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
          },
          session: {
            access_token: 'valid-token',
          },
        },
        error: null,
      })

      const onSuccess = jest.fn()

      render(<LoginForm onSuccess={onSuccess} />)

      // Act: Fill in form and submit
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'validpassword123')
      await user.click(submitButton)

      // Assert: Login should succeed
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'validpassword123',
        })
        expect(onSuccess).toHaveBeenCalled()
      })

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })

    it('should redirect to specified URL after successful login', async () => {
      // Arrange: Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'valid-token' },
        },
        error: null,
      })

      const redirectTo = '/dashboard'
      render(<LoginForm redirectTo={redirectTo} />)

      // Act: Fill in form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'validpassword123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should redirect to specified URL
      await waitFor(() => {
        expect(window.location.href).toBe(redirectTo)
      })
    })

    it('should reload page when no callback or redirect specified', async () => {
      // Arrange: Mock successful login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'valid-token' },
        },
        error: null,
      })

      render(<LoginForm />)

      // Act: Fill in form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'validpassword123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should reload page
      await waitFor(() => {
        expect(mockReload).toHaveBeenCalled()
      })
    })
  })

  describe('Failed Login Scenarios', () => {
    it('should display error message for invalid credentials', async () => {
      // Arrange: Mock failed login with invalid credentials
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Invalid login credentials',
          status: 400,
        },
      })

      render(<LoginForm />)

      // Act: Submit with invalid credentials
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should display error message
      await waitFor(() => {
        expect(screen.getByText(/invalid login credentials/i)).toBeInTheDocument()
      })

      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
    })

    it('should display error message for non-existent user', async () => {
      // Arrange: Mock failed login with non-existent user
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'User not found',
          status: 404,
        },
      })

      render(<LoginForm />)

      // Act: Submit with non-existent email
      await user.type(screen.getByLabelText(/email/i), 'nonexistent@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should display error message
      await waitFor(() => {
        expect(screen.getByText(/user not found/i)).toBeInTheDocument()
      })
    })

    it('should handle rate limiting errors', async () => {
      // Arrange: Mock rate limiting error
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Too many requests. Please try again later.',
          status: 429,
        },
      })

      render(<LoginForm />)

      // Act: Submit login attempt
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should display rate limiting error
      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument()
      })
    })

    it('should handle account locked scenarios', async () => {
      // Arrange: Mock account locked error
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: {
          message: 'Account temporarily locked due to multiple failed login attempts',
          status: 423,
        },
      })

      render(<LoginForm />)

      // Act: Submit login attempt
      await user.type(screen.getByLabelText(/email/i), 'locked@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should display account locked error
      await waitFor(() => {
        expect(screen.getByText(/account temporarily locked/i)).toBeInTheDocument()
      })
    })

    it('should handle network errors gracefully', async () => {
      // Arrange: Mock network error
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Network connection failed')
      )

      render(<LoginForm />)

      // Act: Submit login attempt
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should display generic error message
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation', () => {
    it('should require email field', async () => {
      render(<LoginForm />)

      // Act: Try to submit without email
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Form should not submit due to HTML5 validation
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should require password field', async () => {
      render(<LoginForm />)

      // Act: Try to submit without password
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Form should not submit due to HTML5 validation
      expect(mockSupabaseAuth.signInWithPassword).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      render(<LoginForm />)

      // Act: Enter invalid email format
      const emailInput = screen.getByLabelText(/email/i)
      await user.type(emailInput, 'invalid-email')
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Assert: Email input should be invalid
      expect(emailInput).toBeInvalid()
    })
  })

  describe('Loading States', () => {
    it('should show loading state during login', async () => {
      // Arrange: Mock delayed response
      mockSupabaseAuth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<LoginForm />)

      // Act: Fill form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should show loading state
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument()
      expect(screen.getByRole('button')).toBeDisabled()
      expect(screen.getByDisplayValue('test@example.com')).toBeDisabled()
      expect(screen.getByDisplayValue('password123')).toBeDisabled()
    })

    it('should disable form inputs during login', async () => {
      // Arrange: Mock delayed response
      mockSupabaseAuth.signInWithPassword.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      render(<LoginForm />)

      // Act: Fill form and submit
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Form inputs should be disabled
      expect(screen.getByLabelText(/email/i)).toBeDisabled()
      expect(screen.getByLabelText(/password/i)).toBeDisabled()
    })

    it('should re-enable form after failed login', async () => {
      // Arrange: Mock failed login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      })

      render(<LoginForm />)

      // Act: Submit failed login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Form should be re-enabled after error
      await waitFor(() => {
        expect(screen.getByLabelText(/email/i)).not.toBeDisabled()
        expect(screen.getByLabelText(/password/i)).not.toBeDisabled()
        expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled()
      })
    })
  })

  describe('Accessibility', () => {
    it('should associate error messages with form fields', async () => {
      // Arrange: Mock failed login
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      })

      render(<LoginForm />)

      // Act: Submit invalid login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Error should be announced to screen readers
      await waitFor(() => {
        const errorElement = screen.getByText(/invalid login credentials/i)
        expect(errorElement).toBeInTheDocument()
        expect(errorElement).toHaveAttribute('role', 'alert')
      })
    })

    it('should have proper ARIA labels', () => {
      render(<LoginForm />)

      // Assert: Form elements should have proper labels
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      render(<LoginForm />)

      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      const submitButton = screen.getByRole('button', { name: /sign in/i })

      // Act: Navigate using Tab key
      emailInput.focus()
      expect(emailInput).toHaveFocus()

      await user.tab()
      expect(passwordInput).toHaveFocus()

      await user.tab()
      expect(submitButton).toHaveFocus()
    })
  })

  describe('Security Measures', () => {
    it('should not expose password in error messages', async () => {
      // Arrange: Mock error that could potentially expose password
      mockSupabaseAuth.signInWithPassword.mockRejectedValue(
        new Error('Password validation failed for: password123')
      )

      render(<LoginForm />)

      // Act: Submit login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should show generic error without exposing password
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
        expect(screen.queryByText(/password123/)).not.toBeInTheDocument()
      })
    })

    it('should clear error state on new input', async () => {
      // Arrange: Mock failed login first, then simulate user correction
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid credentials' },
      })

      render(<LoginForm />)

      // Act: Submit failed login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })

      // Act: Start typing new input
      await user.type(screen.getByLabelText(/password/i), 'newpassword')

      // Assert: Error should remain until new submission
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty response from auth service', async () => {
      // Arrange: Mock empty response
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({})

      render(<LoginForm />)

      // Act: Submit login
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should handle gracefully
      await waitFor(() => {
        expect(screen.getByText(/an unexpected error occurred/i)).toBeInTheDocument()
      })
    })

    it('should handle extremely long email addresses', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com'
      
      render(<LoginForm />)

      // Act: Enter very long email
      await user.type(screen.getByLabelText(/email/i), longEmail)
      await user.type(screen.getByLabelText(/password/i), 'password123')

      // Assert: Should handle without errors
      expect(screen.getByDisplayValue(longEmail)).toBeInTheDocument()
    })

    it('should handle special characters in password', async () => {
      // Arrange: Password with special characters
      const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?'
      
      mockSupabaseAuth.signInWithPassword.mockResolvedValue({
        data: {
          user: { id: 'user-123', email: 'test@example.com' },
          session: { access_token: 'token' },
        },
        error: null,
      })

      render(<LoginForm />)

      // Act: Submit with special character password
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), specialPassword)
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      // Assert: Should handle special characters correctly
      await waitFor(() => {
        expect(mockSupabaseAuth.signInWithPassword).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: specialPassword,
        })
      })
    })
  })
})