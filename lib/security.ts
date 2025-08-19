import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "./supabase"

export interface SecurityValidationResult {
  isValid: boolean
  error?: string
  tenantId?: string
}

// Validate API key from environment variable
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = process.env.API_SECRET_KEY
  if (!apiKey) {
    console.error("API_SECRET_KEY environment variable not set")
    return false
  }

  const xApiKey = request.headers.get("x-api-key")
  const authHeader = request.headers.get("authorization")
  const providedKey = xApiKey || authHeader?.replace("Bearer ", "")

  return providedKey === apiKey
}

// Validate tenant exists and is accessible
export async function validateTenant(tenantId: string): Promise<boolean> {
  if (!tenantId || !isValidUUID(tenantId)) {
    return false
  }

  try {
    const supabase = createClient()
    const { data, error } = await supabase.from("tenants").select("tenant_id").eq("tenant_id", tenantId).single()

    return !error && !!data
  } catch (error) {
    console.error("Tenant validation error:", error)
    return false
  }
}

// Comprehensive security validation for API endpoints
const DEFAULT_TENANT_ID = "550e8400-e29b-41d4-a716-446655440000" // KC tenant

export async function validateSecurity(request: NextRequest, requireTenant = true): Promise<SecurityValidationResult> {
  // Validate API key
  if (!validateApiKey(request)) {
    return {
      isValid: false,
      error: "Invalid or missing API key",
    }
  }

  // Handle tenant validation
  if (requireTenant) {
    const url = new URL(request.url)
    const tenantId =
      request.headers.get("X-Tenant-Id") || url.searchParams.get("tenant_id") || url.pathname.split("/")[1] // For [tenantId] routes

    if (!tenantId) {
      return {
        isValid: false,
        error: "Tenant ID is required. Provide X-Tenant-Id header or tenant_id parameter.",
      }
    }

    const isTenantValid = await validateTenant(tenantId)
    if (!isTenantValid) {
      return {
        isValid: false,
        error: "Invalid or inaccessible tenant",
      }
    }

    return {
      isValid: true,
      tenantId,
    }
  }

  return { isValid: true }
}

// Input validation utilities
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

export function sanitizeString(input: string, maxLength = 255): string {
  return input.trim().slice(0, maxLength)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// CORS headers for internet-facing application
export function setCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set("Access-Control-Allow-Origin", "*")
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")
  response.headers.set("Access-Control-Max-Age", "86400")
  return response
}

// Security error responses
export function createSecurityErrorResponse(message: string, status = 401): NextResponse {
  const response = NextResponse.json({ error: message }, { status })
  return setCorsHeaders(response)
}

// Success response with CORS
export function createSecureResponse(data: any, status = 200): NextResponse {
  const response = NextResponse.json(data, { status })
  return setCorsHeaders(response)
}
