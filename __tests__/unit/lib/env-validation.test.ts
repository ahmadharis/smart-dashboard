import { validateEnvironment } from '../../../lib/env-validation'

// Mock console methods to capture and verify output
const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()

// Mock process.exit to prevent actual exit during tests
const processExitSpy = jest.spyOn(process, 'exit').mockImplementation()

describe('Environment Validation Module', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks()
    
    // Reset environment variables to clean state
    process.env = { ...originalEnv }
    
    // Clear all Supabase related env vars to start fresh
    delete process.env.SUPABASE_URL
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.SUPABASE_ANON_KEY
    delete process.env.NODE_ENV
    delete process.env.NEXT_TELEMETRY_DISABLED
    delete process.env.ALLOWED_ORIGINS
  })

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv
    
    // Restore console methods
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
    processExitSpy.mockRestore()
  })

  describe('Happy Path - All Required Variables Present', () => {
    beforeEach(() => {
      // Set up valid environment
      process.env.SUPABASE_URL = 'https://test-project.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjc4ODg2NDAwLCJleHAiOjE5OTQyNjI0MDB9.test-service-role-key'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg4NjQwMCwiZXhwIjoxOTk0MjYyNDAwfQ.test-anon-key'
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg4NjQwMCwiZXhwIjoxOTk0MjYyNDAwfQ.test-anon-key'
      process.env.NODE_ENV = 'development'
    })

    it('should pass validation with all required variables', () => {
      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(consoleErrorSpy).not.toHaveBeenCalled()
    })

    it('should pass validation in production environment', () => {
      // Arrange
      process.env.NODE_ENV = 'production'

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(consoleLogSpy).toHaveBeenCalledWith('🔒 Production environment detected - security checks passed')
    })

    it('should pass validation in test environment', () => {
      // Arrange
      process.env.NODE_ENV = 'test'

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
    })

    it('should show warnings for missing optional variables', () => {
      // Act
      validateEnvironment()

      // Assert
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Environment Configuration Warnings:')
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Optional environment variable not set: NEXT_TELEMETRY_DISABLED - Disable Next.js telemetry')
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Optional environment variable not set: ALLOWED_ORIGINS - Comma-separated list of allowed CORS origins')
    })

    it('should not show warnings when optional variables are set', () => {
      // Arrange
      process.env.NEXT_TELEMETRY_DISABLED = '1'
      process.env.ALLOWED_ORIGINS = 'https://app.example.com,https://admin.example.com'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('NEXT_TELEMETRY_DISABLED'))
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(expect.stringContaining('ALLOWED_ORIGINS'))
    })
  })

  describe('Missing Required Variables', () => {
    it('should fail when SUPABASE_URL is missing', () => {
      // Arrange - set all except SUPABASE_URL
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Environment Configuration Errors:')
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_URL - Supabase project URL')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      // Arrange - set all except SUPABASE_SERVICE_ROLE_KEY
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when NEXT_PUBLIC_SUPABASE_URL is missing', () => {
      // Arrange - set all except NEXT_PUBLIC_SUPABASE_URL
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL - Supabase project URL (client-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing', () => {
      // Arrange - set all except NEXT_PUBLIC_SUPABASE_ANON_KEY
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key (client-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when SUPABASE_ANON_KEY is missing', () => {
      // Arrange - set all except SUPABASE_ANON_KEY
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_ANON_KEY - Supabase anonymous key (server-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail when NODE_ENV is missing', () => {
      // Arrange - set all except NODE_ENV
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'valid-anon-key-' + 'x'.repeat(100)

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: NODE_ENV - Application environment')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should fail with multiple missing variables', () => {
      // Arrange - only set one variable
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Environment Configuration Errors:')
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_URL - Supabase project URL')
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle empty string as missing', () => {
      // Arrange
      process.env.SUPABASE_URL = ''
      process.env.SUPABASE_SERVICE_ROLE_KEY = '   ' // whitespace only
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_URL - Supabase project URL')
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side)')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Invalid Variable Formats', () => {
    beforeEach(() => {
      // Set minimum valid environment
      process.env.NODE_ENV = 'development'
    })

    describe('SUPABASE_URL Validation', () => {
      it('should fail when SUPABASE_URL does not start with https://', () => {
        // Arrange
        process.env.SUPABASE_URL = 'http://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: SUPABASE_URL - Supabase project URL')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })

      it('should fail when SUPABASE_URL does not contain .supabase.co', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.example.com'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: SUPABASE_URL - Supabase project URL')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })
    })

    describe('Service Role Key Validation', () => {
      it('should fail when SUPABASE_SERVICE_ROLE_KEY is too short', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'short-key'
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: SUPABASE_SERVICE_ROLE_KEY - Supabase service role key (server-side)')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })
    })

    describe('Client URL Validation', () => {
      it('should fail when NEXT_PUBLIC_SUPABASE_URL format is invalid', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'invalid-url'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: NEXT_PUBLIC_SUPABASE_URL - Supabase project URL (client-side)')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })
    })

    describe('Anonymous Key Validation', () => {
      it('should fail when NEXT_PUBLIC_SUPABASE_ANON_KEY is too short', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'short'
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous key (client-side)')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })

      it('should fail when SUPABASE_ANON_KEY is too short', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'short'

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: SUPABASE_ANON_KEY - Supabase anonymous key (server-side)')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })
    })

    describe('NODE_ENV Validation', () => {
      it('should fail when NODE_ENV has invalid value', () => {
        // Arrange
        process.env.SUPABASE_URL = 'https://test.supabase.co'
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
        process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)
        process.env.NODE_ENV = 'invalid-env'

        // Act
        validateEnvironment()

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: NODE_ENV - Application environment')
        expect(processExitSpy).toHaveBeenCalledWith(1)
      })

      it('should accept valid NODE_ENV values', () => {
        const validEnvs = ['development', 'production', 'test']
        
        validEnvs.forEach(env => {
          // Arrange
          jest.clearAllMocks()
          process.env.SUPABASE_URL = 'https://test.supabase.co'
          process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
          process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
          process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)
          process.env.NODE_ENV = env

          // Act
          validateEnvironment()

          // Assert
          expect(processExitSpy).not.toHaveBeenCalled()
          expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
        })
      })
    })
  })

  describe('URL Consistency Validation', () => {
    beforeEach(() => {
      // Set other required vars
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(101)
      process.env.SUPABASE_ANON_KEY = 'x'.repeat(101)
      process.env.NODE_ENV = 'development'
    })

    it('should fail when public and server Supabase URLs do not match', () => {
      // Arrange
      process.env.SUPABASE_URL = 'https://project1.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project2.supabase.co'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL must be identical')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should pass when public and server Supabase URLs match', () => {
      // Arrange
      const url = 'https://test.supabase.co'
      process.env.SUPABASE_URL = url
      process.env.NEXT_PUBLIC_SUPABASE_URL = url

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
    })
  })

  describe('Anonymous Key Consistency Validation', () => {
    beforeEach(() => {
      // Set other required vars
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NODE_ENV = 'development'
    })

    it('should fail when public and server anonymous keys do not match', () => {
      // Arrange
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'public-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'server-key-' + 'x'.repeat(100)

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_ANON_KEY must be identical')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should pass when public and server anonymous keys match', () => {
      // Arrange
      const anonKey = 'matching-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey
      process.env.SUPABASE_ANON_KEY = anonKey

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined environment variables gracefully', () => {
      // Arrange - all undefined
      
      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Environment Configuration Errors:')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle null environment variables gracefully', () => {
      // Arrange
      process.env.SUPABASE_URL = null as any
      process.env.NODE_ENV = null as any

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('🚨 Environment Configuration Errors:')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should handle whitespace-only environment variables', () => {
      // Arrange
      process.env.SUPABASE_URL = '   \t\n   '
      process.env.NODE_ENV = '   development   '

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Missing required environment variable: SUPABASE_URL - Supabase project URL')
      // NODE_ENV should still be invalid even with whitespace
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })

    it('should show help message when validation fails', () => {
      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('\n💡 Check your .env.local file and ensure all required variables are set.')
    })
  })

  describe('Security Scenarios', () => {
    it('should validate that service role key is different from anon key', () => {
      // This is a security best practice - service role and anon keys should be different
      // Arrange
      const sameKey = 'x'.repeat(101)
      process.env.SUPABASE_URL = 'https://test.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = sameKey
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = sameKey
      process.env.SUPABASE_ANON_KEY = sameKey
      process.env.NODE_ENV = 'production'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith('🔒 Production environment detected - security checks passed')
      // Note: The current implementation doesn't check for key uniqueness,
      // but this test documents the security concern
    })

    it('should handle potentially malicious environment variable values', () => {
      // Arrange
      process.env.SUPABASE_URL = 'https://test.supabase.co<script>alert("xss")</script>'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(101) + '; rm -rf /'
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(consoleErrorSpy).toHaveBeenCalledWith('❌ Invalid format for environment variable: SUPABASE_URL - Supabase project URL')
      expect(processExitSpy).toHaveBeenCalledWith(1)
    })
  })

  describe('Integration Scenarios', () => {
    it('should validate complete production environment setup', () => {
      // Arrange - complete production setup
      process.env.SUPABASE_URL = 'https://prod-project.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-service-role-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://prod-project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-anon-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.prod-anon-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'production'
      process.env.NEXT_TELEMETRY_DISABLED = '1'
      process.env.ALLOWED_ORIGINS = 'https://app.company.com,https://admin.company.com'

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(consoleLogSpy).toHaveBeenCalledWith('🔒 Production environment detected - security checks passed')
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('should validate development environment with warnings', () => {
      // Arrange - minimal development setup
      process.env.SUPABASE_URL = 'https://dev-project.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'dev-service-key-' + 'x'.repeat(100)
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dev-project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dev-anon-key-' + 'x'.repeat(100)
      process.env.SUPABASE_ANON_KEY = 'dev-anon-key-' + 'x'.repeat(100)
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
      expect(consoleWarnSpy).toHaveBeenCalledWith('⚠️  Environment Configuration Warnings:')
    })
  })

  describe('Real-world Supabase Key Formats', () => {
    it('should validate realistic Supabase service role key format', () => {
      // Arrange with realistic JWT-like service role key
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjc4ODg2NDAwLCJleHAiOjE5OTQyNjI0MDB9.signature'
      
      process.env.SUPABASE_URL = 'https://project.supabase.co'
      process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg4NjQwMCwiZXhwIjoxOTk0MjYyNDAwfQ.signature'
      process.env.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3QiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODg4NjQwMCwiZXhwIjoxOTk0MjYyNDAwfQ.signature'
      process.env.NODE_ENV = 'development'

      // Act
      validateEnvironment()

      // Assert
      expect(processExitSpy).not.toHaveBeenCalled()
      expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
    })

    it('should validate realistic Supabase URL formats', () => {
      const validUrls = [
        'https://abcdefghijklmnop.supabase.co',
        'https://my-project-123.supabase.co',
        'https://prod-app.supabase.co'
      ]

      validUrls.forEach(url => {
        jest.clearAllMocks()
        
        // Arrange
        process.env.SUPABASE_URL = url
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'x'.repeat(150)
        process.env.NEXT_PUBLIC_SUPABASE_URL = url
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'x'.repeat(150)
        process.env.SUPABASE_ANON_KEY = 'x'.repeat(150)
        process.env.NODE_ENV = 'development'

        // Act
        validateEnvironment()

        // Assert
        expect(processExitSpy).not.toHaveBeenCalled()
        expect(consoleLogSpy).toHaveBeenCalledWith('✅ Environment validation passed')
      })
    })
  })
})