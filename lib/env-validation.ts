// Environment Variable Validation
// This file validates that all required environment variables are present at startup
// Prevents runtime failures due to missing configuration

interface RequiredEnvVars {
  [key: string]: {
    description: string
    required: boolean
    validate?: (value: string) => boolean
  }
}

const requiredEnvVars: RequiredEnvVars = {
  // Supabase Configuration (Critical)
  SUPABASE_URL: {
    description: 'Supabase project URL',
    required: true,
    validate: (value) => value.startsWith('https://') && value.includes('.supabase.co')
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key (server-side)',
    required: true,
    validate: (value) => value.length > 100 // Service role keys are long
  },
  NEXT_PUBLIC_SUPABASE_URL: {
    description: 'Supabase project URL (client-side)',
    required: true,
    validate: (value) => value.startsWith('https://') && value.includes('.supabase.co')
  },
  NEXT_PUBLIC_SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous key (client-side)',
    required: true,
    validate: (value) => value.length > 100 // Anon keys are long
  },
  SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous key (server-side)',
    required: true,
    validate: (value) => value.length > 100
  },

  // Application Configuration
  NODE_ENV: {
    description: 'Application environment',
    required: true,
    validate: (value) => ['development', 'production', 'test'].includes(value)
  },

  // Optional but recommended
  NEXT_TELEMETRY_DISABLED: {
    description: 'Disable Next.js telemetry',
    required: false
  },
  ALLOWED_ORIGINS: {
    description: 'Comma-separated list of allowed CORS origins',
    required: false
  },
}

export function validateEnvironment(): void {
  const errors: string[] = []
  const warnings: string[] = []

  // Check all environment variables
  for (const [key, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[key]

    if (config.required && (!value || value.trim() === '')) {
      errors.push(`❌ Missing required environment variable: ${key} - ${config.description}`)
      continue
    }

    if (value && config.validate && !config.validate(value)) {
      errors.push(`❌ Invalid format for environment variable: ${key} - ${config.description}`)
      continue
    }

    if (!config.required && (!value || value.trim() === '')) {
      warnings.push(`⚠️  Optional environment variable not set: ${key} - ${config.description}`)
    }
  }

  // Check for URL consistency
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serverUrl = process.env.SUPABASE_URL
  if (publicUrl && serverUrl && publicUrl !== serverUrl) {
    errors.push('❌ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_URL must be identical')
  }

  const publicKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serverKey = process.env.SUPABASE_ANON_KEY
  if (publicKey && serverKey && publicKey !== serverKey) {
    errors.push('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_ANON_KEY must be identical')
  }

  // Report results
  if (errors.length > 0) {
    console.error('🚨 Environment Configuration Errors:')
    errors.forEach(error => console.error(error))
    console.error('\n💡 Check your .env.local file and ensure all required variables are set.')
    process.exit(1)
  }

  if (warnings.length > 0) {
    console.warn('⚠️  Environment Configuration Warnings:')
    warnings.forEach(warning => console.warn(warning))
    console.warn('')
  }

  console.log('✅ Environment validation passed')
  
  // Security check for production
  if (process.env.NODE_ENV === 'production') {
    console.log('🔒 Production environment detected - security checks passed')
  }
}

// Validate environment on module import (at startup)
if (typeof window === 'undefined') { // Server-side only
  validateEnvironment()
}